const WebSocket = require('ws')

const ws = new WebSocket('ws://localhost:4000')

ws.onopen = () => {
    console.log('Connected to Mesa')
}

ws.onmessage = ({ data }) => {
    let json

    try {
        json = JSON.parse(data)
    } catch(error) {
        throw error
    }

    const { op, d, t } = json
    console.log(op, d, t)

    if(op === 1)
        return ws.send(JSON.stringify({ op: 11, d: {} }))
}