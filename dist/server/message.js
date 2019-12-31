"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Message {
    constructor(opcode, data, type, options) {
        this.opcode = opcode;
        this.data = data;
        this.type = type;
        this.raw = { op: opcode, d: data, t: type };
        this.options = options || {};
    }
    serialize(toJson = false) {
        const json = { op: this.opcode, d: this.data, t: this.type };
        if (toJson)
            return json;
        return JSON.stringify(json);
    }
}
exports.default = Message;
