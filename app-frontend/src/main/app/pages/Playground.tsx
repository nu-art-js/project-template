import * as React from 'react';
import {ReactNode} from "react";
import {GenericSelect} from "../ui/GenericSelect";
import {Page_DialogExamples} from "./Page_DialogExamples";
import {Page_ToasterExample} from "./Page_ToasterExample";
import {Page_ApiGen} from "./Page_ApiGen";
import {Hello} from "../Hello";
import {CustomErrorExample} from './CustomErrorExample';
import {unitStyle} from "../ui/SelectStyle";

type State = {
	selectedScreen?: PlaygroundScreen;
}

type PlaygroundScreen = {
	name: string
	getNode: () => ReactNode

}

export class Playground extends React.Component<{}, State> {

	constructor(props: {}) {
		super(props);
		this.state = {};
	}

	render() {
		return <div className={'ll_v_c match_height match_width'}>
			<div className='ll_h_c' style={{alignSelf: "start", padding: 20}}>
				<GenericSelect<PlaygroundScreen>
					selectedOption={this.state.selectedScreen}
					options={this.getScreens()}
					onChange={(screen: PlaygroundScreen) => {
						this.setState({selectedScreen: screen});
					}}
					styles={unitStyle}
					presentation={(screen) => screen.name}
				/>
			</div>
			{this.state.selectedScreen && this.state.selectedScreen.getNode()}
		</div>
	}

	getScreens(): PlaygroundScreen[] {
		return [
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
