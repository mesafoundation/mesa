# Using Middleware
Mesa supports custom middleware handlers which can act on events such as connections, disconnections and messages. These event handlers are separate to your `EventEmitter` handlers, allowing for more flexibility and extendability of your Mesa server.

If you have an middleware package you'd like to use, you can find most of the documentation on how to use it alongside that package from its README.md. Here is a basic guide on how to register a middleware handler on your Mesa server:
```js
import Mesa from '@cryb/mesa'

import PromClient from 'mesa-prom-client'

const server = new Mesa()
server.use(PromClient({
  path: '/metrics',
  collect: ['connections', 'disconnections']
}))

// etc
```

It's also easy to chain together multiple middleware handlers:
```js
import Mesa from '@cryb/mesa'

import Logger from 'mesa-logger'
import Metrics from 'mesa-metrics'

const server = new Mesa()
server.use(Logger)
server.use(Metrics)

// etc
```

*Note: Middleware handlers will receive all data from client authentication tokens to the content of messages. Ensure that the middleware you're planning to use has been analysed by your security team or yourself. Cryb or the Mesa developers are not responsible for data breaches caused by middleware*
