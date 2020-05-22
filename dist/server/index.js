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
        this.portals = [];
        this.portalIndex = 0;
        config = this.parseConfig(config);
        this.setup(config);
    }
    async send(message, _recipients, excluding) {
        if (_recipients && excluding)
            _recipients = _recipients.filter(recipient => excluding.indexOf(recipient) === -1);
        if (!this.redis && !_recipients)
            return this._send(message, this.clients);
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
        else {
            const recipients = this.clients.filter(({ id }) => _recipients.indexOf(id) > -1);
            this._send(message, recipients);
        }
    }
    close() {
        this.wss.close();
    }
    sendPortalableMessage(_message, client) {
        const message = {
            type: 'message',
            message: _message.serialize(true)
        };
        if (client.id)
            message.clientId = client.id;
        this.sendInternalPortalMessage(message);
    }
    pubSubNamespace() {
        return this.getNamespace('ws');
    }
    getNamespace(prefix) {
        return this.namespace ? `${prefix}_${this.namespace}` : prefix;
    }
    portalPubSubNamespace() {
        return this.getNamespace('portal');
    }
    availablePortalsNamespace() {
        return this.getNamespace('available_portals');
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
        this.wss.on('connection', (socket, req) => this.registerConnection(socket, req));
    }
    parseConfig(_config) {
        const config = Object.assign({}, _config);
        if (config.namespace)
            this.namespace = config.namespace;
        if (config.redis)
            this.setupRedis(config.redis);
        this.clientConfig = utils_1.parseConfig(config.client, ['enforceEqualVersions'], [false]);
        this.serverOptions = utils_1.parseConfig(config.options, ['storeMessages'], [false]);
        this.syncConfig = config.sync || { enabled: false };
        this.heartbeatConfig = config.heartbeat || { enabled: false };
        this.reconnectConfig = config.reconnect || { enabled: false };
        this.portalConfig = utils_1.parseConfig(config.portal, ['enabled', 'distributeLoad'], [false, true]);
        this.authenticationConfig = utils_1.parseConfig(config.authentication, ['timeout', 'required', 'sendUserObject', 'disconnectOnFail', 'storeConnectedUsers'], [10000, false, true, true, true]);
        if (this.syncConfig && this.syncConfig.enabled && !this.authenticationConfig.storeConnectedUsers)
            console.warn('Mesa requires config.authentication.storeConnectedUsers to be true for message sync to be enabled');
        return config;
    }
    _send(message, recipients) {
        // Authentication.required rule
        if (this.authenticationConfig.required)
            recipients = recipients.filter(({ authenticated }) => !!authenticated);
        // Don't send if no recipients
        if (recipients.length === 0)
            return;
        recipients.forEach(recipient => recipient.send(message));
    }
    // Setup
    setupRedis(redisConfig) {
        const redis = helpers_util_1.createRedisClient(redisConfig), publisher = helpers_util_1.createRedisClient(redisConfig), subscriber = helpers_util_1.createRedisClient(redisConfig);
        this.redis = redis;
        this.publisher = publisher;
        this.subscriber = subscriber;
        this.loadInitialState();
        const pubSubNamespace = this.pubSubNamespace(), availablePortalsNamespace = this.availablePortalsNamespace();
        subscriber.on('message', async (channel, data) => {
            let json;
            try {
                json = JSON.parse(data);
            }
            catch (error) {
                return this.emit('error', error);
            }
            switch (channel) {
                case pubSubNamespace:
                    return this.handleInternalMessage(json);
                case availablePortalsNamespace:
                    return this.handlePortalUpdate(json);
            }
        }).subscribe(pubSubNamespace, availablePortalsNamespace);
    }
    // Portal
    sendInternalPortalMessage(internalMessage) {
        if (!this.portalConfig.enabled)
            return;
        else if (!this.redis)
            return console.log('[@cryb/mesa] Redis needs to be enabled for Portals to work. Enable Redis in your Mesa server config');
        else if (this.portals.length === 0)
            return;
        let chosenPortal;
        if (this.portals.length === 1)
            chosenPortal = this.portals[0];
        else if (this.portalConfig.distributeLoad) {
            this.portalIndex += 1;
            if (this.portalIndex >= this.portals.length)
                this.portalIndex = 0;
            chosenPortal = this.portals[this.portalIndex];
        }
        else
            chosenPortal = this.portals[Math.floor(Math.random() * this.portals.length)];
        this.publisher.publish(this.portalPubSubNamespace(), JSON.stringify(Object.assign(Object.assign({}, internalMessage), { portalId: chosenPortal })));
    }
    // State Management
    async loadInitialState() {
        this.portals = await this.redis.smembers(this.availablePortalsNamespace());
    }
    handlePortalUpdate(update) {
        const { id, ready } = update;
        if (ready)
            this.portals.push(id);
        else {
            const portalIndex = this.portals.indexOf(id);
            this.portals.splice(portalIndex, 1);
        }
    }
    // State Updates
    registerConnection(socket, req) {
        const client = new client_1.default(socket, this, { req });
        client.send(new message_1.default(10, this.fetchClientConfig()), true);
        this.clients.push(client);
        this.emit('connection', client);
        this.sendInternalPortalMessage({
            type: 'connection'
        });
    }
    registerAuthentication(client) {
        this.sendInternalPortalMessage({
            type: 'authentication',
            clientId: client.id
        });
    }
    registerDisconnection(disconnectingClient) {
        const clientIndex = this.clients.findIndex(client => client.serverId === disconnectingClient.serverId);
        this.clients.splice(clientIndex, 1);
        this.sendInternalPortalMessage({
            type: 'disconnection',
            clientId: disconnectingClient.id
        });
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
