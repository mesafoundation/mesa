import Redis from 'ioredis';
import { RedisConfig } from '../server';
export declare const createRedisClient: (config: RedisConfig) => Redis.Redis;
