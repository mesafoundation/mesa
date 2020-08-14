"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const death_1 = __importDefault(require("death"));
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
        this.middlewareHandlers = [];
        config = this.parseConfig(config);
        this.setup(config);
    }
    async send(message, _recipients, excluding) {
        // Remove excluded recipients from the _recipients array
        if (_recipients && excluding)
            _recipients = _recipients.filter(recipient => excluding.indexOf(recipient) === -1);
        // Global message
        if (!_recipients) {
            if (this.redis)
                this._sendPubSub(message, ['*']);
            else
                this._send(message, this.clients);
        }
        if (this.redis) {
            function isIdOnReplica(id) {
                return _recipients.indexOf(id) > -1;
            }
            const idsOnReplica = this.authenticatedClientIds.filter(isIdOnReplica);
            let idsOnCluster = this.authenticatedClientIds.filter(id => !isIdOnReplica(id));
            // If sync is enabled
            if (this.syncConfig.enabled) {
                // Get the namespace of the connected clients
                const namespace = this.getNamespace('connected_clients');
                // Create empty recipients lists
                const onlineRecipients = [];
                const offlineRecipients = [];
                // For each recipients get if the client is online or not
                const pipeline = this.redis.pipeline();
                for (let i = 0; i < _recipients.length; i++)
                    pipeline.sismember(namespace, _recipients[i]);
                // Execute the pipeline and add the client id to the online or offline recipients list
                const rawMembers = await pipeline.exec();
                for (let i = 0; i < rawMembers.length; i++) {
                    const [err, online] = rawMembers[i];
                    if (err)
                        continue;
                    if (online)
                        onlineRecipients.push(_recipients[i]);
                    else
                        offlineRecipients.push(_recipients[i]);
                }
                // If there are some offline recipients then handle the undeliverable messages
                if (offlineRecipients.length > 0)
                    offlineRecipients.forEach(recipient => this.handleUndeliverableMessage(message, recipient));
                // Remove any offline recipients from the idsOnCluster list
                // Note that we don't do this for the idsOnReplica list as those ids are checked from the online membrs on this replica
                idsOnCluster = idsOnCluster.filter(id => offlineRecipients.indexOf(id) === -1);
            }
            const clientsOnReplica = this.authenticatedClients(idsOnReplica);
            if (clientsOnReplica.length > 0)
                this._send(message, clientsOnReplica);
            if (idsOnCluster.length > 0)
                this._sendPubSub(message, idsOnCluster);
        }
        else {
            const recipients = this.clients.filter(({ id }) => _recipients.indexOf(id) > -1);
            this._send(message, recipients);
        }
    }
    _send(message, recipients) {
        // Authentication.required rule
        if (this.authenticationConfig.required)
            recipients = recipients.filter(({ authenticated }) => !!authenticated);
        // Don't send if no recipients
        if (recipients.length === 0)
            return;
        recipients.forEach(recipient => recipient.send(message, true));
        this.handleMiddlewareEvent('onMessageSent', message, recipients, true);
    }
    _sendPubSub(message, recipientIds) {
        const internalMessage = {
            message: message.serialize(true, { sentByServer: true, sentInternally: true }),
            recipients: recipientIds || ['*']
        };
        this.publisher.publish(this.pubSubNamespace, JSON.stringify(internalMessage));
    }
    authenticatedClients(ids) {
        return this.clients.filter(client => client.authenticated).filter(client => ids.indexOf(client.id) > -1);
    }
    get authenticatedClientIds() {
        return this.clients.filter(client => client.authenticated).map(client => client.id);
    }
    use(middleware) {
        const configured = middleware(this);
        this.middlewareHandlers.push(configured);
    }
    handleMiddlewareEvent(type, ...args) {
        if (!this.hasMiddleware)
            return;
        this.middlewareHandlers.forEach(handler => {
            const eventHandler = handler[type];
            if (!eventHandler)
                return;
            eventHandler(...args);
        });
    }
    registerAuthentication(client) {
        this.sendInternalPortalMessage({
            type: 'authentication',
            clientId: client.id
        });
    }
    get hasMiddleware() {
        return this.middlewareHandlers.length > 0;
    }
    registerDisconnection(disconnectingClient) {
        const clientIndex = this.clients.findIndex(client => client.serverId === disconnectingClient.serverId);
        this.clients.splice(clientIndex, 1);
        this.sendInternalPortalMessage({
            type: 'disconnection',
            clientId: disconnectingClient.id
        });
        if (this.redis)
            this.redis.decr(this.connectedClientsCountNamespace);
    }
    close() {
        this.wss.close();
    }
    sendPortalableMessage(_message, client) {
        const message = {
            type: 'message',
            message: _message.serialize(true, { sentByServer: true })
        };
        if (client.id)
            message.clientId = client.id;
        this.sendInternalPortalMessage(message);
    }
    get pubSubNamespace() {
        return this.getNamespace('ws');
    }
    setupCloseHandler() {
        death_1.default(async (signal) => {
            if (this.redis && this.clients.length > 0) {
                await this.redis.decrby(this.connectedClientsCountNamespace, this.clients.length);
                if (this.authenticationConfig.storeConnectedUsers) {
                    const idsOnReplica = this.authenticatedClientIds;
                    await this.redis.srem(this.connectedClientsNamespace, ...idsOnReplica);
                }
            }
            process.exit(signal);
        });
    }
    setup(config) {
        if (this.wss)
            this.wss.close();
        const options = {};
        if (config.server)
            options.server = config.server;
        else
            options.port = config.port;
        if (config.path)
            options.path = config.path;
        this.wss = new ws_1.default.Server(options);
        this.wss.on('connection', (socket, req) => this.registerConnection(socket, req));
        this.setupCloseHandler();
    }
    parseConfig(_config) {
        const config = Object.assign({}, _config);
        if (!config.port)
            config.port = 4000;
        this.port = config.port;
        if (config.path)
            this.path = config.path;
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
    // Setup
    setupRedis(redisConfig) {
        const redis = helpers_util_1.createRedisClient(redisConfig);
        const publisher = helpers_util_1.createRedisClient(redisConfig);
        const subscriber = helpers_util_1.createRedisClient(redisConfig);
        this.redis = redis;
        this.publisher = publisher;
        this.subscriber = subscriber;
        this.loadInitialState();
        const pubSubNamespace = this.pubSubNamespace;
        const availablePortalsNamespace = this.availablePortalsNamespace;
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
        this.publisher.publish(this.portalPubSubNamespace, JSON.stringify(Object.assign(Object.assign({}, internalMessage), { portalId: chosenPortal })));
    }
    // State Management
    async loadInitialState() {
        this.portals = await this.redis.smembers(this.availablePortalsNamespace);
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
        this.handleMiddlewareEvent('onConnection', this);
        if (this.redis)
            this.redis.incr(this.connectedClientsCountNamespace);
    }
    handleInternalMessage(internalMessage) {
        const { message: _message, recipients: _recipients } = internalMessage;
        const message = new message_1.default(_message.op, _message.d, _message.t);
        let recipients;
        if (_recipients.indexOf('*') > -1)
            recipients = this.clients;
        else
            recipients = this.clients.filter(client => _recipients.indexOf(client.id) > -1);
        if (recipients.length === 0)
            return;
        recipients.forEach(client => client.send(message, true));
        this.handleMiddlewareEvent('onMessageSent', message, recipients, false);
    }
    async handleUndeliverableMessage(message, recipient) {
        sync_until_1.handleUndeliveredMessage(message, recipient, this.redis, this.getNamespace('undelivered_messages'));
    }
    fetchClientConfig() {
        const config = {};
        const { serverOptions, clientConfig, authenticationConfig } = this;
        const rules = utils_1.parseRules({ serverOptions, clientConfig, authenticationConfig });
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
    getNamespace(prefix) {
        return this.namespace ? `${prefix}_${this.namespace}` : prefix;
    }
    getMiddlewareNamespace(prefix, name) {
        const key = `${prefix}_mw-${name}`;
        return this.namespace ? `${key}_${this.namespace}` : key;
    }
    mapMiddlewareNamespace(prefixes, name) {
        return prefixes.map(prefix => this.getMiddlewareNamespace(prefix, name));
    }
    get portalPubSubNamespace() {
        return this.getNamespace('portal');
    }
    get availablePortalsNamespace() {
        return this.getNamespace('available_portals_pool');
    }
    get connectedClientsNamespace() {
        return this.getNamespace('connected_clients');
    }
    get connectedClientsCountNamespace() {
        return this.getNamespace('connected_clients_count');
    }
}
exports.default = Server;
