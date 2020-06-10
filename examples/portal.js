/* eslint-disable @typescript-eslint/no-var-requires */
/**
  This script will log events on a Mesa server using a Portal
**/

const { Portal } = require('../dist')

const portal = new Portal('redis://localhost:6379', {
  namespace: 'example',
  verbose: true
})

portal.on('connection', () => {
  console.log('Client connected')
})

portal.on('authentication', clientId => {
  console.log('Client authenticated with id', clientId)
})

portal.on('message', (message, clientId) => {
  const { opcode, data, type } = message

  console.log('Recieved', opcode, data, type, clientId ? `from ${clientId}` : '')
})

portal.on('disconnection', clientId => {
  if (!clientId)
    return console.log('Client disconnected')

  console.log('Authenticated client with id', clientId, 'disconnected')
})
