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

import * as fs from "fs";
import {AppTester} from "@nu-art/testelot";
import {
	FirebaseModule,
	FirebaseModule_Class
} from "@nu-art/firebase/backend";
import {ImplementationMissingException} from "@nu-art/ts-common";

export class MyTester
	extends AppTester {

	prepare() {
		// FirebaseModule_Class.localAdminConfigId = "test-permissions";

		// const serviceAccount = this.resolveServiceAccount();
		const serviceAccount = {
			// project_id: 'test',
			// client_email: 'fake_email',
			// private_key: 'fake_key'
			databaseURL: "http://localhost:5002"
		};
		// @ts-ignore
		FirebaseModule.setDefaultConfig({"test-permissions": serviceAccount});
	}

	private resolveServiceAccount() {
		let pathToServiceAccount = process.env.npm_config_service_account || process.argv.find((arg: string) => arg.startsWith("--service-account="));
		if (!pathToServiceAccount)
			throw new ImplementationMissingException("could not find path to service account!!!");

		pathToServiceAccount = pathToServiceAccount.replace("--service-account=", "");
		return JSON.parse(fs.readFileSync(pathToServiceAccount, "utf8"))
	}

	build(): void {
		console.log('ciao');
		super.build()
	}
}
