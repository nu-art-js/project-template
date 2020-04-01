/*
 * A backend boilerplate with example apis
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
import 'module-alias/register'
import {
	RouteResolver,
	Storm
} from "@nu-art/thunderstorm/backend";
import {Environment} from "./config";
import {ValueChangedListener} from "@modules/ValueChangedListener";
import {
	DispatchModule,
	ExampleModule
} from "@modules/ExampleModule";
import {Backend_ModulePack_LiveDocs} from "@nu-art/live-docs/backend";
import {Module} from "@nu-art/ts-common";
import {Backend_ModulePack_Permissions} from "@nu-art/permissions/backend";

const functions = require('firebase-functions');

const packageJson = require("./package.json");
console.log(`Starting server v${packageJson.version} with env: ${Environment.name}`);

const modules: Module[] = [
	ValueChangedListener,
	ExampleModule,
	// SchedulerExample,
	DispatchModule
];

const _exports = new Storm()
	.addModules(...Backend_ModulePack_LiveDocs)
	.addModules(...Backend_ModulePack_Permissions)
	.addModules(...modules)
	.setInitialRouteResolver(new RouteResolver(require, __dirname, "api"))
	.setInitialRoutePath("/api")
	.setEnvironment(Environment.name)
	.build();

_exports.logTest = functions.https.onRequest((req: Request, res: Response) => {
	console.log('LOG_TEST FUNCTION! -- Logging string');
	console.log({
		            firstProps: 'String prop',
		            secondProps: {
			            a: 'Nested Object Prop',
			            b: 10000
		            }
	            });
});

module.exports = _exports;