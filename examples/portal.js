const { Portal } = require('../dist')

const portal = new Portal('redis://localhost:6379', { namespace: 'example' })

portal.on('message', message => {
	console.log(message)
})
