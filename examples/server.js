const { default: Mesa, Message } = require('../dist')

const mesa = new Mesa({
    port: 4000,

    reconnect: {
        enabled: true,
        interval: 5000
    },
    heartbeat: {
        enabled: true,
        interval: 10000
    }
})

mesa.on('connection', client => {
    console.log('A client connected')
    
    client.authenticate(async ({ token }, done) => {
        const { id } = await authenticate(token)

        done(null, id)
    })

    client.on('message', message => {
        const { opcode, data, type } = message

        console.log('Recieved', opcode, data, type, 'from', client.id || 'client')
    })

    client.on('disconnect', ({ code, reason }) => {
        console.log(`Client${client.id ? ` (${client.id})` : ' '}disconnected with`, code, reason ? ('with reason', reason) : '')
    })
})