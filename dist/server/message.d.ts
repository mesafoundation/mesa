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
export default class Message {
    opcode: Opcode;
    data: Data;
    type: Type;
    raw: IMessage;
    constructor(opcode: Opcode, data: Data, type?: Type);
    serialize(): string;
}
export {};
