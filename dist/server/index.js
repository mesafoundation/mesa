"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const client_1 = __importDefault(require("./client"));
const message_1 = __importDefault(require("./message"));
const utils_1 = require("../utils");
const helpers_util_1 = require("../utils/helpers.util");
const sync_until_1 = require("../utils/sync.until");
class Server extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.clients = [];
        config = this.parseConfig(config);
        this.setup(config);
    }
    async send(message, _recipients, excluding) {
        if (_recipients && excluding)
            _recipients = _recipients.filter(recipient => excluding.indexOf(recipient) === -1);
        if (!this.redis && !_recipients)
            return this.clients.forEach(client => client.send(message, true));
        if (this.redis && _recipients && this.syncConfig.enabled) {
            const namespace = this.clientNamespace('connected_clients'), onlineRecipients = [], offlineRecipients = [];
            if (_recipients && this.syncConfig.enabled)
                for (let i = 0; i < _recipients.length; i++) {
                    const recipient = _recipients[i], isRecipientConnected = (await this.redis.sismember(namespace, _recipients[i])) === 1;
                    (isRecipientConnected ? onlineRecipients : offlineRecipients).push(recipient);
                }
            if (onlineRecipients.length > 0)
                this.publisher.publish(this.pubSubNamespace(), JSON.stringify({
                    message: message.serialize(true),
                    recipients: onlineRecipients
                }));
            if (offlineRecipients.length > 0)
                offlineRecipients.forEach(recipient => this.handleUndeliverableMessage(message, recipient));
            return;
        }
        if (this.redis)
            return this.publisher.publish(this.pubSubNamespace(), JSON.stringify({
                message: message.serialize(true),
                recipients: _recipients || ['*']
            }));
        const recipients = this.clients.filter(({ id }) => _recipients.indexOf(id) > -1);
        recipients.forEach(recipient => recipient.send(message));
    }
    pubSubNamespace() {
        return this.namespace ? `ws_${this.namespace}` : 'ws';
    }
    setup(config) {
        if (this.wss)
            this.wss.close();
        const options = {};
        if (config.server)
            options.server = config.server;
        else
            options.port = config.port || 4000;
        this.wss = new ws_1.default.Server(options);
        this.wss.on('connection', socket => this.registerClient(socket));
    }
    parseConfig(config) {
        if (!config)
            config = {};
        if (config.namespace)
            this.namespace = config.namespace;
        if (config.redis)
            this.setupRedis(config.redis);
        this.clientConfig = utils_1.parseConfig(config.client, ['enforceEqualVersions'], [false]);
        this.serverOptions = utils_1.parseConfig(config.options, ['storeMessages'], [false]);
        this.syncConfig = config.sync || { enabled: false };
        this.heartbeatConfig = config.heartbeat || { enabled: false };
        this.reconnectConfig = config.reconnect || { enabled: false };
        this.authenticationConfig = utils_1.parseConfig(config.authentication, ['timeout', 'sendUserObject', 'disconnectOnFail', 'storeConnectedUsers'], [10000, true, true, true]);
        if (this.syncConfig && this.syncConfig.enabled && !this.authenticationConfig.storeConnectedUsers)
            console.warn('Mesa requires config.authentication.storeConnectedUsers to be true for message sync to be enabled');
        return config;
    }
    setupRedis(redisConfig) {
        const redis = helpers_util_1.createRedisClient(redisConfig), publisher = helpers_util_1.createRedisClient(redisConfig), subscriber = helpers_util_1.createRedisClient(redisConfig);
        this.redis = redis;
        this.publisher = publisher;
        this.subscriber = subscriber;
        subscriber.on('message', async (_, data) => {
            try {
                this.handleInternalMessage(JSON.parse(data));
            }
            catch (error) {
                this.emit('error', error);
            }
        }).subscribe(this.pubSubNamespace());
    }
    registerClient(socket) {
        const client = new client_1.default(socket, this);
        client.send(new message_1.default(10, this.fetchClientConfig()));
        this.clients.push(client);
        this.emit('connection', client);
    }
    handleInternalMessage(internalMessage) {
        const { message: _message, recipients: _recipients } = internalMessage, message = new message_1.default(_message.op, _message.d, _message.t);
        let recipients;
        if (_recipients.indexOf('*') > -1)
            recipients = this.clients;
        else
            recipients = this.clients.filter(client => _recipients.indexOf(client.id) > -1);
        recipients.forEach(client => client.send(message, true));
    }
    async handleUndeliverableMessage(message, recipient) {
        sync_until_1.handleUndeliveredMessage(message, recipient, this.redis, this.clientNamespace('undelivered_messages'));
    }
    fetchClientConfig() {
        const config = {}, { serverOptions, clientConfig, authenticationConfig } = this, rules = utils_1.parseRules({ serverOptions, clientConfig, authenticationConfig });
        if (this.heartbeatConfig.enabled)
            config.c_heartbeat_interval = this.heartbeatConfig.interval;
        if (this.reconnectConfig.enabled)
            config.c_reconnect_interval = this.reconnectConfig.interval;
        if (this.authenticationConfig.timeout)
            config.c_authentication_timeout = this.authenticationConfig.timeout;
        if (rules.length > 0)
            config.rules = rules;
        return config;
    }
    clientNamespace(prefix) {
        return this.namespace ? `${prefix}_${this.namespace}` : prefix;
    }
}
exports.default = Server;
