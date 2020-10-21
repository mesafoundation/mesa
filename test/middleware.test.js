const http = require('http')
const { default: Mesa, Message, Client } = require('../lib')

describe('middleware', () => {
  it('properly registers a middleware', done => {
    function Middleware(server) {
      server.wss.close(done)

      return {}
    }

    const server = new Mesa({ port: 3000 })
    server.use(Middleware)
  })

  describe('handlers', () => {
    test('onConnected', done => {
      function Middleware(server) {
        return {
          onConnection: () => server.wss.close(done)
        }
      }

      const port = 4001
      const server = new Mesa({ port })
      server.use(Middleware)

      new Client(`ws://localhost:${port}`)
    })

    test('onDisconnection', done => {
      function Middleware(server) {
        return {
          onDisconnection: () => server.wss.close(done)
        }
      }

      const port = 4002
      const server = new Mesa({ port })
      server.use(Middleware)

      const client = new Client(`ws://localhost:${port}`)
      client.on('connected', () => client.disconnect())
    })

    test('onMessageReceivedAndDisconnection', done => {
      const message = new Message(0, { x: 1, y: 2 }, 'TEST')

      function Middleware(server) {
        return {
          onMessageReceived: mwMessage => {
            expect(mwMessage).toMatchObject(message)
          },
          onDisconnection: () => server.wss.close(done)
        }
      }

      const port = 4003
      const server = new Mesa({ port })
      server.use(Middleware)

      const client = new Client(`ws://localhost:${port}`)
      client.on('connected', () => {
        client.send(message)
        client.disconnect()
      })
    })
  })
})
