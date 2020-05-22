"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const death_1 = __importDefault(require("death"));
const events_1 = require("events");
const message_1 = __importDefault(require("../server/message"));
const uuid_util_1 = __importDefault(require("../utils/uuid.util"));
const helpers_util_1 = require("../utils/helpers.util");
class Portal extends events_1.EventEmitter {
    constructor(redis, config) {
        super();
        this.parseConfig = (config) => {
            if (!config)
                config = {};
            if (typeof config.reportAllEvents === 'undefined')
                config.reportAllEvents = false;
            if (typeof config.verbose === 'undefined')
                config.verbose = false;
            return config;
        };
        this.redis = helpers_util_1.createRedisClient(redis);
        this.publisher = helpers_util_1.createRedisClient(redis);
        this.subscriber = helpers_util_1.createRedisClient(redis);
        this.config = this.parseConfig(config);
        this.setup();
    }
    setup() {
        this.id = uuid_util_1.default();
        this.setupSubscriber();
        this.registerPortal(); // Add the portal to the available_portals list
        this.setupCloseHandler(); // Setup the portal to be removed from the available_portals list on heat death
    }
    setupSubscriber() {
        this.subscriber.on('message', async (channel, data) => {
            let json;
            try {
                json = JSON.parse(data);
            }
            catch (error) {
                return this.emit('error', error);
            }
            const { portalId } = json;
            if (portalId !== this.id && !this.config.reportAllEvents)
                return;
            const { type, clientId, message } = json;
            switch (type) {
                case 'connection':
                    return this.handleSocketUpdate(type);
                case 'authentication':
                    return this.handleSocketUpdate(type, clientId);
                case 'message':
                    return this.handleMessage(message, clientId);
                case 'disconnection':
                    return this.handleSocketUpdate(type, clientId);
            }
        }).subscribe(this.portalPubSubNamespace());
    }
    handleSocketUpdate(type, clientId) {
        this.emit(type, clientId);
    }
    handleMessage(_message, clientId) {
        const message = new message_1.default(_message.op, _message.d, _message.t, { sequence: _message.s });
        this.emit('message', message, clientId);
    }
    registerPortal() {
        this.log('publishing portal id', this.id);
        this.publishReadyState(true);
        this.redis.sadd(this.availablePortalsNamespace(), this.id);
        this.log('published! ready to recieve updates on namespace', this.config.namespace);
    }
    setupCloseHandler() {
        death_1.default((signal, err) => {
            this.log('shutting down...');
            this.publishReadyState(false);
            this.redis.srem(this.availablePortalsNamespace(), this.id);
            process.exit(0);
        });
    }
    publishReadyState(readyState) {
        this.publisher.publish(this.availablePortalsNamespace(), JSON.stringify({
            id: this.id,
            ready: readyState
        }));
    }
    clientNamespace(prefix) {
        return this.config.namespace ? `${prefix}_${this.config.namespace}` : prefix;
    }
    portalPubSubNamespace() {
        return this.clientNamespace(`portal`);
    }
    availablePortalsNamespace() {
        return this.clientNamespace('available_portals');
    }
    log(...messages) {
        if (!this.config.verbose)
            return;
        console.log('[@cryb/mesa/portal]', ...messages);
    }
}
exports.default = Portal;
