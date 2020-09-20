# Configuration

Mesa's Client component allows for the following configuration to be passed in
during initialization:

```js
{
  // Optional: enable/disable auto connection to the Mesa server once the client object has been instantiated. Enabled by default. Once disabled, use the 'connect()' method in order to connect the client to the Mesa server
  autoConnect?: boolean
}
```

To supply this config, pass it into the Client constructor as you would with any
other configuration:

```js
const client = new Client("ws://localhost:4000", {
  // Options go here
});
```
