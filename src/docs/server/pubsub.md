# Pub/Sub
Mesa Pub/Sub allows you to run multiple instances of your Mesa server while allowing messages to reach clients.

Pub/Sub relies on Redis to forward messages, so you'll need a Redis instance to enable this feature. We support Redis Sentinels for high availability production environments too.

To enable pub/sub, simply supply your Redis URI in your Mesa config:
```ts
const mesa = new Mesa({
  port: 4000,
  redis: 'redis://localhost:6379'
})
```

Messages sent globally via `mesa.send` or to authenticated clients via `client.send` or `dispatcher.dispatch` will now be correctly send to clients regardless of which Mesa server they're connected to.

If you want to run different Mesa servers on the same Redis server without pub/sub, check out [namespaces](./namespaces.md).

We also support more advanced Redis connection options via an object. Interally Mesa uses [ioredis](https://github.com/luin/ioredis) to handle Redis connections, so view their [connection options](https://github.com/luin/ioredis/blob/11e5d810f7076a144ab22cb4848b64d9d3da2254/lib/redis/RedisOptions.ts#L8) to learn more
