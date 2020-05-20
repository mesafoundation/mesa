"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const uuid_util_ts_1 = __importDefault(require("../utils/uuid.util.ts"));
const helpers_util_1 = require("../utils/helpers.util");
class Portal extends events_1.EventEmitter {
    constructor(redis, config) {
        this.parseConfig = (config) => {
            if (!config)
                config = {};
            return config;
        };
        this.redis = helpers_util_1.createRedisClient(redis);
        this.subscriber = helpers_util_1.createRedisClient(redis);
        this.config = this.parseConfig(config);
        this.setup();
    }
    setup() {
        this.id = uuid_util_ts_1.default();
        // Need a way to take the subscriber off the market when the Portal gets destroyed
        this.setupSubscriber();
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
            const { message } = json;
            console.log(message);
        }).subscribe(this.clientNamespace(`portal_${this.id}`));
    }
    clientNamespace(prefix) {
        return this.config.namespace ? `${prefix}_${this.config.namespace}` : prefix;
    }
    pubSubNamespace() {
        return this.clientNamespace('ws');
    }
}
exports.default = Portal;
