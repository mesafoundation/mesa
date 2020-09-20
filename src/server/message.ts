type Opcode = number
type Data = {
  [key in string]?: any
}
type Type = string
type Sequence = number

export interface IMessages {
  sent: Message[]
  received: Message[]
}

export interface IMessageOptions {
  sync: boolean
}

export interface IMessage {
  op: Opcode
  d: Data
  t?: Type

  s?: Sequence
  o?: IMessageOptions
}

export interface IInternalMessage {
  message: IMessage
  recipients: string[]
}

interface IMessageSerializationConfig {
  sentByServer?: boolean
  sentInternally?: boolean
}

export default class Message {
  public opcode: Opcode
  public data: Data
  public type: Type

  public sequence?: Sequence
  public options: IMessageOptions

  constructor(opcode: Opcode, data: Data, type?: Type, options?: IMessageOptions) {
    this.opcode = opcode
    this.data = data
    this.type = type

    // this.sequence = sequence
    if (options)
      this.options = this.parseOptions(options)
  }

  public serialize(toJson = false, _config?: IMessageSerializationConfig) {
    const config = this.parseSerializationConfig(_config)
    const json: IMessage = {
      op: this.opcode,
      d: this.data,
      t: this.type
    }

    if (this.sequence && config.sentByServer)
      json.s = this.sequence

    if (this.options && !config.sentByServer)
      json.o = this.options

    if (toJson)
      return json

    return JSON.stringify(json)
  }

  private parseOptions(_options?: IMessageOptions) {
    const options = Object.assign({}, _options)

    if (typeof options.sync === 'undefined')
      options.sync = true

    return options
  }

  private parseSerializationConfig(_config?: IMessageSerializationConfig) {
    const config = Object.assign({}, _config)

    if (typeof config.sentByServer === 'undefined')
      config.sentByServer = false

    if (typeof config.sentInternally === 'undefined')
      config.sentInternally = false

    return config
  }
}
