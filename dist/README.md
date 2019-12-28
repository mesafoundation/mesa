![Cryb OSS](.github/cryb.png "Cryb OSS Logo")

_**Mesa** - Robust, reliable WebSockets_

[![GitHub contributors](https://img.shields.io/github/contributors/crybapp/mesa)](https://github.com/crybapp/mesa/graphs/contributors) [![License](https://img.shields.io/github/license/crybapp/mesa)](https://github.com/crybapp/mesa/blob/master/LICENSE) [![Patreon Donate](https://img.shields.io/badge/donate-Patreon-red.svg)](https://patreon.com/cryb)

## Docs
* [Info](#info)
    * [Features](#features)
        * [Implemented Features](#implemented-features)
* [Installation](#installation)
* [Usage](#usage)
    * [Server Side](#server-side)
        * [Authentication](#authentication)
    * [Client Side](#client-side)
* [Questions / Issues](#questions--issues)

## Info
`@cryb/mesa` is a wrapper around the [ws](https://www.npmjs.com/package/ws) library that provides extra features ontop of WebSockets such as Heartbeats and Redis PUB/SUB.

`ws` on its own is incredibly bare. It doesn't provide support for high throughput modern applications such as scaling support, heartbeats, reconnection acks. Furthermore, many applications have to write their own implementations for user authentication while using WebSockets.

Mesa was written to provide a robust solution to this. Modeled after Discord's WebSockets, Mesa was first utilised in `@cryb/api`. After a while, we wanted to expand our microservices utilising the robust WebSocket solution we had instilled in `@cryb/api`. Thus, Mesa was born.

In a nutshell, Mesa provides a simple wrapper that provides support for pub/sub, authentication, heartbeats and more.

*Mesa is still in early development. Not all features are finished, and things may break. Be careful - this is not suited for production environments just yet.*

### Features
* Pub/sub support via Redis
* Heartbeat support
* Reconnection support
* Authentication support

#### Implemented Features
* Pub/sub support via Redis
* Heartbeat support
* Reconnection support
* Authentication support

## Installation
This library is available on the [NPM registry](https://www.npmjs.com/package/@cryb/mesa). To install, run
```bash
npm i @cryb/mesa --save
```
If you're using [Yarn](https://yarnpkg.com), run

```bash
yarn add @cryb/mesa
```

## Usage
### Server Side
Import the library as you would with any other Node package
```js
const Mesa = require('@cryb/mesa')
// or using ES modules
import Mesa from '@cryb/mesa'
```

To create a Mesa server, simply write:
```js
const server = new Mesa({ port: 4000 })
```

We provide expansive configuration support for customising Mesa to your needs. Here's a rundown of options we provide:
```ts
{
    // Optional: port that Mesa should listen on. Defaults to 4000
    port: number
    // Optional: support for pub/sub via Redis
    redis: Redis.RedisOptions | string

    // Optional: allow Mesa to use an already established HTTPServer for listening. Feature currently unsupported
    server: http.Server

    // Optional
    heartbeat?: {
        // Enable / disable heartbeats
        enabled: boolean

        // Optional: interval in ms for how often heartbeats should be sent to clients. Defaults to 10000ms
        interval: number
        // Optional: how many heartbeats Mesa should send before closing the connection. Defaults to 3
        maxAttempts: number
    }
    // Optional
    reconnect?: {
        // Enable / disconnect reconnects
        enabled: boolean

        // Optional: interval in ms for how often a client should try to reconnect once disconnected from a Mesa server. Defaults to 5000ms
        interval?: number
    }

    // Optional
    authentication: {
        // Optional: interval in ms for how long a client has to send authentication data before being disconnected from a Mesa server. Defaults to 10000ms
        timeout?: number
    }
}
```

Mesa uses EventEmitter in order to inform the application of events. Here's an example of a simple Mesa application:
```js
mesa.on('connection', client => {
    console.log('Client connected')

    client.on('message', message => {
        const { data, type } = message

        console.log('Recieved', data, type)
    })

    client.on('disconnect', ({ code, reason }) => {
        console.log('Client disconnected')
    })
})
```

From here, everything should be fairly self explanatory. We'll share more guides once we implement more features for Mesa.

#### Authentication
Mesa supports client authentication through a simple API that can adapt to support your authentication infrastructure. To authenticate a user from Mesa, use the following API:

```js
const server = new Mesa({
    port: 4000,
    redis: 'redis://localhost:6379' // Optional: Supply a Redis URI to make full use of Authentication via PUB/SUB
})

mesa.on('connection', client => {
    // When a client connects and sends an authentication message, it can be handled here.
    // This authentication method takes in a callback that is called with two parameters: data (sent from the client) and done (supplied by Mesa).
    // This method is called when a client sends a opcode 2 message. For example, it would look like {"op": 2, d: { "token": ... }}
    client.authenticate(async ({ token }, done) => {
        try {
            // Once authentication data has been supplied from the client message, you can authenticate via a call to a microservice or database lookup
            const { data: user } = await axios.post('http://localhost:4500', { token }),
                    { info: { id } } = user

            // Once you have authenticated the user, call the done method supplied in the callback with two parameters.
            // The first parameter should be an error incase there was an issue authenticating this user. If there was no issue, supply null.
            // The second parameter should be an object containing the user ID and the user object. The user ID will be used for Redis PUB/SUB and will ...
            // ... be available in the client.id property. If there was an error, do not supply this value or simply supply null
            done(null, { id, user })
        } catch(error) {
            // Feel free to use a try/catch to resolve done with an error
            done(error)
        }
    })
```

Our use of Redis PUB/SUB relies on a client being authenticated. If you haven't authenticated your client Mesa will not make use of PUB/SUB with this client. Other authenticated clients will have their messages proxied by PUB/SUB

### Client Side
We are working on several client implementations for JavaScript, Swift and more languages. For now, refer to this implementation using native WebSockets.

*Once client implementations are created, we don't recommend interfacing with Mesa using custom-built clients utilising WebSocket frameworks.*

```js
const ws = new WebSocket('ws://localhost:4000')

ws.onopen = () => {
    console.log('Connected to Mesa')

    // Authentication support
    // ws.send(JSON.stringify({ op: 2, d: { token: fetchToken() }}))
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

    // Heartbeat Support
    if(op === 1)
        return ws.send(JSON.stringify({ op: 11, d: {} }))
}
```

## Questions / Issues
If you have an issues with `@cryb/mesa`, please either open a GitHub issue, contact a maintainer or join the [Cryb Discord Server](https://discord.gg/ShTATH4) and ask in #tech-support.