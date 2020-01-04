const { Client, Message } = require('../dist')

const client = new Client('ws://localhost:4000')

client.on('connected', async () => {
    console.log('Connected to Mesa')

    await client.authenticate({ token: fetchToken() })
	console.log('Authenticated with Mesa')
	
	setTimeout(() => client.send(new Message(0, {}, 'PING')), 1000)
})

client.on('message', (data, type) => {
    console.log('Recieved', data, type)
})

client.on('disconnected', (code, reason) => {
    console.log('Disconnected from Mesa', code, reason)
})