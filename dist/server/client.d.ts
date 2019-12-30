/// <reference types="node" />
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import Server from '.';
import Message, { Messages } from './message';
export interface ClientConnectionConfig {
    c_heartbeat_interval?: number;
    c_reconnect_interval?: number;
    c_authentication_timeout?: number;
}
interface AuthenticationResult {
    id: string;
    user: any;
}
declare type AuthenticationCallback = (data: any, done: AuthenticationDoneCallback) => void;
declare type AuthenticationDoneCallback = (error: Error, user?: AuthenticationResult) => void;
declare interface Client extends EventEmitter {
    on(event: 'message', listener: (this: Server, message: Message) => void): this;
    on(event: 'disconnect', listener: (this: Server, code: number, reason: string) => void): this;
}
declare class Client extends EventEmitter {
    id: string;
    user: any;
    authenticated: boolean;
    socket: WebSocket;
    messages: Messages;
    server: Server;
    private heartbeatInterval;
    private heartbeatCount;
    private heartbeatMaxAttempts;
    private heartbeatAttempts;
    private heartbeatBuffer;
    authenticationCheck: AuthenticationCallback;
    constructor(socket: WebSocket, server: Server);
    private setup;
    send(message: Message, pubSub?: boolean): void;
    private heartbeat;
    authenticate(callback: AuthenticationCallback): void;
    updateUser(update: AuthenticationResult): void;
    private registerMessage;
    private registerAuthentication;
    private registerDisconnection;
    private clientNamespace;
    disconnect(code?: number): void;
}
export default Client;
