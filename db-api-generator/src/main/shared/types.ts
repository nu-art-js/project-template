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
import {DB_Object} from "@nu-art/firebase";
import {
	ApiWithBody,
	ApiWithQuery,
	HttpMethod,
} from "@nu-art/thunderstorm";

export const DefaultApiDefs: { [k: string]: GenericApiDef; } = {
	Create: {
		method: HttpMethod.POST,
		key: "create",
		suffix: "create"
	},
	Update: {
		method: HttpMethod.POST,
		key: "update",
		suffix: "update"
	},
	Delete: {
		method: HttpMethod.GET, // delete doesn't works, so we changed it to get
		key: "delete",
		suffix: "delete"
	},
	Unique: {
		method: HttpMethod.GET,
		key: "unique",
		suffix: "unique"
	},
	Query: {
		method: HttpMethod.POST,
		key: "query",
		suffix: "query"
	},
};

export const ErrorKey_BadInput = "bad-input";

export type BadInputErrorBody = { path: string, input?: string };

export type GenericApiDef = { method: HttpMethod, key: string, suffix?: string };

export type ApiBinder_DBCreate<DBType extends DB_Object, RequestType extends Omit<DBType, "_id"> = Omit<DBType, "_id">> = ApiWithBody<string, RequestType, DBType>;
export type ApiBinder_DBDelete<DBType extends DB_Object> = ApiWithQuery<string, DBType, DB_Object>;
export type ApiBinder_DBUniuqe<DBType extends DB_Object> = ApiWithQuery<string, DBType, DB_Object>;
export type ApiBinder_DBUpdate<DBType extends DB_Object> = ApiWithBody<string, DB_Object & Partial<DBType>, DBType>;
export type ApiBinder_DBQuery<DBType extends DB_Object> = ApiWithBody<string, Partial<DBType>, DBType[]>;

