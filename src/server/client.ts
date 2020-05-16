import { EventEmitter } from 'events'
import WebSocket from 'ws'

import http from 'http'

import Server from '.'
import Message, { IMessage, IMessages } from './message'

import { generateId } from '../utils/id.util'
import { getVersion } from '../utils/getters.util'

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

interface IClientAdditional {
	req?: http.IncomingMessage
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
	public serverId = generateId()

	public user: any

	public authenticated: boolean = false

	public socket: WebSocket
	public server: Server
	public request?: http.IncomingMessage

	public messages: IMessages = { sent: [], recieved: [] }

	public authenticationCheck: AuthenticationCallback

	private heartbeatInterval: any
	private heartbeatCount: number = 0
	private heartbeatMaxAttempts: number
	private heartbeatAttempts: number = 0
	private heartbeatBuffer: Message[] = []

	constructor(socket: WebSocket, server: Server, additional?: IClientAdditional) {
		super()

		this.socket = socket
		this.server = server

		if (additional && additional.req)
			this.request = additional.req

		this.setup()
	}

	public send(message: Message, sendDirectly: boolean = false) {
		if (message.opcode === 5) {
			switch (message.type) {
				case 'DISCONNECT_CLIENT':
					this.disconnect(1000)
			}

			return
		}

		// if (!this.server.redis && !this.id && message.opcode === 0)
		// 	console.warn(
		// 		'Mesa pub/sub only works when users are identified using the client.authenticate API.\
		// 		Please use this API in order to enable pub/sub'
		// 	)

		if (this.server.serverOptions.storeMessages)
			this.messages.sent.push(message)

		if (sendDirectly)
			return this.socket.send(message.serialize())

		this.server.send(message, [this.id])
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

		if (op === 0 && (this.server.clientConfig.enforceEqualVersions))
			switch (t) {
				case 'CLIENT_VERSION':
					const { v } = d

					if (v !== getVersion() && this.server.clientConfig.enforceEqualVersions)
						return this.disconnect(1002)
			}
		else if (op === 2 && this.authenticationCheck)
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

		if (typeof id === 'undefined')
			throw new Error('No user id supplied in result callback')
		else if (typeof user === 'undefined')
			throw new Error('No user object supplied in result callback')

		this.id = id
		this.user = user

		if (this.server.syncConfig.enabled && this.server.redis)
			this.redeliverUndeliverableMessages()

		if (this.server.authenticationConfig.storeConnectedUsers && this.server.redis)
			this.server.redis.sadd(this.clientNamespace('connected_clients'), id)

		if (!this.authenticated)
			this.send(new Message(22, this.server.authenticationConfig.sendUserObject ? user : {}))

		this.authenticated = true
	}

	private registerDisconnection(code: number, reason?: string) {
		if (this.heartbeatInterval)
			clearInterval(this.heartbeatInterval)

		if (this.id && this.server.authenticationConfig.storeConnectedUsers && this.server.redis)
			this.server.redis.srem(this.clientNamespace('connected_clients'), this.id)

		this.emit('disconnect', code, reason)
		this.server.emit('disconnection', code, reason)

		this.server.registerDisconnection(this)
	}

	private async redeliverUndeliverableMessages() {
		const namespace = this.clientNamespace('undelivered_messages'),
				_undeliveredMessages = await this.server.redis.hget(namespace, this.id),
				messageRedeliveryInterval = this.server.syncConfig.redeliveryInterval

		let undeliveredMessages: IMessage[] = []

		if (_undeliveredMessages)
			try {
				undeliveredMessages = JSON.parse(_undeliveredMessages)
			} catch (error) {
				console.error(error)
			}

		const messages = undeliveredMessages.map((message, sequence) =>
			new Message(message.op, message.d, message.t, { sequence })
		)

		if (messageRedeliveryInterval) {
			let interval: NodeJS.Timeout,
				messageIndex = 0

			interval = setInterval(() => {
				const message = messages[messageIndex]
				if (!message)
					return clearInterval(interval)

				this.send(message, true)

				messageIndex += 1
			}, messageRedeliveryInterval)
		} else
			messages.forEach(message => this.send(message, true))

		this.server.redis.hdel(namespace, this.id)
	}

	private clientNamespace(prefix: string) {
		return this.server.namespace ? `${prefix}_${this.server.namespace}` : prefix
	}
}

export default Client
