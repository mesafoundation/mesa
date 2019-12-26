/// <reference types="node" />
import WebSocket from 'ws';
import Redis from 'ioredis';
import EventEmitter from 'events';
import { Server as HTTPServer } from 'http';
import Client, { ClientConnectionConfig } from './client';
import Message from './message';
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
interface ServerConfig {
    port?: number;
    redis?: string | Redis.RedisOptions;
    server?: HTTPServer;
    heartbeat?: HeartbeatConfig;
    reconnect?: ReconnectConfig;
    authentication?: AuthenticationConfig;
}
export default class Server extends EventEmitter {
    wss: WebSocket.Server;
    clients: Client[];
    heartbeatConfig: HeartbeatConfig;
    reconnectConfig: ReconnectConfig;
    authenticationConfig: AuthenticationConfig;
    constructor(config?: ServerConfig);
    send(message: Message): void;
    setup(config: ServerConfig): void;
    registerClient(socket: WebSocket): void;
    fetchClientConfig(): ClientConnectionConfig;
}
export {};
