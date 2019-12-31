import { Rule } from './server/client';
import { ServerOptions, ClientConfig, AuthenticationConfig } from './server';
export declare const parseConfig: <T>(config: T, keys: (keyof T)[], values: any[]) => T;
interface Configs {
    serverOptions: ServerOptions;
    clientConfig: ClientConfig;
    authenticationConfig: AuthenticationConfig;
}
export declare const parseRules: (configs: Configs) => Rule[];
export {};
