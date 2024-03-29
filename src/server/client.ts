import { EventEmitter } from 'events'
import WebSocket from 'ws'

import http from 'http'

import Server from '.'
import Message, { IMessage, IMessages } from './message'

import { getVersion } from '../utils/getters.util'
import { generateId } from '../utils/id.util'

export type Rule = 'enforce_equal_versions' | 'store_messages' | 'sends_user_object'

export interface IClientConnectionConfig {
  c_heartbeat_interval?: number
  c_reconnect_interval?: number
  c_authentication_timeout?: number

  rules?: Rule[]
}

interface IClientAuthenticationConfig {
  token?: string

  shouldSync?: boolean
}

interface IAuthenticationResult {
  id: string
  user: any
}

interface IClientAdditional {
  req?: http.IncomingMessage
}

type AuthenticationCallback = (data: any, done: AuthenticationDoneCallback) => void
type AuthenticationDoneCallback = (error: Error | null, user?: IAuthenticationResult) => void

// tslint:disable-next-line: interface-name
declare interface Client extends EventEmitter {
  on(event: 'message', listener: (this: Server, message: Message) => void): this
  on(event: 'disconnect', listener: (this: Server, code: number, reason: string) => void): this
}

class Client extends EventEmitter {
  public id: string
  public serverId = generateId()

  public user: any

  public authenticated = false
  public clientConfig: IClientAuthenticationConfig

  public socket: WebSocket
  public server: Server
  public request?: http.IncomingMessage

  public messages: IMessages = { sent: [], received: [] }

  public authenticationCheck: AuthenticationCallback

  private heartbeatInterval: any
  private heartbeatCount = 0
  private heartbeatMaxAttempts: number
  private heartbeatAttempts = 0
  private heartbeatBuffer: Message[] = []

  constructor(socket: WebSocket, server: Server, additional?: IClientAdditional) {
    super()

    this.socket = socket
    this.server = server

    if (additional && additional.req)
      this.request = additional.req

    this.setup()
  }

  public send(message: Message, sendDirectly = false) {
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
      return this.socket.send(message.serialize(false, { sentByServer: true }))

    this.server.send(message, [this.id])
  }

  public authenticate(callback: AuthenticationCallback) {
    this.authenticationCheck = callback
  }

  public updateUser(update: IAuthenticationResult) {
    if (!this.authenticated) {
      const error = new Error('This user hasn\'t been authenticated yet')
      this.registerError(error)

      throw error
    }

    this.registerAuthentication(null, update)
  }

  public disconnect(code?: number) {
    this.socket.close(code)
  }

  private parseAuthenticationConfig(_config: IClientAuthenticationConfig) {
    const config = Object.assign({}, _config)

    if (typeof config.shouldSync === 'undefined')
      config.shouldSync = true

    if (config.token)
      delete config.token

    return config
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

      this.send(new Message(1, {}), true)
    } else {
      this.heartbeatAttempts += 1

      if (this.heartbeatAttempts > this.heartbeatMaxAttempts) 
        return this.disconnect()

      this.send(new Message(1, { tries: this.heartbeatAttempts, max: this.heartbeatMaxAttempts }), true)
    }

    this.heartbeatCount += 1
  }

  private registerMessage(data: WebSocket.Data) {
    const json: IMessage = JSON.parse(data.toString())

    const { op, d, t } = json
    const message = new Message(op, d, t)

    if (op === 0 && (this.server.clientConfig.enforceEqualVersions))
      switch (t) {
      case 'CLIENT_VERSION': {
        const { v } = d

        if (v !== getVersion() && this.server.clientConfig.enforceEqualVersions)
          return this.disconnect(1002)
      }
      }
    else if (op === 2 && this.authenticationCheck) {
      this.clientConfig = this.parseAuthenticationConfig(d)

      return this.authenticationCheck(d, (error, result) => this.registerAuthentication(error, result))
    } else if (op === 11)
      return this.heartbeatBuffer.push(message)

    this.emit('message', message)
    this.server.emit('message', message)
    this.server.sendPortalableMessage(message, this)
    this.server.handleMiddlewareEvent('onMessageReceived', message, this)

    if (this.server.serverOptions.storeMessages)
      this.messages.received.push(message)
  }

  private registerAuthentication(_error: any, result: IAuthenticationResult) {
    if (_error && this.server.authenticationConfig.disconnectOnFail)
      return this.disconnect(1008)

    const { id, user } = result

    let error: Error

    if (typeof id === 'undefined')
      error = new Error('No user id supplied in result callback')
    else if (typeof user === 'undefined')
      error = new Error('No user object supplied in result callback')

    if(error) {
      this.registerError(error)

      throw error
    }

    this.id = id
    this.user = user

    if (this.server.redis) {
      if (this.server.syncConfig.enabled)
        if (this.clientConfig.shouldSync)
          this.redeliverUndeliverableMessages()
        else
          this.clearUndeliveredMessages()

      if (this.server.authenticationConfig.storeConnectedUsers)
        this.server.redis.sadd(this.clientNamespace('connected_clients'), id)
    }

    if (!this.authenticated)
      this.send(new Message(22, this.server.authenticationConfig.sendUserObject ? user : {}), true)

    this.authenticated = true
    this.server.registerAuthentication(this)

    this.server.handleMiddlewareEvent('onAuthenticated', this)
  }

  private registerDisconnection(code: number, reason?: string) {
    if (this.heartbeatInterval)
      clearInterval(this.heartbeatInterval)

    if (this.id && this.server.authenticationConfig.storeConnectedUsers && this.server.redis)
      this.server.redis.srem(this.clientNamespace('connected_clients'), this.id)

    this.emit('disconnect', code, reason)
    this.server.emit('disconnection', code, reason)
    this.server.handleMiddlewareEvent('onDisconnection', this, code, reason)

    this.server.registerDisconnection(this)
  }

  private registerError(error: Error) {
    this.emit('error', error)

    this.server.handleMiddlewareEvent('onError', error, this)
  }

  private async redeliverUndeliverableMessages() {
    const namespace = this.clientNamespace('undelivered_messages')
    const _undeliveredMessages = await this.server.redis.hget(namespace, this.id)
    const messageRedeliveryInterval = this.server.syncConfig.redeliveryInterval

    let undeliveredMessages: IMessage[] = []

    if (_undeliveredMessages)
      try {
        undeliveredMessages = JSON.parse(_undeliveredMessages)
      } catch (error) {
        return this.registerError(error)
      }

    const messages = undeliveredMessages.map(message =>
      new Message(message.op, message.d, message.t)
    ).map((message, sequence) => {
      message.sequence = sequence + 1

      return message
    })

    let messageIndex = 0

    const interval = setInterval(() => {
      const message = messages[messageIndex]
      if (!message)
        return clearInterval(interval)

      this.send(message, true)

      messageIndex += 1
    }, messageRedeliveryInterval || 0)

    this.server.handleMiddlewareEvent('onRedeliverUndeliverableMessages', messages, this)

    this.clearUndeliveredMessages()
  }

  private async clearUndeliveredMessages() {
    const namespace = this.clientNamespace('undelivered_messages')

    this.server.redis.hdel(namespace, this.id)
  }

  private clientNamespace(prefix: string) {
    return this.server.namespace ? `${prefix}_${this.server.namespace}` : prefix
  }
}

export default Client
