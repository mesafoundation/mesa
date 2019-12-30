"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Message {
    // author: Client
    constructor(opcode, data, type, options) {
        this.opcode = opcode;
        this.data = data;
        this.type = type;
        this.raw = { op: opcode, d: data, t: type };
        this.options = options || {};
        // this.options = options || { sync: false }
    }
    serialize(toJson = false) {
        const json = { op: this.opcode, d: this.data, t: this.type };
        if (toJson)
            return json;
        return JSON.stringify(json);
    }
}
exports.default = Message;
