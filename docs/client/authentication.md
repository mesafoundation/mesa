# Authentication

Mesa interacts with the server in order to authenticate the client using a
simple API.

In order to authenticate with the server, you can use the `client.authenticate`
API. See the following example:

```js
const client = new Client("ws://localhost:4000");

client.on("connection", async () => {
  console.log("Client connected");

  const user = await client.authenticate({ token: fetchToken() });
  console.log(`Hello ${user.name}!`);
});
```

## Additional Options

We allow clients to provide a configuration for authenticating with Mesa,
alongside their authorization object. Here's a rundown of options we provide:

```js
{
  // Optional: specifies if the server should send any missed messages as per the Sync feature. Defaults to true
  shouldSync?: boolean
}
```

This configuration is passed into `client.authenticate` like so:

```js
await client.authenticate(
  { token: fetchToken() },
  {
    shouldSync: false,
  }
);
```
