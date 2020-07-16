# Configuration
Mesa's Server component allows for the following configuration to be passed in during initialization:
```ts
{
  // Optional: port that Mesa should listen on. Defaults to 4000
  port: number
  // Optional: path that Mesa should exist on. Defaults to /
  path: string

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

To supply this config, pass it into the Mesa constructor as you would with any other configuration:
```js
const mesa = new Mesa({
  // Options go here
})
```
