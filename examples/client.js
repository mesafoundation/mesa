/* eslint-disable @typescript-eslint/no-var-requires */
/**
  This script will authenticate with a Mesa server running on port :4000 with a random UUID
  and send a message with opcode 0 and type 'PING' and a random UUID as its data.

  It will also log and recieved messages and will also log 'connected' and 'disconnected' events
**/

const { Client, Message } = require('../dist')
const { default: uuid } = require('../dist/utils/uuid.util')

const client = new Client('ws://localhost:4000/ws')

client.on('connected', async () => {
  console.log('Connected to Mesa')

  await client.authenticate({ id: uuid() })

  setInterval(() => {
    console.log('Sending \'PING\' message to server')

    client.send(new Message(0, { r: uuid() }, 'PING'))
  }, 1000)
})

client.on('message', message => {
  console.log('Recieved', message, 'from server')
})

client.on('disconnected', (code, reason) => {
  console.log('Disconnected from Mesa', code, reason)
})
