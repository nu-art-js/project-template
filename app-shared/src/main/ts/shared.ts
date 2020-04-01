/*
 * A backend boilerplate with example apis
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
	ApiWithBody,
	ApiWithQuery
} from "@nu-art/thunderstorm";

export type CommonBodyReq = {
	message: string
}

export type ParamsToGet = {
	param1: string
}

export type CustomError1 = {
	prop1: string
	prop2: string
}

export type CustomError2 = {
	prop3: string
	prop4: string
}
export interface TestDispatch {
	testDispatch:() => void;
}

export type ExampleApiCustomError = ApiWithBody<"/v1/sample/custom-error", void, void, CustomError1 | CustomError2>
export type ExampleApiPostType = ApiWithBody<"/v1/sample/another-endpoint", CommonBodyReq, string>
export type ExampleApiGetType = ApiWithQuery<string, string>
export type ExampleApiTest = ApiWithQuery<string, string>
export type ExampleGetMax = ApiWithQuery<"/v1/sample/get-max", {n:number}>
export type ApiType_GetWithoutParams = ApiWithQuery<"/v1/sample/get-without-params-endpoint", string>
export type ApiType_ApiGetWithParams = ApiWithQuery<"/v1/sample/get-with-params-endpoint", string, ParamsToGet>
export type ApiType_ApiPostWithoutResponse = ApiWithBody<"/v1/sample/post-without-body-endpoint", CommonBodyReq, void>
export type ApiType_ApiPostWithResponse = ApiWithBody<"/v1/sample/post-with-body-endpoint", CommonBodyReq, string>
