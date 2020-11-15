/*
 * Thunderstorm is a full web app framework!
 *
 * Typescript & Express backend infrastructure that natively runs on firebase function
 * Typescript & React frontend infrastructure
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
	ImplementationMissingException,
	Module,
	ObjectTS
} from "@nu-art/ts-common";

import {
	HeaderKey,
	ServerApi_Middleware
} from "../server/HttpServer";
import {ApiException} from "../../exceptions";
import {HttpRequestData} from "../server/server-api";
import {
	ExpressRequest,
	QueryRequestInfo
} from "../../utils/types";

type ProxyConfig = {
	extras?: ObjectTS
	urls: string[],
	secret: string
};
export type RemoteProxyConfig = {
	remotes: {
		[proxyId: string]: ProxyConfig
	}
	secretHeaderName?: string
	proxyHeaderName?: string
}

export class RemoteProxy_Class<Config extends RemoteProxyConfig>
	extends Module<Config>
	implements QueryRequestInfo {

	async __queryRequestInfo(request: ExpressRequest): Promise<{ key: string; data: any; }> {
		let data: string | undefined;
		try {
			data = this.proxyHeader.get(request);
		} catch (e) {
		}
		return {
			key: this.getName(),
			data
		};
	}

	readonly Middleware: ServerApi_Middleware = async (request: ExpressRequest) => {
		RemoteProxy.assertSecret(request);
	};
	private secretHeader!: HeaderKey;
	private proxyHeader!: HeaderKey;

	protected init(): void {
		if (!this.config)
			throw new ImplementationMissingException("MUST specify config for this module!!");

		if (!this.config.secretHeaderName)
			this.config.secretHeaderName = 'x-secret';

		if (!this.config.proxyHeaderName)
			this.config.proxyHeaderName = 'x-proxy';

		this.secretHeader = new HeaderKey(this.config.secretHeaderName);
		this.proxyHeader = new HeaderKey(this.config.proxyHeaderName);
	}

	assertSecret(request: ExpressRequest) {
		if (!this.secretHeader || !this.proxyHeader)
			throw new ImplementationMissingException("MUST add RemoteProxy to your module list!!!");

		const secret = this.secretHeader.get(request);
		const proxyId = this.proxyHeader.get(request);

		const expectedSecret = this.config.remotes[proxyId];

		if (!proxyId)
			throw new ApiException(403, `Missing proxy declaration in config for ${proxyId} !!`);

		if (!secret)
			throw new ApiException(403, `Missing secret !!`);

		if (!expectedSecret)
			throw new ApiException(403, `ProxyId '${proxyId}' is not registered for remote access !!`);

		if (expectedSecret.secret !== secret)
			throw new ApiException(403, `Secret does not match for proxyId: ${proxyId}`);

		const requestUrl = request.path;
		if (!expectedSecret.urls || !expectedSecret.urls.includes(requestUrl))
			throw new ApiException(403, `Requested url '${requestUrl}' is not allowed from proxyId: ${proxyId}`);

		return expectedSecret.extras;
	}

	async processApi(request: ExpressRequest, requestData: HttpRequestData) {
		return this.assertSecret(request);
	}
}

export const RemoteProxy = new RemoteProxy_Class();