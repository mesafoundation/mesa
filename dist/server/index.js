"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const events_1 = __importDefault(require("events"));
const client_1 = __importDefault(require("./client"));
const message_1 = __importDefault(require("./message"));
class Server extends events_1.default {
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
        this.wss = new ws_1.default.Server({ port: config.port || 4000 });
        this.wss.on('connection', socket => this.registerClient(socket));
    }
    registerClient(socket) {
        const client = new client_1.default(socket, this);
        client.send(new message_1.default(10, this.fetchClientConfig()));
        this.clients.push(client);
        this.emit('connection', client);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc2VydmVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsNENBQTBCO0FBRTFCLG9EQUFpQztBQUdqQyxzREFBeUQ7QUFDekQsd0RBQStCO0FBOEIvQixNQUFxQixNQUFPLFNBQVEsZ0JBQVk7SUFRL0MsWUFBWSxNQUFxQjtRQUMxQixLQUFLLEVBQUUsQ0FBQTtRQVBYLFlBQU8sR0FBYSxFQUFFLENBQUE7UUFRbEIsSUFBRyxDQUFDLE1BQU07WUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBRXZCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFnQjtRQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQW9CO1FBQ3RCLElBQUcsSUFBSSxDQUFDLEdBQUc7WUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRTdCLElBQUksQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLFNBQVMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQTtRQUM3RCxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxTQUFTLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFDN0QsSUFBSSxDQUFDLG9CQUFvQixHQUFHLE1BQU0sQ0FBQyxjQUFjLElBQUksRUFBRSxDQUFBO1FBRXZELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxZQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUM5RCxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVELGNBQWMsQ0FBQyxNQUFpQjtRQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLGdCQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXZDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxpQkFBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELGlCQUFpQjtRQUNiLE1BQU0sTUFBTSxHQUEyQixFQUFFLENBQUE7UUFFekMsSUFBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU87WUFDM0IsTUFBTSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFBO1FBRS9ELElBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPO1lBQzNCLE1BQU0sQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQTtRQUUvRCxJQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPO1lBQ2hDLE1BQU0sQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFBO1FBRXZFLE9BQU8sTUFBTSxDQUFBO0lBQ2pCLENBQUM7Q0FDSjtBQXJERCx5QkFxREMifQ==