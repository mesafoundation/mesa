/// <reference types="node" />
import http from 'http';
import https from 'http';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import Message from './message';
import Client from './client';
declare type RedisConfig = string | Redis.RedisOptions;
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
    sendUserObject?: boolean;
    disconnectOnFail?: boolean;
    storeConnectedUsers?: boolean;
}
interface ServerConfig {
    port?: number;
    namespace?: string;
    redis?: RedisConfig;
    server?: http.Server | https.Server;
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
    namespace: string;
    redis: Redis.Redis;
    publisher: Redis.Redis;
    subscriber: Redis.Redis;
    heartbeatConfig: HeartbeatConfig;
    reconnectConfig: ReconnectConfig;
    authenticationConfig: AuthenticationConfig;
    constructor(config?: ServerConfig);
    send(message: Message): void;
    private setup;
    private parseConfig;
    private setupRedis;
    pubSubNamespace(): string;
    private registerClient;
    private handleInternalMessage;
    private fetchClientConfig;
}
export default Server;
