"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const events_1 = __importDefault(require("events"));
class Client extends events_1.default {
    constructor(url, config) {
        super();
        this.ws = new ws_1.default(url);
    }
}
exports.default = Client;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY2xpZW50L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsNENBQTBCO0FBQzFCLG9EQUFpQztBQUlqQyxNQUFxQixNQUFPLFNBQVEsZ0JBQVk7SUFJNUMsWUFBWSxHQUFXLEVBQUUsTUFBcUI7UUFDMUMsS0FBSyxFQUFFLENBQUE7UUFFUCxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksWUFBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2hDLENBQUM7Q0FDSjtBQVRELHlCQVNDIn0=