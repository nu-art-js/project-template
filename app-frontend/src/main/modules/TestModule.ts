/*
 * A typescript & react boilerplate with api call example
 *
 * Copyright (C) 2018  Adam van der Kruk aka TacB0sS
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

import {Module} from "@nu-art/ts-common";
import {dispatchAll} from "@modules/ExampleModule";
import {TestDispatch} from "@app/sample-app-shared";


export class Test_Class
	extends Module<{}>
	implements TestDispatch {

	testDispatch = () => {
	};

	mod_data: number = 1;

	getModData = () => this.mod_data;

	setModData = () => {
		this.mod_data++;
		dispatchAll()
	};
}

export const Test = new Test_Class();