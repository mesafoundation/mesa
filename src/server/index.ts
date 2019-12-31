import http from 'http'
import https from 'https'

import Redis from 'ioredis'
import { EventEmitter } from 'events'
import WebSocket, { ServerOptions as WSOptions } from 'ws'

import Message, { InternalMessage } from './message'
import Client, { Rule, ClientConnectionConfig } from './client'

import { parseRules, parseConfig } from '../utils'

type RedisConfig = string | Redis.RedisOptions

export interface ClientConfig {
    enforceEqualVersions?: boolean
}

export interface ServerOptions {
    storeMessages?: boolean
}

export interface HeartbeatConfig {
    enabled: boolean

    interval?: 10000 | number
    maxAttempts?: 3 | number
}

export interface ReconnectConfig {
    enabled: boolean

    interval?: 5000 | number
}

export interface AuthenticationConfig {
    timeout?: 10000 | number

    sendUserObject?: boolean
    disconnectOnFail?: boolean
    storeConnectedUsers?: boolean
}

interface ServerConfig {
    port?: number
    namespace?: string

    redis?: RedisConfig
    server?: http.Server | https.Server

    client?: ClientConfig
    options?: ServerOptions

    heartbeat?: HeartbeatConfig
    reconnect?: ReconnectConfig
    authentication?: AuthenticationConfig
}

declare interface Server extends EventEmitter {
    on(event: 'connection', listener: (this: Server, client: Client) => void): this
    on(event: 'message', listener: (this: Server, message: Message) => void): this
    on(event: 'disconnection', listener: (this: Server, code: number, reason: string) => void): this
}

class Server extends EventEmitter {
    wss: WebSocket.Server
    clients: Client[] = []

    namespace: string

    redis: Redis.Redis
    publisher: Redis.Redis
    subscriber: Redis.Redis

    clientConfig: ClientConfig
    serverOptions: ServerOptions

    heartbeatConfig: HeartbeatConfig
    reconnectConfig: ReconnectConfig
    authenticationConfig: AuthenticationConfig

	constructor(config?: ServerConfig) {
        super()

        config = this.parseConfig(config)

        this.setup(config)
    }

    send(message: Message) {
        this.clients.forEach(client => client.send(message))
    }

    private setup(config: ServerConfig) {
        if(this.wss)
            this.wss.close()

        const options: WSOptions = {}

        if(config.server)
            options.server = config.server
        else
            options.port = config.port || 4000

        this.wss = new WebSocket.Server(options)
        this.wss.on('connection', socket => this.registerClient(socket))
    }

    private parseConfig(config?: ServerConfig) {
        if(!config)
            config = {}

        if(config.namespace)
            this.namespace = config.namespace

        if(config.redis)
            this.setupRedis(config.redis)

        this.clientConfig = parseConfig(config.client, ['enforceEqualVersions'], [false])
        this.serverOptions = parseConfig(config.options, ['storeMessages'], [false])

        this.heartbeatConfig = config.heartbeat || { enabled: false }
        this.reconnectConfig = config.reconnect || { enabled: false }
        this.authenticationConfig = parseConfig(config.authentication, ['timeout', 'sendUserObject', 'disconnectOnFail', 'storeConnectedUsers'], [10000, true, true, true])

        return config
    }

    private setupRedis(redisConfig: RedisConfig) {
        let redis: Redis.Redis,
            publisher: Redis.Redis,
            subscriber: Redis.Redis

        if(typeof redisConfig === 'string') {
            redis = new Redis(redisConfig)
            publisher = new Redis(redisConfig)
            subscriber = new Redis(redisConfig)
        } else {
            redis = new Redis(redisConfig)
            publisher = new Redis(redisConfig)
            subscriber = new Redis(redisConfig)
        }

        this.redis = redis
        this.publisher = publisher
        this.subscriber = subscriber

        subscriber.on('message', async (_, data) => {
            try {
                this.handleInternalMessage(JSON.parse(data))
            } catch(error) {
                this.emit('error', error)
            }
        }).subscribe(this.pubSubNamespace())
    }

    pubSubNamespace() {
        return this.namespace ? `ws-${this.namespace}` : 'ws'
    }

    private registerClient(socket: WebSocket) {
        const client = new Client(socket, this)

        client.send(new Message(10, this.fetchClientConfig()))

        this.clients.push(client)
        this.emit('connection', client)
    }

    private handleInternalMessage(internalMessage: InternalMessage) {
        const { message: _message, recipients: _recipients } = internalMessage,
                message = new Message(_message.op, _message.d, _message.t)

        let recipients: Client[]

        if(_recipients.indexOf('*') > -1)
            recipients = this.clients
        else
            recipients = this.clients.filter(client => _recipients.indexOf(client.id) > -1)

        recipients.forEach(client => client.send(message, true))
    }

    private fetchClientConfig() {
        const config: ClientConnectionConfig = {},
                { serverOptions, clientConfig, authenticationConfig } = this,
                rules: Rule[] = parseRules({ serverOptions, clientConfig, authenticationConfig })

        if(this.heartbeatConfig.enabled)
            config.c_heartbeat_interval = this.heartbeatConfig.interval

        if(this.reconnectConfig.enabled)
            config.c_reconnect_interval = this.reconnectConfig.interval

        if(this.authenticationConfig.timeout)
            config.c_authentication_timeout = this.authenticationConfig.timeout

        if(rules.length > 0)
            config.rules = rules

        return config
    }
}

export default Server