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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY2xpZW50L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsNENBQTBCO0FBQzFCLG1DQUFxQztBQU1yQyxNQUFNLE1BQU8sU0FBUSxxQkFBWTtJQUk3QixZQUFZLEdBQVcsRUFBRSxNQUFxQjtRQUMxQyxLQUFLLEVBQUUsQ0FBQTtRQUVQLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxZQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDaEMsQ0FBQztDQUNKO0FBRUQsa0JBQWUsTUFBTSxDQUFBIn0=