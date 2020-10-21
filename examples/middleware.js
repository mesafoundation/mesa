/* eslint-disable @typescript-eslint/no-var-requires */
/**
  This script will start a Mesa server on port :4000 with portals enabled
**/

const { default: Mesa, Message } = require('../lib')

const mesa = new Mesa({
  port: 4000,
  path: '/ws',

  namespace: 'middleware'
})

function Logger(server) {
  return {
    onConnection: client => console.log('Client connected!'),
    onDisconnection: (client, code, reason) => console.log('Client disconnected :(', code, reason),

    onMessage: (message, client) => console.log(message),
    onAuthenticated: client => console.log('Client authenticated', client.id)
  }
}

function PromClient(config) {
  return server => {
    console.log(`Prometheus client middleware registered with path ${config.path}`)

    return {
      onConnection: client => {
        console.log('Client connected!')
      }
    }
  }
}

mesa.use(Logger)
mesa.use(PromClient({ path: '/metrics' }))

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
