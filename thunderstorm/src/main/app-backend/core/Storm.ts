/*
 * Thunderstorm is a full web app framework!
 *
 * Typescript & Express backend infrastructure that natively runs on firebase function
 * Typescript & React frontend infrastructure
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

import {FirebaseModule} from "@nu-art/firebase/backend";
import {
	BeLogged,
	LogClient_Function,
	LogClient_Terminal,
	Module
} from "@nu-art/ts-common";
import {
	Firebase_ExpressFunction,
	FirebaseFunction
} from '@nu-art/firebase/backend-functions';
import {BaseStorm} from "./BaseStorm";
import {
	HttpServer,
	RouteResolver
} from "../modules/server/HttpServer";
import {ServerApi} from "../modules/server/server-api";


const modules: Module[] = [
	HttpServer,
	FirebaseModule,
];


export class Storm
	extends BaseStorm {
	private routeResolver!: RouteResolver;
	private initialPath!: string;
	private functions: any[] = [];

	constructor() {
		super();
		this.addModules(...modules);
	}

	init() {
		// console.log(process.env);
		BeLogged.addClient(process.env.GCLOUD_PROJECT && process.env.FUNCTIONS_EMULATOR ? LogClient_Terminal : LogClient_Function);
		ServerApi.isDebug = !!this.config.isDebug;

		super.init();

		HttpServer.resolveApi(this.routeResolver, !process.env.GCLOUD_PROJECT ? this.initialPath : "");
		HttpServer.printRoutes(process.env.GCLOUD_PROJECT ? this.initialPath : "");
		return this;
	}

	setInitialRouteResolver(routeResolver: RouteResolver) {
		this.routeResolver = routeResolver;
		return this;
	}

	setInitialRoutePath(initialPath: string) {
		this.initialPath = initialPath;
		return this;
	}

	startServer(onStarted?: () => Promise<void>) {
		const modulesAsFunction: FirebaseFunction[] = (this.modules as unknown as FirebaseFunction[]).filter(
			module => module.onFunctionReady && module.getFunction);

		this.functions = [new Firebase_ExpressFunction(HttpServer.express), ...modulesAsFunction];

		this.startServerImpl(onStarted)
		    .then(() => console.log("Server Started!!"))
		    .catch(reason => {
			    this.logError("failed to launch server", reason);
			    throw reason;
		    });

		return this.functions.reduce((toRet, _function) => {
			toRet[_function.getName()] = _function.getFunction();
			return toRet;
		}, {})
	}

	build(onStarted?: () => Promise<void>) {
		return this.startServer(onStarted);
	}

	private async startServerImpl(onStarted?: () => Promise<void>) {
		await this.resolveConfig();

		this.init();

		await HttpServer.startServer();
		const functions = await Promise.all(this.functions.map(moduleAsFunction => moduleAsFunction.onFunctionReady()));
		onStarted && await onStarted();

		return functions;
	}
}
