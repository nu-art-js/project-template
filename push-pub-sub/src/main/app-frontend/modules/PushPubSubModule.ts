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
	addItemToArray,
	compare,
	ImplementationMissingException,
	Module,
	removeFromArray,
	StringMap
} from "@nu-art/ts-common";

import {
	HttpModule,
	ThunderDispatcher,
	ToastModule
} from "@nu-art/thunderstorm/frontend";
// noinspection TypeScriptPreferShortImport
import {
	BaseSubscriptionData,
	IFP,
	ISP,
	ITP,
	MessageType,
	PubSubRegisterClient,
	Request_PushRegisterClient,
	SubscribeProps,
	SubscriptionData
} from "../../index";
import {HttpMethod} from "@nu-art/thunderstorm";
import {
	FirebaseModule,
	FirebaseSession,
	MessagingWrapper
} from "@nu-art/firebase/frontend";

export const Command_SwToApp = 'SwToApp';

export interface OnPushMessageReceived<M extends MessageType<any, any, any> = never,
	S extends string = IFP<M>,
	P extends SubscribeProps = ISP<M>,
	D = ITP<M>> {
	__onMessageReceived(pushKey: S, props?: P, data?: D): void
}

type FirebaseConfig = {
	apiKey: string
	authDomain: string
	projectId: string
	messagingSenderId: string
	databaseURL?: string
}

export type PushPubSubConfig = {
	config?: FirebaseConfig
	publicKeyBase64: string
}


export class PushPubSubModule_Class
	extends Module<PushPubSubConfig> {

	private subscriptions: BaseSubscriptionData[] = [];
	private firebaseToken?: string;
	private messaging?: MessagingWrapper;

	private dispatch_pushMessage = new ThunderDispatcher<OnPushMessageReceived<MessageType<any, any, any>>, "__onMessageReceived">("__onMessageReceived");

	init() {
		if (!this.config?.publicKeyBase64)
			throw new ImplementationMissingException(`Please specify the right config for the 'PushPubSubModule'`);

		this.runAsync('Initializing Firebase SDK and registering SW', this.initApp)
	}

	private registerServiceWorker = async () => navigator.serviceWorker.register('/service_worker.js');

	private initApp = async () => {
		if ('serviceWorker' in navigator) {
			const asyncs: [Promise<ServiceWorkerRegistration>, Promise<FirebaseSession>] = [
				this.registerServiceWorker(),
				FirebaseModule.createSession()
			];

			const {0: registration, 1: app} = await Promise.all(asyncs);

			this.messaging = app.getMessaging();
			this.messaging.usePublicVapidKey(this.config.publicKeyBase64);
			this.messaging.useServiceWorker(registration);

			await this.getToken();

			navigator.serviceWorker.onmessage = (event: MessageEvent) => {
				this.processMessageFromSw(event.data)
			};
		}
	};

	// / need to call this from the login verified
	public getToken = async () => {
		try {
			this.logVerbose('Checking/Requesting permission...');
			const permission = await Notification.requestPermission();
			this.logVerbose(`Notification permission: ${permission}`);
			if (permission !== 'granted')
				return;

			if (!this.messaging)
				return;

			this.firebaseToken = await this.messaging.getToken();
			if (!this.firebaseToken)
				return;

			await this.register();
			this.logVerbose('new token received: ' + this.firebaseToken);
			this.messaging.onTokenRefresh(() => this.runAsync('Token refresh', this.getToken));

			this.messaging.onMessage((payload) => {
				this.processMessage(payload.data)
			});

		} catch (err) {
			this.logError("Unable to get token", err);
		}

	};

	private processMessageFromSw = (data: any) => {
		if (!data.command || !data.message || data.command !== Command_SwToApp)
			return;

		this.processMessage(data.message)
	};

	private processMessage = (data: StringMap) => {
		const arr: SubscriptionData[] = JSON.parse(data.messages);
		arr.forEach(s => {
			const sub = this.subscriptions.find(_s => _s.pushKey === s.pushKey && (s.props ? compare(_s.props, s.props) : true));
			if (!sub)
				return;

			this.dispatch_pushMessage.dispatchModule([s.pushKey, s.props, s.data]);
		});
	};

	subscribe = async (subscription: BaseSubscriptionData) => {
		this.subscribeImpl(subscription);
		return this.register();
	};

	private subscribeImpl(subscription: BaseSubscriptionData) {
		if (this.subscriptions.find(d => d.pushKey === subscription.pushKey && compare(subscription.props, d.props)))
			return;

		addItemToArray(this.subscriptions, subscription);
	}

	subscribeMulti = async (subscriptions: BaseSubscriptionData[]) => {
		subscriptions.forEach(subscription => this.subscribeImpl(subscription));
		return this.register();
	};

	unsubscribe = async (subscription: BaseSubscriptionData) => {
		removeFromArray(this.subscriptions, d => d.pushKey === subscription.pushKey && compare(subscription.props, d.props));
		return this.register();
	};

	private register = async () => {
		if (!this.firebaseToken || this.subscriptions.length === 0)
			return;

		const body: Request_PushRegisterClient = {
			firebaseToken: this.firebaseToken,
			subscriptions: this.subscriptions.map(({pushKey, props}) => ({pushKey, props}))
		};

		return new Promise(resolve => {
			this.throttle(() => {
				HttpModule
					.createRequest<PubSubRegisterClient>(HttpMethod.POST, 'register-pub-sub-tab')
					.setRelativeUrl("/v1/push/register-client")
					.setJsonBody(body)
					.setOnError(() => ToastModule.toastError("Failed to register for push"))
					.execute(() => {
						resolve()
					})
			}, 'push-registration', 800)
		})

	};
}

export const PushPubSubModule = new PushPubSubModule_Class();