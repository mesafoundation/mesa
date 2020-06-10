import Redis from 'ioredis'

import { RedisConfig } from '../server'

export const createRedisClient = (config: RedisConfig) => {
  let client: Redis.Redis

  if (typeof config === 'string')
    client = new Redis(config)
  else
    client = new Redis(config)

  return client
}
