import { Redis } from 'ioredis';
import Message from '../server/message';
export declare const handleUndeliveredMessage: (message: Message, recipient: string, client: Redis, namespace: string) => Promise<void>;
