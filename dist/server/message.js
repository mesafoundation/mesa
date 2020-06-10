"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Message {
    constructor(opcode, data, type, options) {
        this.opcode = opcode;
        this.data = data;
        this.type = type;
        // this.sequence = sequence
        if (options)
            this.options = this.parseOptions(options);
    }
    serialize(toJson = false, _config) {
        const config = this.parseSerializationConfig(_config);
        const json = {
            op: this.opcode,
            d: this.data,
            t: this.type
        };
        if (this.sequence && config.sentByServer)
            json.s = this.sequence;
        if (this.options && !config.sentByServer)
            json.o = this.options;
        if (toJson)
            return json;
        return JSON.stringify(json);
    }
    parseOptions(_options) {
        const options = Object.assign({}, _options);
        if (typeof options.sync === 'undefined')
            options.sync = true;
        return options;
    }
    parseSerializationConfig(_config) {
        const config = Object.assign({}, _config);
        if (typeof config.sentByServer === 'undefined')
            config.sentByServer = false;
        if (typeof config.sentInternally === 'undefined')
            config.sentInternally = false;
        return config;
    }
}
exports.default = Message;
