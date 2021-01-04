import {
	ApiResponse,
	ExpressRequest,
	ServerApi
} from "@ir/thunderstorm/backend";


import {HttpMethod} from "@ir/thunderstorm";
import {PushPubSubModule} from "../../../modules/PushPubSubModule";
import {
	PubSubReadNotification,
	Request_ReadPush
} from "../../../../index";

class ServerApi_PushRead
	extends ServerApi<PubSubReadNotification> {

	constructor() {
		super(HttpMethod.POST, "read");
	}

	protected async process(request: ExpressRequest, response: ApiResponse, queryParams: {}, body: Request_ReadPush) {
		// const user = await KasperoProxy.validateSession(request);
		console.log('here i am')
		return await PushPubSubModule.readNotification(body._id, body.read);
	}
}

module.exports = new ServerApi_PushRead();