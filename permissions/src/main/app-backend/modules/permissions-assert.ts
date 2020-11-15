/*
 * ts-common is the basic building blocks of our typescript projects
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
	Module,
	StringMap,
	_keys,
	BadImplementationException
} from "@nu-art/ts-common";
import {
	ApiException,
	HttpRequestData,
	ExpressRequest,
	ServerApi_Middleware
} from "@nu-art/thunderstorm/backend";
import {
	Base_AccessLevels,
	DB_PermissionAccessLevel,
	DB_PermissionsGroup,
	User_Group
} from "../..";
import {
	AccessLevelPermissionsDB,
	ApiPermissionsDB
} from "./db-types/managment";
import {
	GroupPermissionsDB,
	UserPermissionsDB
} from "./db-types/assign";
import {HttpMethod} from "@nu-art/thunderstorm";
import {AccountModule} from "@nu-art/user-account/backend";
import {PermissionsModule} from "./PermissionsModule";

export type UserCalculatedAccessLevel = { [domainId: string]: number };
export type GroupPairWithBaseLevelsObj = { accessLevels: Base_AccessLevels[], customFields: StringMap[] };
export type RequestPairWithLevelsObj = { accessLevels: DB_PermissionAccessLevel[], customFields: StringMap[] };

type Config = {
	strictMode?: boolean
}

export class PermissionsAssert_Class
	extends Module<Config> {

	readonly Middleware = (keys: string[]): ServerApi_Middleware => async (req: ExpressRequest, data: HttpRequestData) => {
		await this.CustomMiddleware(keys, async (projectId: string, customFields: StringMap) => {

			const account = await AccountModule.validateSession(req);
			return this.assertUserPermissions(projectId, data.url, account._id, customFields);
		})(req, data);
	};

	readonly CustomMiddleware = (keys: string[], action: (projectId: string, customFields: StringMap) => Promise<void>): ServerApi_Middleware => async (req: ExpressRequest, data: HttpRequestData) => {
		const customFields: StringMap = {};
		let object: { [k: string]: any };
		switch (data.method) {
			case HttpMethod.POST:
			case HttpMethod.PATCH:
			case HttpMethod.PUT:
				object = data.body;
				break;

			case HttpMethod.GET:
			case HttpMethod.DELETE:
				object = data.query;
				break;

			default:
				throw new BadImplementationException(`Generic custom fields cannot be extracted on api with method: ${data.method}`)
		}

		_keys(object).filter(key => keys.includes(key as string)).forEach(key => {
			const oElement = object[key];
			if (oElement === undefined || oElement === null)
				return;

			if (typeof oElement !== "string")
				return;

			customFields[key] = oElement;
		});

		const projectId = PermissionsModule.getProjectIdentity()._id;
		await action(projectId, customFields);
	};

	async assertUserPermissions(projectId: string, _path: string, userId: string, requestCustomField: StringMap) {
		const path = _path.substring(0, (_path + '?').indexOf('?'));
		const [apiDetails, userDetails] = await Promise.all([this.getApiDetails(path, projectId),
		                                                     this.getUserDetails(userId)]);

		if (!apiDetails.apiDb.accessLevelIds) {
			if (!this.config.strictMode)
				return;

			throw new ApiException(403, `No permissions configuration specified for api: ${projectId}--${path}`);
		}

		await this.assertUserPermissionsImpl(userDetails.userGroups, apiDetails.requestPermissions, [requestCustomField]);
	}

	async assertUserSharingGroup(granterUserId: string, userGroup: User_Group) {
		const [granterUser, groupToShare] = await Promise.all([this.getUserDetails(granterUserId), GroupPermissionsDB.queryUnique({_id: userGroup.groupId})]);
		groupToShare.customFields = this.getCombineUserGroupCF(userGroup, groupToShare);
		const requestPermissions = await this.getAccessLevels(groupToShare.accessLevelIds || []);
		const requestCustomFields = groupToShare.customFields;
		await this.assertUserPermissionsImpl(granterUser.userGroups, requestPermissions, requestCustomFields);
	}

	async assertUserPermissionsImpl(userGroups: DB_PermissionsGroup[], requestPermissions: DB_PermissionAccessLevel[], requestCustomFields: StringMap[]) {
		if (!requestPermissions.length)
			return;

		const requestPairWithLevelsObj: RequestPairWithLevelsObj = {accessLevels: requestPermissions, customFields: requestCustomFields};

		let groupMatch = false;
		const groupsMatchArray = userGroups.map(group => {
			const groupPairWithLevelsObj: GroupPairWithBaseLevelsObj = {accessLevels: group.__accessLevels || [], customFields: group.customFields || []};

			return this.isMatchWithLevelsObj(groupPairWithLevelsObj, requestPairWithLevelsObj);
		});

		for (const match of groupsMatchArray) {
			if (match)
				groupMatch = true;
		}

		if (!groupMatch) {
			throw new ApiException(403, "Action Forbidden");
		}
	}

	private async getUserDetails(uuid: string) {
		const user = await UserPermissionsDB.queryUnique({accountId: uuid});
		const userGroups = user.groups || [];
		const groupIds = userGroups.map(userGroup => userGroup.groupId);
		const groupsArray: DB_PermissionsGroup[][] = await Promise.all(
			this.splitToManyArrays(groupIds || []).map(subGroupIds => GroupPermissionsDB.query({where: {_id: {$in: subGroupIds}}})));
		const groups: DB_PermissionsGroup[] = ([] as DB_PermissionsGroup[]).concat(...groupsArray);

		return {
			user,
			userGroups: this.getCombineUserGroups(userGroups, groups)
		}
	}

	private getCombineUserGroupCF(userGroup: User_Group, group: DB_PermissionsGroup) {
		const cfArray = [];
		if (group.customFields) {
			cfArray.push(...group.customFields);
		}

		if (userGroup.customField) {
			cfArray.push(userGroup.customField);
		}

		return cfArray;
	}

	private getCombineUserGroups(userGroups: User_Group[], groups: DB_PermissionsGroup[]) {
		const combinedGroups: DB_PermissionsGroup[] = [];
		groups.forEach(group => {
			const existUserGroupItem = userGroups.find(groupItem => groupItem.groupId === group._id);
			if (!existUserGroupItem)
				throw new BadImplementationException("You are missing group in your code implementation");

			userGroups.forEach((userGroup) => {
				if (userGroup.groupId === group._id) {
					combinedGroups.push({...group, customFields: this.getCombineUserGroupCF(userGroup, group)});
				}
			});
		});

		return combinedGroups;
	}

	private async getApiDetails(path: string, projectId: string) {
		const apiDb = await ApiPermissionsDB.queryUnique({path, projectId});
		const requestPermissions = await this.getAccessLevels(apiDb.accessLevelIds || []);

		return {
			apiDb,
			requestPermissions
		}
	}

	private async getAccessLevels(accessLevelIds: string[]) {
		return Promise.all(accessLevelIds.map((levelId: string) => AccessLevelPermissionsDB.queryUnique({_id: levelId})));
	}

	private splitToManyArrays(arrayIds: string[]) {
		const bulkSize = 10;
		const bulksNumber = Math.ceil(arrayIds.length / bulkSize);
		const containArray = [];
		for (let i = 0; i < bulksNumber; i++) {
			const startIndex = i * bulkSize;
			const subArrayIds = arrayIds.slice(startIndex, startIndex + bulkSize);
			containArray.push(subArrayIds);
		}

		return containArray;
	}

	isMatchWithLevelsObj(groupPair: GroupPairWithBaseLevelsObj, requestPair: RequestPairWithLevelsObj) {
		let match = true;

		requestPair.customFields.forEach(requestCF => {
			if (!this.doesCustomFieldsSatisfies(groupPair.customFields, requestCF)) {
				match = false;
			}
		});

		if (!match)
			return false;

		const groupDomainLevelMap = this.getDomainLevelMap(groupPair.accessLevels);
		requestPair.accessLevels.forEach((requiredLevel, index) => {
			const userAccessLevel = groupDomainLevelMap[requiredLevel.domainId];
			if (userAccessLevel === undefined || userAccessLevel < requiredLevel.value)
				match = false;
		});

		return match;
	}

	private getDomainLevelMap(accessLevels: Base_AccessLevels[]) {
		return accessLevels.reduce((toRet, accessLevel) => {
			const levelForDomain = toRet[accessLevel.domainId];
			if (!levelForDomain || levelForDomain < accessLevel.value)
				toRet[accessLevel.domainId] = accessLevel.value;

			return toRet;
		}, {} as UserCalculatedAccessLevel);
	}

	doesCustomFieldsSatisfies(groupCustomFields: StringMap[] = [], requestCustomField: StringMap) {
		if (!Object.keys(requestCustomField).length)
			return true;

		return groupCustomFields.reduce((doesSatisfies, customField) => {
			return doesSatisfies || this.doesCustomFieldSatisfies(customField, requestCustomField);
		}, false);
	}

	private doesCustomFieldSatisfies(groupCustomField: StringMap, requestCustomField: StringMap) {
		return Object.keys(requestCustomField).reduce((doesSatisfies, requestCustomFieldKey) => {
			const customFieldRegEx = this.getRegEx(groupCustomField[requestCustomFieldKey]);
			return doesSatisfies && customFieldRegEx.test(requestCustomField[requestCustomFieldKey]);
		}, true as boolean);
	}

	private getRegEx(value: string) {
		if (!value)
			return new RegExp(`^${value}$`, "g");

		let regExValue = value;
		const startRegEx = '^';
		const endRegEx = '$';
		if (value[0] !== startRegEx)
			regExValue = startRegEx + regExValue;

		if (value[value.length - 1] !== endRegEx)
			regExValue = regExValue + endRegEx;

		return new RegExp(regExValue, "g");
	}
}

export const PermissionsAssert = new PermissionsAssert_Class();