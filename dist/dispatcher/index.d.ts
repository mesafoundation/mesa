import DispatchEvent from './event';
import { Message } from '..';
import { RedisConfig } from '../server';
declare type Dispatchable = Message | DispatchEvent;
interface IDispatcherConfig {
    namespace?: string;
}
declare class Dispatcher {
    private publisher;
    private config;
    constructor(redis: RedisConfig, config?: IDispatcherConfig);
    dispatch: (event: Dispatchable, recipients?: string[], excluding?: string[]) => void;
    private fetchNamespace;
    private dispatchMessage;
    private dispatchEvent;
    private parseConfig;
}
export default Dispatcher;
