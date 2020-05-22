import { IMessage } from '../server/message'

export interface IPortalUpdate {
	id: string
	ready: boolean
}

export interface IPortalConfig {
	namespace?: string
	verbose?: boolean

	reportAllEvents?: boolean
}

export type PortalInternalSocketType = 'connection' | 'authentication' | 'disconnection'
type PortalInternalMessageType = PortalInternalSocketType | 'message'

export interface IPortalInternalMessage {
	type: PortalInternalMessageType
	portalId?: string
	clientId?: string

	message?: IMessage
}
