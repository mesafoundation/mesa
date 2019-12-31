import { EventEmitter } from 'events'
import WebSocket from 'ws'

import Server from '.'
import Message, { IMessage, IMessages } from './message'

export type Rule = 'enforce_equal_versions' | 'store_messages' | 'sends_user_object'

export interface IClientConnectionConfig {
	c_heartbeat_interval?: number
	c_reconnect_interval?: number
	c_authentication_timeout?: number

	rules?: Rule[]
}

interface IAuthenticationResult {
	id: string
	user: any
}

type AuthenticationCallback = (data: any, done: AuthenticationDoneCallback) => void
type AuthenticationDoneCallback = (error: Error, user?: IAuthenticationResult) => void

// tslint:disable-next-line: interface-name
declare interface Client extends EventEmitter {
	on(event: 'message', listener: (this: Server, message: Message) => void): this
	on(event: 'disconnect', listener: (this: Server, code: number, reason: string) => void): this
}

class Client extends EventEmitter {
	public id: string
	public user: any

	public authenticated: boolean = false

	public socket: WebSocket

	public messages: IMessages = { sent: [], recieved: [] }

	public server: Server

	public authenticationCheck: AuthenticationCallback

	private heartbeatInterval: any
	private heartbeatCount: number = 0
	private heartbeatMaxAttempts: number
	private heartbeatAttempts: number = 0
	private heartbeatBuffer: Message[] = []

	constructor(socket: WebSocket, server: Server) {
		super()

		this.socket = socket
		this.server = server

		this.setup()
	}

	public send(message: Message, pubSub: boolean = false) {
		if (this.server.redis && !this.id)
			console.warn('Mesa pub/sub only works when users are identified using the client.authenticate API. Please use this API in order to enable pub/sub')

		if (this.server.serverOptions.storeMessages)
			this.messages.sent.push(message)

		if (!this.server.redis || !this.id || pubSub)
			return this.socket.send(message.serialize())

		this.server.publisher.publish(
			this.server.pubSubNamespace(),
			JSON.stringify({ message: message.serialize(true), recipients: [this.id] })
		)
	}

	public authenticate(callback: AuthenticationCallback) {
		this.authenticationCheck = callback
	}

	public updateUser(update: IAuthenticationResult) {
		if (!this.authenticated) throw new Error('This user hasn\'t been authenticated yet')

		this.registerAuthentication(null, update)
	}

	public disconnect(code?: number) {
		this.socket.close(code)
	}

	private setup() {
		const { socket } = this

		if (this.server.heartbeatConfig.enabled) {
			this.heartbeatMaxAttempts = this.server.heartbeatConfig.maxAttempts || 3
			this.heartbeatInterval = setInterval(() => this.heartbeat(), this.server.heartbeatConfig.interval)
		}

		socket.on('message', data => this.registerMessage(data))
		socket.on('close', (code, reason) => this.registerDisconnection(code, reason))
	}

	private heartbeat() {
		if (this.heartbeatBuffer.length > 0 || this.heartbeatCount === 0) {
			this.heartbeatBuffer = []
			this.heartbeatAttempts = 0

			this.send(new Message(1, {}))
		} else {
			this.heartbeatAttempts += 1

			if (this.heartbeatAttempts > this.heartbeatMaxAttempts) return this.disconnect()
			this.send(new Message(1, { tries: this.heartbeatAttempts, max: this.heartbeatMaxAttempts }))
		}

		this.heartbeatCount += 1
	}

	private registerMessage(data: WebSocket.Data) {
		let json: IMessage

		try {
			json = JSON.parse(data.toString())
		} catch (error) {
			throw error
		}

		const { op, d, t } = json, message = new Message(op, d, t)

		if (op === 2 && this.authenticationCheck)
			return this.authenticationCheck(d, (error, result) => this.registerAuthentication(error, result))
		else if (op === 11)
			return this.heartbeatBuffer.push(message)

		this.emit('message', message)
		this.server.emit('message', message)

		if (this.server.serverOptions.storeMessages)
			this.messages.recieved.push(message)
	}

	private registerAuthentication(error: any, result: IAuthenticationResult) {
		if (error && this.server.authenticationConfig.disconnectOnFail)
			return this.disconnect(1008)

		const { id, user } = result
		if (!id) throw new Error('No user id supplied in result callback')
		if (!user) throw new Error('No user object supplied in result callback')

		this.id = id
		this.user = user

		if (this.server.authenticationConfig.storeConnectedUsers && this.server.redis)
			this.server.redis.sadd(this.clientNamespace(), id)

		if (!this.authenticated)
			this.send(new Message(22, this.server.authenticationConfig.sendUserObject ? user : {}))

		this.authenticated = true
	}

	private registerDisconnection(code: number, reason?: string) {
		if (this.heartbeatInterval)
			clearInterval(this.heartbeatInterval)

		if (this.id && this.server.authenticationConfig.storeConnectedUsers && this.server.redis)
			this.server.redis.srem(this.clientNamespace(), this.id)

		this.emit('disconnect', code, reason)
		this.server.emit('disconnection', code, reason)
	}

	private clientNamespace() {
		return this.server.namespace ? `undelivered_events-${this.server.namespace}` : 'undelivered_events'
	}
}

export default Client
