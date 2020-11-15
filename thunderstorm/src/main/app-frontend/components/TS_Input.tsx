/*
 * Thunderstorm is a full web app framework!
 *
 * Typescript & Express backend infrastructure that natively runs on firebase function
 * Typescript & React frontend infrastructure
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

import * as React from 'react';
import {
	_clearTimeout,
	currentTimeMillies
} from '@nu-art/ts-common';
import {Stylable} from "../tools/Stylable";

export type TS_InputProps<Key> = Stylable & {
	onChange: (value: string, id: Key) => void
	onAccept?: () => void
	onCancel?: () => void
	onBlur?: () => void
	handleKeyEvent?: (e: KeyboardEvent) => void
	value?: string
	type: 'text' | 'number' | 'password'
	placeholder?: string
	id: Key
	name?: string
	focus?: boolean
	spellCheck?: boolean
}

type State = {
	id: string,
	name?: string,
	initialValue?: string
	value?: string
}
const MIN_DELTA = 200;

export class TS_Input<Key extends string = string>
	extends React.Component<TS_InputProps<Key>, State> {

	private ref?: HTMLInputElement | null;
	private clickedTimestamp?: number;
	private timeout?: number;

	// static defaultProps: Partial<Props_FilterInput<string>> = {
	// 	id: generateHex(16)
	// };

	constructor(props: TS_InputProps<Key>) {
		super(props);

		this.state = TS_Input.getInitialState(props);
	};

	private static getInitialState(props: TS_InputProps<any>) {
		return {
			id: props.id,
			name: props.name,
			initialValue: props.value,
			value: props.value || ""
		};
	}

	static getDerivedStateFromProps(props: TS_InputProps<any>, state: State) {
		if (props.id === state.id && state.name === props.name && state.initialValue === props.value)
			return {value: state.value};

		return TS_Input.getInitialState(props);
	}


	componentWillUnmount(): void {
		this.ref?.removeEventListener('keydown', this.props.handleKeyEvent || this.handleKeyEvent);
	}

	private handleKeyEvent = (ev: KeyboardEvent) => {
		ev.stopPropagation();
		if (this.props.onAccept && ev.key === "Enter")
			this.props.onAccept();

		if (this.props.onCancel && ev.key === "Escape")
			this.props.onCancel();
	};

	private onClick = (ev: React.MouseEvent) => {
		if (!this.ref || !this.props.focus)
			return;

		ev.stopPropagation();
		const now = currentTimeMillies();
		if (!this.clickedTimestamp || now - this.clickedTimestamp >= MIN_DELTA)
			return this.clickedTimestamp = now;

		this.timeout && _clearTimeout(this.timeout);
		delete this.clickedTimestamp;
		this.ref.select();
	};

	changeValue = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		this.props.onChange(value, event.target.id as Key);
		this.setState({value: value});
	};

	render() {
		const handleKeyEvent = this.props.handleKeyEvent || this.handleKeyEvent;

		return <input
			className={this.props.className}
			name={this.props.name || this.props.id}
			style={this.props.style}
			key={this.props.id}
			id={this.props.id}
			type={this.props.type}
			onClick={this.onClick}
			value={this.state.value}
			placeholder={this.props.placeholder}
			onChange={this.changeValue}
			onBlur={() => {
				this.ref?.removeEventListener('keydown', handleKeyEvent);
				this.ref = null;
				this.props.onBlur && this.props.onBlur();
			}}
			ref={input => {
				if (this.ref || !input)
					return;

				this.ref = input;
				this.props.focus && this.ref.focus();
				this.ref.addEventListener('keydown', handleKeyEvent);
			}}
			spellCheck={this.props.spellCheck}
		/>;
	}
}