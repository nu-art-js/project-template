
import * as React from "react";
import {ExampleModule} from "@modules/ExampleModule";

export class CustomErrorExample
	extends React.Component {

	constructor(props: {}) {
		super(props);

		this.state = {
			formFields: {},
		};
	}

	callServerApi_CustomError = () => {
		ExampleModule.callCustomErrorApi();
	};

	render() {
		return <>
			<button style={{marginRight: 8}} onClick={this.callServerApi_CustomError}>Server API - Custom Error</button>
		</>;
	}
}
