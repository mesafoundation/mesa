import WebSocket from 'ws'
import EventEmitter from 'events'

import Server from '.'
import Message, { IMessage, Messages } from './message'

export interface ClientConnectionConfig {
    c_heartbeat_interval?: number
    c_reconnect_interval?: number
    c_authentication_timeout?: number
}

interface AuthenticationResult {
    id: string
    user: any
}

export default class Client extends EventEmitter {
    id: string
    user: any

    socket: WebSocket

    messages: Messages = { sent: [], recieved: [] }

    server: Server

    private heartbeatInterval: any
    private heartbeatCount: number = 0
    private heartbeatMaxAttempts: number
    private heartbeatAttempts: number = 0
    private heartbeatBuffer: Message[] = []

    authenticationCheck: Function

    constructor(socket: WebSocket, server: Server) {
        super()

        this.socket = socket
        this.server = server

        this.setup()
    }

    setup() {
        const { socket } = this

        if(this.server.heartbeatConfig.enabled) {
            this.heartbeatMaxAttempts = this.server.heartbeatConfig.maxAttempts || 3
            this.heartbeatInterval = setInterval(() => this.heartbeat(), this.server.heartbeatConfig.interval)
        }

        socket.on('message', data => this.registerMessage(data))
        socket.on('close', (code, reason) => this.registerDisconnection(code, reason))
    }

    send(message: Message, pubSub: boolean = false) {
        if(this.server.redis && !this.id)
            console.warn('Mesa pub/sub only works when users are identified using the client.authenticate API. Please use this API in order to enable pub/sub')

        if(!this.server.redis || !this.id || pubSub) {
            this.messages.sent.push(message)
            return this.socket.send(message.serialize())
        }

        this.server.publisher.publish('ws', JSON.stringify({ message: message.serialize(true), recipients: [this.id], sync: !!message.options.sync }))
    }

    heartbeat() {
        if(this.heartbeatBuffer.length > 0 || this.heartbeatCount === 0) {
            this.heartbeatBuffer = []
            this.heartbeatAttempts = 0

            this.send(new Message(1, {}))
        } else {
            this.heartbeatAttempts += 1

            if(this.heartbeatAttempts > this.heartbeatMaxAttempts) return this.disconnect()
            this.send(new Message(1, { tries: this.heartbeatAttempts, max: this.heartbeatMaxAttempts }))
        }

        this.heartbeatCount += 1
    }

    authenticate(callback: Function) {
        this.authenticationCheck = callback
    }

    registerMessage(data: WebSocket.Data) {
        let json: IMessage

        try {
            json = JSON.parse(data.toString())
        } catch(error) {
            throw error
        }

        const { op, d, t } = json, message = new Message(op, d, t)

        if(op === 2 && this.authenticationCheck)
            return this.authenticationCheck(d, (error, result) => this.registerAuthentication(error, result))
        else if(op === 11)
            return this.heartbeatBuffer.push(message)

        this.emit('message', message)
        this.server.emit('message', message)
        this.messages.recieved.push(message)
    }

    registerAuthentication(error: any, result: AuthenticationResult) {
        if(error) console.error(error)

        this.id = result.id
        this.user = result.user
    }

    registerDisconnection(code: number, reason?: string) {
        if(this.heartbeatInterval)
            clearInterval(this.heartbeatInterval)
        
        this.emit('disconnect', { code, reason })
    }

    disconnect(code?: number) {
        this.socket.close(code)
    }
}