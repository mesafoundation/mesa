import WebSocket from 'ws'
import { EventEmitter } from 'events'

import Message, { IMessage, Messages } from '../server/message'
import { ClientConnectionConfig, Rule } from '../server/client'

interface ClientConfig {
    autoConnect?: boolean
}

declare interface Client extends EventEmitter {
    on(event: 'connected', listener: (this: Client) => void): this
    on(event: 'message', listener: (this: Client, message: Message) => void): this
    on(event: 'disconnected', listener: (this: Client, code: number, reason: string) => void): this

    on(event: 'error', listener: (this: Client, error: Error) => void): this
}

class Client extends EventEmitter {
    url: string
    private config: ClientConfig

    authenticated: boolean = false

    messages: Messages

    private ws: WebSocket
    private queue: Message[] = []
    
    private rules: Rule[] = []

    private heartbeatIntervalTime: number
    private authenticationTimeout: number

    private reconnectionInterval: NodeJS.Timeout
    private reconnectionIntervalTime: number

    private authenticationResolve: (value?: unknown) => void

    constructor(url: string, config?: ClientConfig) {
        super()

        config = this.parseConfig(config)

        this.url = url
        this.config = config

        if(config.autoConnect)
            this.connect()
    }

    private parseConfig(config?: ClientConfig) {
        if(typeof config.autoConnect === 'undefined')
            config.autoConnect = true

        return config
    }

    connect = () => new Promise((resolve, reject) => {
        if(this.reconnectionInterval)
            clearInterval(this.reconnectionInterval)

        if(this.ws && this.ws.readyState === this.ws.OPEN)
            throw 'This client is already connected to a pre-existing Mesa server. Call disconnect() to disconnect before attempting to reconnect again'

        this.ws = new WebSocket(this.url)

        const resolveConnection = () => {
            this.ws.removeEventListener('open', resolveConnection)
            resolve()
        }

        this.ws.addEventListener('open', resolveConnection)

        const rejectError = error => {
            this.ws.removeEventListener('error', rejectError)
            reject(error)
        }

        this.ws.addEventListener('error', rejectError)

        this.ws.on('open', () => this.registerOpen())
        this.ws.on('message', data => this.registerMessage(data))
        this.ws.on('close', (code, reason) => this.registerClose(code, reason))
        this.ws.on('error', error => this.registerError(error))
    })

    private connectAndSupressWarnings() {
        this.connect()
                .then(() => {})
                .catch(() => {})
    }

    send(message: Message) {
        if(this.ws.readyState !== this.ws.OPEN)
            return this.queue.push(message)

        if(this.rules.indexOf('store_messages') > -1)
            this.messages.sent.push(message)
        
        this.ws.send(message.serialize())
    }

    authenticate = (data: Object) => new Promise(async (resolve, reject) => {
        this.authenticationResolve = resolve
        this.send(new Message(2, { ...data }))
    })

    disconnect(code?: number, data?: string) {
        this.ws.close(code, data)
    }

    private registerOpen() {
        this.emit('connected')

        if(this.queue.length > 0) {
            this.queue.forEach(this.send)
            this.queue = []
        }
    }

    private registerMessage(data: WebSocket.Data) {
        let json: IMessage

        try {
            json = JSON.parse(data.toString())
        } catch(error) {
            return console.error(error)
        }

        const { op, d, t } = json, message = new Message(op, d, t)

        switch(message.opcode) {
            case 1:
                return this.send(new Message(11, {}))
            case 10:
                const { c_heartbeat_interval, c_reconnect_interval, c_authentication_timeout, rules } = message.data as ClientConnectionConfig

                if(c_heartbeat_interval)
                    this.heartbeatIntervalTime = c_heartbeat_interval

                if(c_reconnect_interval)
                    this.reconnectionIntervalTime = c_reconnect_interval

                if(c_authentication_timeout)
                    this.authenticationTimeout = c_authentication_timeout

                if(rules.indexOf('enforce_equal_versions') > -1)
                    this.send(
                        new Message(0, { v: require('../package.json').version }, 'CLIENT_VERSION')
                    )

                if(rules.indexOf('store_messages') > -1)
                    this.messages = { sent: [], recieved: [] }

                this.rules = rules

                return
            case 22:
                this.authenticated = true

                if(this.rules.indexOf('sends_user_object') && this.authenticationResolve)
                    this.authenticationResolve(d)
                
                return
        }

        this.emit('message', message)

        if(this.rules.indexOf('store_messages') > -1)
            this.messages.recieved.push(message)
    }

    private registerClose(code?: number, reason?: string) {
        this.emit('disconnected', code, reason)

        if(this.reconnectionIntervalTime) {
            if(this.reconnectionInterval)
                clearInterval(this.reconnectionInterval)
            
            this.ws = null
            this.reconnectionInterval = setInterval(() => this.connectAndSupressWarnings(), this.reconnectionIntervalTime)
        }
    }

    private registerError(error: Error) {
        this.emit('error', error)
    }
}

export default Client