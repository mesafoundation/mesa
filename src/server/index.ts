import http from 'http'
import https from 'https'

import { EventEmitter } from 'events'
import Redis from 'ioredis'
import WebSocket, { ServerOptions as WSOptions } from 'ws'

import Client, { IClientConnectionConfig, Rule } from './client'
import Message, { IInternalMessage } from './message'

import { parseConfig, parseRules } from '../utils'
import { createRedisClient } from '../utils/helpers.util'

export type RedisConfig = string | Redis.RedisOptions

export interface IClientConfig {
	enforceEqualVersions?: boolean
}

export interface IServerOptions {
	storeMessages?: boolean
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

	public heartbeatConfig: IHeartbeatConfig
	public reconnectConfig: IReconnectConfig
	public authenticationConfig: IAuthenticationConfig

	constructor(config?: IServerConfig) {
		super()

		config = this.parseConfig(config)

		this.setup(config)
	}

	public send(message: Message) {
		this.clients.forEach(client => client.send(message))
	}

	public pubSubNamespace() {
		return this.namespace ? `ws-${this.namespace}` : 'ws'
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
		this.wss.on('connection', socket => this.registerClient(socket))
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

		this.heartbeatConfig = config.heartbeat || { enabled: false }
		this.reconnectConfig = config.reconnect || { enabled: false }
		this.authenticationConfig = parseConfig(config.authentication, ['timeout', 'sendUserObject', 'disconnectOnFail', 'storeConnectedUsers'], [10000, true, true, true])

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

	private registerClient(socket: WebSocket) {
		const client = new Client(socket, this)

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
}

export default Server
