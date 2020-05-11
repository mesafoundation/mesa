"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Message {
    constructor(opcode, data, type, options) {
        this.opcode = opcode;
        this.data = data;
        this.type = type;
        this.options = options || {};
        if (this.options.sequence)
            this.sequence = this.options.sequence;
    }
    serialize(toJson = false) {
        const json = {
            op: this.opcode,
            d: this.data,
            t: this.type,
            s: this.sequence
        };
        if (toJson)
            return json;
        return JSON.stringify(json);
    }
}
exports.default = Message;
