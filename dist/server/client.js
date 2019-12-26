"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const message_1 = __importDefault(require("./message"));
class Client extends events_1.default {
    constructor(socket, server) {
        super();
        this.messages = {
            sent: [],
            recieved: []
        };
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
    send(message) {
        this.messages.sent.push(message);
        this.socket.send(message.serialize());
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
            return this.authenticationCheck(d, this.registerAuthentication);
        else if (op === 11)
            return this.heartbeatBuffer.push(message);
        this.emit('message', message);
        this.server.emit('message', message);
        this.messages.recieved.push(message);
    }
    registerAuthentication(error, user) {
        console.log(error, user);
    }
    registerDisconnection(code, reason) {
        if (this.heartbeatInterval)
            clearInterval(this.heartbeatInterval);
        this.emit('disconnect', { code, reason });
    }
    disconnect(code) {
        this.socket.close(code);
    }
}
exports.default = Client;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3NlcnZlci9jbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFDQSxvREFBaUM7QUFHakMsd0RBQXVEO0FBUXZELE1BQXFCLE1BQU8sU0FBUSxnQkFBWTtJQWtCNUMsWUFBWSxNQUFpQixFQUFFLE1BQVk7UUFDdkMsS0FBSyxFQUFFLENBQUE7UUFoQlgsYUFBUSxHQUFhO1lBQ2pCLElBQUksRUFBRSxFQUFFO1lBQ1IsUUFBUSxFQUFFLEVBQUU7U0FDZixDQUFBO1FBS08sbUJBQWMsR0FBVyxDQUFDLENBQUE7UUFFMUIsc0JBQWlCLEdBQVcsQ0FBQyxDQUFBO1FBQzdCLG9CQUFlLEdBQWMsRUFBRSxDQUFBO1FBT25DLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBRXBCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRUQsS0FBSztRQUNELE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFFdkIsSUFBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUU7WUFDcEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUE7WUFDeEUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUE7U0FDckc7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMs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