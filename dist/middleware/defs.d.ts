import Server from '../server';
import Client from '../server/client';
import Message from '../server/message';
export interface MiddlewareHandler {
    onConnection: (client: Client) => void;
    onDisconnection: (client: Client, code: number, reason?: string) => void;
    onPortalJoin: (id: string) => void;
    onPortalLeave: (id: string) => void;
    onUndeliverableMessageSent: (message: Message, clientIds: string[]) => void;
    onRedeliverUndeliverableMessages: (messages: Message[], client: Client) => void;
    onMessageSent: (message: Message, clients: Client[], fromCurrentReplica: boolean) => void;
    onMessageRecieved: (message: Message, client: Client) => void;
    onAuthenticated: (client: Client) => void;
}
export declare type MiddlewareEvent = 'onConnection' | 'onDisconnection' | 'onPortalJoin' | 'onPortalLeave' | 'onUndeliverableMessageSent' | 'onRedeliverUndeliverableMessages' | 'onMessageSent' | 'onMessageRecieved' | 'onAuthenticated';
export declare type MiddlewareNondescriptHandler = (...args: any[]) => void;
declare type Middleware = (server: Server) => MiddlewareHandler;
export default Middleware;
