"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const event_1 = __importDefault(require("./event"));
const __1 = require("..");
const helpers_util_1 = require("../utils/helpers.util");
class Dispatcher {
    constructor(redis, config) {
        this.dispatch = (event, recipients = []) => {
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
            return config;
        };
        this.publisher = helpers_util_1.createRedisClient(redis);
        this.config = this.parseConfig(config);
    }
    fetchNamespace() {
        return this.config.namespace ? `ws-${this.config.namespace}` : 'ws';
    }
    dispatchMessage(message, recipients) {
        this.publisher.publish(this.fetchNamespace(), JSON.stringify({
            message: message.serialize(true),
            recipients
        }));
    }
    dispatchEvent(event, recipients) {
        this.publisher.publish(this.fetchNamespace(), JSON.stringify({
            message: event.serialize(true),
            recipients
        }));
    }
}
exports.default = Dispatcher;