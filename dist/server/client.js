"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const message_1 = __importDefault(require("./message"));
class Client extends events_1.EventEmitter {
    constructor(socket, server) {
        super();
        this.authenticated = false;
        this.messages = { sent: [], recieved: [] };
        this.heartbeatCount = 0;
        this.heartbeatAttempts = 0;
        this.heartbeatBuffer = [];
        this.socket = socket;
        this.server = server;
        this.setup();
    }
    setup() {
        const { socket } = this;
        if (this.server.heartbeatConfig.enabled) {
            this.heartbeatMaxAttempts = this.server.heartbeatConfig.maxAttempts || 3;
            this.heartbeatInterval = setInterval(() => this.heartbeat(), this.server.heartbeatConfig.interval);
        }
        socket.on('message', data => this.registerMessage(data));
        socket.on('close', (code, reason) => this.registerDisconnection(code, reason));
    }
    send(message, pubSub = false) {
        if (this.server.redis && !this.id)
            console.warn('Mesa pub/sub only works when users are identified using the client.authenticate API. Please use this API in order to enable pub/sub');
        if (!this.server.redis || !this.id || pubSub) {
            this.messages.sent.push(message);
            return this.socket.send(message.serialize());
        }
        this.server.publisher.publish(this.server.pubSubNamespace(), JSON.stringify({ message: message.serialize(true), recipients: [this.id], sync: !!message.options.sync }));
    }
    heartbeat() {
        if (this.heartbeatBuffer.length > 0 || this.heartbeatCount === 0) {
            this.heartbeatBuffer = [];
            this.heartbeatAttempts = 0;
            this.send(new message_1.default(1, {}));
        }
        else {
            this.heartbeatAttempts += 1;
            if (this.heartbeatAttempts > this.heartbeatMaxAttempts)
                return this.disconnect();
            this.send(new message_1.default(1, { tries: this.heartbeatAttempts, max: this.heartbeatMaxAttempts }));
        }
        this.heartbeatCount += 1;
    }
    authenticate(callback) {
        this.authenticated = true;
        this.authenticationCheck = callback;
    }
    updateUser(update) {
        if (!this.authenticated)
            throw 'This user hasn\'t been authenticated yet';
        this.registerAuthentication(null, update);
    }
    registerMessage(data) {
        let json;
        try {
            json = JSON.parse(data.toString());
        }
        catch (error) {
            throw error;
        }
        const { op, d, t } = json, message = new message_1.default(op, d, t);
        if (op === 2 && this.authenticationCheck)
            return this.authenticationCheck(d, (error, result) => this.registerAuthentication(error, result));
        else if (op === 11)
            return this.heartbeatBuffer.push(message);
        this.emit('message', message);
        this.server.emit('message', message);
        this.messages.recieved.push(message);
    }
    registerAuthentication(error, result) {
        if (error)
            console.error(error);
        this.id = result.id;
        this.user = result.user;
    }
    registerDisconnection(code, reason) {
        if (this.heartbeatInterval)
            clearInterval(this.heartbeatInterval);
        this.emit('disconnect', code, reason);
        this.server.emit('disconnection', code, reason);
    }
    disconnect(code) {
        this.socket.close(code);
    }
}
exports.default = Client;
