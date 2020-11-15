/*
 * A typescript & react boilerplate with api call example
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

const path = require('path');
const HtmlWebPackPlugin = require("html-webpack-plugin");
const WebpackMd5Hash = require('webpack-md5-hash');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');
const packageJson = require('./package.json');
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const sourcePath = path.join(__dirname, './src');
const swFolder = path.join(__dirname, './src/sw/');
const swConfig = path.join(__dirname, './src/sw/tsconfig.json');
const mainFolder = path.join(__dirname, './src/main/');
const mainConfig = path.join(__dirname, './src/main/tsconfig.json');

// const isDevelopment = true;
const isDevelopment = process.env.NODE_ENV !== 'production';
const reactRefreshWebpackPlugin = new ReactRefreshWebpackPlugin();
reactRefreshWebpackPlugin.options.overlay = false;

module.exports = (env, argv) => {

	const envConfig = require(`./_config/${env}`);

	console.log("env: " + env);

	console.log("argv: " + JSON.stringify(argv));
	console.log("argv.mode: " + argv.mode);
	const outputFolder = path.resolve(__dirname, `dist/${envConfig.outputFolder()}`);

	return {
		context: sourcePath,
		entry: {
			main: './main/index.tsx',
			ts_service_worker: './sw/index.ts',
		},
		output: {
			path: outputFolder,
			filename: '[name].js',
			publicPath: '/',
		},
		devtool: "source-map",

		devServer: {
			hot: true,
			historyApiFallback: true,
			compress: true,
			https: envConfig.getDevServerSSL(),
			port: envConfig.getHostingPort(),
		},

		resolve: {
			alias: {
				"@modules": path.resolve(__dirname, "src/main/modules"),
				"@consts": path.resolve(__dirname, "src/main/consts"),
				"@components": path.resolve(__dirname, "src/main/components"),
				"@renderers": path.resolve(__dirname, "src/main/renderers"),
				"@shared": path.resolve(__dirname, "src/main/app-shared"),
				"@styles": path.resolve(__dirname, "src/main/res/styles"),
				"@res": path.resolve(__dirname, "src/main/res"),
				// "@utils": path.resolve(__dirname, "src/main/utils")
			},
			extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
		},

		module: {
			rules: [
				isDevelopment && {
					test: /main\/.+\.tsx?$/,
					include: [mainFolder],
					use: {
						loader: 'babel-loader',
						options: {plugins: ['react-refresh/babel']}
					}
				},
				{
					test: /sw\/.+\.ts$/,
					include: [swFolder],
					use: {
						loader: "ts-loader",
						options: {
							configFile: swConfig
						}
					}
				},
				{
					test: /main\/.+\.tsx?$/,
					include: [mainFolder],
					use: {
						loader: "awesome-typescript-loader",
						options: {
							configFileName: mainConfig,
							forceIsolatedModules: true
						}
					}
				},
				{enforce: "pre", test: /\.js$/, loader: "source-map-loader", exclude: [/node_modules/, /dist/, /build/, /__test__/]},
				{
					test: /\.[ot]tf$/,
					use: [
						{
							loader: 'url-loader',
							options: {
								limit: 10000,
								mimetype: 'application/octet-stream',
								name: 'fonts/[name].[ext]',
							}
						}
					]
				},
				{
					test: /\.json$/,
					exclude: /node_modules/,
				},
				{
					test: /\.(jpe?g|png|gif|ico|svg)$/i,
					use: [
						{
							loader: 'file-loader',
							options: {
								name: '[name].[ext]'
							}
						},
					]
				},
				{
					test: /\.s?[c|a]ss$/,
					use: [
						'style-loader',
						MiniCssExtractPlugin.loader,
						{
							loader: 'css-loader',
							options: {minimize: envConfig.cssMinify(), importLoaders: 2}
						},
						{
							loader: 'postcss-loader',
							options: {
								plugins: () => [
									require('autoprefixer')
								],
							}
						},
						'sass-loader'
					]
				}
			]
		},
		plugins: [
			new webpack.DefinePlugin({
				'process.env': {
					'appEnv': `"${env}"`,
					'appVersion': `"${packageJson.version}"`
				}
			}),
			new CleanWebpackPlugin(outputFolder),
			new MiniCssExtractPlugin({
				filename: 'main/res/styles.[contenthash].css',
			}),
			new HtmlWebPackPlugin({
				inject: true,
				favicon: './main/res/favicon.ico',
				template: "./main/index.ejs",
				filename: "./index.html",
				minify: envConfig.htmlMinificationOptions(),
			}),
			// new WebpackMd5Hash(),
			envConfig.getPrettifierPlugin(),
			new WriteFilePlugin(),
			// isDevelopment && new webpack.HotModuleReplacementPlugin(),
			isDevelopment && reactRefreshWebpackPlugin,
		].filter(plugin => plugin),

	};
};
