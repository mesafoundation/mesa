"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DispatchEvent {
    constructor(action, target) {
        this.action = action;
        this.target = target;
    }
}
exports.default = DispatchEvent;
