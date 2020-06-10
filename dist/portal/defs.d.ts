import { IMessage } from '../server/message';
export interface IPortalUpdate {
    id: string;
    ready: boolean;
}
export interface IPortalConfig {
    namespace?: string;
    verbose?: boolean;
    reportAllEvents?: boolean;
}
export declare type PortalInternalSocketType = 'connection' | 'authentication' | 'disconnection';
declare type PortalInternalMessageType = PortalInternalSocketType | 'message';
export interface IPortalInternalMessage {
    type: PortalInternalMessageType;
    portalId?: string;
    clientId?: string;
    message?: IMessage;
}
export {};
