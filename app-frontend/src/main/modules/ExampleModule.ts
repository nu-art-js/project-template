/*
 * A typescript & react boilerplate with api call example
 *
 * Copyright (C) 2018  Adam van der Kruk aka TacB0sS
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
	Module,
	Second
} from "@nu-art/ts-common";

import {
	HttpModule,
	ThunderDispatcher,
	ToastModule
} from "@nu-art/thunderstorm/frontend";
import {
	CommonBodyReq,
	CustomError1,
	CustomError2,
	ExampleApiCustomError,
	ExampleApiGetType,
	ExampleApiPostType
} from "@app/sample-app-shared";
import {
	ErrorResponse,
	HttpMethod
} from "@nu-art/thunderstorm";

type Config = {
	remoteUrl: string
}

export const RequestKey_CustomError = "CustomError";
export const RequestKey_PostApi = "PostApi";
export const RequestKey_GetApi = "GetApi";

export interface TestDispatch {
	testDispatch: () => void
}

export class ExampleModule_Class
	extends Module<Config> {
	private message!: string;
	thunderDispatcher = new ThunderDispatcher<TestDispatch, 'testDispatch'>('testDispatch');

	data: string[] = [];

	getData = () => this.data;

	setData = () => {
		this.data = ['a','b'];
	}

	testClickHandler = () => {
		console.log('hi');
		setTimeout(() => {
			this.setData();
			this.thunderDispatcher.dispatchUI([])
			this.thunderDispatcher.dispatchModule([])
		}, 2 * Second)
	}

	callCustomErrorApi() {
		HttpModule
			.createRequest<ExampleApiCustomError>(HttpMethod.POST, RequestKey_CustomError)
			.setRelativeUrl("/v1/sample/custom-error")
			.setOnError((request, resError?: ErrorResponse<CustomError1 | CustomError2>) => {
				const error = resError?.error;
				if (!error)
					return;

				const errorType = error.type;
				if (!errorType)
					return;

				let errorBody: CustomError1 | CustomError2 | undefined;
				switch (errorType) {
					case "CustomError1":
						errorBody = error.body as CustomError1;
						ToastModule.toastError(`${errorBody.prop1}\n${errorBody.prop2}`);
						break;

					case "CustomError2":
						errorBody = error.body as CustomError2;
						ToastModule.toastError(`${errorBody.prop3}\n${errorBody.prop4}`);
						break;
				}
			})
			.setOnSuccessMessage(`Success`)
			.execute();
	}

	public getMessageFromServer1 = () => {
		this.logInfo("getting label from server");
		const bodyObject: CommonBodyReq = {message: this.message || "No message"};

		HttpModule
			.createRequest<ExampleApiPostType>(HttpMethod.POST, RequestKey_PostApi)
			.setJsonBody(bodyObject)
			.setRelativeUrl("/v1/sample/another-endpoint")
			.setOnError(`Error getting new message from backend`)
			.setOnSuccessMessage(`Success`)
			.execute(this.setMessage);

		this.logInfo("continue... will receive an event once request is completed..");
	};

	public getMessageFromServer2 = () => {
		this.logInfo("getting label from server");

		HttpModule
			.createRequest<ExampleApiGetType>(HttpMethod.GET, RequestKey_GetApi)
			.setRelativeUrl(this.config.remoteUrl)
			.setOnError(`Error getting new message from backend`)
			.execute(async response => {
				this.message = response;
			});

		this.logInfo("continue... will receive an event once request is completed..");
	};


	setMessage = async (message: string) => {
		this.logInfo(`got message: ${message}`);
		this.message = message;
	};

	getMessage = () => this.message;
}

export const ExampleModule = new ExampleModule_Class();
