import Server from '../server'
import Client from '../server/client'
import Message from '../server/message'

export interface MiddlewareHandler {
  onConnection: (client: Client) => void
  onDisconnection: (client: Client, code: number, reason?: string) => void

  onPortalJoin: (id: string) => void
  onPortalLeave: (id: string) => void

  onRedeliverUndeliverableMessages: (count: number, client: string) => void

  onMessage: (message: Message, client: Client) => void
  onAuthenticated: (client: Client) => void
}

export type MiddlewareEvent =
  'onConnection' |
  'onDisconnection' |
  'onPortalJoin' |
  'onPortalLeave' |
  'onRedeliverUndeliverableMessages' |
  'onMessage' |
  'onAuthenticated'

export type MiddlewareNondescriptHandler = (...args: any[]) => void

type Middleware = (server: Server) => MiddlewareHandler
export default Middleware
