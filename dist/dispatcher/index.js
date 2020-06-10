"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const event_1 = __importDefault(require("./event"));
const __1 = require("..");
const helpers_util_1 = require("../utils/helpers.util");
const sync_until_1 = require("../utils/sync.until");
class Dispatcher {
    constructor(redis, config) {
        this.dispatch = (event, recipients = ['*'], excluding) => {
            if (recipients && excluding)
                recipients = recipients.filter(recipient => excluding.indexOf(recipient) === -1);
            switch (event.constructor.name) {
                case __1.Message.name:
                    this.dispatchMessage(event, recipients);
                    break;
                case event_1.default.name:
                    this.dispatchEvent(event, recipients);
                    break;
                default:
                    throw new Error('No dispatch handler found');
            }
        };
        this.parseConfig = (config) => {
            if (!config)
                config = {};
            if (!config.sync)
                config.sync = { enabled: false };
            return config;
        };
        this.redis = helpers_util_1.createRedisClient(redis);
        this.publisher = helpers_util_1.createRedisClient(redis);
        this.config = this.parseConfig(config);
    }
    async dispatchMessage(message, _recipients) {
        const connectedClientsNamespace = this.clientNamespace('connected_clients');
        const undeliveredMessagesNamespace = this.clientNamespace('undelivered_messages');
        let recipients = [];
        if (this.config.sync.enabled)
            for (let i = 0; i < _recipients.length; i++) {
                const recipient = _recipients[i];
                if (recipient === '*') {
                    recipients.push(recipient);
                    continue;
                }
                const isRecipientOnline = await this.redis.sismember(connectedClientsNamespace, recipient);
                if (isRecipientOnline)
                    recipients.push(recipient);
                else
                    sync_until_1.handleUndeliveredMessage(message, recipient, this.redis, undeliveredMessagesNamespace);
            }
        else
            recipients = _recipients;
        this.publisher.publish(this.pubSubNamespace(), JSON.stringify({
            message: message.serialize(true),
            recipients
        }));
    }
    dispatchEvent(event, recipients) {
        this.publisher.publish(this.pubSubNamespace(), JSON.stringify({
            message: event.serialize(true),
            recipients
        }));
    }
    clientNamespace(prefix) {
        return this.config.namespace ? `${prefix}_${this.config.namespace}` : prefix;
    }
    pubSubNamespace() {
        return this.clientNamespace('ws');
    }
}
exports.default = Dispatcher;
