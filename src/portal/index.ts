import { EventEmitter } from 'events'

import generateUUID from '../utils/uuid.util.ts'
import { createRedisClient } from '../utils/helpers.util'

interface IPortalConfig {
	namespace?: string
}

interface IPortalInternalMessage {
	message: IMessage

	senderId?: string
	recipients: string[]
}

declare interface Server extends EventEmitter {
	on(event: 'message', listener: (this: Server, message: PortalMessage) => void): this
}

class Portal extends EventEmitter {
	public id: string

	private redis: Redis.Redis
	private subscriber: Redis.Redis

	private config: IDispatcherConfig

	constructor(redis: RedisConfig, config?: IPortalConfig) {
		this.redis = createRedisClient(redis)
		this.subscriber = createRedisClient(redis)

		this.config = this.parseConfig(config)

		this.setup()
	}

	private setup() {
		this.id = generateUUID()

		// Need a way to take the subscriber off the market when the Portal gets destroyed
		this.setupSubscriber()
	}

	private setupSubscriber() {
		this.subscriber.on('message', async (channel, data) => {
			let json: IPortalInternalMessage

			try {
				json = JSON.parse(data)
			} catch(error) {
				return this.emit('error', error)
			}

			const { message } = json

			console.log(message)
		}).subscribe(this.clientNamespace(`portal_${this.id}`))
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

		return config
	}
}

export default Portal
