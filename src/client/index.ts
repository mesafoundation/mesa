import WebSocket from 'ws'
import EventEmitter from 'events'

interface ClientConfig {}

export default class Client extends EventEmitter {
    ws: WebSocket
    url: string

    constructor(url: string, config?: ClientConfig) {
        super()

        this.ws = new WebSocket(url)
    }
}