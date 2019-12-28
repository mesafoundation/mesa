declare type Opcode = number;
declare type Data = {
    [key in string]?: any;
};
declare type Type = string;
export interface Messages {
    sent: Message[];
    recieved: Message[];
}
export interface IMessage {
    op: Opcode;
    d: Data;
    t?: Type;
}
export interface MessageOptions {
    to?: string;
    sync?: boolean;
}
export interface InternalMessage {
    message: IMessage;
    recipients: string[];
    sync: boolean;
}
export default class Message {
    opcode: Opcode;
    data: Data;
    type: Type;
    raw: IMessage;
    options: MessageOptions;
    constructor(opcode: Opcode, data: Data, type?: Type, options?: MessageOptions);
    serialize(toJson?: boolean): string | IMessage;
}
export {};
