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
	ApiTypeBinder,
	BaseHttpRequest,
	DeriveBodyType,
	DeriveQueryType,
	DeriveResponseType,
	DeriveUrlType,
	ErrorResponse,
	QueryParams,
	RequestErrorHandler
} from "@nu-art/thunderstorm";
import {
	ApiBinder_DBCreate,
	ApiBinder_DBDelete,
	ApiBinder_DBQuery,
	ApiBinder_DBUniuqe,
	ApiBinder_DBUpdate,
	DefaultApiDefs,
	GenericApiDef
} from "../index";
import {DB_Object} from "@nu-art/firebase";
import {
	ThunderDispatcher,
	ToastModule,
	XhrHttpModule
} from "@nu-art/thunderstorm/frontend";

import {
	addItemToArray,
	Module,
	PartialProperties,
	removeItemFromArray
} from "@nu-art/ts-common";

export type BaseApiConfig = {
	relativeUrl: string
	key: string
}

export abstract class BaseDB_ApiGeneratorCaller<DBType extends DB_Object, UType extends PartialProperties<DBType, "_id"> = PartialProperties<DBType, "_id">>
	extends Module<BaseApiConfig> {

	private readonly errorHandler: RequestErrorHandler<any> = (request: BaseHttpRequest<any>, resError?: ErrorResponse<any>) => {
		if (this.onError(request, resError))
			return;
		return ToastModule.toastError(
			request.getStatus() === 403 ? "You are not allowed to perform this action. Please check your permissions." : "Failed to perform action.");
	};

	private defaultDispatcher?: ThunderDispatcher<any, string>;

	constructor(config: BaseApiConfig) {
		super();
		this.setDefaultConfig(config);
	}

	setDefaultDispatcher(defaultDispatcher: ThunderDispatcher<any, string>) {
		this.defaultDispatcher = defaultDispatcher;
	}

	protected createRequest<Binder extends ApiTypeBinder<U, R, B, P, any> = ApiTypeBinder<void, void, void, {}, any>,
		U extends string = DeriveUrlType<Binder>,
		R = DeriveResponseType<Binder>,
		B = DeriveBodyType<Binder>,
		P extends QueryParams = DeriveQueryType<Binder>>(apiDef: GenericApiDef): BaseHttpRequest<Binder> {

		const request = XhrHttpModule
			.createRequest(apiDef.method, this.getKey(apiDef))
			.setRelativeUrl(`${this.config.relativeUrl}${apiDef.suffix ? "/" + apiDef.suffix : ""}`)
			.setOnError(this.errorHandler) as BaseHttpRequest<any>;

		const timeout = this.timeoutHandler(apiDef);
		if (timeout)
			request.setTimeout(timeout);

		return request;
	}

	protected getKey(apiDef: GenericApiDef) {
		return `request-api--${this.config.key}-${apiDef.key}`;
	}

	protected timeoutHandler(apiDef: GenericApiDef): number | void {
	}

	protected onError(request: BaseHttpRequest<any>, resError?: ErrorResponse<any>): boolean {
		return false;
	}

	create(toCreate: UType): BaseHttpRequest<ApiBinder_DBCreate<DBType>> {
		return this
			.createRequest<ApiBinder_DBCreate<DBType>>(DefaultApiDefs.Create)
			.setJsonBody(toCreate)
			.execute(async (response: DBType) => {
				return this.onEntryCreated(response);
			});
	}

	update = (toUpdate: DB_Object & Partial<DBType>): BaseHttpRequest<ApiBinder_DBUpdate<DBType>> => {
		return this
			.createRequest<ApiBinder_DBUpdate<DBType>>(DefaultApiDefs.Update)
			.setJsonBody(toUpdate)
			.execute(async response => {
				return this.onEntryUpdated(response);
			});
	};

	query = (query?: Partial<DBType>): BaseHttpRequest<ApiBinder_DBQuery<DBType>> => {
		let _query = query;
		if (!_query)
			_query = {} as Partial<DBType>;

		return this
			.createRequest<ApiBinder_DBQuery<DBType>>(DefaultApiDefs.Query)
			.setJsonBody(_query)
			.execute(async response => {
				return this.onQueryReturned(response);
			});
	};

	unique = (_id: string): BaseHttpRequest<ApiBinder_DBUniuqe<DBType>> => {
		return this
			.createRequest<ApiBinder_DBUniuqe<DBType>>(DefaultApiDefs.Unique)
			.setUrlParams({_id})
			.execute(async response => {
				return this.onGotUnique(response);
			});
	};

	delete = (_id: string): BaseHttpRequest<ApiBinder_DBDelete<DBType>> => {
		return this
			.createRequest<ApiBinder_DBDelete<DBType>>(DefaultApiDefs.Delete)
			.setUrlParams({_id})
			.execute(async response => {
				return this.onEntryDeleted(response);
			});
	};

	private ids: string[] = [];
	private items: { [k: string]: DBType } = {};

	public getItems() {
		return this.ids.map(id => this.items[id]);
	}

	public get(id: string) {
		return this.items[id];
	}

	protected async onEntryCreated(item: DBType): Promise<void> {
		addItemToArray(this.ids, item._id);
		this.items[item._id] = item;
		this.dispatch();
	}

	private dispatch = () => {
		this.defaultDispatcher?.dispatchUI([]);
		this.defaultDispatcher?.dispatchModule([]);
	};

	protected async onEntryDeleted(item: DBType): Promise<void> {
		removeItemFromArray(this.ids, item._id);
		delete this.items[item._id];

		this.dispatch()
	}

	protected async onEntryUpdated(item: DBType): Promise<void> {
		this.items[item._id] = item;
		this.dispatch()
	}

	protected async onGotUnique(item: DBType): Promise<void> {
		if (!this.ids.includes(item._id))
			addItemToArray(this.ids, item._id);

		this.items[item._id] = item;
		this.dispatch()
	}

	protected async onQueryReturned(items: DBType[]): Promise<void> {
		this.ids = items.map(item => item._id);
		this.items = items.reduce((toRet, item) => {
			toRet[item._id] = item;
			return toRet;
		}, this.items);

		this.dispatch()
	}
}
