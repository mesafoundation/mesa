export type DispatchAction = 'DISCONNECT_CLIENT'
export type DispatchTarget = string

export default class DispatchEvent {
	public action: DispatchAction
	public target: DispatchTarget

	constructor(action: DispatchAction, target: DispatchTarget) {
		this.action = action
		this.target = target
	}
}