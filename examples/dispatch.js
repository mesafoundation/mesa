const { Dispatcher, Message, DispatchEvent } = require('../dist')

const dispatcher = new Dispatcher('redis://localhost:6379')

dispatcher.dispatch(new Message(0, { x: 0 }), [...fetchUserIds()])
dispatcher.dispatch(new DispatchEvent('DISCONNECT_CLIENT'), [...fetchUserIds()])