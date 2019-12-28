/// <reference types="node" />
import WebSocket from 'ws';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { Server as HTTPServer } from 'http';
import Client, { ClientConnectionConfig } from './client';
import Message, { InternalMessage } from './message';
interface HeartbeatConfig {
    enabled: boolean;
    interval?: 10000 | number;
    maxAttempts?: 3 | number;
}
interface ReconnectConfig {
    enabled: boolean;
    interval?: 5000 | number;
}
interface AuthenticationConfig {
    timeout?: 10000 | number;
}
declare type RedisConfig = string | Redis.RedisOptions;
interface ServerConfig {
    port?: number;
    redis?: RedisConfig;
    server?: HTTPServer;
    heartbeat?: HeartbeatConfig;
    reconnect?: ReconnectConfig;
    authentication?: AuthenticationConfig;
}
declare interface Server extends EventEmitter {
    on(event: 'connection', listener: (this: Server, client: Client) => void): this;
    on(event: 'message', listener: (this: Server, message: Message) => void): this;
    on(event: 'disconnection', listener: (this: Server, code: number, reason: string) => void): this;
}
declare class Server extends EventEmitter {
    wss: WebSocket.Server;
    clients: Client[];
    redis: Redis.Redis;
    publisher: Redis.Redis;
    subscriber: Redis.Redis;
    heartbeatConfig: HeartbeatConfig;
    reconnectConfig: ReconnectConfig;
    authenticationConfig: AuthenticationConfig;
    constructor(config?: ServerConfig);
    send(message: Message): void;
    setup(config: ServerConfig): void;
    setupRedis(redisConfig: RedisConfig): void;
    registerClient(socket: WebSocket): void;
    handleInternalMessage(internalMessage: InternalMessage): void;
    fetchClientConfig(): ClientConnectionConfig;
}
export default Server;
