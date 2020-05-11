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
        * [Dispatch Events](#dispatch-events)
    * [Client Side](#client-side)
        * [JavaScript](#javascript)
            * [Authentication](#authentication)
    * [Opcodes](#opcodes)
* [Client Libraries](#client-libraries)
	* [Creating a client library](#creating-a-client-library)
	* [Future Libraries](#future-libraries)
* [Questions / Issues](#questions--issues)

## Info
`@cryb/mesa` is a wrapper around the [ws](https://www.npmjs.com/package/ws) library that provides extra features ontop of WebSockets such as Heartbeats and Redis Pub/Sub.

`ws` on its own is incredibly bare. It doesn't provide support for high throughput modern applications such as scaling support, heartbeats, reconnection acks. Furthermore, many applications have to write their own implementations for user authentication while using WebSockets.

Mesa was written to provide a robust solution to this. Modeled after Discord's WebSockets, Mesa was first utilised in `@cryb/api`. After a while we wanted to expand our microservices utilising the robust WebSocket solution we had instilled in `@cryb/api`. Thus, Mesa was born.

In a nutshell, Mesa provides a simple wrapper that provides support for pub/sub, authentication, heartbeats and more

### Features
* Heartbeat support
* Message sync support
* Reconnection support
* Authentication support
* Global dispatch events
* Pub/sub support via Redis

#### Planned Features
* Better error reporting
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
const server = new Mesa({ port: 4000 })
```

We provide expansive configuration support for customising Mesa to your needs. Here's a rundown of options we provide:
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

		// Optional: send the user object to the client once authentication is complete. Defaults to true
		sendUserObject?: boolean
		// Optional: disconnect the user if authentication failed. Defaults to true
		disconnectOnFail?: boolean
		// Optional: store the IDs of connected users in a Redis set called connected_clients. Defaults to true
		storeConnectedUsers?: boolean
	}
}
```

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
}
```

To supply this config, pass it into the Dispatcher constructor as you would with any other configuration:
```js
const dispatcher = new Dispatcher('redis://localhost:6379', {
	namespace: 'api'
})
```

Now that a Dispatcher instance has been created, use it to emit events to authenticated clients:
```js
// This sends a message to clients with the id 0 and 1.
dispatcher.dispatch(new Message(0, { status: 'online' }, 'STATUS_UPDATE'), ['0', '1'])
```

We also support dispatch events which are events not sent to clients but are used to handle client connections.
```js
// This disconnects an authenticated client with the id of 0.
dispatcher.dispatch(new DispatchEvent('DISCONNECT_CLIENT'), ['0'])
```

In the future we'll create an API for creating and handling custom dispatch events.

*Note: in the future we plan to migrate from Dispatcher connecting via Redis Pub/Sub to directly connecting to Mesa. The Dispatcher API is early, so please keep this in mind while writing implementations*

### Client Side
We currently provide client libraries for both browser and server-based JavaScript

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
Mesa interacts with the server in order to authenticate the client using a simple API. In order to authenticate with the server, you can use the `authenticate()` API. See the following example:
```js
const client = new Client('ws://localhost:4000')

client.on('connection', async () => {
	console.log('Client connected')

	const user = await client.authenticate({ token: fetchToken() })
	console.log(`Hello ${user.name}!`)
})
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

## Client Libraries
While we have an official Client implementation for Node.js in this library, we do offer client libraries for other languages. Here's a list of official or community maintained client libraries:

* [mesa-js-client](https://github.com/neoncloth/mesa-js-client) for browser-based JavaScript. Maintained by Cryb

### Creating a client library
We'd love for the community to create implementations of the Mesa client. Make sure to title the library in the style of `mesa-lang-client`. For example, a Go library would take the name of `mesa-go-client`.

In the future we'll publish a specification so it's easier to understand how the client interacts with a Mesa server, but for now please look over [`client.ts`](https://github.com/crybapp/mesa/blob/master/src/client/index.ts). If you do create a client library, please let us know [on our Discord](https://discord.gg/ShTATH4)

### Future Libraries
We'd love to see client implementations of Mesa in the all languages, but these are the languages we have our eye on—ordered by priority:

* [Swift](https://swift.org)
* [Go](https://golang.org)

## Questions / Issues
If you have an issues with `@cryb/mesa`, please either open a GitHub issue, contact a maintainer or join the [Cryb Discord Server](https://discord.gg/ShTATH4) and ask in #tech-support
