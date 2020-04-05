import {
	ServerApi,
	ApiResponse
} from "@nu-art/thunderstorm/backend";

import {
	HttpMethod,
	ApiWithQuery
} from "@nu-art/thunderstorm";
import * as express from "express";
import {FirebaseProjectCollections} from "@nu-art/firebase";
import {FirebaseModule} from "@nu-art/firebase/backend";


class ServerApi_RegisterExternalProject
	extends ServerApi<ApiWithQuery<string, { list: FirebaseProjectCollections[] }>> {

	constructor() {
		super(HttpMethod.GET, "list-firebase-collections");
	}

	protected async process(request: express.Request, response: ApiResponse, queryParams: {}, body: void) {
		return {list: Object.values(FirebaseModule.listCollectionsInModules())};
	}
}

module.exports = new ServerApi_RegisterExternalProject();
