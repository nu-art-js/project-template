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
	auditBy,
	BadImplementationException,
	batchAction,
	currentTimeMillis,
	Day,
	filterInstances,
	generateHex,
	Hour,
	ImplementationMissingException,
	MB,
	Module,
	ThisShouldNotHappenException,
	TypedMap
} from "@nu-art/ts-common";
import {
	FileWrapper,
	FirebaseModule,
	StorageWrapper
} from "@nu-art/firebase/backend";
import {
	BaseUploaderFile,
	DB_Asset,
	Push_FileUploaded,
	PushKey_FileUploaded,
	TempSecureUrl,
	UploadResult
} from "../../shared/types";
import {AssetsTempModule} from "./AssetsTempModule";
import {PushPubSubModule} from "@nu-art/push-pub-sub/backend";
import {AssetsModule} from "./AssetsModule";
import {
	CleanupDetails,
	OnCleanupSchedulerAct
} from "@nu-art/thunderstorm/backend";
import {fromBuffer} from "file-type";
import {FileTypeResult} from "file-type/core";
import {FirestoreQuery} from "@nu-art/firebase";
import {FirebaseType_Metadata} from "../../../../../firebase/src/main/app-backend/storage/types";


type Config = {
	bucketName?: string
	path: string
}

export type FileTypeValidation = {
	fileType?: string[],
	minSize?: number
	maxSize?: number
	validator?: FileValidator
}

export const DefaultMimetypeValidator = async (file: FileWrapper, doc: DB_Asset) => {
	const buffer = await file.read();
	const fileType = await fromBuffer(buffer);
	if (!fileType)
		throw new ImplementationMissingException(`No validator defined for asset of mimetype: ${doc.mimeType}`);

	if (fileType.mime !== doc.mimeType)
		throw new BadImplementationException(`Original mimetype (${doc.mimeType}) does not match the resolved mimetype: (${fileType.mime})`);

	return fileType;
};

export type FileValidator = (file: FileWrapper, doc: DB_Asset) => Promise<FileTypeResult | undefined>;
export const fileSizeValidator = async (file: FileWrapper, metadata: FirebaseType_Metadata, minSizeInBytes: number = 0, maxSizeInBytes: number = MB) => {
	if (!metadata.size)
		throw new ThisShouldNotHappenException(`could not resolve metadata.size for file: ${file.path}`);

	return metadata.size >= minSizeInBytes && metadata.size <= maxSizeInBytes;
};

export class AssetsUploadingModuleBE_Class
	extends Module<Config>
	implements OnCleanupSchedulerAct {

	private storage!: StorageWrapper;

	mimeTypeValidator: TypedMap<FileValidator> = {};
	fileValidator: TypedMap<FileTypeValidation> = {};

	constructor() {
		super();
		this.setDefaultConfig({path: "assets"});
	}

	registerTypeValidator(mimeType: string, validator: (file: FileWrapper, doc: DB_Asset) => Promise<void>) {

	}

	register(key: string, validationConfig: FileTypeValidation) {
		if (this.fileValidator[key] && this.fileValidator[key] !== validationConfig)
			throw new BadImplementationException(`File Validator already exists for key: ${key}`);

		this.fileValidator[key] = validationConfig;
	}

	__onCleanupSchedulerAct(): CleanupDetails {
		return {
			moduleKey: this.getName(),
			interval: Day,
			cleanup: this.cleanup
		};
	}

	private cleanup = async () => {
		const entries: DB_Asset[] = await AssetsTempModule.query({where: {timestamp: {$lt: currentTimeMillis() - Hour}}});
		const bucketName = this.config?.bucketName;
		const bucket = await this.storage.getOrCreateBucket(bucketName);
		const dbEntriesToDelete = await Promise.all(entries.map(async dbAsset => {
			const file = await bucket.getFile(dbAsset.path);
			if (!(await file.exists()))
				return;

			await file.delete();
			return dbAsset;
		}));

		await batchAction(filterInstances(dbEntriesToDelete), 10, async (toDelete) => {
			return AssetsTempModule.delete({where: {_id: {$in: toDelete.map(item => item._id)}}});
		});
	};

	init() {
		this.storage = FirebaseModule.createAdminSession("file-uploader").getStorage();
	}

	async getUrl(files: BaseUploaderFile[]): Promise<TempSecureUrl[]> {
		const bucketName = this.config?.bucketName;
		const bucket = await this.storage.getOrCreateBucket(bucketName);
		return Promise.all(files.map(async _file => {
			const key = _file.key || _file.mimeType;

			// this will fail the entire request... should it?
			if (!this.fileValidator[key])
				throw new ImplementationMissingException(`Missing validator for type ${key}`);

			const _id = generateHex(32);
			const path = `${this.config.path}/${_id}`;
			const dbAsset: DB_Asset = {
				timestamp: currentTimeMillis(),
				_id,
				feId: _file.feId,
				name: _file.name,
				ext: _file.name.substring(_file.name.toLowerCase().lastIndexOf(".")),
				mimeType: _file.mimeType,
				key,
				path,
				_audit: auditBy('be-stub'),
				bucketName: bucket.bucketName
			};

			if (_file.public)
				dbAsset.public = _file.public;

			const dbTempMeta = await AssetsTempModule.upsert(dbAsset);
			const fileWrapper = await bucket.getFile(dbTempMeta.path);
			const url = await fileWrapper.getWriteSecuredUrl(_file.mimeType, Hour);
			return {
				secureUrl: url.securedUrl,
				tempDoc: dbTempMeta
			};
		}));
	}

	processAssetManually = async (feId?: string) => {
		let query: FirestoreQuery<DB_Asset> = {limit: 1};
		if (feId)
			query = {where: {feId}};

		const unprocessedFiles: DB_Asset[] = await AssetsTempModule.query(query);
		return Promise.all(unprocessedFiles.map(asset => this.processAsset(asset.path)));
	};

	processAsset = async (filePath?: string) => {
		if (!filePath)
			throw new ThisShouldNotHappenException('Missing file path');

		this.logInfo(`Looking for file with path: ${filePath}`);
		const tempMeta = await AssetsTempModule.queryUnique({path: filePath});
		if (!tempMeta)
			throw new ThisShouldNotHappenException(`Could not find meta for file with path: ${filePath}`);

		this.logInfo(`Found temp meta with _id: ${tempMeta._id}`, tempMeta);
		const validationConfig = this.fileValidator[tempMeta.key];
		if (!validationConfig)
			return this.notifyFrontend(UploadResult.Failure, tempMeta.feId, `Missing a validation config for ${tempMeta.key} for file: ${tempMeta.name}`);

		let mimetypeValidator: FileValidator = DefaultMimetypeValidator;
		if (validationConfig.validator)
			mimetypeValidator = validationConfig.validator;

		if (!mimetypeValidator && validationConfig.fileType && validationConfig.fileType.includes(tempMeta.mimeType))
			mimetypeValidator = this.mimeTypeValidator[tempMeta.mimeType];

		if (!mimetypeValidator)
			return this.notifyFrontend(UploadResult.Failure, tempMeta.feId,
			                           `Missing a mimetype(${tempMeta.mimeType}) validator for ${tempMeta.key} for file: ${tempMeta.name}`);

		const file = await this.storage.getFile(tempMeta.path, tempMeta.bucketName);
		try {
			const metadata = (await file.getDefaultMetadata()).metadata;
			if (!metadata)
				throw new ThisShouldNotHappenException(`could not resolve metadata for file: ${file.path}`);

			await fileSizeValidator(file, metadata, validationConfig.minSize, validationConfig.maxSize);
			const fileType = await mimetypeValidator(file, tempMeta);

			tempMeta.md5Hash = metadata.md5Hash;
			if (fileType) {
				this.logWarning(`renaming the file extension name: ${tempMeta.ext} => ${fileType.ext}`);
				tempMeta.ext = fileType.ext;
			}
		} catch (e) {
			//TODO delete the file and the temp doc
			return await this.notifyFrontend(UploadResult.Failure, tempMeta.feId, `Post-processing failed for file: ${tempMeta.name}`, e);
		}

		if (tempMeta.public) {
			try {
				// need to handle the response status!
				await file.makePublic();
			} catch (e) {
				await this.notifyFrontend(UploadResult.Failure, tempMeta.feId, `Failed to make the file public: ${tempMeta.name}`, e);
			}
		}

		// need to check if the md5hash exists in db already otherwise add new entry..
		await AssetsModule.runInTransaction(async (transaction) => {
			const upsertWrite = await AssetsModule.upsert_Read(tempMeta, transaction);
			await AssetsTempModule.deleteUnique(tempMeta._id, transaction);
			return upsertWrite();
		});

		// need to return the new asset id so fe would know how to connect the asset id with the item it is editing atm!!
		// message is not something to be served from BE.. FE needs info to compose the message.. think multiple languages!!
		return this.notifyFrontend(UploadResult.Success, tempMeta.feId, `Successfully parsed and processed file ${tempMeta.name}`);
	};

	private notifyFrontend = async (result: UploadResult, feId: string, message: string, cause?: Error) => {
		cause && this.logWarning(cause);
		const data = {message, result, cause};
		await PushPubSubModule.pushToKey<Push_FileUploaded>(PushKey_FileUploaded, {feId}, data);
	};
}


export const AssetsUploadingModuleBE = new AssetsUploadingModuleBE_Class();




