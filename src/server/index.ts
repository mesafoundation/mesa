import http from 'http'
import https from 'https'
import death from 'death'

import { EventEmitter } from 'events'
import Redis from 'ioredis'
import WebSocket, { ServerOptions as WSOptions } from 'ws'

import Client, { IClientConnectionConfig, Rule } from './client'
import Message, { IInternalMessage, IMessage } from './message'
import Middleware, { MiddlewareEvent, MiddlewareHandler, MiddlewareNondescriptHandler } from '../middleware/defs'

import { IPortalInternalMessage, IPortalUpdate } from '../portal/defs'

import { parseConfig, parseRules } from '../utils'
import { createRedisClient } from '../utils/helpers.util'
import { handleUndeliveredMessage } from '../utils/sync.until'

export type RedisConfig = string | Redis.RedisOptions

export interface IClientConfig {
  enforceEqualVersions?: boolean
}

export interface IServerOptions {
  storeMessages?: boolean
}

export interface ISyncConfig {
  enabled: boolean
  redeliveryInterval?: 0 | number
}

export interface IPortalConfig {
  enabled: boolean
  distributeLoad?: boolean
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

  required?: boolean
  sendUserObject?: boolean
  disconnectOnFail?: boolean
  storeConnectedUsers?: boolean
}

interface IServerConfig {
  port?: number
  path?: string

  namespace?: string

  redis?: RedisConfig
  server?: http.Server | https.Server

  client?: IClientConfig
  options?: IServerOptions

  sync?: ISyncConfig
  portal?: IPortalConfig
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

  public port: number
  public path: string
  
  public namespace: string

  public redis: Redis.Redis
  public publisher: Redis.Redis
  public subscriber: Redis.Redis

  public clientConfig: IClientConfig
  public serverOptions: IServerOptions

  public syncConfig: ISyncConfig
  public portalConfig: IPortalConfig
  public heartbeatConfig: IHeartbeatConfig
  public reconnectConfig: IReconnectConfig
  public authenticationConfig: IAuthenticationConfig

  private portals: string[] = []
  private portalIndex = 0

  private middlewareHandlers: MiddlewareHandler[] = []

  constructor(config?: IServerConfig) {
    super()

    config = this.parseConfig(config)

    this.setup(config)
  }

  public async send(message: Message, _recipients?: string[], excluding?: string[]) {
    // Remove excluded recipients from the _recipients array
    if (_recipients && excluding)
      _recipients = _recipients.filter(recipient => excluding.indexOf(recipient) === -1)

    // Global message
    if(!_recipients) {
      if(this.redis)
        this._sendPubSub(message, ['*'])
      else
        this._send(message, this.clients)
    }

    if (this.redis) {
      function isIdOnReplica(id) {
        return _recipients.indexOf(id) > -1
      }

      const idsOnReplica = this.authenticatedClientIds.filter(isIdOnReplica)
      let idsOnCluster = this.authenticatedClientIds.filter(id => !isIdOnReplica(id))

      // If sync is enabled
      if(this.syncConfig.enabled) {
        // Get the namespace of the connected clients
        const namespace = this.getNamespace('connected_clients')
        
        // Create empty recipients lists
        const onlineRecipients = []
        const offlineRecipients = []

        // For each recipients get if the client is online or not
        const pipeline = this.redis.pipeline()
        for (let i = 0; i < _recipients.length; i++)
          pipeline.sismember(namespace, _recipients[i])

        // Execute the pipeline and add the client id to the online or offline recipients list
        const rawMembers = await pipeline.exec()
        for(let i = 0; i < rawMembers.length; i++) {
          const [err, online] = rawMembers[i]
          if(err)
            continue

          if(online)
            onlineRecipients.push(_recipients[i])
          else
            offlineRecipients.push(_recipients[i])
        }

        // If there are some offline recipients then handle the undeliverable messages
        if (offlineRecipients.length > 0)
          offlineRecipients.forEach(recipient => this.handleUndeliverableMessage(message, recipient))

        // Remove any offline recipients from the idsOnCluster list
        // Note that we don't do this for the idsOnReplica list as those ids are checked from the online membrs on this replica
        idsOnCluster = idsOnCluster.filter(id => offlineRecipients.indexOf(id) === -1)
      }

      const clientsOnReplica = this.authenticatedClients(idsOnReplica)

      if(clientsOnReplica.length > 0)
        this._send(message, clientsOnReplica)

      if(idsOnCluster.length > 0)
        this._sendPubSub(message, idsOnCluster)
    } else {
      const recipients = this.clients.filter(({ id }) => _recipients.indexOf(id) > -1)

      this._send(message, recipients)
    }
  }

  private _send(message: Message, recipients: Client[]) {
    // Authentication.required rule
    if (this.authenticationConfig.required)
      recipients = recipients.filter(({ authenticated }) => !!authenticated)

    // Don't send if no recipients
    if (recipients.length === 0)
      return

    recipients.forEach(recipient => recipient.send(message, true))

    this.handleMiddlewareEvent('onMessageSent', message, recipients, true)
  }

  private _sendPubSub(message: Message, recipientIds?: string[]) {
    const internalMessage: IInternalMessage = {
      message: message.serialize(true, { sentByServer: true, sentInternally: true }) as IMessage,
      recipients: recipientIds || ['*']
    }

    this.publisher.publish(this.pubSubNamespace, JSON.stringify(internalMessage))
  } 

  private authenticatedClients(ids: string[]) {
    return this.clients.filter(client => client.authenticated).filter(client => ids.indexOf(client.id) > -1)
  }

  private get authenticatedClientIds() {
    return this.clients.filter(client => client.authenticated).map(client => client.id)
  }

  public use(middleware: Middleware) {
    const configured = middleware(this)

    this.middlewareHandlers.push(configured)
  }

  public async handleMiddlewareEvent(type: MiddlewareEvent, ...args: any[]) {
    if(!this.hasMiddleware)
      return

    for(let i = 0; i < this.middlewareHandlers.length; i++) {
      const handler = this.middlewareHandlers[i]
      const eventHandler = handler[type] as MiddlewareNondescriptHandler
      if(!eventHandler)
        continue

      try {
        await eventHandler(...args)
      } catch(error) {}
    }
  }

  public registerAuthentication(client: Client) {
    this.sendInternalPortalMessage({
      type: 'authentication',
      clientId: client.id
    })
  }

  public get hasMiddleware() {
    return this.middlewareHandlers.length > 0
  }

  public registerDisconnection(disconnectingClient: Client) {
    const clientIndex = this.clients.findIndex(client => client.serverId === disconnectingClient.serverId)
    this.clients.splice(clientIndex, 1)

    this.sendInternalPortalMessage({
      type: 'disconnection',
      clientId: disconnectingClient.id
    })

    if(this.redis)
      this.redis.decr(this.connectedClientsCountNamespace)
  }

  public close() {
    this.wss.close()
  }

  public sendPortalableMessage(_message: Message, client: Client) {
    const message: IPortalInternalMessage = {
      type: 'message',
      message: _message.serialize(true, { sentByServer: true }) as IMessage
    }

    if (client.id)
      message.clientId = client.id

    this.sendInternalPortalMessage(message)
  }

  public get pubSubNamespace() {
    return this.getNamespace('ws')
  }

  private setupCloseHandler() {
    death(async signal => {
      if(this.redis && this.clients.length > 0) {
        await this.redis.decrby(this.connectedClientsCountNamespace, this.clients.length)

        if(this.authenticationConfig.storeConnectedUsers) {
          const idsOnReplica = this.authenticatedClientIds

          await this.redis.srem(this.connectedClientsNamespace, ...idsOnReplica)
        }
      }

      process.exit(signal)
    })
  }

  private setup(config: IServerConfig) {
    if (this.wss)
      this.wss.close()

    const options: WSOptions = {}

    if (config.server)
      options.server = config.server
    else
      options.port = config.port

    if (config.path)
      options.path = config.path

    this.wss = new WebSocket.Server(options)
    this.wss.on('connection', (socket, req) => this.registerConnection(socket, req))

    this.setupCloseHandler()
  }

  private parseConfig(_config?: IServerConfig) {
    const config = Object.assign({}, _config)

    if (!config.port)
      config.port = 4000

    this.port = config.port

    if (config.path)
      this.path = config.path

    if (config.namespace)
      this.namespace = config.namespace

    if (config.redis)
      this.setupRedis(config.redis)

    this.clientConfig = parseConfig(config.client, ['enforceEqualVersions'], [false])
    this.serverOptions = parseConfig(config.options, ['storeMessages'], [false])

    this.syncConfig = config.sync || { enabled: false }
    this.heartbeatConfig = config.heartbeat || { enabled: false }
    this.reconnectConfig = config.reconnect || { enabled: false }

    this.portalConfig = parseConfig(config.portal, ['enabled', 'distributeLoad'], [false, true])
    this.authenticationConfig = parseConfig(config.authentication, ['timeout', 'required', 'sendUserObject', 'disconnectOnFail', 'storeConnectedUsers'], [10000, false, true, true, true])

    if (this.syncConfig && this.syncConfig.enabled && !this.authenticationConfig.storeConnectedUsers)
      console.warn('Mesa requires config.authentication.storeConnectedUsers to be true for message sync to be enabled')

    return config
  }

  // Setup
  private setupRedis(redisConfig: RedisConfig) {
    const redis: Redis.Redis = createRedisClient(redisConfig)
    const publisher: Redis.Redis = createRedisClient(redisConfig)
    const subscriber: Redis.Redis = createRedisClient(redisConfig)

    this.redis = redis
    this.publisher = publisher
    this.subscriber = subscriber

    this.loadInitialState()

    const pubSubNamespace = this.pubSubNamespace
    const availablePortalsNamespace = this.availablePortalsNamespace

    subscriber.on('message', async (channel, data) => {
      let json

      try {
        json = JSON.parse(data)
      } catch (error) {
        return this.emit('error', error)
      }

      switch (channel) {
      case pubSubNamespace:
        return this.handleInternalMessage(json)
      case availablePortalsNamespace:
        return this.handlePortalUpdate(json)
      }
    }).subscribe(pubSubNamespace, availablePortalsNamespace)
  }

  // Portal
  private sendInternalPortalMessage(internalMessage: IPortalInternalMessage) {
    if (!this.portalConfig.enabled)
      return
    else if (!this.redis)
      return console.log('[@cryb/mesa] Redis needs to be enabled for Portals to work. Enable Redis in your Mesa server config')
    else if (this.portals.length === 0)
      return

    let chosenPortal: string

    if (this.portals.length === 1)
      chosenPortal = this.portals[0]
    else if (this.portalConfig.distributeLoad) {
      this.portalIndex += 1

      if (this.portalIndex >= this.portals.length)
        this.portalIndex = 0

      chosenPortal = this.portals[this.portalIndex]
    } else
      chosenPortal = this.portals[Math.floor(Math.random() * this.portals.length)]

    this.publisher.publish(this.portalPubSubNamespace, JSON.stringify({
      ...internalMessage,
      portalId: chosenPortal
    }))
  }

  // State Management
  private async loadInitialState() {
    this.portals = await this.redis.smembers(this.availablePortalsNamespace)
  }

  private handlePortalUpdate(update: IPortalUpdate) {
    const { id, ready } = update

    if (ready)
      this.portals.push(id)
    else {
      const portalIndex = this.portals.indexOf(id)

      this.portals.splice(portalIndex, 1)
    }
  }

  // State Updates
  private registerConnection(socket: WebSocket, req: http.IncomingMessage) {
    const client = new Client(socket, this, { req })
    client.send(new Message(10, this.fetchClientConfig()), true)

    this.clients.push(client)
    this.emit('connection', client)

    this.sendInternalPortalMessage({
      type: 'connection'
    })

    this.handleMiddlewareEvent('onConnection', this)

    if(this.redis)
      this.redis.incr(this.connectedClientsCountNamespace)
  }

  private handleInternalMessage(internalMessage: IInternalMessage) {
    const { message: _message, recipients: _recipients } = internalMessage
    const message = new Message(_message.op, _message.d, _message.t)

    let recipients: Client[]

    if (_recipients.indexOf('*') > -1)
      recipients = this.clients
    else
      recipients = this.clients.filter(client => _recipients.indexOf(client.id) > -1)

    if(recipients.length === 0)
      return

    recipients.forEach(client => client.send(message, true))

    this.handleMiddlewareEvent('onMessageSent', message, recipients, false)
  }

  private async handleUndeliverableMessage(message: Message, recipient: string) {
    handleUndeliveredMessage(message, recipient, this.redis, this.getNamespace('undelivered_messages'))
  }

  private fetchClientConfig() {
    const config: IClientConnectionConfig = {}
    const { serverOptions, clientConfig, authenticationConfig } = this
    const rules: Rule[] = parseRules({ serverOptions, clientConfig, authenticationConfig })

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

  private getNamespace(prefix: string) {
    return this.namespace ? `${prefix}_${this.namespace}` : prefix
  }

  public getMiddlewareNamespace(prefix: string, name: string) {
    const key = `${prefix}_mw-${name}`

    return this.namespace ? `${key}_${this.namespace}` : key
  }

  public mapMiddlewareNamespace(prefixes: string[], name: string) {
    return prefixes.map(prefix => this.getMiddlewareNamespace(prefix, name))
  }

  private get portalPubSubNamespace() {
    return this.getNamespace('portal')
  }

  private get availablePortalsNamespace() {
    return this.getNamespace('available_portals_pool')
  }

  private get connectedClientsNamespace() {
    return this.getNamespace('connected_clients')
  }

  private get connectedClientsCountNamespace() {
    return this.getNamespace('connected_clients_count')
  }
}

export default Server
