export declare type DispatchAction = 'DISCONNECT_CLIENT';
export default class DispatchEvent {
    action: DispatchAction;
    constructor(action: DispatchAction);
    serialize: (toJson?: boolean) => string | import("../server/message").IMessage;
}
