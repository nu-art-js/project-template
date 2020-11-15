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
	__custom,
	__scenario
} from "@nu-art/testelot";
import {PushPubSubModule} from "../main/app-backend/modules/PushPubSubModule";
import {
	assert,
	compare,
	currentTimeMillies,
	generateHex,
	Hour
} from "@nu-art/ts-common";
import {
	DB_PushKeys,
	DB_PushSession,
	Request_PushRegister
} from "../main";
import {
	FirestoreCollection,
	FirestoreTransaction
} from "@nu-art/firebase/backend";

const arrayOf2 = Array(2).fill(0);
export const scenarioCleanup = __scenario("Scheduled Cleaup");

const testRegister = async function (request: Request_PushRegister, timestamp: number) {
	const session: DB_PushSession = {
		firebaseToken: request.firebaseToken,
		timestamp,
		userId: 'fake-user'
	};

	// @ts-ignore
	await PushPubSubModule.pushSessions.upsert(session);

	const subscriptions = request.subscriptions.map((s): DB_PushKeys => ({
		firebaseToken: request.firebaseToken,
		pushKey: s.pushKey,
		props: s.props
	}));

	// @ts-ignore
	const pushKeysCollection: FirestoreCollection<DB_PushKeys> = PushPubSubModule.pushKeys;

	return pushKeysCollection.runInTransaction(async (transaction: FirestoreTransaction) => {
		const data = await transaction.query(pushKeysCollection, {where: {firebaseToken: request.firebaseToken}});
		const toInsert = subscriptions.filter(s => !data.find((d: DB_PushKeys) => compare(d, s)));
		return Promise.all(toInsert.map(instance => transaction.insert(pushKeysCollection, instance)));
	});
};

const processClean = __custom(async () => {
	// @ts-ignore
	const asyncs = [PushPubSubModule.pushKeys.deleteAll(), PushPubSubModule.pushSessions.deleteAll()];
	return Promise.all(asyncs);
}).setLabel('Start Clean');

const populate = (timestamp: number) => __custom(async () => {
	for (const i in arrayOf2) {
		const instance = {
			firebaseToken: generateHex(8),
			subscriptions: arrayOf2.map((_e, _i) => ({pushKey: generateHex(8), props: {a: _i}}))
		};
		await testRegister(instance, timestamp);
	}
}).setLabel('Populate');

const cleaup = __custom(async () => PushPubSubModule.scheduledCleanup()).setLabel('Cleaning up');

const check = __custom(async () => {
	// @ts-ignore
	const docs = await PushPubSubModule.pushSessions.query({where: {timestamp: {$lt: currentTimeMillies() - Hour}}});
	assert(`There shouldn't be any docs`, docs.length, 0);
}).setLabel('Checking clean');

scenarioCleanup.add(processClean);
scenarioCleanup.add(populate(currentTimeMillies() - 2 * Hour));
scenarioCleanup.add(populate(currentTimeMillies() + 2 * Hour));
scenarioCleanup.add(cleaup);
scenarioCleanup.add(check);