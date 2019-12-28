const { Client } = require('../dist')

const client = new Client('ws://localhost:4000')

client.on('connected', async () => {
    console.log('Connected to Mesa')

    await client.authenticate({ token: fetchToken() })
    console.log('Authenticated with Mesa')
})

client.on('message', (data, type) => {
    console.log('Recieved', data, type)
})

client.on('disconnect', () => {
    console.log('Disconnected from Mesa')
})