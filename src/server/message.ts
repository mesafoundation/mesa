type Opcode = number
type Data = {
	[key in string]?: any
}
type Type = string

export interface IMessages {
	sent: Message[]
	recieved: Message[]
}

export interface IMessage {
	op: Opcode
	d: Data
	t?: Type
}

export interface IMessageOptions {
	to?: string
}

export interface IInternalMessage {
	message: IMessage
	recipients: string[]
}

export default class Message {
	public opcode: Opcode
	public data: Data
	public type: Type

	public raw: IMessage

	public options: IMessageOptions

	constructor(opcode: Opcode, data: Data, type?: Type, options?: IMessageOptions) {
		this.opcode = opcode
		this.data = data
		this.type = type

		this.raw = { op: opcode, d: data, t: type }
		this.options = options || {}
	}

	public serialize(toJson: boolean = false) {
		const json: IMessage = { op: this.opcode, d: this.data, t: this.type }
		if (toJson) return json

		return JSON.stringify(json)
	}
}
