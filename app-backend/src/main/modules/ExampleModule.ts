/*
 * A backend boilerplate with example apis
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
	Dispatcher,
	Module
} from "@nu-art/ts-common";
import {TestDispatch} from "@app/app-shared";
import {
	FirestoreCollection,
	FirebaseModule
} from "@nu-art/firebase/backend";
import {QueryRequestInfo} from "@nu-art/thunderstorm/backend";

type Config = {
	options: string[],
	dispatchNum: string
}

class ExampleModule_Class
	extends Module<Config>
	implements QueryRequestInfo {
	dispatcher = new Dispatcher<TestDispatch, 'testDispatch'>('testDispatch');

	async __queryRequestInfo(): Promise<{ key: string; data: any }> {
		return {
			key: 'AccountsModule', data: {_id: 'noabkr@intuitionrobotics.com'}
		};
	}

	getRandomString() {
		return this.config.options[Math.floor(Math.random() * (this.config.options.length))];
	}

	async getDispatchNumber() {
		await this.dispatcher.dispatchModuleAsync([])
		return this.config.dispatchNum;
	}
}

class DispatchModule_Class
	extends Module<Config>
	implements TestDispatch {
	private numbers!: FirestoreCollection<{ n: number }>;


	protected init(): void {
		const firestore = FirebaseModule.createAdminSession().getFirestore();
		this.numbers = firestore.getCollection<{ n: number }>('test-dispatcher', ["n"]);
	}

	testDispatch = async () => {
		const max = await this.getMaxImpl();
		await this.numbers.upsert({n: max + 1});
	};

	getMax = async () => {
		const n = await this.getMaxImpl()
		return {n}
	};

	private async getMaxImpl() {
		const data = await this.numbers.getAll();
		console.log(data);
		return data.length > 0 ? Math.max(...data.map(d => d.n)) : 0;
	}
}

export const DispatchModule = new DispatchModule_Class();
export const ExampleModule = new ExampleModule_Class();
