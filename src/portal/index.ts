import death from 'death'
import Redis from 'ioredis'
import { EventEmitter } from 'events'

import PortalMessage from './message'

import { RedisConfig } from '../server'
import { IMessage } from '../server/message'

import generateUUID from '../utils/uuid.util'
import { createRedisClient } from '../utils/helpers.util'

import { IPortalConfig, IPortalInternalMessage, IPortalInternalSocketUpdate } from './defs'

declare interface Portal extends EventEmitter {
	on(event: 'connection', listener: (this: Portal, clientId?: string) => void): this
	on(event: 'disconnection', listener: (this: Portal, clientId?: string) => void): this

	on(event: 'message', listener: (this: Portal, message: PortalMessage) => void): this
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
		this.subscriber.on('message', async (channel, data) => {
			let json: IPortalInternalMessage

			try {
				json = JSON.parse(data)
			} catch(error) {
				return this.emit('error', error)
			}

			const { update, message, type } = json

			switch(type) {
				case 'connection':
					return this.handleSocketUpdate(update)
				case 'message':
					return this.handleMessage(message)
				case 'disconnection':
					return this.handleSocketUpdate(update)
			}
		}).subscribe(this.portalPubSubNamespace())
	}

	private handleSocketUpdate(update: IPortalInternalSocketUpdate) {
		const { id, type } = update

		this.emit(type, id)
	}

	private handleMessage(_message: IMessage) {
		const message = new PortalMessage(_message.op, _message.d, _message.t, { sequence: _message.s })

		this.emit('message', message)
	}

	private registerPortal() {
		this.publishReadyState(true)
		this.redis.sadd(this.availablePortalsNamespace(), this.id)
	}

	private setupCloseHandler() {
		death((signal, err) => {
			console.log("[cryb/mesa/portal] shutting down...")

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
		return this.clientNamespace(`portal_${this.id}`)
	}

	private availablePortalsNamespace() {
		return this.clientNamespace('available_portals')
	}

	private parseConfig = (config?: IPortalConfig) => {
		if (!config)
			config = {}

		return config
	}
}

export default Portal
