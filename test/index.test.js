const http = require('http')
const { default: Mesa, Message, Client } = require('../dist')

describe('server', () => {
	describe('client', () => {
		it('allows a client to connect', done => {
			const port = 1000,
						server = new Mesa({ port }),
						client = new Client(`ws://localhost:${port}`)

			server.on('connection', () => server.wss.close(done))
		})

		it('can recieve a message from a client', done => {
			const port = 1001,
						server = new Mesa({ port }),
						client = new Client(`ws://localhost:${port}`),
						message = new Message(0, { x: 1, y: 2 }, 'TEST')

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
			const port = 2000,
						server = new Mesa({ port }),
						client = new Client(`ws://localhost:${port}`)

			server.on('connection', () => server.wss.close(done))
		})

		it('uses a pre-existing http server', done => {
      const server = http.createServer()

      server.listen(2001, () => {
        const mesaServer = new Mesa({ server }),
        			client = new WebSocket(`ws://localhost:${server.address().port}`)

        mesaServer.on('connection', () => {
        	mesaServer.wss.close()
        	server.close(done)
        })
      })
		})
	})
})

describe('message', () => {
	describe('serialization', () => {
		test('does a message properly serialize to json', () => {
			const message = new Message(0, {}, 'TEST'),
						serialized = { op: 0, d: {}, t: 'TEST' }

			expect(message.serialize(true)).toStrictEqual(serialized)
		})

		test('does a message properly serialize to a string', () => {
			const message = new Message(0, {}, 'TEST'),
						serialized = JSON.stringify({ op: 0, d: {}, t: 'TEST' })

			expect(message.serialize(false)).toBe(serialized)
		})
	})
})
