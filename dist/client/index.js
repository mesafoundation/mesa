"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
const message_1 = __importDefault(require("../server/message"));
class Client extends events_1.EventEmitter {
    constructor(url, config) {
        super();
        this.authenticated = false;
        this.messages = { sent: [], recieved: [] };
        this.queue = [];
        this.connect = () => new Promise((resolve, reject) => {
            if (this.reconnectionInterval)
                clearInterval(this.reconnectionInterval);
            if (this.ws && this.ws.readyState === this.ws.OPEN)
                throw 'This client is already connected to a pre-existing Mesa server. Call disconnect() to disconnect before attempting to reconnect again';
            this.ws = new ws_1.default(this.url);
            const resolveConnection = () => {
                this.ws.removeEventListener('open', resolveConnection);
                resolve();
            };
            this.ws.addEventListener('open', resolveConnection);
            const rejectError = error => {
                this.ws.removeEventListener('error', rejectError);
                reject(error);
            };
            this.ws.addEventListener('error', rejectError);
            this.ws.on('open', () => this.registerOpen());
            this.ws.on('message', data => this.registerMessage(data));
            this.ws.on('close', (code, reason) => this.registerClose(code, reason));
            this.ws.on('error', error => this.registerError(error));
        });
        this.authenticate = (data) => new Promise(async (resolve, reject) => {
            this.authenticationResolve = resolve;
            this.send(new message_1.default(2, Object.assign({}, data)));
        });
        config = this.parseConfig(config);
        this.url = url;
        this.config = config;
        if (config.autoConnect)
            this.connect();
    }
    parseConfig(config) {
        if (!config)
            config = {};
        if (typeof config.autoConnect === 'undefined')
            config.autoConnect = true;
        return config;
    }
    connectAndSupressWarnings() {
        this.connect()
            .then(() => { })
            .catch(() => { });
    }
    send(message) {
        if (this.ws.readyState !== this.ws.OPEN)
            return this.queue.push(message);
        this.messages.sent.push(message);
        this.ws.send(message.serialize());
    }
    disconnect(code, data) {
        this.ws.close(code, data);
    }
    registerOpen() {
        this.emit('connected');
        if (this.queue.length > 0) {
            this.queue.forEach(this.send);
            this.queue = [];
        }
    }
    registerMessage(data) {
        let json;
        try {
            json = JSON.parse(data.toString());
        }
        catch (error) {
            return console.error(error);
        }
        const { op, d, t } = json, message = new message_1.default(op, d, t);
        switch (message.opcode) {
            case 1:
                return this.send(new message_1.default(11, {}));
            case 10:
                const { c_heartbeat_interval, c_reconnect_interval, c_authentication_timeout } = message.data;
                if (c_reconnect_interval)
                    this.reconnectionIntervalTime = c_reconnect_interval;
                return;
            case 22:
                this.authenticated = true;
                if (this.authenticationResolve)
                    this.authenticationResolve(d);
                return;
        }
        this.emit('message', message);
        this.messages.recieved.push(message);
    }
    registerClose(code, reason) {
        this.emit('disconnected', code, reason);
        if (this.reconnectionIntervalTime) {
            if (this.reconnectionInterval)
                clearInterval(this.reconnectionInterval);
            this.ws = null;
            this.reconnectionInterval = setInterval(() => this.connectAndSupressWarnings(), this.reconnectionIntervalTime);
        }
    }
    registerError(error) {
        this.emit('error', error);
    }
}
exports.default = Client;
