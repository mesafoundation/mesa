"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class DispatchEvent {
    constructor(action) {
        this.serialize = (toJson = false) => {
            const message = new __1.Message(5, {}, this.action);
            return message.serialize(toJson);
        };
        this.action = action;
    }
}
exports.default = DispatchEvent;
