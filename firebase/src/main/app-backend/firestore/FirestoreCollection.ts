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
	BadImplementationException,
	batchAction,
	generateHex,
	Subset
} from "@nu-art/ts-common";
import {
	FirestoreType_Collection,
	FirestoreType_DocumentSnapshot
} from "./types";
import {
	Clause_Select,
	Clause_Where,
	FilterKeys,
	FirestoreQuery
} from "../../shared/types";
import {FirestoreWrapper} from "./FirestoreWrapper";
import {FirestoreInterface} from "./FirestoreInterface";
import {FirestoreTransaction} from "./FirestoreTransaction";
import admin = require("firebase-admin");

export class FirestoreCollection<Type extends object> {
	readonly name: string;
	readonly wrapper: FirestoreWrapper;
	readonly collection: FirestoreType_Collection;

	/**
	 * External unique as in there must never ever be two that answer the same query
	 */
	readonly externalUniqueFilter: ((object: Partial<Type>) => Clause_Where<Type>);

	constructor(name: string, wrapper: FirestoreWrapper, externalFilterKeys?: FilterKeys<Type>) {
		this.name = name;
		this.wrapper = wrapper;
		if(!/[a-z-]{3,}/.test(name))
			console.log("Please follow name pattern for collections /[a-z-]{3,}/")

		this.collection = wrapper.firestore.collection(name);
		this.externalUniqueFilter = (instance: Partial<Type>) => {
			if (!externalFilterKeys)
				throw new BadImplementationException("In order to use a unique query your collection MUST have a unique filter");

			return externalFilterKeys.reduce((where, key: keyof Type) => {
				// @ts-ignore
				where[key] = instance[key];
				return where;
			}, {} as Clause_Where<Type>)
		};
	}

	private async _query(ourQuery?: FirestoreQuery<Type>): Promise<FirestoreType_DocumentSnapshot[]> {
		const myQuery = FirestoreInterface.buildQuery(this, ourQuery);
		return (await myQuery.get()).docs;
	}

	private async _queryUnique(ourQuery: FirestoreQuery<Type>): Promise<FirestoreType_DocumentSnapshot | undefined> {
		const results: FirestoreType_DocumentSnapshot[] = await this._query(ourQuery);
		return FirestoreInterface.assertUniqueDocument(results, ourQuery, this.name);
	}

	async queryUnique(ourQuery: FirestoreQuery<Type>): Promise<Type | undefined> {
		const doc = await this._queryUnique(ourQuery);
		if (!doc)
			return;

		return doc.data() as Type
	}

	async insert(instance: Type): Promise<Type> {
		await this.collection.add(instance);
		return instance;
	}

	async insertAll(instances: Type[]) {
		return Promise.all(instances.map(instance => this.insert(instance)));
	}

	async query(ourQuery: FirestoreQuery<Type>): Promise<Type[]> {
		return (await this._query(ourQuery)).map(result => result.data() as Type);
	}

	async upsert(instance: Type): Promise<Type> {
		return this.runInTransaction((transaction) => transaction.upsert(this, instance))
	}

	async upsertAll(instances: Type[]) {
		return batchAction(instances, 500, async chunked => this.runInTransaction(transaction => transaction.upsertAll(this, chunked)));
	}

	async patch(instance: Subset<Type>): Promise<Type> {
		return this.runInTransaction(transaction => transaction.patch(this, instance));
	}

	async deleteItem(instance: Type): Promise<Type | undefined> {
		return this.runInTransaction((transaction) => transaction.deleteItem(this, instance))
	}

	async deleteUnique(query: FirestoreQuery<Type>): Promise<Type | undefined> {
		return this.runInTransaction((transaction) => transaction.deleteUnique(this, query))
	}

	async delete(query: FirestoreQuery<Type>) {
		const docRefs = await this._query(query);
		return this.deleteBatch(docRefs);
	}

	private async deleteBatch(docRefs: FirestoreType_DocumentSnapshot[]) {
		await batchAction(docRefs, 200, async (temp) => {
			const initialValue = this.wrapper.firestore.batch();
			// @ts-ignore
			await temp.reduce((batch, val) => batch.delete(val.ref), initialValue).commit();
		})
	}

	async deleteAll() {
		const docRefs = await this._query();
		return this.deleteBatch(docRefs);
	}


	async getAll(select?: Clause_Select<Type>): Promise<Type[]> {
		return this.query({select} as FirestoreQuery<Type>);
	}

	async runInTransaction<ReturnType>(processor: (transaction: FirestoreTransaction) => Promise<ReturnType>): Promise<ReturnType> {
		const firestore = this.wrapper.firestore;
		return firestore.runTransaction<ReturnType>(async (transaction: admin.firestore.Transaction) => {
			return processor(new FirestoreTransaction(transaction));
		});
	}

	createDocumentReference() {
		const id = generateHex(16);
		return this.wrapper.firestore.doc(`${this.name}/${id}`);
	}

	getUniqueFilter = () => this.externalUniqueFilter;

}