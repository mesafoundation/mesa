/// <reference types="node" />
import http from 'http';
import https from 'https';
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import WebSocket from 'ws';
import Client from './client';
import Message from './message';
export declare type RedisConfig = string | Redis.RedisOptions;
export interface IClientConfig {
    enforceEqualVersions?: boolean;
}
export interface IServerOptions {
    storeMessages?: boolean;
}
export interface ISyncConfig {
    enabled: boolean;
    redeliveryInterval?: 0 | number;
}
export interface IPortalConfig {
    enabled: boolean;
    distributeLoad?: boolean;
}
export interface IHeartbeatConfig {
    enabled: boolean;
    interval?: 10000 | number;
    maxAttempts?: 3 | number;
}
export interface IReconnectConfig {
    enabled: boolean;
    interval?: 5000 | number;
}
export interface IAuthenticationConfig {
    timeout?: 10000 | number;
    required?: boolean;
    sendUserObject?: boolean;
    disconnectOnFail?: boolean;
    storeConnectedUsers?: boolean;
}
interface IServerConfig {
    port?: number;
    namespace?: string;
    redis?: RedisConfig;
    server?: http.Server | https.Server;
    client?: IClientConfig;
    options?: IServerOptions;
    sync?: ISyncConfig;
    portal?: IPortalConfig;
    heartbeat?: IHeartbeatConfig;
    reconnect?: IReconnectConfig;
    authentication?: IAuthenticationConfig;
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
    clientConfig: IClientConfig;
    serverOptions: IServerOptions;
    syncConfig: ISyncConfig;
    portalConfig: IPortalConfig;
    heartbeatConfig: IHeartbeatConfig;
    reconnectConfig: IReconnectConfig;
    authenticationConfig: IAuthenticationConfig;
    private portals;
    private portalIndex;
    constructor(config?: IServerConfig);
    send(message: Message, _recipients?: string[], excluding?: string[]): Promise<number | void>;
    registerAuthentication(client: Client): void;
    registerDisconnection(disconnectingClient: Client): void;
    close(): void;
    sendPortalableMessage(_message: Message, client: Client): void;
    pubSubNamespace(): string;
    private setup;
    private parseConfig;
    private _send;
    private setupRedis;
    private sendInternalPortalMessage;
    private loadInitialState;
    private handlePortalUpdate;
    private registerConnection;
    private handleInternalMessage;
    private handleUndeliverableMessage;
    private fetchClientConfig;
    private getNamespace;
    private portalPubSubNamespace;
    private availablePortalsNamespace;
}
export default Server;
