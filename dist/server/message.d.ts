declare type Opcode = number;
declare type Data = {
    [key in string]?: any;
};
declare type Type = string;
export interface IMessages {
    sent: Message[];
    recieved: Message[];
}
export interface IMessage {
    op: Opcode;
    d: Data;
    t?: Type;
}
export interface IMessageOptions {
    to?: string;
}
export interface IInternalMessage {
    message: IMessage;
    recipients: string[];
}
export default class Message {
    opcode: Opcode;
    data: Data;
    type: Type;
    raw: IMessage;
    options: IMessageOptions;
    constructor(opcode: Opcode, data: Data, type?: Type, options?: IMessageOptions);
    serialize(toJson?: boolean): string | IMessage;
}
export {};
