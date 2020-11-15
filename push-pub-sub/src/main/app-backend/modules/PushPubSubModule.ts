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
	generateHex,
	Hour,
	ImplementationMissingException,
	Module,
	Subset
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
	DB_Notifications,
	DB_PushKeys,
	DB_PushSession,
	IFP,
	ISP,
	ITP,
	MessageType,
	Request_PushRegister,
	SubscribeProps,
	SubscriptionData
} from "../../index";
import {
	dispatch_queryRequestInfo,
	ExpressRequest
} from "@nu-art/thunderstorm/backend";

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
	private notifications!: FirestoreCollection<DB_Notifications>;
	private messaging!: PushMessagesWrapper;

	protected init(): void {
		const session = FirebaseModule.createAdminSession();
		const firestore = session.getFirestore();

		this.pushSessions = firestore.getCollection<DB_PushSession>('push-sessions', ["firebaseToken"]);
		this.pushKeys = firestore.getCollection<DB_PushKeys>('push-keys');
		this.notifications = firestore.getCollection<DB_Notifications>('notifications');
		this.messaging = session.getMessaging();
	}

	async register(body: Request_PushRegister, request: ExpressRequest): Promise<DB_Notifications[]> {
		const resp = await dispatch_queryRequestInfo.dispatchModuleAsync([request]);
		console.log('response from dispatcher',resp);
		const userId: string | undefined = resp.find(e => e.key === 'AccountsModule')?.data._id || resp.find(e => e.key === 'RemoteProxy')?.data;
		if (!userId)
			throw new ImplementationMissingException('Missing user from accounts Module');

		const session: DB_PushSession = {
			firebaseToken: body.firebaseToken,
			timestamp: currentTimeMillies(),
			userId
		};

		await this.pushSessions.upsert(session);

		const subscriptions: DB_PushKeys[] = body.subscriptions.map((s): DB_PushKeys => {
			const sub: DB_PushKeys = {
				firebaseToken: body.firebaseToken,
				pushKey: s.pushKey
			};
			if (s.props)
				sub.props = s.props;

			return sub;
		});

		return this.pushSessions.runInTransaction(async transaction => {
			const notifications: DB_Notifications[] = await transaction.query(this.notifications, {where: {userId}});

			const writePush = await transaction.upsert_Read(this.pushSessions, session);

			const write = await transaction.delete_Read(this.pushKeys, {where: {firebaseToken: body.firebaseToken}});
			await transaction.insertAll(this.pushKeys, subscriptions);
			await Promise.all([write(), writePush()]);
			return notifications
		});
	}

	async pushToKey<M extends MessageType<any, any, any> = never,
		S extends string = IFP<M>,
		P extends SubscribeProps = ISP<M>,
		D = ITP<M>>(key: S, props?: P, data?: D, userId?: S, persistent: boolean = false) {
		console.log('i am pushign to key...')
		let docs = await this.pushKeys.query({where: {pushKey: key}});
		if (props)
			docs = docs.filter(doc => !doc.props || compare(doc.props, props));
		console.log('here are the docs: '+docs)

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
		console.log('sending a message')
		const response: FirebaseType_BatchResponse = await this.messaging.sendAll(messages);
		console.log('and this is the response: '+response.responses.map(_response => _response.success))

		const tokens = docs.map(_doc => _doc.firebaseToken);
		const sessions = await this.pushSessions.query({where: {firebaseToken: {$in: tokens}}});
		if (persistent) {

			const notifications = sessions.reduce((carry: DB_Notifications[], session) => {
				if (!session.userId)
					return carry;
				const notification: DB_Notifications = {
					_id: generateHex(16),
					userId: userId || session.userId,
					timestamp: currentTimeMillies(),
					read: false,
					pushKey: key
				};
				if (props)
					notification.props = props;

				carry.push(notification);
				return carry;
			}, []);

			await this.notifications.insertAll(notifications);
		}

		return this.cleanUp(response, messages);
	}

	readNotification = async (id: string, read: boolean) => {
		await this.notifications.patch({_id: id, read} as Subset<DB_Notifications>);
	};

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

		//TODO: delete notifications for the user that are older than X
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