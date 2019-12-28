import WebSocket from 'ws'
import { EventEmitter } from 'events'

interface ClientConfig {}

declare interface Client extends EventEmitter {}

class Client extends EventEmitter {
    ws: WebSocket
    url: string

    constructor(url: string, config?: ClientConfig) {
        super()

        this.ws = new WebSocket(url)
    }
}

export default Client