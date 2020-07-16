# Namespaces
Mesa allows you define namespaces, opening up support for running multiple instances of Mesa using the same Redis server/sentinel without any clashes.

To use namespaces, supply  to your Mesa config like so:
```ts
const mesa = new Mesa({
  port: 4000,
  namespace: 'api'
})
```

If you're using the `Dispatcher` or `Portal` APIs you'll need to supply the namespace inside your config when creating instances of those classes:
```ts
const portal = new Portal(redisUri, {
  namespace: 'api'
})

const dispatcher = new Dispatcher(redisUri, {
  namespace: 'api'
})
```
