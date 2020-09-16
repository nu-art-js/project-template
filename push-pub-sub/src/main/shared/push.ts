
export type Request_SendPush = {
	userId?: string,
	deviceId: string,
	data: object
}

export type Response_SendPush = {
	mId: string
}

export type Request_RegisterPush = {
	deviceId: string
}

export enum ActionResult {
	Success = 'Success',
	Error   = 'Error'
}

export type ResultPush = {
	clientTimestamp: number
	serverTimestamp: number
	output: string
	result: ActionResult
};

export type Request_ResultPush = {
	mId: string
	pushResult: Omit<ResultPush, 'serverTimestamp'>
}

export type NodePath = {
	nodePath: string
}
