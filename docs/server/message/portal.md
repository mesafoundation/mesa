# Portal

Mesa allows you to handle messages sent from Mesa clients to a detatched gateway
server from anywhere in your codebase using Portals, which are especially useful
in large, replicated environments.

First, enable Portals in your Mesa server config:

```js
const mesa = new Mesa({
  port: 4000,

  portal: {
    enabled: true,
  },
});
```

We also supply an option called `MesaConfig.portal.distributeLoad`. This option
is enabled by default and will send messages to Portal instances in order.
Disabling this option will choose a random Portal to handle your message.

There are other configuration options on the `MesaConfig.portal` object. For a
full rundown, see [Configuration](#configuration).

To use Portals, you'll need to import the `Portal` module from Mesa:

```js
const { Portal } = require("@cryb/mesa");
// or using ES modules
import { Portal } from "@cryb/mesa";
```

Then create a new Portal instance and pass in your Redis URI or config:

```js
const portal = new Portal("redis://localhost:6379");
```

We provide expansive configuration support for customising Portal to your needs.
Here's a rundown of options we provide:

```js
{
  // Optional: namespace for Redis events. This should match the namespace on the Mesa server you're targetting if that Mesa server has a namespace
  namespace?: string
  // Optional: log Portal-related events on startup and closure. Defaults to false
  verbose?: boolean

  // Optional: ensure all events are sent to this Portal instance. Defaults to false
  reportAllEvents?: boolean
}
```

To supply this config, pass it into the Portal constructor as you would with any
other configuration:

```js
const portal = new Portal("redis://localhost:6379", {
  namespace: "api",
  verbose: true,

  reportAllEvents: false,
});
```

_Note: Due to the way Portals and Mesa are designed, Portals will halt your
program from stopping to quickly remove itself from the pool of available
portals. It will allow your program to exit as normal._

Once you have your Portal setup, you can listen to new messages using the
`EventEmitter` API:

```js
portal.on("connection", () => {
  console.log("Client connected");
});

portal.on("authentication", (clientId) => {
  console.log("Client authenticated with id", clientId);
});

portal.on("message", (message) => {
  const { opcode, data, type } = message;

  console.log("Received", opcode, data, type);
});

portal.on("disconnection", (clientId) => {
  if (!clientId) return console.log("Client disconnected");

  console.log("Authenticated client with id", clientId, "disconnected");
});
```

By default, messages sent to Mesa servers are only sent to a single Portal in
order to ensure events are not handled in two different places. If you want to
capture all events using a Portal, set `reportAllEvents` to `true` in you Portal
config.

_Note: Unless you are using `reportAllEvents` or have a single Portal instance
running, you should never update application state using Portals. There is no
guarentee a single Portal will receive the same `connection`, `authentication`,
`message`, and `disconnection` events for the same client. You should use
Portals to forward messages to clients or update an existing database._

An example of a Chat application handling events using Portals would look
something like this:

```js
import { Portal, Dispatcher, Message } from "@cryb/portal";
import { setStatus, fetchRoomByMemberId } from "./chat";

const namespace = "chat";
const redisUri = "redis://localhost:6379";

const portal = new Portal(redisUri, { namespace });
const dispatcher = new Dispatcher(redisUri, { namespace });

// We recommend you update client status on portal.authentication and not portal.connected
portal.on("authentication", (clientId) => {
  setStatus("online", clientId);
});

portal.on("message", (message) => {
  const { members } = fetchRoomByMemberId(message.clientId);

  dispatcher.dispatch(
    new Message(0, { content: message.content }, "NEW_MESSAGE"),
    members,
    [message.clientId]
  );
});

portal.on("disconnection", (clientId) => {
  setStatus("offline", clientId);
});
```
