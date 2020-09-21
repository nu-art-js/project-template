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

/**
 * Created by tacb0ss on 11/07/2018.
 */
import {
	BadImplementationException,
	dispatch_onServerError,
	isErrorOfType,
	Logger,
	MUSTNeverHappenException,
	ServerErrorSeverity,
	validate,
	ValidatorTypeResolver,
	ValidationException
} from "@nu-art/ts-common";

import {Stream} from "stream";
import {parse} from "url";
import {
	HttpServer,
	ServerApi_Middleware
} from "./HttpServer";
import {IncomingHttpHeaders} from "http";
// noinspection TypeScriptPreferShortImport
import {
	ApiTypeBinder,
	ApiWithBody,
	ApiWithQuery,
	DeriveBodyType,
	DeriveQueryType,
	DeriveResponseType,
	DeriveUrlType,
	HttpMethod,
	QueryParams
} from "../../../shared/types";
import {assertProperty} from "../../utils/to-be-removed";
import {ApiException,} from "../../exceptions";
import {
	ExpressRequest,
	ExpressResponse,
	ExpressRouter
} from "../../utils/types";

export type HttpRequestData = {
	originalUrl: string
	headers: IncomingHttpHeaders
	url: string
	query: any
	body: any
	method: HttpMethod
}


export abstract class ServerApi<Binder extends ApiTypeBinder<string, R, B, P>, R = DeriveResponseType<Binder>, B = DeriveBodyType<Binder>, P extends QueryParams | {} = DeriveQueryType<Binder>>
	extends Logger {
	public static isDebug: boolean;

	readonly printResponse: boolean = true;
	readonly headersToLog: string[] = [];

	private readonly method: HttpMethod;
	private url!: string;
	private readonly relativePath: string;
	private middlewares?: ServerApi_Middleware[];
	private bodyValidator?: ValidatorTypeResolver<B>;
	private queryValidator?: ValidatorTypeResolver<P>;

	protected constructor(method: HttpMethod, relativePath: string, tag?: string) {
		super(tag || relativePath);
		this.method = method;
		this.relativePath = `/${relativePath}`;
	}

	setMiddlewares(...middlewares: ServerApi_Middleware[]) {
		this.middlewares = middlewares;
		return this;
	}

	addMiddlewares(...middlewares: ServerApi_Middleware[]) {
		this.middlewares = [...(this.middlewares || []), ...middlewares];
		return this;
	}

	addHeaderToLog(...headersToLog: string[]) {
		this.headersToLog.push(...headersToLog)
	}

	setBodyValidator(bodyValidator: ValidatorTypeResolver<B>) {
		this.bodyValidator = bodyValidator;
	}

	setQueryValidator(queryValidator: ValidatorTypeResolver<P>) {
		this.queryValidator = queryValidator;
	}

	getUrl() {
		return this.url;
	}

	dontPrintResponse() {
		// @ts-ignore
		this.printResponse = false;
	}

	setMaxResponsePrintSize(printResponseMaxSizeBytes: number) {
		// @ts-ignore
		this.printResponse = printResponseMaxSizeBytes > -1;
	}

	public route(router: ExpressRouter, prefixUrl: string) {
		const fullPath = `${prefixUrl ? prefixUrl : ""}${this.relativePath}`;
		this.setTag(fullPath);
		router[this.method](fullPath, this.call);
		this.url = `${HttpServer.getBaseUrl()}${fullPath}`;
	}

	assertProperty = assertProperty;

	call = async (req: ExpressRequest, res: ExpressResponse) => {
		const response: ApiResponse = new ApiResponse(this, res);

		this.logInfo(`-- Url: ${req.path}`);

		if (this.headersToLog.length > 0) {
			const headers: { [s: string]: string | undefined } = {}
			for (const headerName of this.headersToLog) {
				headers[headerName] = req.header(headerName);
			}
			this.logDebug(`-- Headers: `, headers);
		}

		const reqQuery: P = parse(req.url, true).query as P;
		if (reqQuery && typeof reqQuery === "object" && Object.keys(reqQuery as QueryParams).length)
			this.logVerbose(`-- Url Params: `, reqQuery);
		else
			this.logVerbose(`-- No Params`);

		const body: B | string | undefined = req.body;
		if (body && ((typeof body === "object")))
			this.logVerbose(`-- Body (Object): `, body as unknown as object);
		else if (body && (body as string).length)
			this.logVerbose(`-- Body (String): `, body as unknown as string);
		else
			this.logVerbose(`-- No Body`);

		const requestData: HttpRequestData = {
			method: this.method,
			originalUrl: req.path,
			headers: req.headers,
			url: req.url,
			query: reqQuery,
			body: body as B,
		};

		try {
			this.bodyValidator && validate<B>(body as B, this.bodyValidator);
			this.queryValidator && validate<P>(reqQuery, this.queryValidator);

			if (this.middlewares)
				await Promise.all(this.middlewares.map(m => m(req, requestData)));

			const toReturn: unknown = await this.process(req, response, reqQuery, body as B);
			if (response.isConsumed())
				return;

			if (!toReturn)
				return await response.end(200);

			// TODO need to handle stream and buffers
			// if (Buffer.isBuffer(toReturn))
			// 	return response.stream(200, toReturn as Buffer);

			const responseType = typeof toReturn;
			if (responseType === "object")
				return await response.json(200, toReturn as object);

			if (responseType === "string" && (toReturn as string).toLowerCase().startsWith("<html"))
				return await response.html(200, toReturn as string);

			return await response.text(200, toReturn as string);
		} catch (err) {
			let e: any = err;
			let severity: ServerErrorSeverity = ServerErrorSeverity.Warning;
			if (typeof e === "string")
				e = new BadImplementationException(`String was thrown: ${e}`);

			if (!(e instanceof Error) && typeof e === "object")
				e = new BadImplementationException(`Object instance was thrown: ${JSON.stringify(e)}`);

			try {
				this.logErrorBold(e);
			} catch (e2) {
				this.logErrorBold("Error while handling error on request...", e2);
				this.logErrorBold(`Original error thrown: ${JSON.stringify(e)}`);
				this.logErrorBold(`-- Someone was stupid... you MUST only throw an Error and not objects or strings!! --`);
			}

			if (isErrorOfType(e, ValidationException))
				e = new ApiException(400, "Validator exception", e);

			if (!isErrorOfType(e, ApiException))
				e = new ApiException(500, "Unexpected server error", e);

			const apiException = isErrorOfType(e, ApiException);
			if (!apiException)
				throw new MUSTNeverHappenException("MUST NEVER REACH HERE!!!");

			if (apiException.responseCode >= 500)
				severity = ServerErrorSeverity.Error;
			else if (apiException.responseCode >= 400)
				severity = ServerErrorSeverity.Warning;

			switch (apiException.responseCode) {
				case 401:
					severity = ServerErrorSeverity.Debug;
					break;

				case 404:
					severity = ServerErrorSeverity.Info;
					break;

				case 403:
					severity = ServerErrorSeverity.Warning;
					break;

				case 500:
					severity = ServerErrorSeverity.Critical;
					break;
			}

			const message = await HttpServer.errorMessageComposer(requestData, apiException);
			try {
				await dispatch_onServerError.dispatchModuleAsync([severity, HttpServer, message]);
			} catch (e) {
				this.logError("Error while handing server error", e);
			}
			if (apiException.responseCode === 500)
				return response.serverError(apiException);

			return response.exception(apiException);
		}
	};

	protected abstract async process(request: ExpressRequest, response: ApiResponse, queryParams: P, body: B): Promise<R>;
}

export abstract class ServerApi_Get<Binder extends ApiWithQuery<U, R, P>, U extends string = DeriveUrlType<Binder>, R = DeriveResponseType<Binder>, P extends QueryParams | {} = DeriveQueryType<Binder>>
	extends ServerApi<Binder> {

	protected constructor(apiName: string) {
		super(HttpMethod.GET, apiName);
	}
}

export abstract class ServerApi_Post<Binder extends ApiWithBody<U, R, B>, U extends string = DeriveUrlType<Binder>, R = DeriveResponseType<Binder>, B = DeriveBodyType<Binder>>
	extends ServerApi<Binder> {

	protected constructor(apiName: string) {
		super(HttpMethod.POST, apiName);
	}
}

export class ServerApi_Redirect
	extends ServerApi<any> {
	private readonly responseCode: number;
	private readonly redirectUrl: string;

	public constructor(apiName: string, responseCode: number, redirectUrl: string) {
		super(HttpMethod.ALL, apiName);
		this.responseCode = responseCode;
		this.redirectUrl = redirectUrl;
	}

	protected async process(request: ExpressRequest, response: ApiResponse, queryParams: QueryParams, body: any): Promise<void> {
		response.redirect(this.responseCode, `${HttpServer.getBaseUrl()}${this.redirectUrl}`)
	}
}

export class ApiResponse {
	private api: ServerApi<any>;
	private readonly res: ExpressResponse;
	private consumed: boolean = false;

	constructor(api: ServerApi<any>, res: ExpressResponse) {
		this.api = api;
		this.res = res;
	}

	public isConsumed(): boolean {
		return this.consumed;
	}

	private consume() {
		if (this.consumed) {
			this.api.logError("This API was already satisfied!!", new Error());
			return;
		}

		this.consumed = true;
	}

	stream(responseCode: number, stream: Stream, headers?: any) {
		this.consume();

		this.printHeaders(headers);
		this.api.logVerbose("Response with stream");
		this.res.set(headers);
		this.res.writeHead(responseCode);
		stream.pipe(this.res, {end: false});
		stream.on('end', () => {
			this.res.end();
		});
	}

	private printHeaders(headers?: any) {
		if (!headers)
			return this.api.logVerbose(` -- No response headers`);

		this.api.logVerbose(` -- Response with headers: `, headers);
	}

	private printResponse(response?: string | object) {
		if (!response)
			return this.api.logVerbose(` -- No response body`);

		if (!this.api.printResponse)
			return this.api.logVerbose(` -- Response: -- Not Printing --`);

		this.api.logVerbose(` -- Response:`, response);
	}

	public code(responseCode: number, headers?: any) {
		this.printHeaders(headers);
		this.end(responseCode, "", headers);
	}

	text(responseCode: number, response?: string, _headers?: any) {
		const headers = (_headers || {});
		headers["content-type"] = "text/plain";

		this.end(responseCode, response, headers);
	}

	html(responseCode: number, response?: string, _headers?: any) {
		const headers = (_headers || {});
		headers["content-type"] = "text/html";

		this.end(responseCode, response, headers);
	}

	json(responseCode: number, response?: object | string, _headers?: any) {
		this._json(responseCode, response, _headers);
	}


	private _json(responseCode: number, response?: object | string, _headers?: any) {
		const headers = (_headers || {});
		headers["content-type"] = "application/json";

		this.end(responseCode, response, headers);
	}

	end(responseCode: number, response?: object | string, headers?: any) {
		this.consume();

		this.printHeaders(headers);
		this.printResponse(response);

		this.res.set(headers);
		this.res.writeHead(responseCode);
		this.res.end(typeof response !== "string" ? JSON.stringify(response, null, 2) : response);
	}

	redirect(responseCode: number, url: string) {
		this.consume();

		this.res.redirect(responseCode, url);
	}

	exception(exception: ApiException, headers?: any) {
		const responseBody = exception.responseBody;
		if (!ServerApi.isDebug)
			delete responseBody.debugMessage;

		this._json(exception.responseCode, responseBody, headers);
	}

	serverError(error: Error & { cause?: Error }, headers?: any) {
		const stack = error.cause ? error.cause.stack : error.stack;
		const message = (error.cause ? error.cause.message : error.message) || "";
		this.text(500, ServerApi.isDebug && stack ? stack : message, headers);
	}
}