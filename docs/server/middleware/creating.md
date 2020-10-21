# Creating Middleware
Creating custom middleware is easy. First you'll want to create a function that takes in a parameter of `server`. It'll also need to return a simple object:
```js
function Middleware(server) {
  return {}
}
```

This middleware can be registered like so:
```js
mesa.use(Middleware)
```

This is the most basic middleware you can create. If you need to pass in custom information such as a configuration you can do it like so:
```js
function MiddlewareWithConfig(config) {
  return function(server) {
    return {}
  }
}
```

Now registering your middleware will look like this:
```js
mesa.use(MiddlewareWithConfig({ x: 0, y: true }))
```

If you want to listen for events, simply add [one of the handlers Mesa provides](#handler-types) as a function in the object that your middleware returns:
```js
function Logger() {
  return {
    onConnected: client => {
      console.log('A client connected')
    },

    onDisconnected: (client, code, reason) => {
      console.log('A client disconnected')
    }
  }
}
```

State management can also be conducted from inside your middleware:
```js
function Metrics() {
  let connectedCount = 0
  let messagesCount = 0

  return {
    onConnected: client => {
      connected += 1
    },
    onMessage: message => {
      messagesCount += 1
    },
    onDisconnected: (client, code, reason) => {
      connected -= 1
    }
  }
}
```

As state kept in the middleware does not persist on replicated servers or after a restart, we recommend you use Redis in order to store middleware values. We also highly recommend you use the namespace handler in order to ensure that there are no issues with different Mesa servers running on the same plane:
```js
function PersistedMetrics(config) {
  return function({ redis, mapMiddlewareNamespace }) {
    const [connectedKey, messagesKey] = mapMiddlewareNamespace(['connected_clients_count', 'messages_received_count'], 'persisted_metrics')

    return {
      onConnected: client => {
        if(!config.connected)
          return

        redis.incr(connectedKey)
      },
      onMessage: message => {
        if(!config.messages)
          return

        redis.incr(messagesKey)
      },
      onDisconnected: (client, code, reason) => {
        if(!config.connected)
          return

        redis.decr(connectedKey)
      }
    }
  }
}

// 

const mesa = new Mesa()
mesa.use(PersistedMetrics({
  connected: true,
  messages: false
}))
```

This is the ideal middleware setup: utilising replications and middlewares for maximum scalability

## Handler Types
We support many handlers for internal Mesa events and we continue to add new ones consistantly. Here is an example:
```ts
return {
  // Called when a client connects to the current Mesa server
  onConnection(client: Client) {

  },
  // Called when a client disconnects from the current Mesa server
  onDisconnection(client: Client, code: number, reason?: string) {

  },


  // Called when a portal connects to a Mesa cluster  
  onPortalJoin(id: string) {

  },
  // Called when a portal disconnects from a Mesa cluster  
  onPortalLeave(id: string) {

  },

  // Called when Mesa cannot deliver a message to a client as they are offline
  onUndeliverableMessageSent(message: Message, clientIds: string[]) {

  },
  // Called when Mesa sends undeliverable messages back to a client after a period of inactivity
  onRedeliverUndeliverableMessages(count: number, client: string) {

  },

  // Called when Mesa sends a message
  onMessageSent(message: Message, client: Client[], fromCurrentReplica: boolean) {

  },
  // Called when Mesa receives a message from a client
  onMessageReceived(message: Message, client: Client) {

  },

  // Called when a client is authenticated
  onAuthenticated(client: Client) {

  }
}
```
