/* eslint-disable @typescript-eslint/no-var-requires */
/**
  This script will connect to the default Redis URI and port and will dispatch a
  Message in the 'example' namespace to all clients
**/

const { Dispatcher, Message } = require('../lib')

const dispatcher = new Dispatcher('redis://localhost:6379', {
  namespace: 'example'
})

dispatcher.dispatch(new Message(0, { status: 'online' }, 'STATUS_UPDATE'), ['*'])

// dispatcher.dispatch(new Message(0, { status: 'online' }, 'STATUS_UPDATE'), ['0', '1', '2'])
