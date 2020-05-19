const { default: Mesa, Message, Client } = require('../dist')

let server,
		client

beforeAll(() => {
	server = new Mesa({ port: 6969 })
	client = new Client('ws://localhost:6969', { autoConnect: false })
})

describe('server/client', () => {
	test('can a client connect to a server', async () => {
		const connected = jest.fn()
		client.connect()

		await new Promise(resolve => {
			client.on('connected', () => {
				resolve()
				connected()

				expect(connected).toHaveBeenCalled()
			})
		})
	})

	test('can a client send a message', async () => {
		const recieved = jest.fn()

		const sending = new Message(0, { x: 1 }, 'TEST')
		client.send(sending)

		await new Promise(resolve => {
			server.on('message', recieving => {
				resolve()
				recieved(recieving)

				expect(recieved).toHaveBeenCalledWith(sending)
			})
		})
	})

	// test('can a server send a message', async () => {
	// 	const recieved = jest.fn()

	// 	const sending = new Message(0, { x: 1 }, 'TEST')
	// 	server.send(sending)

	// 	await new Promise(resolve => {
	// 		client.on('message', recieving => {
	// 			resolve()
	// 			recieved(recieving)

	// 			expect(recieved).toHaveBeenCalledWith(sending)
	// 		})
	// 	})
	// })
})

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

afterAll(() => {
	// console.log(client.ws.readyState)
	server.wss.close()
})
