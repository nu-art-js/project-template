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

import * as admin from "firebase-admin";
import {FirestoreType_DocumentSnapshot} from "./types";
import {FirestoreCollection,} from "./FirestoreCollection";
import {
	BadImplementationException,
	merge,
	Subset
} from "@nu-art/ts-common";
import {FirestoreQuery} from "../../shared/types";
import {FirestoreInterface} from "./FirestoreInterface";

export class FirestoreTransaction {
	private transaction: admin.firestore.Transaction;

	constructor(transaction: admin.firestore.Transaction) {
		this.transaction = transaction;
	}

	private async _query<Type extends object>(collection: FirestoreCollection<Type>, ourQuery: FirestoreQuery<Type>): Promise<FirestoreType_DocumentSnapshot[]> {
		const query = FirestoreInterface.buildQuery(collection, ourQuery);
		return (await this.transaction.get(query)).docs;
	}

	private async _queryUnique<Type extends object>(collection: FirestoreCollection<Type>, ourQuery: FirestoreQuery<Type>): Promise<FirestoreType_DocumentSnapshot | undefined> {
		const results: FirestoreType_DocumentSnapshot[] = await this._query(collection, ourQuery);
		return FirestoreInterface.assertUniqueDocument(results, ourQuery, collection.name);
	}

	private async _queryItem<Type extends object>(collection: FirestoreCollection<Type>, instance: Subset<Type>): Promise<FirestoreType_DocumentSnapshot | undefined> {
		const ourQuery = FirestoreInterface.buildUniqueQuery(collection, instance);
		const results: FirestoreType_DocumentSnapshot[] = await this._query(collection, ourQuery);
		return FirestoreInterface.assertUniqueDocument(results, ourQuery, collection.name);
	}

	async query<Type extends object>(collection: FirestoreCollection<Type>, ourQuery: FirestoreQuery<Type>): Promise<Type[]> {
		return (await this._query(collection, ourQuery)).map(result => result.data() as Type);
	}

	async queryItem<Type extends object>(collection: FirestoreCollection<Type>, instance: Partial<Type>): Promise<Type | undefined> {
		const ourQuery = FirestoreInterface.buildUniqueQuery(collection, instance);
		return this.queryUnique(collection, ourQuery);
	}

	async queryUnique<Type extends object>(collection: FirestoreCollection<Type>, ourQuery: FirestoreQuery<Type>): Promise<Type | undefined> {
		const doc = await this._queryUnique(collection, ourQuery);
		if (!doc)
			return;

		return doc.data() as Type;
	}

	async insert<Type extends object>(collection: FirestoreCollection<Type>, instance: Type) {
		const doc = collection.createDocumentReference();
		await this.transaction.set(doc, instance);
		return instance;
	}

	async insertAll<Type extends object>(collection: FirestoreCollection<Type>, instances: Type[]) {
		return Promise.all(instances.map(instance => this.insert(collection, instance)));
	}

//------------------------
	async upsert<Type extends object>(collection: FirestoreCollection<Type>, instance: Type) {
		return (await this.upsert_Read(collection, instance))();
	}

	async upsert_Read<Type extends object>(collection: FirestoreCollection<Type>, instance: Type) {
		const ref = await this.getOrCreateDocument(collection, instance);

		return async () => {
			await this.transaction.set(ref, instance);
			return instance;
		}
	}

	private async getOrCreateDocument<Type extends object>(collection: FirestoreCollection<Type>, instance: Type) {
		let ref = (await this._queryItem(collection, instance))?.ref;
		if (!ref)
			ref = collection.createDocumentReference();
		return ref;
	}

	async upsertAll<Type extends object>(collection: FirestoreCollection<Type>, instances: Type[]): Promise<Type[]> {
		if (instances.length > 500)
			throw new BadImplementationException('Firestore transaction supports maximum 500 at a time');

		return (await this.upsertAll_Read(collection, instances))();
	}

	async upsertAll_Read<Type extends object>(collection: FirestoreCollection<Type>, instances: Type[]): Promise<() => Promise<Type[]>> {
		const writes = await Promise.all(instances.map(async instance => this.upsert_Read(collection, instance)));

		return async () => Promise.all(writes.map(async _write => _write()));
	}

	async patch<Type extends object>(collection: FirestoreCollection<Type>, instance: Subset<Type>) {
		return (await this.patch_Read(collection, instance))();
	}

	async patch_Read<Type extends object>(collection: FirestoreCollection<Type>, instance: Subset<Type>) {
		const doc = await this._queryItem(collection, instance);
		if (!doc)
			throw new BadImplementationException(`Patching a non existent doc for query ${FirestoreInterface.buildUniqueQuery(collection, instance)}`);

		return async () => {
			const patchedInstance = merge(await doc.data() as Type, instance);
			this.transaction.set(doc.ref, patchedInstance);
			return patchedInstance;
		}
	}

	async delete<Type extends object>(collection: FirestoreCollection<Type>, ourQuery: FirestoreQuery<Type>) {
		await (await this.delete_Read(collection, ourQuery))()
	}

	async delete_Read<Type extends object>(collection: FirestoreCollection<Type>, ourQuery: FirestoreQuery<Type>) {
		const docs = await this._query(collection, ourQuery);

		if (docs.length > 500)
			throw new BadImplementationException(`Trying to delete ${docs.length} documents. Not allowed more then 5oo in a single transaction`);

		return async () => {
			const toReturn = docs.map(doc => doc.data() as Type);
			await Promise.all(docs.map(async (doc) => this.transaction.delete(doc.ref)));
			return toReturn;
		}
	}

	async deleteItem<Type extends object>(collection: FirestoreCollection<Type>, instance: Type) {
		return this.deleteUnique(collection, FirestoreInterface.buildUniqueQuery(collection, instance))
	}

	async deleteUnique<Type extends object>(collection: FirestoreCollection<Type>, ourQuery: FirestoreQuery<Type>): Promise<Type | undefined> {
		const write = await this.deleteUnique_Read(collection, ourQuery);
		if (!write)
			return;

		return write();
	}

	async deleteUnique_Read<Type extends object>(collection: FirestoreCollection<Type>, ourQuery: FirestoreQuery<Type>): Promise<undefined | (() => Promise<Type>)> {
		const doc = (await this._queryUnique(collection, ourQuery));
		if (!doc)
			return;

		return async () => {
			const result = doc.data() as Type;
			await this.transaction.delete(doc.ref);

			return result;
		}
	}
}