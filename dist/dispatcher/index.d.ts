import DispatchEvent from './event';
import { Message } from '..';
import { RedisConfig } from '../server';
declare type Dispatchable = Message | DispatchEvent;
interface IDispatcherSyncConfig {
    enabled: boolean;
}
interface IDispatcherConfig {
    namespace?: string;
    sync?: IDispatcherSyncConfig;
}
declare class Dispatcher {
    private redis;
    private publisher;
    private config;
    constructor(redis: RedisConfig, config?: IDispatcherConfig);
    dispatch: (event: Dispatchable, recipients?: string[], excluding?: string[]) => void;
    private dispatchMessage;
    private dispatchEvent;
    private clientNamespace;
    private pubSubNamespace;
    private parseConfig;
}
export default Dispatcher;
