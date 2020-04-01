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

import {
	BaseComponent,
	ThunderDispatcher
} from "@nu-art/thunderstorm/frontend";
import * as React from "react";
import {Second} from "@nu-art/ts-common";
import {ExampleModule} from "@modules/ExampleModule";
import {Test} from "@modules/TestModule";
import {TestDispatch} from "@app/sample-app-shared";

export class Page_Dispatch
	extends BaseComponent
	implements TestDispatch {
	uiDispatcher = new ThunderDispatcher<TestDispatch, 'testDispatch'>('testDispatch');

	componentDidMount(): void {
		ExampleModule.fetchMax()
	}

	testDispatch = () => {
		this.forceUpdate();
	};

	uiClickHandler = () => {
		console.log("changing component 2 color...");
		setTimeout(() => {
			this.uiDispatcher.dispatchUI([]);
		}, Second)
	};


	render() {
		const data = ExampleModule.getData();
		const modData = Test.getModData();
		const apiData = ExampleModule.getApiData();
		const max = ExampleModule.getMax();
		return <>
			<h1>mod --> UI dispatch data: {data}.</h1>
			<button onClick={() => ExampleModule.testClickHandler()}>click me to test mod --> UI dispatch</button>
			<h1>mod --> mod dispatch data: {modData}</h1>
			<button onClick={() => ExampleModule.testModDispatcher()}>click me to test mod --> mod dispatch</button>
			<div>
				<button style={{background: '#4e69ab'}} onClick={() => this.uiClickHandler()}>click me to change another component's color</button>
			</div>
			<SecondComponent/>
			<h1>backend --> ui dispatch data: {apiData}</h1>
			<button onClick={() => ExampleModule.testBackendDispatcher()}>click me to test api dispatch</button>
			<div>Max in firestore collection is: {max}</div>
		</>;
	}
}

class SecondComponent
	extends BaseComponent<{}, { color: string }>
	implements TestDispatch {

	state = {
		color: '#ffc0cb'
	}

	testDispatch = () => {
		this.setState(state => ({color: state.color === '#a6f6ea' ? '#ffc0cb' : '#a6f6ea'}));
	};

	render() {
		return <div style={{background: this.state.color}}>component 2: {this.state.color}</div>;
	}
}