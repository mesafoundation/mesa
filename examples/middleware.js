/* eslint-disable @typescript-eslint/no-var-requires */
/**
  This script will start a Mesa server on port :4000 with portals enabled
**/

const { default: Mesa, Message } = require('../dist')

const mesa = new Mesa({
  port: 4000,
  path: '/ws',
  
  namespace: 'middleware'
})

function logger(server) {
  return {
    onConnection: client => console.log('Client connected!'),
    onDisconnection: (client, code, reason) => console.log('Client disconnected :(', code, reason),

    onMessage: (message, client) => console.log(message),
    onAuthenticated: client => console.log('Client authenticated', client.id)
  }
}

mesa.use(logger)

mesa.on('connection', client => {
  client.authenticate(async ({ id }, done) => {
    done(null, { id, user: { id }})
  })

  client.on('message', message => {
    const { data, type } = message

    switch(type) {
    case 'PING':
      client.send(new Message(0, {}, 'PONG'))
    }
  })
})
