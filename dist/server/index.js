"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
const client_1 = __importDefault(require("./client"));
const message_1 = __importDefault(require("./message"));
class Server extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.clients = [];
        if (!config)
            config = {};
        this.setup(config);
    }
    send(message) {
        this.clients.forEach(client => client.send(message));
    }
    setup(config) {
        if (this.wss)
            this.wss.close();
        this.heartbeatConfig = config.heartbeat || { enabled: false };
        this.reconnectConfig = config.reconnect || { enabled: false };
        this.authenticationConfig = config.authentication || {};
        if (config.redis)
            this.setupRedis(config.redis);
        this.wss = new ws_1.default.Server({ port: config.port || 4000 });
        this.wss.on('connection', socket => this.registerClient(socket));
    }
    setupRedis(redisConfig) {
        let redis, publisher, subscriber;
        if (typeof redisConfig === 'string') {
            redis = new ioredis_1.default(redisConfig);
            publisher = new ioredis_1.default(redisConfig);
            subscriber = new ioredis_1.default(redisConfig);
        }
        else {
            redis = new ioredis_1.default(redisConfig);
            publisher = new ioredis_1.default(redisConfig);
            subscriber = new ioredis_1.default(redisConfig);
        }
        this.redis = redis;
        this.publisher = publisher;
        this.subscriber = subscriber;
        subscriber.on('message', async (_, data) => {
            try {
                this.handleInternalMessage(JSON.parse(data));
            }
            catch (error) {
                this.emit('error', error);
            }
        }).subscribe('ws');
    }
    registerClient(socket) {
        const client = new client_1.default(socket, this);
        client.send(new message_1.default(10, this.fetchClientConfig()));
        this.clients.push(client);
        this.emit('connection', client);
    }
    handleInternalMessage(internalMessage) {
        const { message: _message, recipients: _recipients, sync } = internalMessage, message = new message_1.default(_message.op, _message.d, _message.t);
        let recipients;
        if (_recipients.indexOf('*') > -1)
            recipients = this.clients;
        else
            recipients = this.clients.filter(client => _recipients.indexOf(client.id) > -1);
        recipients.forEach(client => client.send(message, true));
    }
    fetchClientConfig() {
        const config = {};
        if (this.heartbeatConfig.enabled)
            config.c_heartbeat_interval = this.heartbeatConfig.interval;
        if (this.reconnectConfig.enabled)
            config.c_reconnect_interval = this.reconnectConfig.interval;
        if (this.authenticationConfig.timeout)
            config.c_authentication_timeout = this.authenticationConfig.timeout;
        return config;
    }
}
exports.default = Server;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc2VydmVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsNENBQTBCO0FBQzFCLHNEQUEyQjtBQUMzQixtQ0FBcUM7QUFHckMsc0RBQXlEO0FBQ3pELHdEQUFvRDtBQXNDcEQsTUFBTSxNQUFPLFNBQVEscUJBQVk7SUFZaEMsWUFBWSxNQUFxQjtRQUMxQixLQUFLLEVBQUUsQ0FBQTtRQVhYLFlBQU8sR0FBYSxFQUFFLENBQUE7UUFZbEIsSUFBRyxDQUFDLE1BQU07WUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBRXZCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFnQjtRQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQW9CO1FBQ3RCLElBQUcsSUFBSSxDQUFDLEdBQUc7WUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRTdCLElBQUksQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLFNBQVMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQTtRQUM3RCxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxTQUFTLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFDN0QsSUFBSSxDQUFDLG9CQUFvQixHQUFHLE1BQU0sQ0FBQyxjQUFjLElBQUksRUFBRSxDQUFBO1FBRXZELElBQUcsTUFBTSxDQUFDLEtBQUs7WUFDWCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVqQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUks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