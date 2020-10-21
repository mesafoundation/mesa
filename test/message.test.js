const { Message } = require('../lib')

describe('message', () => {
  describe('constructor', () => {
    it('properly unpacks a message', () => {
      const message = new Message(0, { x: 0, y: '1' }, 'TEST')

      expect(message.opcode).toBe(0)
      expect(message.data).toStrictEqual({ x: 0, y: '1' })
      expect(message.type).toBe('TEST')
    })
  })

  describe('serialization', () => {
    it('properly serializes a message to json', () => {
      const message = new Message(0, {}, 'TEST')
      const serialized = { op: 0, d: {}, t: 'TEST' }

      expect(message.serialize(true)).toStrictEqual(serialized)
    })

    it('properly serializes a message to a string', () => {
      const message = new Message(0, {}, 'TEST')
      const serialized = JSON.stringify({ op: 0, d: {}, t: 'TEST' })

      expect(message.serialize(false)).toBe(serialized)
    })
  })
})
