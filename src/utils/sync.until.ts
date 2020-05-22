import { Redis } from 'ioredis'

import Message, { IMessage } from '../server/message'

export const handleUndeliveredMessage = async (
	message: Message,
	recipient: string,

	client: Redis,
	namespace: string
) => {
	if (!message.options.sync)
		return
	else if (!recipient)
		return
	else if (typeof recipient === 'undefined')
		return
	else if (typeof recipient !== 'string')
		return
	else if (recipient.trim().length === 0)
		return

	const _undeliveredMessages = await client.hget(namespace, recipient)

	let undeliveredMessages: IMessage[] = []

	if (_undeliveredMessages)
		try {
			undeliveredMessages = JSON.parse(_undeliveredMessages)
		} catch (error) {
			console.error(error)
		}

	undeliveredMessages.push(message.serialize(true) as IMessage)

	client.hset(namespace, recipient, JSON.stringify(undeliveredMessages))
}
