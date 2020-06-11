# Authentication
Mesa supports client authentication through a simple API that can adapt to support your authentication infrastructure.

*Note: currently authentication requires [Pub/Sub](./pubsub.md) to be enabled on your server.*

If you learn better from examples, click [here](#example).

## How-To
When a client connects to your server, call the `client.authenticate` method to setup a handler for when your client wants to authenticate itself against your server.

### Authenticate Method
`client.authenticate` takes in a single method with two parameters: a data and a callback method:
```ts
client.authenticate((data, done) => {})
```

The `data` parameter is data sent from your client which should contain enough information to authenticate your client. For example, this may be an object containing a token parameter:
```json
{
  "token": "user_token"
}
```

### Done Callback
The `done` parameter is a method that takes in two different paremeters: error and user:
```ts
done(error, user)
```

The `error` parameter should contain an `Error` object in the case that something went wrong authenticating your client, or if your client couldn't be authenticated for whatever reason.

If there was no error, simply pass in `null` to this parameter.

#### User Object
The `user` parameter should contain an object with a structure like this:
```json
{
  "id": "user_id",
  "user": user_object
}
```

The `id` property should be the id of the authenticated user.

The `user` property should be your user object. This is optional, but if you choose not to include this simply set it to the following:
```json
{
  "id": "user_id"
}
```

That's it! Hopefully the Mesa authentication API is able to fit and adapt to your needs. If you have any issues, open up a GitHub issue or contact a maintainer

## Example
The following example uses the `jsonwebtoken` and `monk` libraries to authenticate connecting clients.

```ts
import { Mesa } from '@cryb/mesa'

import monk from 'monk'
import jwt from 'jsonwebtoken'

// Setting up the MongoDB client
const db = monk(process.env.MONGO_URI)
const collection = db.collection(users)

const server = new Mesa({
  port: 4000,

  redis: 'redis://localhost:6379'
})

mesa.on('connection', client => {
  client.authenticate(async (data, done) => {
    try {
      // Get the body object of the json web token
      const body = jwt.verify(data.token, process.env.JWT_KEY)

      // Get the id of the user
      const userId = body.id

      // Lookup the user in our database
      const user = await collection.findOne({ 'id': id })

      // Call the done method with our user id and user object
      done(null, { id: user.id, user: user })
    } catch(error) {
      done(error)
    }
  })
})
```
