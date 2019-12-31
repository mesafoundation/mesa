import { Rule } from './server/client';
import { IServerOptions, IClientConfig, IAuthenticationConfig } from './server';
export declare const parseConfig: <T>(config: T, keys: (keyof T)[], values: any[]) => T;
interface IConfigs {
    serverOptions: IServerOptions;
    clientConfig: IClientConfig;
    authenticationConfig: IAuthenticationConfig;
}
export declare const parseRules: (configs: IConfigs) => Rule[];
export {};
