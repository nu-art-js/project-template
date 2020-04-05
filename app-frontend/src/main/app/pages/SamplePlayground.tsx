import * as React from 'react';
import {Page_DialogExamples} from "./Page_DialogExamples";
import {Page_ToasterExample} from "./Page_ToasterExample";
import {Page_ApiGen} from "./Page_ApiGen";
import {Hello} from "../Hello";
import {CustomErrorExample} from './CustomErrorExample';
import {unitStyle} from "../ui/SelectStyle";
import {
	Playground,
	PlaygroundScreen
} from "@nu-art/thunderstorm/app-frontend/components/Playground";

const icon__arrowClose = require('@res/images/icon__arrowClose.svg');
const icon__arrowOpen = require('@res/images/icon__arrowOpen.svg');

export class SamplePlayground extends React.Component<{}> {

	constructor(props: {}) {
		super(props);
		this.state = {};
	}

	render() {
		return <Playground selectStyle={unitStyle}
			            iconClose={icon__arrowClose}
			            iconOpen={icon__arrowOpen}
			            screens={this.getScreens()}/>
	}

	getScreens(): PlaygroundScreen[] {
		return [
			{
				name: "Hello",
				getNode: () => {
					return <Hello/>;
				}
			},
			{
				name: "Dialog Examples",
				getNode: () => {
					return <Page_DialogExamples/>;
				}
			},
			{
				name: "Toaster Examples",
				getNode: () => {
					return <Page_ToasterExample/>;
				}
			},
			{
				name: "Api Generator",
				getNode: () => {
					return <Page_ApiGen/>;
				}
			},
			{
				name: "Live docs",
				getNode: () => {
					return <Hello/>;
				}
			},
			{
				name: "Custom error",
				getNode: () => {
					return <CustomErrorExample/>;
				}
			},
		];
	}

}
