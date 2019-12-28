/// <reference types="node" />
import { EventEmitter } from 'events';
import Message, { Messages } from '../server/message';
interface ClientConfig {
    autoConnect?: boolean;
}
declare interface Client extends EventEmitter {
    on(event: 'connected', listener: (this: Client) => void): this;
    on(event: 'message', listener: (this: Client, message: Message) => void): this;
    on(event: 'disconnected', listener: (this: Client, code: number, reason: string) => void): this;
    on(event: 'error', listener: (this: Client, error: Error) => void): this;
}
declare class Client extends EventEmitter {
    url: string;
    private config;
    authenticated: boolean;
    messages: Messages;
    private ws;
    private queue;
    private reconnectionInterval;
    private reconnectionIntervalTime;
    private authenticationResolve;
    constructor(url: string, config?: ClientConfig);
    private parseConfig;
    connect: () => Promise<unknown>;
    private connectAndSupressWarnings;
    send(message: Message): number;
    authenticate: (data: Object) => Promise<unknown>;
    disconnect(code?: number, data?: string): void;
    private registerOpen;
    private registerMessage;
    private registerClose;
    private registerError;
}
export default Client;
