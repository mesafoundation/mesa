import { Rule } from './server/client'
import { ServerOptions, ClientConfig, AuthenticationConfig } from './server'

export const parseConfig = <T>(config: T, keys: (keyof T)[], values: any[]) => {
    if(!config) (config as any) = {}

    keys.forEach((key, i) => {
        if(typeof config[key] !== 'undefined') return

        config[key] = values[i]
    })

    return config
}

interface Configs {
    serverOptions: ServerOptions
    clientConfig: ClientConfig

    authenticationConfig: AuthenticationConfig
}

export const parseRules = (configs: Configs) => {
    const { serverOptions, clientConfig, authenticationConfig } = configs,
            rules: Rule[] = [],
            ruleKeys: Rule[] = ['enforce_equal_versions', 'store_messages', 'sends_user_object'],
            ruleValues = [!!clientConfig.enforceEqualVersions, !!serverOptions.storeMessages, !!authenticationConfig.sendUserObject]

    ruleKeys.forEach((key, i) => {
        if(!ruleValues[i]) return
        
        rules.push(key)
    })

    return rules
}