/// <reference types="node" />
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import Server from '.';
import Message, { IMessages } from './message';
export declare type Rule = 'enforce_equal_versions' | 'store_messages' | 'sends_user_object';
export interface IClientConnectionConfig {
    c_heartbeat_interval?: number;
    c_reconnect_interval?: number;
    c_authentication_timeout?: number;
    rules?: Rule[];
}
interface IAuthenticationResult {
    id: string;
    user: any;
}
declare type AuthenticationCallback = (data: any, done: AuthenticationDoneCallback) => void;
declare type AuthenticationDoneCallback = (error: Error, user?: IAuthenticationResult) => void;
declare interface Client extends EventEmitter {
    on(event: 'message', listener: (this: Server, message: Message) => void): this;
    on(event: 'disconnect', listener: (this: Server, code: number, reason: string) => void): this;
}
declare class Client extends EventEmitter {
    id: string;
    user: any;
    authenticated: boolean;
    socket: WebSocket;
    messages: IMessages;
    server: Server;
    authenticationCheck: AuthenticationCallback;
    private heartbeatInterval;
    private heartbeatCount;
    private heartbeatMaxAttempts;
    private heartbeatAttempts;
    private heartbeatBuffer;
    constructor(socket: WebSocket, server: Server);
    send(message: Message, pubSub?: boolean): void;
    authenticate(callback: AuthenticationCallback): void;
    updateUser(update: IAuthenticationResult): void;
    disconnect(code?: number): void;
    private setup;
    private heartbeat;
    private registerMessage;
    private registerAuthentication;
    private registerDisconnection;
    private clientNamespace;
}
export default Client;
