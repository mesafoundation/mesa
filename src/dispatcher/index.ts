import Redis from 'ioredis'

import DispatchEvent from './event'

import { Message } from '..'
import { RedisConfig } from '../server'

import { IInternalMessage, IMessage } from '../server/message'
import { createRedisClient } from '../utils/helpers.util'
import { handleUndeliveredMessage } from '../utils/sync.until'

type Dispatchable = Message | DispatchEvent

interface IDispatcherSyncConfig {
  enabled: boolean
}

interface IDispatcherConfig {
  namespace?: string

  sync?: IDispatcherSyncConfig
}

class Dispatcher {
  private redis: Redis.Redis
  private publisher: Redis.Redis

  private config: IDispatcherConfig

  constructor(redis: RedisConfig, config?: IDispatcherConfig) {
    this.redis = createRedisClient(redis)
    this.publisher = createRedisClient(redis)

    this.config = this.parseConfig(config)
  }

  public dispatch = (event: Dispatchable, recipients: string[] = ['*'], excluding?: string[]) => {
    if (recipients && excluding)
      recipients = recipients.filter(recipient => excluding.indexOf(recipient) === -1)

    switch (event.constructor.name) {
      case Message.name:
        this.dispatchMessage(event as Message, recipients)
        break
      case DispatchEvent.name:
        this.dispatchEvent(event as DispatchEvent, recipients)
        break
      default:
        throw new Error('No dispatch handler found')
    }
  }

  private async dispatchMessage(message: Message, _recipients: string[]) {
    const connectedClientsNamespace = this.clientNamespace('connected_clients'),
          undeliveredMessagesNamespace = this.clientNamespace('undelivered_messages')

    let recipients: string[] = []

    if (this.config.sync.enabled)
      for (let i = 0; i < _recipients.length; i++) {
        const recipient = _recipients[i]
        if (recipient === '*') {
          recipients.push(recipient)
          continue
        }

        const isRecipientOnline = await this.redis.sismember(connectedClientsNamespace, recipient)

        if (isRecipientOnline)
          recipients.push(recipient)
        else
          handleUndeliveredMessage(message, recipient, this.redis, undeliveredMessagesNamespace)
      }
    else
      recipients = _recipients

    this.publisher.publish(
      this.pubSubNamespace(),
      JSON.stringify({
        message: message.serialize(true),
        recipients
      } as IInternalMessage)
    )
  }

  private dispatchEvent(event: Dispatchable, recipients: string[]) {
    this.publisher.publish(
      this.pubSubNamespace(),
      JSON.stringify({
        message: event.serialize(true),
        recipients
      } as IInternalMessage)
    )
  }

  private clientNamespace(prefix: string) {
    return this.config.namespace ? `${prefix}_${this.config.namespace}` : prefix
  }

  private pubSubNamespace() {
    return this.clientNamespace('ws')
  }

  private parseConfig = (config?: IDispatcherConfig) => {
    if (!config)
      config = {}

    if (!config.sync)
      config.sync = { enabled: false }

    return config
  }
}

export default Dispatcher
