"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRules = exports.parseConfig = void 0;
exports.parseConfig = (_config, keys, values) => {
    const config = Object.assign({}, _config);
    if (!config)
        config = {};
    keys.forEach((key, i) => {
        if (typeof config[key] !== 'undefined')
            return;
        config[key] = values[i];
    });
    return config;
};
exports.parseRules = (configs) => {
    const { serverOptions, clientConfig, authenticationConfig } = Object.assign({}, configs), rules = [], ruleKeys = ['enforce_equal_versions', 'store_messages', 'sends_user_object'], ruleValues = [
        !!clientConfig.enforceEqualVersions,
        !!serverOptions.storeMessages,
        !!authenticationConfig.sendUserObject
    ];
    ruleKeys.forEach((key, i) => {
        if (!ruleValues[i])
            return;
        rules.push(key);
    });
    return rules;
};
