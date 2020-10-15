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

/**
 * Created by tacb0ss on 25/08/2018.
 */

import {
	_keys,
	ImplementationMissingException,
	Module,
	moduleResolver,
	ThisShouldNotHappenException
} from "@nu-art/ts-common";
import {FirebaseSession_Admin} from "./auth/FirebaseSession_Admin";
// import {FirebaseSession_UserPassword} from "./auth/FirebaseSession_UserPassword";
import {JWTInput} from "google-auth-library";
import {readFileSync} from "fs";
import {Firebase_UserCredential} from "./auth/firebase-session";
import {FirestoreCollection} from "./firestore/FirestoreCollection";
import {FirebaseProjectCollections} from "../shared/types";

type ConfigType = {
	[s: string]: string | JWTInput | Firebase_UserCredential;
};

export class FirebaseModule_Class
	extends Module<ConfigType> {

	// private readonly tokenSessions: { [s: string]: FirebaseSession_UserPassword; } = {};
	private readonly adminSessions: { [s: string]: FirebaseSession_Admin; } = {};
	private localAdmin!: FirebaseSession_Admin;
	public static localAdminConfigId: string;
	private localProjectId!: string;

	constructor() {
		super("firebase");
	}

	getLocalProjectId(): string {
		if (this.localProjectId)
			return this.localProjectId;

		return this.localProjectId = this.deriveLocalProjectId();
	}

	private deriveLocalProjectId(): string {
		let projectId;
		if (FirebaseModule_Class.localAdminConfigId)
			if (!this.config[FirebaseModule_Class.localAdminConfigId])
				throw new ImplementationMissingException(`Forgot to define a service account for project Id: ${FirebaseModule_Class.localAdminConfigId}`);
			else
				projectId = FirebaseModule_Class.localAdminConfigId;

		if (!projectId)
			projectId = process.env.GCP_PROJECT;

		if (!projectId)
			projectId = process.env.GCLOUD_PROJECT;

		if (!projectId)
			throw new ThisShouldNotHappenException("Could not resolve project id...");

		return projectId;
	}

	protected connect(): Promise<void> {
		return new Promise<void>((resolve) => {
			resolve();
		});
	}

	protected disconnect(): Promise<void> {
		return new Promise<void>((resolve) => {
			resolve();
		});
	}

	// public async createSessionWithUsernameAndPassword(configId: string) {
	// 	let session = this.tokenSessions[configId];
	// 	if (session)
	// 		return session;
	//
	// 	const config = this.getProjectAuth(configId) as Firebase_UserCredential;
	// 	if (!config || !config.config || !config.credentials || !config.credentials.password || !config.credentials.user)
	// 		throw new BadImplementationException(`Config for key ${configId} is not a User & Password credentials pattern`);
	//
	// 	session = new FirebaseSession_UserPassword(config, configId);
	// 	this.tokenSessions[configId] = session;
	//
	// 	await session.connect();
	// 	return session;
	// }

	private createLocalAdminSession() {
		if (this.localAdmin)
			return this.localAdmin;

		this.logInfo("Creating local admin session");
		this.localAdmin = new FirebaseSession_Admin("local-admin");
		this.localAdmin.connect();

		return this.localAdmin;
	}

	public createAdminSession(_projectId?: string) {
		let projectId = _projectId;
		if (!projectId)
			projectId = this.localProjectId;

		let session = this.adminSessions[projectId];
		if (session)
			return session;

		this.logInfo(`Creating Firebase session for project id: ${projectId}`);
		let config = this.getProjectAuth(projectId) as JWTInput | string;
		if (!config)
			return this.createLocalAdminSession();

		if (typeof config === "string")
			config = JSON.parse(readFileSync(config, "utf8")) as JWTInput;

		// if (!config || !config.client_email || !config.private_key)
		// 	throw new BadImplementationException(`Config for key ${projectId} is not an Admin credentials pattern`);

		session = new FirebaseSession_Admin(projectId, config);
		this.adminSessions[projectId] = session;

		session.connect();
		return session;
	}

	getProjectAuth(projectId: string) {
		return this.config?.[projectId];
	}

	listCollectionsInModules() {
		const modules: Module[] = moduleResolver();
		const firebaseProjectCollections = modules.reduce((toRet, module) => {
			const keys = _keys(module);
			const _collections: FirestoreCollection<any>[] = keys
				.filter(key => typeof module[key] === "object" && module[key].constructor?.["name"].startsWith("FirestoreCollection"))
				.map(key => module[key] as unknown as FirestoreCollection<any>)
				.filter(collection => collection.wrapper.isAdmin());

			for (const collection of _collections) {
				const projectId = collection.wrapper.firebaseSession.getProjectId();
				const collectionName = collection.name;
				const project = toRet[projectId] || (toRet[projectId] = {projectId: projectId, collections: []});
				project.collections.push(collectionName);
			}

			return toRet;
		}, {} as { [k: string]: FirebaseProjectCollections });
		return Object.values(firebaseProjectCollections);
	}

}

export const FirebaseModule = new FirebaseModule_Class();