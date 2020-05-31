/// <reference types="node" />
import { EventEmitter } from 'events';
import Message, { IMessages } from '../server/message';
interface IClientConfig {
    autoConnect?: boolean;
}
interface IClientAuthenticationConfig {
    shouldSync?: boolean;
}
export interface IClientConnectionOptions {
    isInitialConnection: boolean;
    isInitialSessionConnection: boolean;
    isAutomaticReconnection: boolean;
}
export interface IClientDisconnectionOptions {
    willAttemptReconnect: boolean;
}
declare interface Client extends EventEmitter {
    on(event: 'connected', listener: (this: Client, options: IClientConnectionOptions) => void): this;
    on(event: 'message', listener: (this: Client, message: Message) => void): this;
    on(event: 'disconnected', listener: (this: Client, code: number, reason: string, options: IClientDisconnectionOptions) => void): this;
    on(event: 'error', listener: (this: Client, error: Error) => void): this;
}
declare class Client extends EventEmitter {
    url: string;
    authenticated: boolean;
    messages: IMessages;
    private config;
    private ws;
    private queue;
    private rules;
    private heartbeatIntervalTime;
    private authenticationTimeout;
    private reconnectionInterval;
    private reconnectionIntervalTime;
    private authenticationResolve;
    private isInitialConnection;
    private isInitialSessionConnection;
    private isAutomaticReconnection;
    private didForcefullyDisconnect;
    constructor(url: string, config?: IClientConfig);
    connect: () => Promise<unknown>;
    send(message: Message): number;
    authenticate: (data: object, config?: IClientAuthenticationConfig) => Promise<unknown>;
    disconnect(code?: number, data?: string): void;
    private parseConfig;
    private parseAuthenticationConfig;
    private connectAndSupressWarnings;
    private registerOpen;
    private registerMessage;
    private registerClose;
    private registerError;
}
export default Client;
