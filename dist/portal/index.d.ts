/// <reference types="node" />
import { EventEmitter } from 'events';
import PortalMessage from './message';
import { RedisConfig } from '../server';
import { IPortalConfig } from './defs';
declare interface Portal extends EventEmitter {
    on(event: 'connection', listener: (this: Portal, clientId?: string) => void): this;
    on(event: 'disconnection', listener: (this: Portal, clientId?: string) => void): this;
    on(event: 'message', listener: (this: Portal, message: PortalMessage) => void): this;
}
declare class Portal extends EventEmitter {
    id: string;
    private redis;
    private publisher;
    private subscriber;
    private config;
    constructor(redis: RedisConfig, config?: IPortalConfig);
    private setup;
    private setupSubscriber;
    private handleSocketUpdate;
    private handleMessage;
    private registerPortal;
    private setupCloseHandler;
    private publishReadyState;
    private clientNamespace;
    private portalPubSubNamespace;
    private availablePortalsNamespace;
    private parseConfig;
}
export default Portal;
