"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUndeliveredMessage = void 0;
exports.handleUndeliveredMessage = async (message, recipient, client, namespace) => {
    if (message.options && !message.options.sync)
        return;
    else if (!recipient)
        return;
    else if (typeof recipient === 'undefined')
        return;
    else if (typeof recipient !== 'string')
        return;
    else if (recipient.trim().length === 0)
        return;
    const _undeliveredMessages = await client.hget(namespace, recipient);
    let undeliveredMessages = [];
    if (_undeliveredMessages)
        try {
            undeliveredMessages = JSON.parse(_undeliveredMessages);
        }
        catch (error) {
            console.error(error);
        }
    undeliveredMessages.push(message.serialize(true));
    client.hset(namespace, recipient, JSON.stringify(undeliveredMessages));
};
