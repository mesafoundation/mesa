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
        this.server.publisher.publish('ws', JSON.stringify({ message: message.serialize(true), recipients: [this.id], sync: !!message.options.sync }));
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
        this.authenticationCheck = callback;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3NlcnZlci9jbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFDQSxtQ0FBcUM7QUFHckMsd0RBQXVEO0FBcUJ2RCxNQUFNLE1BQU8sU0FBUSxxQkFBWTtJQWtCN0IsWUFBWSxNQUFpQixFQUFFLE1BQWM7UUFDekMsS0FBSyxFQUFFLENBQUE7UUFiWCxhQUFRLEdBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQTtRQUt2QyxtQkFBYyxHQUFXLENBQUMsQ0FBQTtRQUUxQixzQkFBaUIsR0FBVyxDQUFDLENBQUE7UUFDN0Isb0JBQWUsR0FBYyxFQUFFLENBQUE7UUFPbkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7UUFDcEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7UUFFcEIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxLQUFLO1FBQ0QsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQTtRQUV2QixJQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRTtZQUNwQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQTtZQUN4RSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtTQUNyRztRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxF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