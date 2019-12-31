import { Rule } from './server/client'
import { IServerOptions, IClientConfig, IAuthenticationConfig } from './server'

export const parseConfig = <T>(config: T, keys: (keyof T)[], values: any[]) => {
	if (!config) (config as any) = {}

	keys.forEach((key, i) => {
		if (typeof config[key] !== 'undefined') return

		config[key] = values[i]
	})

	return config
}

interface IConfigs {
	serverOptions: IServerOptions
	clientConfig: IClientConfig

	authenticationConfig: IAuthenticationConfig
}

export const parseRules = (configs: IConfigs) => {
	const { serverOptions, clientConfig, authenticationConfig } = configs,
		rules: Rule[] = [],
		ruleKeys: Rule[] = ['enforce_equal_versions', 'store_messages', 'sends_user_object'],
		ruleValues = [
			!!clientConfig.enforceEqualVersions,
			!!serverOptions.storeMessages,
			!!authenticationConfig.sendUserObject
		]

	ruleKeys.forEach((key, i) => {
		if (!ruleValues[i]) return

		rules.push(key)
	})

	return rules
}