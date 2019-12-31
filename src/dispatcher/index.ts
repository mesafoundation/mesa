import Redis from 'ioredis'

import DispatchEvent from './event'

import { Message } from '..'
import { RedisConfig } from '../server'

import { IInternalMessage } from '../server/message'
import { createRedisClient } from '../utils/helpers.util'

type Dispatchable = Message | DispatchEvent

interface IDispatcherConfig {
	namespace?: string
}

class Dispatcher {
	private publisher: Redis.Redis
	private config: IDispatcherConfig

	constructor(redis: RedisConfig, config?: IDispatcherConfig) {
		this.publisher = createRedisClient(redis)
		this.config = this.parseConfig(config)
	}

	public dispatch = (event: Dispatchable, recipients?: string[]) => {
		switch (event.constructor.name) {
			case Message.name:
				this.dispatchMessage(event as Message, recipients || [])
				break
			case DispatchEvent.name:
				this.dispatchEvent(event as DispatchEvent)
				break
			default:
				throw new Error('No dispatch handler found')
		}
	}

	private fetchNamespace() {
		return this.config.namespace ? `ws-${this.config.namespace}` : 'ws'
	}

	private dispatchMessage(message: Message, recipients: string[]) {
		this.publisher.publish(
			this.fetchNamespace(),
			JSON.stringify({
				message: message.serialize(true),
				recipients
			} as IInternalMessage)
		)
	}

	private dispatchEvent(event: Dispatchable) {
		console.warn('Dispatching events currently not supported')
	}

	private parseConfig = (config?: IDispatcherConfig) => {
		if (!config)
			config = {}

		return config
	}
}

export default Dispatcher
