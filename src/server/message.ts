type Opcode = number
type Data = {
	[key in string]?: any
}
type Type = string
type Sequence = number

export interface IMessages {
	sent: Message[]
	recieved: Message[]
}

export interface IMessage {
	op: Opcode
	d: Data
	t?: Type
	s?: Sequence
}

export interface IMessageOptions {
	to?: string
	sequence?: number
}

export interface IInternalMessage {
	message: IMessage
	recipients: string[]
}

export default class Message {
	public opcode: Opcode
	public data: Data
	public type: Type
	public sequence: Sequence

	public options: IMessageOptions

	constructor(opcode: Opcode, data: Data, type?: Type, options?: IMessageOptions) {
		this.opcode = opcode
		this.data = data
		this.type = type

		this.options = options || {}

		if (this.options.sequence)
			this.sequence = this.options.sequence
	}

	public serialize(toJson: boolean = false) {
		const json: IMessage = {
			op: this.opcode,
			d: this.data,
			t: this.type,
			s: this.sequence
		}

		if (toJson)
			return json

		return JSON.stringify(json)
	}
}
