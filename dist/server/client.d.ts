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
declare type AuthenticationDoneCallback = (error: Error, user?: AuthenticationResult) => void;
declare type AuthenticationCallback = (data: any, done: AuthenticationDoneCallback) => void;
declare interface Client extends EventEmitter {
    on(event: 'message', listener: (this: Server, message: Message) => void): this;
    on(event: 'disconnect', listener: (this: Server, code: number, reason: string) => void): this;
}
declare class Client extends EventEmitter {
    id: string;
    user: any;
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
    setup(): void;
    send(message: Message, pubSub?: boolean): void;
    heartbeat(): void;
    authenticate(callback: AuthenticationCallback): void;
    registerMessage(data: WebSocket.Data): number | void;
    registerAuthentication(error: any, result: AuthenticationResult): void;
    registerDisconnection(code: number, reason?: string): void;
    disconnect(code?: number): void;
}
export default Client;
