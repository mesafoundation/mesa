import death from 'death'
import { EventEmitter } from 'events'
import Redis from 'ioredis'

import Message from '../server/message'

import { RedisConfig } from '../server'
import { IMessage } from '../server/message'

import { createRedisClient } from '../utils/helpers.util'
import generateUUID from '../utils/uuid.util'

import { IPortalConfig, IPortalInternalMessage, PortalInternalSocketType } from './defs'

// tslint:disable-next-line: interface-name
declare interface Portal extends EventEmitter {
	on(event: 'connection', listener: (this: Portal) => void): this
	on(event: 'authentication', listener: (this: Portal, clientId: string) => void): this
	on(event: 'disconnection', listener: (this: Portal, clientId?: string) => void): this

	on(event: 'message', listener: (this: Portal, message: Message, clientId?: string) => void): this
}

class Portal extends EventEmitter {
	public id: string

	private redis: Redis.Redis
	private publisher: Redis.Redis
	private subscriber: Redis.Redis

	private config: IPortalConfig

	constructor(redis: RedisConfig, config?: IPortalConfig) {
		super()

		this.redis = createRedisClient(redis)
		this.publisher = createRedisClient(redis)
		this.subscriber = createRedisClient(redis)

		this.config = this.parseConfig(config)

		this.setup()
	}

	private setup() {
		this.id = generateUUID()

		this.setupSubscriber()

		this.registerPortal() // Add the portal to the available_portals list
		this.setupCloseHandler() // Setup the portal to be removed from the available_portals list on heat death
	}

	private setupSubscriber() {
		this.subscriber.on('message', async (_, data) => {
			let json: IPortalInternalMessage

			try {
				json = JSON.parse(data)
			} catch (error) {
				return this.emit('error', error)
			}

			const { portalId } = json
			if (portalId !== this.id && !this.config.reportAllEvents)
				return

			const { type, clientId, message } = json

			switch (type) {
				case 'connection':
					return this.handleSocketUpdate(type)
				case 'authentication':
					return this.handleSocketUpdate(type, clientId)
				case 'message':
					return this.handleMessage(message, clientId)
				case 'disconnection':
					return this.handleSocketUpdate(type, clientId)
			}
		}).subscribe(this.portalPubSubNamespace())
	}

	private handleSocketUpdate(type: PortalInternalSocketType, clientId?: string) {
		this.emit(type, clientId)
	}

	private handleMessage(_message: IMessage, clientId?: string) {
		const message = new Message(_message.op, _message.d, _message.t, _message.o)
		message.sequence = _message.s

		this.emit('message', message, clientId)
	}

	private registerPortal() {
		this.log('publishing portal id', this.id)

		this.publishReadyState(true)
		this.redis.sadd(this.availablePortalsNamespace(), this.id)

		this.log('published! ready to recieve updates on namespace', this.config.namespace)
	}

	private setupCloseHandler() {
		death((signal, err) => {
			this.log('shutting down...')

			this.publishReadyState(false)
			this.redis.srem(this.availablePortalsNamespace(), this.id)

			process.exit(0)
		})
	}

	private publishReadyState(readyState: boolean) {
		this.publisher.publish(this.availablePortalsNamespace(), JSON.stringify({
			id: this.id,
			ready: readyState
		}))
	}

	private clientNamespace(prefix: string) {
		return this.config.namespace ? `${prefix}_${this.config.namespace}` : prefix
	}

	private portalPubSubNamespace() {
		return this.clientNamespace(`portal`)
	}

	private availablePortalsNamespace() {
		return this.clientNamespace('available_portals_pool')
	}

	private log(...messages: string[]) {
		if (!this.config.verbose)
			return

		console.log('[@cryb/mesa/portal]', ...messages)
	}

	private parseConfig = (config?: IPortalConfig) => {
		if (!config)
			config = {}

		if (typeof config.reportAllEvents === 'undefined')
			config.reportAllEvents = false

		if (typeof config.verbose === 'undefined')
			config.verbose = false

		return config
	}
}

export default Portal
