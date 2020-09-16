import {
	ApiResponse,
	ServerApi
} from "@nu-art/thunderstorm/backend";


import {HttpMethod} from "@nu-art/thunderstorm";
import {PushPubSubModule} from "../../../modules/PushPubSubModule";
import {
	PubSubRegisterClient,
	Request_PushRegisterClient
} from "../../../../index";
import {ExpressRequest} from "@nu-art/thunderstorm/backend";

class ServerApi_PushRegister
	extends ServerApi<PubSubRegisterClient> {

	constructor() {
		super(HttpMethod.POST, "register-client");
	}

	protected async process(request: ExpressRequest, response: ApiResponse, queryParams: {}, body: Request_PushRegisterClient) {
		// const user = await KasperoProxy.validateSession(request);

		await PushPubSubModule.register(body);
	}
}

module.exports = new ServerApi_PushRegister();



