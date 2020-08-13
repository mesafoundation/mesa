# Dispatcher
Mesa allows you to send messages from any part of your codebase using `Dispatcher`. Codebases that split their code up between multiple f
iles or services will find dispatch events particularly useful.

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
```
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
