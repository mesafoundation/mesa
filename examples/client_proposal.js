const { Client } = require('../dist')

const client = new Client('ws://localhost:4000')

client.on('ready', () => {
    console.log('Connected to Mesa!')
})

client.on('message', (data, type) => {
    console.log('Recieved', data, type)
})

client.on('disconnect', () => {
    console.log('Disconnected from Mesa')
})