/*
 * ts-common is the basic building blocks of our typescript projects
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
	addItemToArray,
	removeItemFromArray,
} from "../index";
import {Logger} from "../core/logger/Logger";

export class Queue
	extends Logger {

	private parallelCount = 1;
	private running = 0;
	private queue: (() => Promise<void>)[] = [];
	private onQueueEmpty?: () => void;

	constructor(name: string) {
		super(name);
	}

	setParallelCount(parallelCount: number) {
		this.parallelCount = parallelCount;
		return this;
	}

	setOnQueueEmpty(onQueueEmpty: () => void) {
		this.onQueueEmpty = onQueueEmpty;
		return this;
	}

	addItem<T>(toExecute: () => Promise<T>, onCompleted?: (output: T) => void, onError?: (error: Error) => void) {
		this.addItemImpl(toExecute.bind(this),onCompleted?.bind(this),onError?.bind(this));

		this.execute();
	}

	addItemImpl<T>(toExecute: () => Promise<T>, onCompleted?: (output: T) => void, onError?: (error: Error) => void) {
		addItemToArray(this.queue, async (resolve: () => void) => {
			this.running++;
			try {
				const output: T = await toExecute();
				onCompleted && onCompleted(output);
			} catch (e) {
				try {
					onError && onError(e);
				} catch (e1) {
					this.logError("Error while calling onError");
					this.logError("--- Original: ", e);
					this.logError("-- Secondary: ", e1);
				}
			}
			this.running--;
			resolve();
			this.execute();
		});
	}

	ignore = (params: any) => {
	};

	execute() {
		if (this.queue.length === 0 && this.running === 0)
			return this.onQueueEmpty && this.onQueueEmpty();

		for (let i = 0; this.running < this.parallelCount && i < this.queue.length; i++) {
			const toExecute = this.queue[0];
			removeItemFromArray(this.queue, toExecute);
			new Promise(toExecute.bind(this))
				.then(this.ignore)
				.catch(this.ignore);
		}
	}
}
