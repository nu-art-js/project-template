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

// tslint:disable-next-line:no-import-side-effect
import './res/styles/styles.scss';

import * as React from 'react';
import {App} from "./app/App";
import {
	Thunder,
	ToastBuilder,
	ForceUpgrade
} from "@nu-art/thunderstorm/frontend";
import {
	Frontend_ModulePack_LiveDocs,
	LiveDocsModule,
	showEditModalExample
} from "@nu-art/live-docs/frontend";
import {ExampleModule} from "@modules/ExampleModule";

new Thunder()
	.setConfig(require("./config").config)
	.addModules(...Frontend_ModulePack_LiveDocs)
	.addModules(ForceUpgrade, ExampleModule)
	.setMainApp(App)
	.build();

LiveDocsModule.setActionsResolver((docKey: string) => {
	const doc = LiveDocsModule.get(docKey);

	return new ToastBuilder().setContent(doc.document.length === 0 ? `No Content for document with key: ${docKey}` : doc.document).setActions(
		[<button style={{marginRight: 8}} onClick={() => showEditModalExample(docKey)}>Edit for me</button>]);
});