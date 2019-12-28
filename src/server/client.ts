import WebSocket from 'ws'
import { EventEmitter } from 'events'

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

type AuthenticationCallback = (data: any, done: AuthenticationDoneCallback) => void
type AuthenticationDoneCallback = (error: Error, user?: AuthenticationResult) => void

declare interface Client extends EventEmitter {
    on(event: 'message', listener: (this: Server, message: Message) => void): this
    on(event: 'disconnect', listener: (this: Server, code: number, reason: string) => void): this
}

class Client extends EventEmitter {
    id: string
    user: any

    authenticated: boolean = false

    socket: WebSocket

    messages: Messages = { sent: [], recieved: [] }

    server: Server

    private heartbeatInterval: any
    private heartbeatCount: number = 0
    private heartbeatMaxAttempts: number
    private heartbeatAttempts: number = 0
    private heartbeatBuffer: Message[] = []

    authenticationCheck: AuthenticationCallback

    constructor(socket: WebSocket, server: Server) {
        super()

        this.socket = socket
        this.server = server

        this.setup()
    }

    private setup() {
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

        this.server.publisher.publish(this.server.pubSubNamespace(), JSON.stringify({ message: message.serialize(true), recipients: [this.id], sync: !!message.options.sync }))
    }

    private heartbeat() {
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

    authenticate(callback: AuthenticationCallback) {
        this.authenticationCheck = callback
    }

    updateUser(update: AuthenticationResult) {
        if(!this.authenticated) throw 'This user hasn\'t been authenticated yet'

        this.registerAuthentication(null, update)
    }

    private registerMessage(data: WebSocket.Data) {
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

    private registerAuthentication(error: any, result: AuthenticationResult) {
        if(error && this.server.authenticationConfig.disconnectOnFail)
            return this.disconnect(1008)

        const { id, user } = result
        if(!id) throw 'No user id supplied in result callback'
        if(!user) throw 'No user object supplied in result callback'

        this.id = result.id
        this.user = result.user

        if(!this.authenticated)
            this.send(new Message(22, this.server.authenticationConfig.sendUserObject ? result.user : {}))

        this.authenticated = true
    }

    private registerDisconnection(code: number, reason?: string) {
        if(this.heartbeatInterval)
            clearInterval(this.heartbeatInterval)
        
        this.emit('disconnect', code, reason)
        this.server.emit('disconnection', code, reason)
    }

    disconnect(code?: number) {
        this.socket.close(code)
    }
}

export default Client