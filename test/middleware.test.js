const http = require('http')
const { default: Mesa, Message, Client } = require('../dist')

describe('middleware', () => {
  it('properly registers a middleware', done => {
    function Middleware(server) {
      done()

      return {}
    }

    const server = new Mesa({ port: 3000 })
    server.use(Middleware)
  })

  describe('handlers', () => {
    test('onConnected', done => {
      function Middleware(server) {
        return {
          onConnection: () => done()
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
          onDisconnection: () => done()
        }
      }

      const port = 4002
      const server = new Mesa({ port })
      server.use(Middleware)

      const client = new Client(`ws://localhost:${port}`)
      client.on('connected', () => client.disconnect())
    })

    test('onMessage', () => {
      const message = new Message(0, { x: 1, y: 2 }, 'TEST')

      function Middleware(server) {
        return {
          onMessage: mwMessage => {
            expect(mwMessage).toMatchObject(message)
          }
        }
      }

      const port = 4003
      const server = new Mesa({ port })
      server.use(Middleware)

      const client = new Client(`ws://localhost:${port}`)
      client.on('connected', () => client.send(message))
    })
  })
})