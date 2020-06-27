/* eslint-disable @typescript-eslint/no-var-requires */
/**
  This script will start a Mesa server on port :4000 with portals enabled
**/

const { default: Mesa, Message } = require('../dist')

const mesa = new Mesa({
  port: 4000,
  path: '/ws',
  
  namespace: 'example'
})

console.log('Mesa listening on', mesa.port)

mesa.on('connection', client => {
  console.log('A client connected')
  
  client.authenticate(async ({ id }, done) => {
    console.log('Authenticated', id)

    done(null, { id, user: { id }})
  })

  client.on('message', message => {
    const { data, type } = message

    switch(type) {
    case 'PING':
      client.send(new Message(0, {}, 'PONG'))
    }

    console.log('Recieved', data, type, 'from', client.id || 'client')
  })

  client.on('disconnect', ({ code, reason }) => {
    console.log(`Client${client.id ? ` (${client.id}) ` : ' '}disconnected with`, code, reason ? ('with reason', reason) : '')
  })
})
