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
	__custom,
	__scenario
} from "@nu-art/testelot";
import {FirebaseModule} from "@nu-art/firebase/backend";
import {MyTester} from "./core";


const mainScenario = __scenario("File Uploading Testing");
// mainScenario.add(parseApk);
mainScenario.add(__custom(async () => {
	// @ts-ignore
	const db = await FirebaseModule.createLocalAdminSession().getDatabase();
	const resp = await db.get('/');
	console.log(resp);
}).setLabel('Parse Apk'));

module.exports = new MyTester()
	.addModules(FirebaseModule)
	.setScenario(mainScenario)
	.build();
