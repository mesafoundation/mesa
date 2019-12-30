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

export interface MessageOptions {
    to?: string
}

export interface InternalMessage {
    message: IMessage
    recipients: string[]
}

export default class Message {
    opcode: Opcode
    data: Data
    type: Type

    raw: IMessage

    options: MessageOptions

    constructor(opcode: Opcode, data: Data, type?: Type, options?: MessageOptions) {
        this.opcode = opcode
        this.data = data
        this.type = type

        this.raw = { op: opcode, d: data, t: type }
        this.options = options || { }
    }

    serialize(toJson: boolean = false) {
        const json: IMessage = { op: this.opcode, d: this.data, t: this.type }
        if(toJson) return json

        return JSON.stringify(json)
    }
}