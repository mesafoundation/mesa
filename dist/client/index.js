"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
class Client extends events_1.EventEmitter {
    constructor(url, config) {
        super();
        this.ws = new ws_1.default(url);
    }
}
exports.default = Client;
