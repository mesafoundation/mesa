type Opcode = number
type Data = {
    [key in string]?: any
}
type Type = string

export interface Messages {
    sent: Message[]
    recieved: Message[]
}

export interface IMessage {
    op: Opcode
    d: Data
    t?: Type
}

export default class Message {
    opcode: Opcode
    data: Data
    type: Type

    raw: IMessage

    // author: Client

    constructor(opcode: Opcode, data: Data, type?: Type) {
        this.opcode = opcode
        this.data = data
        this.type = type

        this.raw = { op: opcode, d: data, t: type }
    }

    serialize() {
        return JSON.stringify({
            op: this.opcode,
            d: this.data,
            t: this.type
        })
    }
}