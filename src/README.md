![Cryb OSS](.github/cryb.png "Cryb OSS Logo")

_**Mesa** — Robust, reliable WebSockets_

[![GitHub contributors](https://img.shields.io/github/contributors/crybapp/mesa)](https://github.com/crybapp/mesa/graphs/contributors) [![License](https://img.shields.io/github/license/crybapp/mesa)](https://github.com/crybapp/mesa/blob/master/LICENSE) [![Patreon Donate](https://img.shields.io/badge/donate-Patreon-red.svg)](https://patreon.com/cryb)

## Docs
* [Info](#info)
    * [Features](#features)
        * [Planned Features](#planned-features)
    * [Status](#status)
* [Codebase](#codebase)
  * [Code Style](#code-style)
* [Installation](#installation)
* [Usage](#usage)
    * [Server Side](#server-side)
        * [Authenticating Clients](#authenticating-clients)
        * [Message Sync](#message-sync)
          * [Client Sync Options](#client-sync-options)
        * [Dispatch Events](#dispatch-events)
        * [Portals](#portals)
    * [Client Side](#client-side)
        * [JavaScript](#javascript)
            * [Authentication](#authentication)
    * [Opcodes](#opcodes)
  * [Configuration](#configuration)
* [Client Libraries](#client-libraries)
  * [Creating a Client Library](#creating-a-client-library)
  * [Future Libraries](#future-libraries)
* [Questions / Issues](#questions--issues)

## Info
`@cryb/mesa` is a wrapper around the [ws](https://www.npmjs.com/package/ws) library that provides extra features such as heartbeats, automatic reconnection handling and Redis pub/sub support.

`ws` on its own usually isn't enough. It doesn't provide features out of the box required by modern applications such as replication support and reconnection handling. Many users either stick to [Socket.IO](https://socket.io) or write their own implementations for authentication, reconnections and pub/sub around the `ws` package.

Mesa was created to provide a wrapper around `ws` to allow developers to quickly deploy a WebSocket server with all the features they need a simple configuration update away.

Modeled somewhat after Discord's WebSockets, Mesa was first created by [William](https://github.com/neoncloth) in a client project before making its way into `@cryb/api`. After a while we wanted to add WebSocket capabilities to other services we were working on utilising the robust WebSocket solution we had created in `@cryb/api`. Thus, Mesa was born.

In a nutshell, Mesa provides a simple, configurable wrapper that provides support for pub/sub, authentication, heartbeats and more and has powered production applications with millions of users since mid-2019

### Features
* Heartbeat support
* Message sync support
* Reconnection support
* Authentication support
* Global dispatch events
* Pub/sub support via Redis

#### Planned Features
* Specification
* Redis config support
* Better error reporting
* Custom message interface
* Less dependency on Redis
* Plugin / middleware support
* Better disconnection handling

### Status
`@cryb/mesa` has been actively developed since December 2019

## Codebase
The codebase for `@cryb/mesa` is written in JavaScript, utilising TypeScript and Node.js

### Code Style
We ask that you follow our [code style guidelines](https://github.com/crybapp/library/blob/master/code-style/STYLE.md) when contributing to this repository.

We use TSLint in order to lint our code. Run `yarn lint` before committing any code to ensure it's clean.

*Note: while we have most rules covered in our `tslint.json` config, it's good practice to familarise yourself with our code style guidelines*

## Installation
This library is available on the [NPM registry](https://www.npmjs.com/package/@cryb/mesa). To install, run:
```bash
npm i @cryb/mesa --save
```
If you're using [Yarn](https://yarnpkg.com), run:

```bash
yarn add @cryb/mesa
```

## Usage
### Server Side
Import the library as you would with any other Node package:
```js
const Mesa = require('@cryb/mesa')
// or using ES modules
import Mesa from '@cryb/mesa'
```

To create a Mesa server, simply write:
```js
const mesa = new Mesa({ port: 4000 })
```

We provide expansive configuration support for customising Mesa to your needs. See [Configuration](#configuration) for options.

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

From here, everything should be fairly self explanatory. We'll share more guides once we implement more features for Mesa

#### Authenticating Clients
Mesa supports client authentication through a simple API that can adapt to support your authentication infrastructure. To authenticate a user from Mesa, use the following API:

```js
const server = new Mesa({
  port: 4000,
  /**
   * Optional: supply a namespace so different Mesa servers running on a cluster don't interfere with each other
   */
  namespace: 'api',
  /**
   * Optional: supply a Redis URI to make full use of Authentication via Pub/Sub
   */
  redis: 'redis://localhost:6379'
})

mesa.on('connection', client => {
  /**
   * When a client connects and sends an authentication message, it can be handled here.
   * 
   * This authentication method takes in a callback that is called with two parameters: data (sent from the client) and done (supplied by Mesa).
   * 
   * This method is called when a client sends a opcode 2 message. For example, it would look like {"op": 2, d: { "token": ... }}
   */
  client.authenticate(async ({ token }, done) => {
    try {
      /**
       * Once authentication data has been supplied from the client message, you can authenticate via a call to a microservice or database lookup
       */
      const { data: user } = await axios.post('http://localhost:4500', { token }),
        { info: { id } } = user

      /**
       * Once you have authenticated the user, call the done method supplied in the callback with two parameters.
       * 
       * The first parameter should be an error incase there was an issue authenticating this user. If there was no issue, supply null.
       * 
       * The second parameter should be an object containing the user ID and the user object. The user ID will be used for Redis Pub/Sub and will be available in the client.id property. If there was an error, do not supply this value or simply supply null
       */
      done(null, { id, user })
    } catch(error) {
      // Feel free to use a try/catch to resolve done with an error
      done(error)
    }
  })
})
```

Our use of Redis Pub/Sub relies on a client being authenticated. If you haven't authenticated your client Mesa will not make use of Pub/Sub with this client. Other authenticated clients will have their messages proxied by Pub/Sub

#### Message Sync
Mesa suports message sync, allowing clients that have been disconnected either purposefully or unpurposefully to recieve any messages that couldn't be delivered.

To enable message sync, add the following to your config:
```js
const server = new Mesa({
  port: 4000,
  // Redis is required for message sync
  redis: 'redis://localhost:6379',

  sync: {
    enabled: true
  },
  authentication: {
    // storeConnectedUsers is also required for message sync
    storeConnectedUsers: true
  }
})
```

Now any time a message is sent to an offline client, either using `Mesa.send` or `Dispatcher.dispatch`, it'll automatically be sent as soon as they connect.

*Note: If you're using the Dispatcher API, make sure that `sync.enabled` is set to `true` in your Dispatcher config.*

Clients will recieve undelivered messages in this format:
```json
{ "op": 0, "d": {}, "t": "EXAMPLE_MESSAGE", "s": 3 }
```

The `s` property notates the sequence position of the message. This is used to help clients reconstruct the order undelivered messages were supposed to be recieved in.

If you want to implement a custom interval between message redeliveries, use the following configuration on the Mesa server:
```js
sync: {
  enabled: true,

  redeliveryInterval: 1000 // 1 second
}
```

Authentication via the `client.authenticate` API is required for message sync to work

##### Client Sync Options
We also support client configuration for message sync. For example, if a client is connecting to Mesa alongside reaching out to a REST API on its initial state load, the client can opt-out of recieving missed messages using the following API:
```js
client.authenticate({ token: fetchToken() }, { shouldSync: false })
```

If you want to only use sync on reconnects, look at the following example using [`mesa-js-client`](https://github.com/neoncloth/mesa-js-client):
```js
client.on('connection', async ({ isInitialConnection }) => {
  console.log('Connected to Mesa')

  // Only sync on connections after first connection or on reconnections
  await client.authenticate({ token: fetchToken() }, { shouldSync: !isInitialConnection })
})
```

#### Dispatch Events
Dispatch events are server-side events that are used to send messages to Mesa clients throughout a large codebase. Codebases that split their code up between multiple files will find dispatch events particularly useful.

To use dispatch events you'll need a Redis instance and Pub/Sub to be enabled on the core Mesa server. To create a dispatch event, import the `Dispatcher` module from Mesa:
```js
const { Dispatcher } = require('@cryb/mesa')
// or using ES modules
import { Dispatcher } from '@cryb/mesa'
```

Then create a new Dispatcher instance and pass in your Redis URI or config:
```js
const dispatcher = new Dispatcher('redis://localhost:6379')
```

We provide expansive configuration support for customising Dispatcher to your needs. Here's a rundown of options we provide:
```ts
{
  // Optional: namespace for Redis events. This should match the namespace on the Mesa server you're targetting if that Mesa server has a namespace
  namespace?: string

  // Optional
  sync?: {
    // Enable / disable message sync. Defaults to false
    enabled: boolean
  }
}
```

To supply this config, pass it into the Dispatcher constructor as you would with any other configuration:
```js
const dispatcher = new Dispatcher('redis://localhost:6379', {
  namespace: 'api',

  sync: {
    enabled: true
  }
})
```

Now that a Dispatcher instance has been created, use it to emit events to authenticated clients:
```js
// This sends a message to clients with the id 0 and 1.
dispatcher.dispatch(new Message(0, { status: 'online' }, 'STATUS_UPDATE'), ['0', '1'])
```

We also allow for a third option that filters out any client ids from the recipients. Here's an example:
```js
room.on('message', (content, author) => {
  // Supplying the third array will not send the message to the author of the message.
  // This is useful when using Mesa in conjunction with a REST API where state has already been updates for the author
  dispatcher.dispatch(new Message(0, { content, author }, 'NEW_MESSAGE'), room.members, [author])
})
```

If you want to dispatch a message to all connected clients, supply a single asterisk in the recipient array:
```js
dispatcher.dispatch(new Message(0, { alert: true, content: 'Hello World' }, 'GLOBAL_ALERT'), ['*'])
```

*Note: the excluding option passed in as the third element will not work with global dispatch messages*

<!-- We also support dispatch events which are events not sent to clients but are used to handle client connections.
```js
// This disconnects an authenticated client with the id of 0.
dispatcher.dispatch(new DispatchEvent('DISCONNECT_CLIENT'), ['0'])
```

In the future we'll create an API for creating and handling custom dispatch events.

*Note: in the future we plan to migrate from Dispatcher connecting via Redis Pub/Sub to directly connecting to Mesa. The Dispatcher API is early, so please keep this in mind while writing implementations* -->

#### Portals
Portals allow you to handle messages sent from Mesa clients to a detatched gateway server from anywhere in your codebase. Portals are especially useful in large, replicated environments.

First, enable Portals in your Mesa server config:
```js
const mesa = new Mesa({
  port: 4000,

  portal: {
    enabled: true
  }
})
```

We also supply an option called `MesaConfig.portal.distributeLoad`. This option is enabled by default and will send messages to Portal instances in order. Disabling this option will choose a random Portal to handle your message.

There are other configuration options on the `MesaConfig.portal` object. For a full rundown, see [Configuration](#configuration).

To use Portals, you'll need to import the `Portal` module from Mesa:
```js
const { Portal } = require('@cryb/mesa')
// or using ES modules
import { Portal } from '@cryb/mesa'
```

Then create a new Portal instance and pass in your Redis URI or config:
```js
const portal = new Portal('redis://localhost:6379')
```

We provide expansive configuration support for customising Portal to your needs. Here's a rundown of options we provide:
```
{
  // Optional: namespace for Redis events. This should match the namespace on the Mesa server you're targetting if that Mesa server has a namespace
  namespace?: string
  // Optional: log Portal-related events on startup and closure. Defaults to false
  verbose?: boolean

  // Optional: ensure all events are sent to this Portal instance. Defaults to false
  reportAllEvents?: boolean
}
```

To supply this config, pass it into the Portal constructor as you would with any other configuration:
```js
const portal = new Portal('redis://localhost:6379', {
  namespace: 'api',
  verbose: true,

  reportAllEvents: false
})
```

Once you have your Portal setup, you can listen to new messages using the `EventEmitter` API:
```js
portal.on('connection', () => {
  console.log('Client connected')
})

portal.on('authentication', clientId => {
  console.log('Client authenticated with id', clientId)
})

portal.on('message', message => {
  const { opcode, data, type } = message

  console.log('Recieved', opcode, data, type)
})

portal.on('disconnection', clientId => {
  if (!clientId)
    return console.log('Client disconnected')

  console.log('Authenticated client with id', clientId, 'disconnected')
})
```

By default, messages sent to Mesa servers are only sent to a single Portal in order to ensure events are not handled in two different places. If you want to capture all events using a Portal, set `reportAllEvents` to `true` in you Portal config.

*Note: Unless you are using `reportAllEvents` or have a single Portal instance running, you should never update application state using Portals. There is no guarentee a single Portal will recieve the same `connection`, `authentication`, `message`, and `disconnection` events for the same client. You should use Portals to forward messages to clients or update an existing database.*

An example of a Chat application handling events using Portals would look something like this:
```js
import { Portal, Dispatcher, Message } from '@cryb/portal'
import { setStatus, fetchRoomByMemberId }  from './chat'

const namespace = 'chat',
      redisUri = 'redis://localhost:6379',
      portal = new Portal(redisUri, { namespace }),
      dispatcher = new Dispatcher(redisUri, { namespace })

// We recommend you update client status on portal.authentication and not portal.connected
portal.on('authentication', clientId => {
  setStatus('online', clientId)
})

portal.on('message', message => {
  const { members } = fetchRoomByMemberId(message.clientId)

  dispatcher.dispatch(new Message(0, { content: message.content }, 'NEW_MESSAGE'), members, message.clientId)
})

portal.on('disconnection', clientId => {
  setStatus('offline', clientId)
})
```

### Client Side
We currently provide client libraries for Node-based JavaScript. For a browser-based client library, see [mesa-js-client](https://github.com/neoncloth/mesa-js-client)

#### <a name="client-authentication"></a> JavaScript
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
*Note: the URL provided needs to be the standard WebSocket connection URI for your Mesa server*

We provide expansive configuration support for customising the Mesa client to your needs. Here's a rundown of options we provide:
```ts
{
  // Optional: enable/disable auto connection to the Mesa server once the client object has been instantiated. Enabled by default. Once disabled, use the 'connect()' method in order to connect the client to the Mesa server
  autoConnect?: boolean
}
```

To supply this config, pass it into the Client constructor as you would with any other configuration:
```js
const client = new Client('ws://localhost:4000', {
  // Options go here
})
```

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

##### Authentication
Mesa interacts with the server in order to authenticate the client using a simple API. In order to authenticate with the server, you can use the `Client.authenticate` API. See the following example:
```js
const client = new Client('ws://localhost:4000')

client.on('connection', async () => {
  console.log('Client connected')

  const user = await client.authenticate({ token: fetchToken() })
  console.log(`Hello ${user.name}!`)
})
```

We allow clients to provide a configuration for authenticating with Mesa, alongside their authorization object. Here's a rundown of options we provide:
```ts
{
  // Optional: specifies if the server should send any missed messages as per the Sync feature. Defaults to true
  shouldSync?: boolean
}
```

### Opcodes
Mesa relies on opcodes to identify different event types. While internal Mesa events uses opcodes 1 to 22, these may be useful to know for building a custom client for example.

We recommend that you keep to opcode 0 for sending / recieving events via Mesa to minimalise errors and interference with internal Mesa events

| **Code** | **Name**           | **Client Action** | **Description**                                                                          |
|----------|--------------------|-------------------|------------------------------------------------------------------------------------------|
| 0        | Dispatch           | Send/Receive      | Sent by both Mesa and the client to transfer events                                      |
| 1        | Heartbeat          | Send/Recieve      | Sent by both Mesa and the client for ping checking                                       |
| 2        | Authentication     | Send              | Sent by the client to authenticate with Mesa                                             |
| 5        | Internal Event     | N/A               | Sent and recieved by internal server components                                          |
| 10       | Hello              | Recieve           | Sent by Mesa alongside server information for client setup                               |
| 11       | Heartbeat ACK      | Receive           | Sent by Mesa to acknowledge a heartbeat has been received                                |
| 22       | Authentication ACK | Receive           | Sent by Mesa alongside user information to acknowledge the client has been authenticated |

### Configuration
Mesa's Server component allows for the following configuration to be passed in during initialization:
```ts
{
  // Optional: port that Mesa should listen on. Defaults to 4000
  port: number
  // Optional: namespace for Redis events. If you have multiple Mesa instances running on a cluster, you should use this
  namespace: string

  // Optional: allow Mesa to use an already established HTTP server for listening
  server: http.Server | https.Server
  // Optional: support for pub/sub via Redis
  redis: Redis.RedisOptions | string

  // Optional
  client?: {
    // Optional: enforce the same Mesa version between server and client. Defaults to false
    enforceEqualVersions?: boolean
  }
  // Optional
  options?: {
    // Optional: store messages on the client object. This setting applies to both server and client instances. Defaults to false
    storeMessages?: boolean
  }

  // Optional
  sync?: {
    // Enable / disable message sync. Defaults to false
    enabled: boolean

    // Optional: the interval in ms of message redeliveries. Defaults to 0ms
    redeliveryInterval?: number
  }
  // Optional
  portal?: {
    // Enable / disable portals. Defaults to false
    enabled: boolean

    // Optional: try and distribute messages between Portals as best as possible. Defaults to true
    distributeLoad?: boolean
  }
  // Optional
  heartbeat?: {
    // Enable / disable heartbeats. Defaults to false
    enabled: boolean

    // Optional: interval in ms for how often heartbeats should be sent to clients. Defaults to 10000ms
    interval?: number
    // Optional: how many heartbeats Mesa should send before closing the connection. Defaults to 3
    maxAttempts?: number
  }
  // Optional
  reconnect?: {
    // Enable / disconnect reconnects. Defaults to false
    enabled: boolean

    // Optional: interval in ms for how often a client should try to reconnect once disconnected from a Mesa server. Defaults to 5000ms
    interval?: number
  }

  // Optional
  authentication?: {
    // Optional: interval in ms for how long a client has to send authentication data before being disconnected from a Mesa server. Defaults to 10000ms
    timeout?: number

    // Optional: messages sent using Mesa.send will not be sent to unauthenticated clients. Defaults to false
    required?: boolean
    // Optional: send the user object to the client once authentication is complete. Defaults to true
    sendUserObject?: boolean
    // Optional: disconnect the user if authentication failed. Defaults to true
    disconnectOnFail?: boolean
    // Optional: store the IDs of connected users in a Redis set called connected_clients. Defaults to true
    storeConnectedUsers?: boolean
  }
}
```

## Client Libraries
While we have an official Client implementation for Node.js in this library, we do offer client libraries for other languages. Here's a list of official or community maintained client libraries:

* [mesa-js-client](https://github.com/neoncloth/mesa-js-client) for browser-based JavaScript. Maintained by William from Cryb
* [mesa-react-native](https://gist.github.com/neoncloth/0152667cecd9ffad21b6939ecc82a87e) for React Native. Maintained by William from Cryb

### Creating a Client Library
We'd love for the community to create implementations of the Mesa client. Make sure to title the library in the style of `mesa-lang-client`. For example, a Go library would take the name of `mesa-go-client`.

In the future we'll publish a specification so it's easier to understand how the client interacts with a Mesa server, but for now please look over [`client.ts`](https://github.com/crybapp/mesa/blob/master/src/client/index.ts). If you do create a client library, please let us know [on our Discord](https://discord.gg/ShTATH4)

### Future Libraries
We'd love to see client implementations of Mesa in the all languages, but these are the languages we have our eye on—ordered by priority:

* [Swift](https://swift.org)
* [Go](https://golang.org)

## Questions / Issues
If you have an issues with `@cryb/mesa`, please either open a GitHub issue, contact a maintainer or join the [Cryb Discord Server](https://discord.gg/ShTATH4) and ask in #tech-support
