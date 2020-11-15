/*
 * Permissions management system, define access level for each of 
 * your server apis, and restrict users by giving them access levels
 *
 * Copyright (C) 2020 Adam van der Kruk aka TacB0sS
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
	ApiWithBody,
	ApiWithQuery
} from "@nu-art/thunderstorm";

export const HeaderKey_SessionId = "x-session-id";
export const HeaderKey_Email = "x-email";

export const QueryParam_Email = "userEmail";
export const QueryParam_SessionId = HeaderKey_SessionId;
export const QueryParam_RedirectUrl = "redirectUrl";
export const HeaderKey_CurrentPage = "current-page";

export type DB_Session = {
	userId: string
	sessionId: string
	timestamp: number
}

export type Response_Auth = {
	sessionId: string
	email: string
}

export type Request_CreateAccount = {
	email: string
	password: string
	password_check: string
	// customProps?: StringMap
}

export type Request_LoginAccount = {
	email: string
	password: string
}

export type Request_ValidateSession = {
	sessionId: string
}

export type Response_LoginSAML = {
	loginUrl: string
};

export type Response_Validation = UI_Account

export type UI_Account = { email: string; _id: string }

export type Response_ListAccounts = {
	accounts: UI_Account[]
};

export type RequestParams_LoginSAML = {
	[QueryParam_RedirectUrl]: string
};

export type PostAssertBody = {
	SAMLResponse: string
	RelayState: string
};

export type AccountApi_Create = ApiWithBody<'/v1/account/create', Request_CreateAccount, Response_Auth>
export type AccountApi_Login = ApiWithBody<'/v1/account/login', Request_LoginAccount, Response_Auth>
export type AccountApi_LoginSAML = ApiWithQuery<"/v1/account/login-saml", Response_LoginSAML, RequestParams_LoginSAML>
export type AccountApi_ValidateSession = ApiWithQuery<'/v1/account/validate', Response_Validation>
export type AccountApi_AssertLoginSAML = ApiWithBody<"/v1/account/assert", PostAssertBody, void>

export type AccountApi_ListAccounts = ApiWithQuery<'/v1/account/query', Response_ListAccounts>
