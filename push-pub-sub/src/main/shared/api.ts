import {ApiWithBody} from "@nu-art/thunderstorm";
import {Request_PushRegisterClient} from "./types";
import {
	NodePath,
	Request_RegisterPush,
	Request_ResultPush,
	Request_SendPush,
	Response_SendPush
} from "./push";

export type PubSubRegisterClient = ApiWithBody<'/v1/push/register-client', Request_PushRegisterClient, void>
export type PubSubRegisterAndroid = ApiWithBody<"/v1/push/register-android", Request_RegisterPush, NodePath>
export type PubSubRegister = ApiWithBody<"/v1/push/register", Request_RegisterPush, NodePath>
export type PubSubPush = ApiWithBody<"/v1/push/send", Request_SendPush, Response_SendPush>
export type PubSubPushResult = ApiWithBody<"/v1/push/result", Request_ResultPush, void>