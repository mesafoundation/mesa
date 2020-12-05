import Redis from 'ioredis'

import { RedisOptions } from '../server'

export const createRedisClient = (config: RedisOptions) => {
  let client: Redis.Redis

  if (Array.isArray(config))
    client = new Redis(...config as any[]) // No sane person would do this
  else if (typeof config === 'string')
    client = new Redis(config)
  else
    client = new Redis(config)

  return client
}
