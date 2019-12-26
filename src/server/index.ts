import WebSocket from 'ws'
import Redis from 'ioredis'
import EventEmitter from 'events'
import { Server as HTTPServer } from 'http'

import Client, { ClientConnectionConfig } from './client'
import Message from './message'

interface HeartbeatConfig {
    enabled: boolean

    interval?: 10000 | number
    maxAttempts?: 3 | number
}

interface ReconnectConfig {
    enabled: boolean

    interval?: 5000 | number
}

interface AuthenticationConfig {
    timeout?: 10000 | number
}

interface ServerConfig {
    port?: number
    redis?: string | Redis.RedisOptions

    server?: HTTPServer

    heartbeat?: HeartbeatConfig
    reconnect?: ReconnectConfig
    authentication?: AuthenticationConfig
}

export default class Server extends EventEmitter {
    wss: WebSocket.Server
    clients: Client[] = []

    heartbeatConfig: HeartbeatConfig
    reconnectConfig: ReconnectConfig
    authenticationConfig: AuthenticationConfig

	constructor(config?: ServerConfig) {
        super()
        if(!config) config = {}

        this.setup(config)
    }

    send(message: Message) {
        this.clients.forEach(client => client.send(message))
    }

    setup(config: ServerConfig) {
        if(this.wss) this.wss.close()

        this.heartbeatConfig = config.heartbeat || { enabled: false }
        this.reconnectConfig = config.reconnect || { enabled: false }
        this.authenticationConfig = config.authentication || {}
    
        this.wss = new WebSocket.Server({ port: config.port || 4000 })
        this.wss.on('connection', socket => this.registerClient(socket))
    }

    registerClient(socket: WebSocket) {
        const client = new Client(socket, this)

        client.send(new Message(10, this.fetchClientConfig()))

        this.clients.push(client)
        this.emit('connection', client)
    }

    fetchClientConfig() {
        const config: ClientConnectionConfig = {}

        if(this.heartbeatConfig.enabled)
            config.c_heartbeat_interval = this.heartbeatConfig.interval

        if(this.reconnectConfig.enabled)
            config.c_reconnect_interval = this.reconnectConfig.interval

        if(this.authenticationConfig.timeout)
            config.c_authentication_timeout = this.authenticationConfig.timeout

        return config
    }
}