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
	ApiResponse,
	ExpressRequest,
	ServerApi
} from "@nu-art/thunderstorm/backend";
import {HttpMethod} from "@nu-art/thunderstorm";
import {
	PubSubRegister,
	Request_RegisterPush
} from "../_imports";
import {PushModule} from "../../../modules/PushModule";

class ServerApi_RegisterPush
	extends ServerApi<PubSubRegister> {

	constructor() {
		super(HttpMethod.POST, "register");
	}

	protected async process(request: ExpressRequest, response: ApiResponse, queryParams: {}, body: Request_RegisterPush) {

		this.assertProperty(body, "deviceId");

		const nodePath: string = await PushModule.registerDevice(body.deviceId);
		return {nodePath};
	}
}

module.exports = new ServerApi_RegisterPush();



