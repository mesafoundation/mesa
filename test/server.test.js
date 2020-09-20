const http = require('http')
const { default: Mesa, Message, Client } = require('../lib')

describe('server', () => {
  describe('client', () => {
    it('allows a client to connect', done => {
      const port = 2000
      const server = new Mesa({ port })
      const client = new Client(`ws://localhost:${port}`)

      server.on('connection', () => server.wss.close(done))
    })

    it('can recieve a message from a client', done => {
      const port = 2001
      const server = new Mesa({ port })
      const client = new Client(`ws://localhost:${port}`)
      const message = new Message(0, { x: 1, y: 2 }, 'TEST')

      client.on('connected', () => {
        client.send(message)
      })

      server.on('message', recievedMessage => {
        expect(recievedMessage).toMatchObject(message)

        server.wss.close(done)
      })
    })
  })

  describe('config', () => {
    it('starts on a given port', done => {
      const port = 2100
      const server = new Mesa({ port })
      const client = new Client(`ws://localhost:${port}`)

      server.on('connection', () => server.wss.close(done))
    })

    it('starts on a given path', done => {
      const port = 2102
      const server = new Mesa({ port, path: '/ws' })
      const client = new Client(`ws://localhost:${port}/ws`)

      server.on('connection', () => server.wss.close(done))
    })

    it('uses a pre-existing http server', done => {
      const server = http.createServer()

      server.listen(2101, () => {
        const mesaServer = new Mesa({ server })
        const client = new WebSocket(`ws://localhost:${server.address().port}`)

        mesaServer.on('connection', () => {
          mesaServer.wss.close()
          server.close(done)
        })
      })
    })
  })
})
