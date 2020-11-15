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
	BadImplementationException,
	Exception,
	Module
} from "@nu-art/ts-common";
import * as jwt from "jsonwebtoken";
import {
	Octokit,
	RestEndpointMethodTypes
} from '@octokit/rest';
import {
	OctokitResponse, ReposGetContentResponseData
} from "@octokit/types"
import * as path from "path";
import {
	ExpressRequest,
	promisifyRequest
} from "@nu-art/thunderstorm/backend";

type Config = {
	appId: string
	privateKey: string
	userAgent: string
	gitOwner: string
};

export class GithubModule_Class
	extends Module<Config> {

	private createClient(token: string, prefix?: string) {
		const auth = `${prefix || "token"} ${token}`;
		const client: Octokit = new Octokit(
			{
				userAgent: this.config.userAgent,
				log: {
					debug: this.logDebug.bind(this),
					info: this.logInfo.bind(this),
					warn: this.logWarning.bind(this),
					error: this.logError.bind(this)
				},
				auth: auth
			});
		return client;
	};

	private async createClientWithJWT() {
		const ts = Math.floor(Date.now() / 1000.0);
		const payload = {
			// issued at time
			iat: ts,
			// JWT expiration time (10 minute maximum)
			exp: ts + (10 * 60),
			// GitHub App's identifier
			iss: parseInt(this.config.appId)
		};
		const signedToken = await jwt.sign(payload, this.config.privateKey, {algorithm: "RS256"});
		return this.createClient(signedToken, 'Bearer');
	}

	private async getInstallationTokenFromClient(client: Octokit) {
		const installations = await client.apps.listInstallations();
		// Get installations that match GIT_OWNER.
		const filteredInstallations = installations.data.filter((installation) => {
			return installation.account.login === this.config.gitOwner;
		});

		// Handle/log cases where the number of matching installations of the Github App is different than one.
		if (filteredInstallations.length > 1) {
			let message = `Warning: more than one installations of the Github app with owner ${this.config.gitOwner} found.`;
			message += ` Picking the first one...`;
			this.logInfo(message);
		} else if (!filteredInstallations.length) {
			this.logError('Could not create installation access token for the Github App.');
			this.logError(`Error: No installation matches owner "${this.config.gitOwner}."`);
			this.logError(`Installations were: ${JSON.stringify(installations, null, 2)}`);
			throw new BadImplementationException(`No installations for owner ${this.config.gitOwner}`);
		}

		// Create an "Installation access token". Expires in one hour. Identifies actions
		// as performed by the Github App.
		const installationToken = await client.apps.createInstallationAccessToken({installation_id: filteredInstallations[0].id});

		if (!installationToken.data || !installationToken.data.token) {
			this.logError(`Invalid structure of installation token object.`);
			throw new Exception(`Invalid structure of installation token object.`)
		}

		return installationToken.data.token;
	}

	async getGithubInstallationToken() {
		const client = await this.createClientWithJWT();
		const token = await this.getInstallationTokenFromClient(client);
		this.logInfo('Got github installation token successfully.');
		return token;
	}

	async getFile(repo: string, filePath: string, branch: string, request: ExpressRequest) {
		const token = await this.getGithubInstallationToken();
		const client: Octokit = this.createClient(token);

		let contents: OctokitResponse<RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"]>;

		try {
			contents = await client.repos.getContent(
				{
					owner: this.config.gitOwner,
					repo,
					path: filePath,
					ref: branch
				});
		} catch (error) {
			this.logError(error);
			if (error.status === 403 && error.errors && error.errors.length === 1 &&
				error.errors[0].code === 'too_large') {
				this.logWarning(`File ${filePath} is too large, will attempt to get as Blob.`);
				return this.getLargeFile(client, repo, filePath, branch);
			} else if (error.status === 404) {
				this.logError(`File ${filePath} was not found.`);
				throw new Exception(`File ${filePath} was not found`);
			} else {
				throw new Exception('Failed to get file from Github');
			}
		}

		// Check that if contents.data is not an array.
		if (Array.isArray(contents.data)) {
			throw new BadImplementationException('Invalid response of method repos.getContent')
		}
		if (!contents || !contents.data || !contents.data.content) {
			throw new Exception('Failed to get file contents from Github');
		}

		const buffer = Buffer.from(contents.data.content, 'base64');
		const decodedContent = buffer.toString('utf8');
		return decodedContent;
	}

	private async getLargeFile(client: Octokit, repo: string, filePath: string, branch: string) {
		const fileSha = await this.getFileBySha(client, repo, filePath, branch);
		const request = {
			owner: this.config.gitOwner,
			repo,
			file_sha: fileSha
		};
		const response = await client.git.getBlob(request);

		if (!response || !response.data || !response.data.content)
			throw new Exception('Failed to get file contents from Github');

		const buffer = Buffer.from(response.data.content, 'base64');
		return buffer.toString('utf8');
	}

	private async getFileBySha(client: Octokit, repo: string, filePath: string, branch: string) {
		const parentPath = path.dirname(filePath);
		let parentDirectoryResponse: OctokitResponse<RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"]>;
		try {
			const request = {
				owner: this.config.gitOwner,
				repo,
				path: parentPath,
				ref: branch
			};
			parentDirectoryResponse = await client.repos.getContent(request);
		} catch (error) {
			throw new Exception(`Failed to fetch parent directory contents of file ${filePath}`, error);
		}

		if (!parentDirectoryResponse || !parentDirectoryResponse.data)
			throw new Exception(`Failed to fetch parent directory contents of file ${filePath}`);

		// Check that if parentDirectoryResponse.data is an array.
		if (!Array.isArray(parentDirectoryResponse.data))
			throw new BadImplementationException("File's parent directory is not an array")


		let fileSha = '';
		for (const responseEntry of parentDirectoryResponse.data) {
			if (responseEntry.path === filePath) {
				fileSha = responseEntry.sha;
				break;
			}
		}

		if (!fileSha)
			throw new Exception(`File ${filePath} was not found`);

		return fileSha;
	}

	async getReleaseBranches(product: string): Promise<string[]> {
		const branches = await this.listBranches(product);
		if (!branches || !branches.length) {
			return [];
		}

		// Response includes (besides branch name) extra information about the branch.
		const releaseBranches = branches.map(branch => branch.name).filter(
			name => {
				return name.startsWith(`release/`);
			}
		).reverse();

		// Return master with the release branches.
		releaseBranches.unshift('master');
		return releaseBranches
	}

	async listBranches(repo: string): Promise<RestEndpointMethodTypes["repos"]["listBranches"]["response"]["data"]> {
		const token = await this.getGithubInstallationToken();
		const client: Octokit = this.createClient(token);

		let branches: RestEndpointMethodTypes["repos"]["listBranches"]["response"]["data"];
		try {
			// Returns all the branches using the paginate method.
			// Maximum allowed page size is 100.
			branches = await client.paginate(
				// Equivalent to 'GET /repos/:owner/:repo/branches?per_page=100'
				client.repos.listBranches,
				{
					owner: this.config.gitOwner,
					repo,
					per_page: 100
				}
			);
		} catch (error) {
			this.logError(error);
			throw new Exception(`Failed to list ${repo} branches`);
		}

		// Response includes (besides branch name) extra information about the branch.
		return branches;
	};

	async getArchiveUrl(repo: string, branch: string) {
		const token = await this.getGithubInstallationToken();
		const client: Octokit = this.createClient(token);
		const response = await client.repos.downloadArchive(
			{
				owner: this.config.gitOwner,
				repo,
				ref: branch,
				archive_format: "zipball"
			}
		);
		if (!response || !response.url) {
			throw new Exception(`Invalid response while getting archive url for branch ${branch} of repo ${repo}`);
		}
		this.logInfo(`Got archive url: ${response.url}.`);
		return response.url;
	}

	async downloadArchive(url: string, branch: string, request: ExpressRequest) {
		const response = await promisifyRequest({uri: url, encoding: null});
		if (!response || !response.body) {
			throw new Exception(`Failed to download archive for branch ${branch} of product ${url}`)
		}
		this.logDebug(`Got archive in zip format.`);
		// Returns a buffer.
		return response.body;
	}

	/**
	 *
	 * @param repo The name of the repo.
	 * @param branch The name of the branch.
	 *
	 * This API has an upper limit of 1,000 files for a directory.
	 */
	async listDirectoryContents(repo: string, branch: string, _path: string): Promise<ReposGetContentResponseData| undefined> {
		const token = await this.getGithubInstallationToken();
		const client: Octokit = this.createClient(token);

		let response: RestEndpointMethodTypes["repos"]["getContent"]["response"];

		response = await client.repos.getContent(
			{
				owner: this.config.gitOwner,
				repo,
				path: _path,
				ref: branch,
			});

		if (!response || !response.data)
			return;

		if (!Array.isArray(response.data)) {
			throw new Exception(`Invalid response from octokit's repos.getContent`);
		}

		return response.data;
	}

}

export const GithubModule = new GithubModule_Class();