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

export type CustomOptional<T, K> = {
	[P in keyof T]?: K
};

export type Subset<T> = {
	[P in keyof T]: T[P];
};

export type OptionalKeys<T extends object> = Exclude<{ [K in keyof T]: T extends Record<K, T[K]> ? never : K }[keyof T], undefined>
export type MandatoryKeys<T extends object, V extends any = any> = Exclude<{ [K in keyof T]: T extends Record<K, T[K]> ? (T[K] extends V ? K : never) : never }[keyof T], undefined>

export type RequireOptionals<T extends object, Keys extends OptionalKeys<T> = OptionalKeys<T>> = Pick<T, Exclude<keyof T, Keys>>
	& { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys]

export type RequireOneOptional<T extends object, Keys extends OptionalKeys<T> = OptionalKeys<T>> = Pick<T, Exclude<keyof T, Keys>>
	& { [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>> }[Keys]

export type Constructor<T> = new (...args: any) => T
export type ArrayType<T extends any[]> = T extends (infer I)[] ? I : never;

export type PartialProperties<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type Identity = { id: string };

export type StringMap = { [s: string]: string };

export type ObjectTS = { [s: string]: any };

export type TypedMap<ValueType> = { [s: string]: ValueType };

export type DB_Object = { _id: string }

export type Auditable = {
	_audit?: AuditBy;
};

export type AuditBy = {
	comment?: string;
	auditBy: string;
	auditAt: Timestamp;
};

export type Timestamp = {
	timestamp: number;
	pretty: string;
	timezone?: string;
};

export type FunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];

export const Void = (() => {
})();


export type PackageJson = {
	version: string;
	name: string;
};

export type DeflatePromise<T> = T extends Promise<infer A> ? A : T

export type ReturnPromiseType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? DeflatePromise<R> : never;

export type RangeTimestamp = {
	min: number;
	max: number;
};
