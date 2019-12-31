"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const ioredis_1 = __importDefault(require("ioredis"));
const ws_1 = __importDefault(require("ws"));
const client_1 = __importDefault(require("./client"));
const message_1 = __importDefault(require("./message"));
const utils_1 = require("../utils");
class Server extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.clients = [];
        config = this.parseConfig(config);
        this.setup(config);
    }
    send(message) {
        this.clients.forEach(client => client.send(message));
    }
    pubSubNamespace() {
        return this.namespace ? `ws-${this.namespace}` : 'ws';
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
        this.heartbeatConfig = config.heartbeat || { enabled: false };
        this.reconnectConfig = config.reconnect || { enabled: false };
        this.authenticationConfig = utils_1.parseConfig(config.authentication, ['timeout', 'sendUserObject', 'disconnectOnFail', 'storeConnectedUsers'], [10000, true, true, true]);
        return config;
    }
    setupRedis(redisConfig) {
        let redis, publisher, subscriber;
        if (typeof redisConfig === 'string') {
            redis = new ioredis_1.default(redisConfig);
            publisher = new ioredis_1.default(redisConfig);
            subscriber = new ioredis_1.default(redisConfig);
        }
        else {
            redis = new ioredis_1.default(redisConfig);
            publisher = new ioredis_1.default(redisConfig);
            subscriber = new ioredis_1.default(redisConfig);
        }
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
}
exports.default = Server;
