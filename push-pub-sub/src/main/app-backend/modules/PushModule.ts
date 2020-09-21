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
	Auditable,
	auditBy,
	currentTimeMillies,
	Day,
	generateHex,
	Module,
	Subset
} from "@nu-art/ts-common";
import {
	DatabaseWrapper,
	FirebaseModule,
	FirestoreCollection
} from "@nu-art/firebase/backend";
import {ApiException} from "@nu-art/thunderstorm/backend";
import {
	Request_ResultPush,
	ResultPush
} from "../../shared/push";
import {
	CollectionNam_PubSubProcessedMessages,
	CollectionNam_PubSubQueue,
	CollectionNam_PubSubRegistry
} from "./_imports";

type Config = {}

type DB_PushRegistry = PushRegistry & {
	uuid: string
}

type DB_PushMessage = Auditable & {
	mId: string
	timestamp: number
	deviceId: string
	data: object
	pushResult?: ResultPush
}

type PushRegistry = {
	timestamp: number
	deviceId: string
};

export type FB_RegistryWrapper = PushRegistry & {
	data?: object
	mId?: string
}
export const Path_Push = "/push-registry";

const getListeningPath = (sha: string, uuid: string) => `${Path_Push}/${sha}/${uuid}`;

const Interval_UpdateUUID = 2 * Day;

export enum RegistrationMethod {
	Listener,
	Api
}

export class PushModule_Class
	extends Module<Config> {

	private pushRegistry!: FirestoreCollection<DB_PushRegistry>;
	private pushQueue!: FirestoreCollection<DB_PushMessage>;
	private db!: DatabaseWrapper;
	private processedPushMessages!: FirestoreCollection<DB_PushMessage>;

	init() {
		const session = FirebaseModule.createAdminSession();
		this.db = session.getDatabase();
		const firestore = session.getFirestore();
		this.pushRegistry = firestore.getCollection<DB_PushRegistry>(CollectionNam_PubSubRegistry, ["deviceId"]);
		this.pushQueue = firestore.getCollection<DB_PushMessage>(CollectionNam_PubSubQueue, ["mId"]);
		this.processedPushMessages = firestore.getCollection<DB_PushMessage>(CollectionNam_PubSubProcessedMessages, ["mId"]);
	}

	async register(token: string, registrationMethod: RegistrationMethod) {
		const entry = await this.pushRegistry.queryUnique({where: {deviceId: token}});
		if (entry && entry.timestamp + Interval_UpdateUUID > currentTimeMillies()) {
			const listeningPath = getListeningPath(token, entry.uuid);
			const _deviceId = await this.db.get<FB_RegistryWrapper>(`${listeningPath}/deviceId`);
			if (_deviceId)
				return listeningPath;
		}

		if (entry)
			await this.db.remove(getListeningPath(token, entry.uuid));

		const instance: DB_PushRegistry = {
			deviceId: token,
			uuid: generateHex(32),
			timestamp: currentTimeMillies()
		};

		const obj: FB_RegistryWrapper = {
			deviceId: instance.deviceId,
			timestamp: instance.timestamp,
		};

		await this.pushRegistry.upsert(instance);

		const path = getListeningPath(token, instance.uuid);
		await this.db.set<FB_RegistryWrapper>(path, obj);

		return path;
	}

	async registerDevice(deviceId: string) {
		const entry = await this.pushRegistry.queryUnique({where: {deviceId}});
		if (entry && entry.timestamp + Interval_UpdateUUID > currentTimeMillies()) {
			const listeningPath = getListeningPath(deviceId, entry.uuid);
			const _deviceId = await this.db.get<FB_RegistryWrapper>(`${listeningPath}/deviceId`);
			if (_deviceId)
				return listeningPath;
		}

		if (entry)
			await this.db.remove(getListeningPath(deviceId, entry.uuid));

		const instance: DB_PushRegistry = {
			deviceId: deviceId,
			uuid: generateHex(32),
			timestamp: currentTimeMillies()
		};

		const obj: FB_RegistryWrapper = {
			deviceId: instance.deviceId,
			timestamp: instance.timestamp,
		};

		await this.pushRegistry.upsert(instance);

		const path = getListeningPath(deviceId, instance.uuid);
		await this.db.set<FB_RegistryWrapper>(path, obj);

		return path;
	}

	async handleNodeChange(newData: FB_RegistryWrapper, params: { [p: string]: any }) {
		const pushRegistry = await this.getPushRegistry(newData.deviceId);
		await this.assertIntegrityAndPush(newData, pushRegistry);
	}

	async sendPush(userId: string, deviceId: string, data: object) {
		const message: DB_PushMessage = {
			_audit: auditBy(userId),
			mId: generateHex(64),
			deviceId,
			data: data,
			timestamp: currentTimeMillies()
		};

		const pushRegistry = await this.getPushRegistry(deviceId);

		await this.pushQueue.upsert(message);

		const registryWrapper = await this.db.get<FB_RegistryWrapper>(getListeningPath(deviceId, pushRegistry.uuid));
		if (!registryWrapper) {
			throw new ApiException(404, `Registry wrapper does not exists in DatabaseWrapper`);
		}

		await this.assertIntegrityAndPush(registryWrapper, pushRegistry);

		return message.mId;
	}

	async sendNextPush(deviceId: string, uuid: string, registryWrapper: FB_RegistryWrapper) {
		const messageQueue = await this.pushQueue.query({where: {deviceId: deviceId}, orderBy: [{key: "timestamp", order: "desc"}], limit: 1});
		if (messageQueue.length === 0)
		// await this.pushDatabase.remove(`${getListeningPath(deviceId, uuid)}/mId`);
			return this.logDebug(`Nothing to push for:\n Device: ${deviceId}\n uuid: ${uuid}`);

		const nextMessage = messageQueue[0];
		await this.pushQueue.deleteUnique({where: {mId: nextMessage.mId}});
		await this.processedPushMessages.insert(nextMessage);

		registryWrapper.data = nextMessage.data;
		registryWrapper.mId = nextMessage.mId;
		await this.db.set<FB_RegistryWrapper>(getListeningPath(deviceId, uuid), registryWrapper);
		return registryWrapper;
	}

	private async getPushRegistry(deviceId: string): Promise<DB_PushRegistry> {
		const pushRegistry = await this.pushRegistry.queryUnique({where: {deviceId}});

		if (!pushRegistry)
			throw new ApiException(404, `Could not find pushRegistry for device id: ${deviceId}`);

		return pushRegistry;
	}

	private async assertIntegrityAndPush(_registryWrapper: FB_RegistryWrapper, pushRegistry: DB_PushRegistry) {
		let registryWrapper = _registryWrapper;
		if (!registryWrapper) {
			registryWrapper = {
				deviceId: pushRegistry.deviceId,
				timestamp: pushRegistry.timestamp,
			};
			await this.db.set<FB_RegistryWrapper>(getListeningPath(pushRegistry.deviceId, pushRegistry.uuid), registryWrapper);
		}

		return this.sendNextPush(pushRegistry.deviceId, pushRegistry.uuid, registryWrapper);
	}

	async pushResult(body: Request_ResultPush) {
		const message = {
			...body,
			pushResult: {
				...body.pushResult,
				serverTimestamp: currentTimeMillies()
			}
		};
		await this.processedPushMessages.patch(message as Subset<DB_PushMessage>);
	}
}

export const PushModule = new PushModule_Class();
