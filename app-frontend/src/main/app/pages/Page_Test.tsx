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

import {BaseComponent} from "@nu-art/thunderstorm/frontend";
import * as React from "react";
import {
	ExampleModule,
	TestDispatch
} from "@modules/ExampleModule";

export class Page_Test
	extends BaseComponent
	implements TestDispatch {

	testDispatch = () => {
		this.forceUpdate();
	};

	render() {
		const data = ExampleModule.getData();
		return <>
			<h1>Hi</h1>
			<div>My number is {data.join(', ')}</div>
			<button onClick={() => ExampleModule.testClickHandler()}>Click me</button>
		</>;
	}

}
