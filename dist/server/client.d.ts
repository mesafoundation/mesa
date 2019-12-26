/// <reference types="node" />
import WebSocket from 'ws';
import EventEmitter from 'events';
import Mesa from '.';
import Message, { Messages } from './message';
export interface ClientConnectionConfig {
    c_heartbeat_interval?: number;
    c_reconnect_interval?: number;
    c_authentication_timeout?: number;
}
export default class Client extends EventEmitter {
    socket: WebSocket;
    messages: Messages;
    server: Mesa;
    private heartbeatInterval;
    private heartbeatCount;
    private heartbeatMaxAttempts;
    private heartbeatAttempts;
    private heartbeatBuffer;
    authenticationCheck: Function;
    constructor(socket: WebSocket, server: Mesa);
    setup(): void;
    send(message: Message): void;
    heartbeat(): void;
    authenticate(callback: Function): void;
    registerMessage(data: WebSocket.Data): any;
    registerAuthentication(error: any, user: any): void;
    registerDisconnection(code: number, reason?: string): void;
    disconnect(code?: number): void;
}
