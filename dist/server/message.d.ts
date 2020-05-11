declare type Opcode = number;
declare type Data = {
    [key in string]?: any;
};
declare type Type = string;
declare type Sequence = number;
export interface IMessages {
    sent: Message[];
    recieved: Message[];
}
export interface IMessage {
    op: Opcode;
    d: Data;
    t?: Type;
    s?: Sequence;
}
export interface IMessageOptions {
    to?: string;
    sequence?: number;
}
export interface IInternalMessage {
    message: IMessage;
    recipients: string[];
}
export default class Message {
    opcode: Opcode;
    data: Data;
    type: Type;
    sequence: Sequence;
    options: IMessageOptions;
    constructor(opcode: Opcode, data: Data, type?: Type, options?: IMessageOptions);
    serialize(toJson?: boolean): string | IMessage;
}
export {};
