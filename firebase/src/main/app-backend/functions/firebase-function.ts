/*
 * Firebase is a simpler Typescript wrapper to all of firebase services.
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
	Change,
	CloudFunction,
	EventContext,
	HttpsFunction,
	RuntimeOptions
} from 'firebase-functions';
import {DataSnapshot} from "firebase-functions/lib/providers/database";

import * as express from "express";
import {
	Request,
	Response
} from "express";
import {
	addItemToArray,
	deepClone,
	ImplementationMissingException,
	Module
} from "@nu-art/ts-common";
import {ObjectMetadata} from "firebase-functions/lib/providers/storage";
import firebase from "firebase";
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;

const functions = require('firebase-functions');

export interface FirebaseFunctionInterface {
	getFunction(): HttpsFunction;
	onFunctionReady(): Promise<void>;
}

export abstract class FirebaseFunction<Config = any>
	extends Module<Config>
	implements FirebaseFunctionInterface {
	protected isReady: boolean = false;
	protected toBeExecuted: (() => Promise<any>)[] = [];
	protected toBeResolved!: (value?: (PromiseLike<any>)) => void;

	abstract getFunction(): HttpsFunction
	onFunctionReady = async () => {
		this.isReady = true;
		const toBeExecuted = this.toBeExecuted;
		this.toBeExecuted = [];
		for (const toExecute of toBeExecuted) {
			try {
				await toExecute();
			} catch (e) {
				console.error("Error running function: ", e);
			}
		}

		this.toBeResolved && this.toBeResolved();
	};
}

export class Firebase_ExpressFunction
	implements FirebaseFunctionInterface {
	private readonly express: express.Express;
	private function!: HttpsFunction;
	private toBeExecuted: (() => Promise<any>)[] = [];
	private isReady: boolean = false;
	private toBeResolved!: (value?: (PromiseLike<any>)) => void;
	private name: string = "api";
	static config: RuntimeOptions = {};

	constructor(_express: express.Express) {
		this.express = _express;
	}

	static setConfig(config: RuntimeOptions) {
		this.config = config;
	}

	getName() {
		return this.name;
	}

	getFunction = () => {
		if (this.function)
			return this.function;

		const realFunction = functions.runWith(Firebase_ExpressFunction.config).https.onRequest(this.express);
		return this.function = functions.runWith(Firebase_ExpressFunction.config).https.onRequest((req: Request, res: Response) => {
			if (this.isReady)
				return realFunction(req, res);
			return new Promise((resolve) => {
				addItemToArray(this.toBeExecuted, () => realFunction(req, res));
				this.toBeResolved = resolve;
			});
		});
	};

	onFunctionReady = async () => {
		this.isReady = true;
		const toBeExecuted = this.toBeExecuted;
		this.toBeExecuted = [];
		for (const toExecute of toBeExecuted) {
			try {
				await toExecute();
			} catch (e) {
				console.error("Error running function: ", e);
			}
		}

		this.toBeResolved && this.toBeResolved();
	};
}

//TODO: I would like to add a type for the params..
export abstract class FirebaseFunctionModule<DataType = any, ConfigType = any>
	extends FirebaseFunction<ConfigType> {

	private readonly listeningPath: string;
	private function!: CloudFunction<Change<DataSnapshot>>;

	protected constructor(listeningPath: string, name?: string) {
		super();
		name && this.setName(name);
		this.listeningPath = listeningPath;
	}

	abstract processChanges(before: DataType, after: DataType, params: { [param: string]: any }): Promise<any>;

	getFunction = () => {
		if (this.function)
			return this.function;

		return this.function = functions.database.ref(this.listeningPath).onWrite(
			(change: Change<DataSnapshot>, context: EventContext) => {
				const before: DataType = change.before && change.before.val();
				const after: DataType = change.after && change.after.val();
				const params = deepClone(context.params);

				if (this.isReady) {
					this.logDebug(`Processing function: ${before} => ${after}\nParams: ${JSON.stringify(params, null, 2)}`);
					return this.processChanges(before, after, params);
				}

				return new Promise((resolve) => {
					addItemToArray(this.toBeExecuted, async () => {
						return await this.processChanges(before, after, params);
					});

					this.logDebug(`Queuing function: ${before} => ${after}\nParams: ${JSON.stringify(params, null, 2)}`);
					this.toBeResolved = resolve;
				});
			});
	};
}

export type FirestoreConfigs = {
	runTimeOptions?: RuntimeOptions,
	configs: any
}

//TODO: I would like to add a type for the params..
export abstract class FirestoreFunctionModule<DataType extends object, ConfigType extends FirestoreConfigs = FirestoreConfigs>
	extends FirebaseFunction<ConfigType> {

	private readonly collectionName: string;
	private function!: CloudFunction<Change<DataSnapshot>>;

	protected constructor(collectionName: string, name?: string) {
		super();
		name && this.setName(name);
		this.collectionName = collectionName;
	}

	abstract processChanges(params: { [param: string]: any }, before?: DataType, after?: DataType,): Promise<any>;

	getFunction = () => {
		if (this.function)
			return this.function;

		return this.function = functions.runWith(this.config?.runTimeOptions || {}).firestore.document(`${this.collectionName}/{docId}`).onWrite(
			(change: Change<DocumentSnapshot<DataType>>, context: EventContext) => {
				const before: DataType | undefined = change.before && change.before.data();
				const after: DataType | undefined = change.after && change.after.data();
				const params = deepClone(context.params);

				if (this.isReady) {
					this.logDebug(`Processing function Params: ${JSON.stringify(params, null, 2)}`);
					return this.processChanges(params, before, after);
				}

				return new Promise((resolve) => {
					addItemToArray(this.toBeExecuted, async () => {
						return await this.processChanges(params, before, after);
					});

					this.logDebug(`Queuing firestore function: ${before} => ${after}\nParams: ${JSON.stringify(params, null, 2)}`);
					this.toBeResolved = resolve;
				});
			});
	};
}

export abstract class FirebaseScheduledFunction<ConfigType extends any = any>
	extends FirebaseFunction<ConfigType> {

	private function!: CloudFunction<Change<DataSnapshot>>;
	private schedule?: string;
	private runningCondition: (() => Promise<boolean>)[] = [async () => true];

	constructor(name?: string) {
		super();
		name && this.setName(name);
	}

	addRunningCondition(runningCondition: () => Promise<boolean>) {
		addItemToArray(this.runningCondition, runningCondition);
		return this;
	}

	setSchedule(schedule: string) {
		this.schedule = schedule;
		return this;
	}

	abstract onScheduledEvent(): Promise<any>;

	private async _onScheduledEvent() {
		const results: boolean[] = await Promise.all(this.runningCondition.map(condition => condition()));

		if (results.includes(false)) {
			this.logDebug("will not execute backup.. running conditions didn't pass: ", results);
			return;
		}

		return this.onScheduledEvent();
	}

	getFunction = () => {
		if (!this.schedule)
			throw new ImplementationMissingException("MUST set schedule !!");

		if (this.function)
			return this.function;

		return this.function = functions.pubsub.schedule(this.schedule).onRun(async () => {
			if (this.isReady) {
				this.logDebug(`FirebaseScheduledFunction schedule`);
				return this._onScheduledEvent();
			}

			return new Promise((resolve) => {
				addItemToArray(this.toBeExecuted, async () => {
					return this._onScheduledEvent();
				});

				this.logDebug(`FirebaseScheduledFunction schedule`);
				this.toBeResolved = resolve;
			});
		});
	};
}

export type BucketConfigs = {
	runtimeOpts?: RuntimeOptions
	bucketName?: string
}

export abstract class Firebase_StorageFunction<ConfigType extends BucketConfigs = BucketConfigs>
	extends FirebaseFunction<ConfigType> {

	private function!: CloudFunction<ObjectMetadata>;
	private readonly path: string;
	private runtimeOpts: RuntimeOptions = {};

	protected constructor(path: string, name?: string) {
		super();
		this.path = path;
		name && this.setName(name);
	}

	abstract onFinalize(object: ObjectMetadata, context: EventContext): Promise<any>;

	getFunction = () => {
		if (this.function)
			return this.function;

		this.runtimeOpts = {
			timeoutSeconds: this.config?.runtimeOpts?.timeoutSeconds || 300,
			memory: this.config?.runtimeOpts?.memory || '2GB'
		};

		return this.function = functions.runWith(this.runtimeOpts).storage.bucket(this.config.bucketName).object().onFinalize(async (object: ObjectMetadata, context: EventContext) => {
			if (!object.name?.startsWith(this.path))
				return;

			if (this.isReady)
				return await this.onFinalize(object, context);

			return new Promise((resolve) => {
				addItemToArray(this.toBeExecuted, async () => {
					return await this.onFinalize(object, context);
				});

				this.toBeResolved = resolve;
			});
		});
	};
}
