export type SubscribeProps = { [prop: string]: string | number };

export type BaseSubscriptionData = {
	props?: SubscribeProps
	pushKey: string
	userId?: string
}

export type SubscriptionData = BaseSubscriptionData & {
	data?: any
}

export type Request_PushRegister = FirebaseToken & {
	subscriptions: BaseSubscriptionData[]
}

export type Request_ReadPush = {
	_id:string,
	read:boolean
}

export type Response_PushRegister = DB_Notifications[]

export type DB_PushSession = FirebaseToken & {
	timestamp: number
	userId: string
}

export type DB_Notifications = BaseSubscriptionData & {
	_id:string,
	timestamp: number,
	read: boolean,
	persistent?: boolean
}

export type DB_PushKeys = FirebaseToken & BaseSubscriptionData

export type FirebaseToken = {
	firebaseToken: string
}

export type MessageType<S extends string, P extends SubscribeProps, D> = {}
export type IFP<Binder extends MessageType<any, any, any>> = Binder extends MessageType<infer S, any, any> ? S extends string ? S : never : never;
export type ISP<Binder extends MessageType<any, any, any>> = Binder extends MessageType<any, infer P, any> ? P extends SubscribeProps ? P : never : never;
export type ITP<Binder extends MessageType<any, any, any>> = Binder extends MessageType<any, any, infer D> ? D : never;
