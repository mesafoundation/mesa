import http from 'http'
import https from 'https'

import { EventEmitter } from 'events'
import Redis from 'ioredis'
import WebSocket, { ServerOptions as WSOptions } from 'ws'

import Client, { IClientConnectionConfig, Rule } from './client'
import Message, { IInternalMessage, IMessage } from './message'

import { parseConfig, parseRules } from '../utils'
import { createRedisClient } from '../utils/helpers.util'
import { handleUndeliveredMessage } from '../utils/sync.until'

export type RedisConfig = string | Redis.RedisOptions

export interface IClientConfig {
	enforceEqualVersions?: boolean
}

export interface IServerOptions {
	storeMessages?: boolean
}

export interface ISyncConfig {
	enabled: boolean
	redeliveryInterval?: 0 | number
}

export interface IHeartbeatConfig {
	enabled: boolean

	interval?: 10000 | number
	maxAttempts?: 3 | number
}

export interface IReconnectConfig {
	enabled: boolean

	interval?: 5000 | number
}

export interface IAuthenticationConfig {
	timeout?: 10000 | number

	sendUserObject?: boolean
	disconnectOnFail?: boolean
	storeConnectedUsers?: boolean
}

interface IServerConfig {
	port?: number
	namespace?: string

	redis?: RedisConfig
	server?: http.Server | https.Server

	client?: IClientConfig
	options?: IServerOptions

	sync?: ISyncConfig
	heartbeat?: IHeartbeatConfig
	reconnect?: IReconnectConfig
	authentication?: IAuthenticationConfig
}

// tslint:disable-next-line: interface-name
declare interface Server extends EventEmitter {
	on(event: 'connection', listener: (this: Server, client: Client) => void): this
	on(event: 'message', listener: (this: Server, message: Message) => void): this
	on(event: 'disconnection', listener: (this: Server, code: number, reason: string) => void): this
}

class Server extends EventEmitter {
	public wss: WebSocket.Server
	public clients: Client[] = []

	public namespace: string

	public redis: Redis.Redis
	public publisher: Redis.Redis
	public subscriber: Redis.Redis

	public clientConfig: IClientConfig
	public serverOptions: IServerOptions

	public syncConfig: ISyncConfig
	public heartbeatConfig: IHeartbeatConfig
	public reconnectConfig: IReconnectConfig
	public authenticationConfig: IAuthenticationConfig

	constructor(config?: IServerConfig) {
		super()

		config = this.parseConfig(config)

		this.setup(config)
	}

	public async send(message: Message, _recipients?: string[], excluding?: string[]) {
		if (_recipients && excluding)
			_recipients = _recipients.filter(recipient => excluding.indexOf(recipient) === -1)

		if (!this.redis && !_recipients)
			return this.clients.forEach(client => client.send(message, true))

		if (this.redis && _recipients && this.syncConfig.enabled) {
			const namespace = this.clientNamespace('connected_clients'),
					onlineRecipients = [],
					offlineRecipients = []

			if (_recipients && this.syncConfig.enabled)
				for (let i = 0; i < _recipients.length; i++) {
					const recipient = _recipients[i],
							isRecipientConnected = (await this.redis.sismember(namespace, _recipients[i])) === 1;

					(isRecipientConnected ? onlineRecipients : offlineRecipients).push(recipient)
				}

			if (onlineRecipients.length > 0)
				this.publisher.publish(this.pubSubNamespace(), JSON.stringify({
					message: message.serialize(true),
					recipients: onlineRecipients
				} as IInternalMessage))

			if (offlineRecipients.length > 0)
				offlineRecipients.forEach(recipient => this.handleUndeliverableMessage(message, recipient))

			return
		}

		if (this.redis)
			return this.publisher.publish(this.pubSubNamespace(), JSON.stringify({
				message: message.serialize(true),
				recipients: _recipients || ['*']
			} as IInternalMessage))
		else {
			const recipients = this.clients.filter(({ id }) => _recipients.indexOf(id) > -1)
			recipients.forEach(recipient => recipient.send(message))
		}
	}

	public registerDisconnection(disconnectingClient: Client) {
		const clientIndex = this.clients.findIndex(client => client.serverId === disconnectingClient.serverId)

		this.clients.splice(clientIndex, 1)
	}

	public pubSubNamespace() {
		return this.namespace ? `ws_${this.namespace}` : 'ws'
	}

	private setup(config: IServerConfig) {
		if (this.wss)
			this.wss.close()

		const options: WSOptions = {}

		if (config.server)
			options.server = config.server
		else
			options.port = config.port || 4000

		this.wss = new WebSocket.Server(options)
		this.wss.on('connection', (socket, req) => this.registerClient(socket, req))
	}

	private parseConfig(config?: IServerConfig) {
		if (!config)
			config = {}

		if (config.namespace)
			this.namespace = config.namespace

		if (config.redis)
			this.setupRedis(config.redis)

		this.clientConfig = parseConfig(config.client, ['enforceEqualVersions'], [false])
		this.serverOptions = parseConfig(config.options, ['storeMessages'], [false])

		this.syncConfig = config.sync || { enabled: false }
		this.heartbeatConfig = config.heartbeat || { enabled: false }
		this.reconnectConfig = config.reconnect || { enabled: false }
		this.authenticationConfig = parseConfig(config.authentication, ['timeout', 'sendUserObject', 'disconnectOnFail', 'storeConnectedUsers'], [10000, true, true, true])

		if (this.syncConfig && this.syncConfig.enabled && !this.authenticationConfig.storeConnectedUsers)
			console.warn('Mesa requires config.authentication.storeConnectedUsers to be true for message sync to be enabled')

		return config
	}

	private setupRedis(redisConfig: RedisConfig) {
		const redis: Redis.Redis = createRedisClient(redisConfig),
			publisher: Redis.Redis = createRedisClient(redisConfig),
			subscriber: Redis.Redis = createRedisClient(redisConfig)

		this.redis = redis
		this.publisher = publisher
		this.subscriber = subscriber

		subscriber.on('message', async (_, data) => {
			try {
				this.handleInternalMessage(JSON.parse(data))
			} catch (error) {
				this.emit('error', error)
			}
		}).subscribe(this.pubSubNamespace())
	}

	private registerClient(socket: WebSocket, req: http.IncomingMessage) {
		const client = new Client(socket, this, { req })

		client.send(new Message(10, this.fetchClientConfig()))

		this.clients.push(client)
		this.emit('connection', client)
	}

	private handleInternalMessage(internalMessage: IInternalMessage) {
		const { message: _message, recipients: _recipients } = internalMessage,
			message = new Message(_message.op, _message.d, _message.t)

		let recipients: Client[]

		if (_recipients.indexOf('*') > -1)
			recipients = this.clients
		else
			recipients = this.clients.filter(client => _recipients.indexOf(client.id) > -1)

		recipients.forEach(client => client.send(message, true))
	}

	private async handleUndeliverableMessage(message: Message, recipient: string) {
		handleUndeliveredMessage(message, recipient, this.redis, this.clientNamespace('undelivered_messages'))
	}

	private fetchClientConfig() {
		const config: IClientConnectionConfig = {},
			{ serverOptions, clientConfig, authenticationConfig } = this,
			rules: Rule[] = parseRules({ serverOptions, clientConfig, authenticationConfig })

		if (this.heartbeatConfig.enabled)
			config.c_heartbeat_interval = this.heartbeatConfig.interval

		if (this.reconnectConfig.enabled)
			config.c_reconnect_interval = this.reconnectConfig.interval

		if (this.authenticationConfig.timeout)
			config.c_authentication_timeout = this.authenticationConfig.timeout

		if (rules.length > 0)
			config.rules = rules

		return config
	}

	private clientNamespace(prefix: string) {
		return this.namespace ? `${prefix}_${this.namespace}` : prefix
	}
}

export default Server
