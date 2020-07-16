/// <reference types="node" />
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import http from 'http';
import Server from '.';
import Message, { IMessages } from './message';
export declare type Rule = 'enforce_equal_versions' | 'store_messages' | 'sends_user_object';
export interface IClientConnectionConfig {
    c_heartbeat_interval?: number;
    c_reconnect_interval?: number;
    c_authentication_timeout?: number;
    rules?: Rule[];
}
interface IClientAuthenticationConfig {
    token?: string;
    shouldSync?: boolean;
}
interface IAuthenticationResult {
    id: string;
    user: any;
}
interface IClientAdditional {
    req?: http.IncomingMessage;
}
declare type AuthenticationCallback = (data: any, done: AuthenticationDoneCallback) => void;
declare type AuthenticationDoneCallback = (error: Error | null, user?: IAuthenticationResult) => void;
declare interface Client extends EventEmitter {
    on(event: 'message', listener: (this: Server, message: Message) => void): this;
    on(event: 'disconnect', listener: (this: Server, code: number, reason: string) => void): this;
}
declare class Client extends EventEmitter {
    id: string;
    serverId: string;
    user: any;
    authenticated: boolean;
    clientConfig: IClientAuthenticationConfig;
    socket: WebSocket;
    server: Server;
    request?: http.IncomingMessage;
    messages: IMessages;
    authenticationCheck: AuthenticationCallback;
    private heartbeatInterval;
    private heartbeatCount;
    private heartbeatMaxAttempts;
    private heartbeatAttempts;
    private heartbeatBuffer;
    constructor(socket: WebSocket, server: Server, additional?: IClientAdditional);
    send(message: Message, sendDirectly?: boolean): void;
    authenticate(callback: AuthenticationCallback): void;
    updateUser(update: IAuthenticationResult): void;
    disconnect(code?: number): void;
    private parseAuthenticationConfig;
    private setup;
    private heartbeat;
    private registerMessage;
    private registerAuthentication;
    private registerDisconnection;
    private redeliverUndeliverableMessages;
    private clearUndeliveredMessages;
    private clientNamespace;
}
export default Client;
