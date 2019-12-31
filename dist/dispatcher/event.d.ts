export declare type DispatchAction = 'DISCONNECT_CLIENT';
export declare type DispatchTarget = string;
export default class DispatchEvent {
    action: DispatchAction;
    target: DispatchTarget;
    constructor(action: DispatchAction, target: DispatchTarget);
}
