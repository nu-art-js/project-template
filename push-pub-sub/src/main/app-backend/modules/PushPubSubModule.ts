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
	__stringify,
	compare,
	currentTimeMillies,
	Hour,
	Module
} from "@nu-art/ts-common";

import {
	FirebaseModule,
	FirebaseType_BatchResponse,
	FirebaseType_Message,
	FirestoreCollection,
	PushMessagesWrapper
} from '@nu-art/firebase/backend';
// noinspection TypeScriptPreferShortImport
import {
	DB_PushKeys,
	DB_PushSession,
	IFP,
	ISP,
	ITP,
	MessageType,
	Request_PushRegisterClient,
	SubscribeProps,
	SubscriptionData
} from "../../index";
import {
	CollectionName_PushNotifications,
	CollectionName_PushSession,
	CollectionName_PushTopics
} from "./_imports";

type Config = {
	delta_time?: number
};

type TempMessages = {
	[token: string]: SubscriptionData[]
};

export class PushPubSubModule_Class
	extends Module<Config> {

	private pushSessions!: FirestoreCollection<DB_PushSession>;
	private pushKeys!: FirestoreCollection<DB_PushKeys>;
	private messaging!: PushMessagesWrapper;

	protected init(): void {
		const session = FirebaseModule.createAdminSession();
		const firestore = session.getFirestore();

		this.pushSessions = firestore.getCollection<DB_PushSession>(CollectionName_PushSession, ["firebaseToken"]);
		this.pushKeys = firestore.getCollection<DB_PushKeys>(CollectionName_PushTopics);
		this.pushNotifications = firestore.getCollection<DB_PushKeys>(CollectionName_PushNotifications);

		this.messaging = session.getMessaging();
	}

	async register(request: Request_PushRegisterClient) {
		const session: DB_PushSession = {
			firebaseToken: request.firebaseToken,
			timestamp: currentTimeMillies()
		};
		await this.pushSessions.upsert(session);

		const subscriptions: DB_PushKeys[] = request.subscriptions.map((s): DB_PushKeys => {
			const sub: DB_PushKeys = {
				firebaseToken: request.firebaseToken,
				pushKey: s.pushKey
			};
			if (s.props)
				sub.props = s.props;

			return sub;
		});

		await this.pushKeys.runInTransaction(async transaction => {
			await transaction.delete(this.pushKeys, {where: {firebaseToken: request.firebaseToken}});
			await transaction.insertAll(this.pushKeys, subscriptions);
		});
	}

	async pushToKey<M extends MessageType<any, any, any> = never, S extends string = IFP<M>, P extends SubscribeProps = ISP<M>, D = ITP<M>>(key: S, props?: P, data?: D) {
		let docs = await this.pushKeys.query({where: {pushKey: key}});
		if (props)
			docs = docs.filter(doc => !doc.props || compare(doc.props, props));

		if (docs.length === 0)
			return;

		const _messages = docs.reduce((carry: TempMessages, db_pushKey: DB_PushKeys) => {
			carry[db_pushKey.firebaseToken] = carry[db_pushKey.firebaseToken] || [];

			const item: SubscriptionData = {
				pushKey: db_pushKey.pushKey,
				data
			};
			if (db_pushKey.props)
				item.props = db_pushKey.props;

			carry[db_pushKey.firebaseToken].push(item);

			return carry;
		}, {} as TempMessages);

		const messages: FirebaseType_Message[] = Object.keys(_messages).map(token => ({token, data: {messages: __stringify(_messages[token])}}));
		const response: FirebaseType_BatchResponse = await this.messaging.sendAll(messages);
		return this.cleanUp(response, messages);
	}

	scheduledCleanup = async () => {
		const delta_time = this.config?.delta_time || Hour;

		const docs = await this.pushSessions.query({where: {timestamp: {$lt: currentTimeMillies() - delta_time}}});

		return this.cleanUpImpl(docs.map(d => d.firebaseToken));
	};

	private cleanUp = async (response: FirebaseType_BatchResponse, messages: FirebaseType_Message[]) => {
		this.logInfo(`${response.successCount} sent, ${response.failureCount} failed`);

		if (response.failureCount > 0)
			this.logWarning(response.responses.filter(r => r.error));

		const toDelete = response.responses.reduce((carry, resp, i) => {
			if (!resp.success && messages[i])
				carry.push(messages[i].token);

			return carry;
		}, [] as string[]);

		return this.cleanUpImpl(toDelete);
	};

	private async cleanUpImpl(toDelete: string[]) {
		if (toDelete.length === 0)
			return;

		const async = [
			this.pushSessions.delete({where: {firebaseToken: {$in: toDelete}}}),
			this.pushKeys.delete({where: {firebaseToken: {$in: toDelete}}})
		];

		await Promise.all(async);
	}
}

export const PushPubSubModule = new PushPubSubModule_Class();