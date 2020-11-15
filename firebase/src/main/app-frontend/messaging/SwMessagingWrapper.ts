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
	_setTimeout,
	Logger
} from "@nu-art/ts-common";
import {FirebaseType_Messaging} from "./types";
// tslint:disable:no-import-side-effect
import 'firebase/messaging';


export class SwMessagingWrapper
	extends Logger {

	private readonly messaging: FirebaseType_Messaging;

	constructor(messaging: FirebaseType_Messaging) {
		super();
		this.messaging = messaging;
	}

	onBackgroundMessage(callback: (payload: any) => void){
		// This means that the bundle is being evaluated in the main thread to register the service worker so there is no need to run the rest
		// Also because it would fail since firebase would initialize the messaging controller as the main thread one instead of the sw one...
		if(!self || !('ServiceWorkerGlobalScope' in self))
			return this.logWarning('Not a service worker context');

		this.logInfo('This is a service worker context');
		this.messaging.onBackgroundMessage(callback)
	}

}