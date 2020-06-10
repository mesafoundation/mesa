import { Message } from '..'

export type DispatchAction = 'DISCONNECT_CLIENT'

export default class DispatchEvent {
  public action: DispatchAction

  constructor(action: DispatchAction) {
    this.action = action
  }

  public serialize = (toJson = false) => {
    const message = new Message(5, {}, this.action)

    return message.serialize(toJson)
  }
}
