# Mesa

Mesa is a WebSocket library that provides extra features such as heartbeats, automatic reconnection handling and Pub/Sub support.

[ws](https://www.npmjs.com/package/ws), which Mesa wraps, on its own usually isn't enough. It doesn't provide features out of the box required by modern applications which means many users either stick to [Socket.IO](https://socket.io) or write their own implementations around the `ws` package. Mesa was extracted from the WebSocket implementation in `@cryb/api` after we wanted to add robust WebSocket capabilities to other services.

In a nutshell, Mesa provides a simple, configurable wrapper that provides support for pub/sub, authentication, heartbeats and more and has powered production applications with millions of users since mid-2019.

## Features

* Heartbeat support
* Reconnection support
* Authentication support
* Message redelivery support
* Replication support via Redis
* *and many more...*

## Installation

This library is available on the [NPM registry](https://www.npmjs.com/package/@cryb/mesa). To install, run:

```bash
npm install @cryb/mesa --save
```

If you're using [Yarn](https://yarnpkg.com), run:

```bash
yarn add @cryb/mesa
```

## Usage

### Server Side

Import the library as you would with any other Node package:

```js
const Mesa = require('@cryb/mesa').default
// or using ES modules
import Mesa from '@cryb/mesa'
```

To create a Mesa server, simply write:

```js
const mesa = new Mesa({ port: 4000 })
```

We provide expansive configuration support for customising Mesa to your needs. See [Server Configuration](src/docs/server/configuration.md) for options.

Mesa uses `EventEmitter` in order to inform the application of events. Here's an example of a simple Mesa application:

```js
mesa.on('connection', client => {
  console.log('Client connected')

  client.on('message', message => {
    const { data, type } = message

    console.log('Recieved', data, type)
  })

  client.on('disconnect', (code, reason) => {
    console.log('Client disconnected')
  })
})
```

Sending messages to clients or globally is easy. Simply import `Message` from Mesa and use the following API:

```js
// Sending globally
mesa.send(new Message(0, { disabled: true }, 'MANIFEST_UPDATE'))

// You can also limit to certain authenticated client ids
mesa.send(new Message(0, { content: 'Hey!' }, 'NEW_MESSAGE'), ['0', '1', '2']) // Only send to connected clients with id 0, 1, 2
mesa.send(new Message(0, { userId: '1', status: 'online' }, 'STATUS_UPDATE'), ['*'], ['1']) // Send to all connected clients except client with id 1

// Sending to clients
client.send(new Message(0, {}, 'LOGOUT'))
```

It's your call on how you wish to handle messages, but we recommend using a switch statement based on the type:

```js
client.on('message', message => {
  const { data, type } = message

  switch(type) {
    case 'STATUS_UPDATE':
    handleStatusUpdate(data.status, client.id)
    break
    case 'TYPING_STATUS':
    setUserTyping(data.typing, client.id)
    break
  }
})
````

### Server Guides

We supply a number of guides for fully utilising Mesa server:

#### Replication

* [Using Pub/Sub](src/docs/server/pubsub.md)
  * Replicate messages across multiple Mesa instances
* [Using Namespaces](src/docs/server/namespaces.md)
  * Run multiple Mesa instances in different namespaces

#### Clients

* [Authenticating Clients](src/docs/server/client/authentication.md)
  * Authenticate connecting clients

#### Messages

* [Redelivering Messages](src/docs/server/message/sync.md)
  * Ensure clients recieve missed messages upon reconnection
* [Handling Messages using Portal](src/docs/server/message/portal.md)
  * Recieve and handle client messages from anywhere in your codebase
* [Sending Messages using Dispatcher](src/docs/server/message/dispatcher.md)
  * Send messages to clients from anywhere in your codebase

#### Middleware

* [Using Middleware](src/docs/server/middleware/using.md)
  * Extend your Mesa server with new functionality and minimal effort
* [Creating Middleware](src/docs/server/middleware/creating.md)
  * Create powerful middleware handlers to hook into Mesa's event system

### Client Side

*Note: we currently provide client libraries for Node-based JavaScript. For a browser-based client library, see [mesa-js-client](https://github.com/neoncloth/mesa-js-client).*

Import the Client export from the library as you would with any other Node package:

```js
const { Client } = require('@cryb/mesa')
// or using ES modules
import { Client } from '@cryb/mesa'
```

To connect to a Mesa server, simply write:

```js
const client = new Client('ws://localhost:4000')
```

*Note: the URL provided needs to be the standard WebSocket connection URI for your Mesa server.*

We provide expansive configuration support for customising the Mesa client to your needs. See [Client Configuration](src/docs/client/configuration.md) for options.

We use the EventEmitter in order to inform the application of events from the Mesa server. Here's an example of a simple client application:

```js
const client = new Client('ws://localhost:4000')

client.on('connection', () => {
  console.log('Client connected')
})

client.on('message', message => {
  const { data, type } = message

  console.log('Recieved', data, type)
})

client.on('disconnected', (code, reason) => {
  console.log('Client disconnected')
})
```

Sending messages to the server works the same way as sending messages to clients from Mesa:

```js
client.send(new Message(0, { status: 'online' }, 'STATUS_UPDATE'))
```

Handling messages is identical to how messages are handled on the server, so again it's your choice on how you choose to implement this

### Client Guides

We supply a number of guides for fully utilising Mesa client:

* [Authentication](src/docs/client/authentication.md)
  * Authenticate clients against your Mesa server

## Extras

* [Chat App](https://chat.mesa.ws)
  * chat.mesa.ws is an example chat app using `Mesa.Server` and `mesa-js-client`. [Source Code](https://github.com/neoncloth/mech)
* [Echo Server](https://echo.mesa.ws)
  * echo.mesa.ws is an echo server for testing Mesa connections
* [Gateway Server](https://github.com/darnfish/mega)
  * Mega is a gateway server utilising Mesa that can be configured via environment variables
* [Client Libraries](/src/docs/client-libraries.md)
  * Our guidance on using available client libraries or creating your own

## License

MIT

## Questions / Issues

If you have an issues with `@cryb/mesa`, please either open a GitHub issue, contact a maintainer or join the [Cryb Discord Server](https://discord.gg/xdhEgD5) and ask in `#tech-support`.
