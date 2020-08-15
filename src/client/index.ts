import { EventEmitter } from 'events'
import WebSocket from 'ws'

import { IClientConnectionConfig, Rule } from '../server/client'
import Message, { IMessage, IMessages } from '../server/message'
import { getVersion } from '../utils/getters.util'

interface IClientConfig {
  autoConnect?: boolean
}

interface IClientAuthenticationConfig {
  shouldSync?: boolean
}

export interface IClientConnectionOptions {
  isInitialConnection: boolean
  isInitialSessionConnection: boolean

  isAutomaticReconnection: boolean
}

export interface IClientDisconnectionOptions {
  willAttemptReconnect: boolean
}

// tslint:disable-next-line: interface-name
declare interface Client extends EventEmitter {
  on(event: 'connected', listener: (this: Client, options: IClientConnectionOptions) => void): this
  on(event: 'message', listener: (this: Client, message: Message) => void): this
  on(event: 'disconnected', listener: (
    this: Client,
    code: number,
    reason: string,
    options: IClientDisconnectionOptions
  ) => void): this

  on(event: 'error', listener: (this: Client, error: Error) => void): this
}

class Client extends EventEmitter {
  public url: string

  public authenticated = false

  public messages: IMessages
  private config: IClientConfig

  private ws: WebSocket
  private queue: Message[] = []

  private rules: Rule[] = []

  private heartbeatIntervalTime: number
  private authenticationTimeout: number

  private reconnectionInterval: NodeJS.Timeout
  private reconnectionIntervalTime: number

  private authenticationResolve: (value?: unknown) => void

  // Connection Options
  private isInitialConnection = true
  // First connection (not counting force disconnections)
  private isInitialSessionConnection = true
  // First session connection connection (counting force disconnections)

  private isAutomaticReconnection = false

  // Disconnection Options
  private didForcefullyDisconnect = false

  constructor(url: string, config?: IClientConfig) {
    super()

    config = this.parseConfig(config)

    this.url = url
    this.config = config

    if (config.autoConnect)
      this.connect()
  }

  public connect = () => new Promise((resolve, reject) => {
    if (this.reconnectionInterval)
      clearInterval(this.reconnectionInterval)

    if (this.ws && this.ws.readyState === this.ws.OPEN)
      throw new Error('This client is already connected to a pre-existing Mesa server. Call disconnect() to disconnect before attempting to reconnect again')

    this.ws = new WebSocket(this.url)

    this.didForcefullyDisconnect = false

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

  public send(message: Message) {
    if (this.ws.readyState !== this.ws.OPEN)
      return this.queue.push(message)

    if (this.rules.indexOf('store_messages') > -1)
      this.messages.sent.push(message)

    this.ws.send(message.serialize())
  }

  // eslint-disable-next-line no-async-promise-executor
  public authenticate = <T>(data: T, config?: IClientAuthenticationConfig) => new Promise(async (resolve, reject) => {
    try {
      config = this.parseAuthenticationConfig(config)

      this.authenticationResolve = resolve
      this.send(new Message(2, { ...data, ...config }))
    } catch(error) {
      reject(error)
    }
  })

  public disconnect(code?: number, data?: string) {
    this.ws.close(code, data)

    this.didForcefullyDisconnect = true

    if (this.reconnectionInterval)
      clearInterval(this.reconnectionInterval)
  }

  private parseConfig(_config?: IClientConfig) {
    const config = Object.assign({}, _config)

    if (typeof config.autoConnect === 'undefined')
      config.autoConnect = true

    return config
  }

  private parseAuthenticationConfig(_config?: IClientAuthenticationConfig) {
    const config = Object.assign({}, _config)

    if (typeof config.shouldSync === 'undefined')
      config.shouldSync = true

    return config
  }

  private connectAndSupressWarnings() {
    this.connect()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .then(() => { })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => { })
  }

  private registerOpen() {
    this.emit('connected', {
      isInitialConnection: this.isInitialConnection,
      isInitialSessionConnection: this.isInitialSessionConnection,

      isAutomaticReconnection: this.isAutomaticReconnection
    })

    if (this.isInitialConnection)
      this.isInitialConnection = false

    if (this.isInitialSessionConnection)
      this.isInitialSessionConnection = false

    if (this.isAutomaticReconnection)
      this.isAutomaticReconnection = false

    if (this.queue.length > 0) {
      this.queue.forEach(this.send)
      this.queue = []
    }
  }

  private registerMessage(data: WebSocket.Data) {
    let json: IMessage

    try {
      json = JSON.parse(data.toString())
    } catch (error) {
      return console.error(error)
    }

    const { op, d, t, s } = json
    const message = new Message(op, d, t)

    if (s)
      message.sequence = s

    switch (message.opcode) {
    case 1:
      return this.send(new Message(11, {}))
    case 10: {
      const {
        c_heartbeat_interval,
        c_reconnect_interval,
        c_authentication_timeout,
        rules
      } = message.data as IClientConnectionConfig

      if (c_heartbeat_interval)
        this.heartbeatIntervalTime = c_heartbeat_interval

      if (c_reconnect_interval)
        this.reconnectionIntervalTime = c_reconnect_interval

      if (c_authentication_timeout)
        this.authenticationTimeout = c_authentication_timeout

      if (rules.indexOf('enforce_equal_versions') > -1)
        this.send(
          new Message(0, { v: getVersion() }, 'CLIENT_VERSION')
        )

      if (rules.indexOf('store_messages') > -1)
        this.messages = { sent: [], recieved: [] }

      this.rules = rules

      return
    }
    case 22: {
      this.authenticated = true

      if (this.authenticationResolve)
        this.authenticationResolve(d)

      return
    }
    }

    this.emit('message', message)

    if (this.rules.indexOf('store_messages') > -1)
      this.messages.recieved.push(message)
  }

  private registerClose(code?: number, reason?: string) {
    this.emit(
      'disconnected',
      code,
      reason,
      { willAttemptReconnect: (!!this.reconnectionIntervalTime && !this.didForcefullyDisconnect) }
    )

    if (this.didForcefullyDisconnect)
      this.isInitialSessionConnection = true

    if (this.reconnectionIntervalTime) {
      if (this.reconnectionInterval)
        clearInterval(this.reconnectionInterval)

      this.ws = null
      this.isAutomaticReconnection = true
      this.reconnectionInterval = setInterval(() => this.connectAndSupressWarnings(), this.reconnectionIntervalTime)
    }
  }

  private registerError(error: Error) {
    this.emit('error', error)
  }
}

export default Client
