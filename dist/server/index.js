"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const message_1 = __importDefault(require("./message"));
const client_1 = __importDefault(require("./client"));
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
        // config.sync = config.sync || { enabled: false }
        config.heartbeat = config.heartbeat || { enabled: false };
        config.reconnect = config.reconnect || { enabled: false };
        // if(!config.redis && config.sync.enabled) {
        //     config.sync.enabled = false
        //     console.warn('Mesa Sync relies on Redis to function properly. As you have not configured Redis, Sync will be disabled')
        // }
        if (!config.authentication) {
            const authenticationKeys = ['sendUserObject', 'disconnectOnFail', 'storeConnectedUsers'], authenticationKeyValues = [true, true, true];
            authenticationKeys.forEach((key, i) => {
                if (typeof config.authentication[key])
                    config.authentication[key] = authenticationKeyValues[i];
            });
        }
        else
            config.authentication = {};
        // this.syncConfig = config.sync
        this.heartbeatConfig = config.heartbeat;
        this.reconnectConfig = config.reconnect;
        this.authenticationConfig = config.authentication;
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
    pubSubNamespace() {
        return this.namespace ? `ws-${this.namespace}` : 'ws';
    }
    registerClient(socket) {
        const client = new client_1.default(socket, this);
        client.send(new message_1.default(10, this.fetchClientConfig()));
        this.clients.push(client);
        this.emit('connection', client);
    }
    handleInternalMessage(internalMessage) {
        // const { message: _message, recipients: _recipients, sync } = internalMessage,
        const { message: _message, recipients: _recipients } = internalMessage, message = new message_1.default(_message.op, _message.d, _message.t);
        let recipients;
        if (_recipients.indexOf('*') > -1)
            recipients = this.clients;
        else
            recipients = this.clients.filter(client => _recipients.indexOf(client.id) > -1);
        recipients.forEach(client => client.send(message, true));
    }
    fetchClientConfig() {
        const config = {};
        if (this.heartbeatConfig.enabled)
            config.c_heartbeat_interval = this.heartbeatConfig.interval;
        if (this.reconnectConfig.enabled)
            config.c_reconnect_interval = this.reconnectConfig.interval;
        if (this.authenticationConfig.timeout)
            config.c_authentication_timeout = this.authenticationConfig.timeout;
        return config;
    }
}
exports.default = Server;
