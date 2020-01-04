const { Dispatcher, Message, DispatchEvent } = require('../dist')

const dispatcher = new Dispatcher('redis://localhost:6379')

dispatcher.dispatch(new Message(0, { status: 'online' }, 'STATUS_UPDATE'), [...fetchUserIds()])
dispatcher.dispatch(new DispatchEvent('DISCONNECT_CLIENT'), [...fetchUserIds()])