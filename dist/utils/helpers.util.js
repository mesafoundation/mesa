"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
exports.createRedisClient = (config) => {
    let client;
    if (typeof config === 'string')
        client = new ioredis_1.default(config);
    else
        client = new ioredis_1.default(config);
    return client;
};
