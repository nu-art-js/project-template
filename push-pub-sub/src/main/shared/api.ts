import {ApiWithBody} from "@nu-art/thunderstorm";
import {
	Request_PushRegister,
	Request_ReadPush,
	Response_PushRegister
} from "./types";

export type PubSubRegisterClient = ApiWithBody<'/v1/push/register', Request_PushRegister, Response_PushRegister>
export type PubSubReadNotification = ApiWithBody<'/v1/push/read-notification', Request_ReadPush, void>