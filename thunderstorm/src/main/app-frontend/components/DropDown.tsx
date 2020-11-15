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
import {FilterInput} from "./FilterInput";
import {
	generateHex,
	__stringify
} from "@nu-art/ts-common";
import {KeyboardListener} from '../tools/KeyboardListener';
import {stopPropagation} from "../utils/tools";
import {Adapter,} from "./adapter/Adapter";
import {Tree} from "./tree/Tree";
import {Stylable} from '../tools/Stylable';
import {Overlay} from "./Overlay";

const defaultWidth = "222px";
const defaultTitleHeight = "28px";
const defaultListHeight = "150px";

// export enum OnEnterOptions {
//     SelectFirstOption= (e:)
// }

const wrapperStyle: React.CSSProperties = {
	display: "inline-block"
};

export const headerStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	boxSizing: "border-box",
	position: "relative",
	border: "solid 1px",
	borderRadius: 2,
	color: "black",
	backgroundColor: "white",
	width: defaultWidth,
	height: defaultTitleHeight,
};

export const inputStyle: React.CSSProperties = {
	border: "unset",
	boxSizing: "border-box",
	outline: "none",
	// padding: "0 5px",
	width: "100%",
};

const listContainerStyle: React.CSSProperties = {
	display: "inline-block",
	position: "absolute",
	zIndex: 10,
};

export const listStyle: React.CSSProperties = {
	boxSizing: "border-box",
	backgroundColor: "whitesmoke",
	border: "solid 1px",
	borderRadius: 5,
	display: "flex",
	flexFlow: "column",
	alignItems: "stretch",
	maxHeight: defaultListHeight,
	overflowX: "hidden",
	overflowY: "auto",
	position: "relative",
	top: 5,
	width: defaultWidth,

};

export type InputProps = Stylable & {
	placeholder?: string
}

export type State<ItemType> = {
	id: string
	filteredOptions: ItemType[]
	adapter: Adapter
	open: boolean
	selected?: ItemType
	hover?: ItemType
	filterTextLength?: number
}

type StaticProps = {
	id: string,
	headerStylable: Stylable
	listStylable: Stylable
	inputStylable: InputProps
}

export type Props_DropDown<ItemType> = StaticProps & {
	adapter: Adapter
	// selection: {
	// 	onChange: (selected: ItemType) => void
	// 	value?: ItemType
	// 	closeOnSelection: boolean
	// }
	// filter?: {
	// 	filter: (item: ItemType) => string[]
	// 	onChange?: (list?: ItemType[]) => void
	// }

	onSelected: (selected: ItemType) => void
	selected?: ItemType

	filter?: (item: ItemType) => string[]
	onFilter?: (list?: ItemType[]) => void

	inputEventHandler?: (state: State<ItemType>, e: KeyboardEvent) => State<ItemType>
	selectedItemRenderer?: (props?: ItemType) => React.ReactNode
	caret?: {
		open: React.ReactNode,
		close: React.ReactNode,
	},
	autocomplete?: boolean
	disabled?: boolean
}

export class DropDown<ItemType>
	extends React.Component<Props_DropDown<ItemType>, State<ItemType>> {

	static defaultProps: Partial<StaticProps> = {
		id: generateHex(8),
		headerStylable: {style: headerStyle},
		listStylable: {style: listStyle},
		inputStylable: {style: inputStyle}
	};


	constructor(props: Props_DropDown<ItemType>) {
		super(props);

		this.state = {
			id: props.id,
			filteredOptions: this.props.adapter.data,
			adapter: DropDown.cloneAdapter(this.props),
			open: false,
			selected: this.props.selected,
		};
	}

	static getDerivedStateFromProps(nextProps: Props_DropDown<any>, prevState: State<any>): Partial<State<any>> | null {
		// if (prevState.id !== nextProps.id)
			// console.log(`Changing ids: ${prevState.id} => ${nextProps.id}`);

		if (prevState.adapter.data === nextProps.adapter.data)
			return null;

		const adapter = DropDown.cloneAdapter(nextProps);
		return {adapter, id: nextProps.id}
	}

	private static cloneAdapter = (nextProps: Props_DropDown<any>) => {
		return nextProps.adapter.clone(new Adapter(nextProps.autocomplete && nextProps.filter ? [] : nextProps.adapter.data));
	};

	toggleList = (e: React.MouseEvent) => {
		if (this.props.disabled)
			return;

		stopPropagation(e);

		this.setState(prevState => ({open: !prevState.open}));
	};

	onSelected = (item: ItemType) => {
		this.setState({
			              open: false,
			              selected: item
		              });

		this.props.onSelected(item);
	};

	render() {
		return (
			<Overlay showOverlay={this.state.open} onClickOverlay={() => this.setState({open: false})}>
				<KeyboardListener onKeyboardEventListener={this.keyEventHandler}>
					<div id={this.props.id} style={wrapperStyle}>
						{this.renderHeader()}
						{this.renderTree()}
					</div>
				</KeyboardListener>
			</Overlay>
		)
	}

	private renderHeader = () => {
		return (
			<div
				id={`${this.props.id}-header`}

				onClick={this.toggleList}{...this.props.headerStylable}>
				{this.renderSelectedOrFilterInput()}
				{this.renderCaret()}
			</div>);
	};


	private renderTree = () => {
		if (!this.state.open)
			return;

		if (this.props.autocomplete && !this.state.filterTextLength)
			return;

		this.props.adapter.data = this.state.filteredOptions;

		return <div style={listContainerStyle}>
			<div {...this.props.listStylable}>
				{this.renderTreeImpl()}
			</div>
		</div>
	}

	private keyEventHandler = (node: HTMLDivElement, e: KeyboardEvent) => {
		if (this.props.inputEventHandler)
			return this.setState(() => {
				const state = this.props.inputEventHandler ? this.props.inputEventHandler(this.state, e) : this.state;
				return state;
			})

		if (e.code === "Enter" && this.state.filteredOptions)
			return this.onSelected(this.state.filteredOptions[0])

		if (e.code === "Escape")
			return this.setState({open: false});

		if (e.code === "ArrowDown") {
			return document.getElementById(`${this.props.id}-tree-listener`)?.focus()
		}
	};

	private renderSelectedOrFilterInput = () => {
		if (!this.state.open || !this.props.filter) {
			return (
				<div className={'match_width'}>
					{this.renderSelectedItem(this.state.selected)}
				</div>);
		}

		return <FilterInput<ItemType>
			key={this.state.id}
			id={`${this.props.id}-input`}
			filter={this.props.filter}
			list={this.props.adapter.data}
			onChange={(filteredOptions: ItemType[], filterBy) => {
				this.setState(state => {
					state.adapter.data = this.props.autocomplete && this.props.filter && !filterBy.length ? [] : filteredOptions;
					console.log(`filter: ${this.props.id} (${filterBy}) -> ${__stringify(filteredOptions)}`)
					console.log(`state.adapter.data: ${__stringify(state.adapter.data)}`)
					return {
						adapter: state.adapter,
						filterTextLength: filterBy.length
					}
				}, () => this.props.onFilter && this.props.onFilter(this.state.filteredOptions));
			}}
			handleKeyEvent={(e) => {
				return
			}}
			focus={true}
			{...this.props.inputStylable}
		/>;
	};

	private renderSelectedItem = (selected?: ItemType) => {
		if (this.props.selectedItemRenderer)
			return this.props.selectedItemRenderer(selected);

		if (selected === undefined)
			return <div>{this.props.inputStylable.placeholder}</div>

		const Renderer = this.props.adapter.treeNodeRenderer;
		const node = {
			propKey: 'string',
			path: 'string',
			item: 'any',
			adapter: this.props.adapter,
			expandToggler: (e: React.MouseEvent, expxand?: boolean) => {
			},
			onClick: (e: React.MouseEvent) => {
			},
			onFocus: (e: React.MouseEvent) => {
			},
			expanded: true,
			focused: false,
			selected: true
		};
		return <Renderer item={selected} node={node}/>
	};


	private renderCaret = () => {
		const caret = this.props.caret;
		if (!caret)
			return;

		return this.state.open ? caret.close : caret.open;
	};


	private renderTreeImpl = () => {
		const treeKeyEventHandler = treeKeyEventHandlerResolver(this.props.id);
		const id = `${this.props.id}-tree`;
		if ((!this.props.filter || !this.props.autocomplete || this.state.filterTextLength) && this.state.adapter.data.length === 0)
			return <div style={{textAlign: "center", opacity: 0.5}}>No options</div>;

		return <Tree
			id={id}
			key={id}
			adapter={this.state.adapter}
			indentPx={0}
			callBackState={(key: string, value: any, level: number) => key === '/'}
			selectedItem={this.state.selected}
			onNodeClicked={(path: string, item: ItemType) => this.onSelected(item)}
			unMountFromOutside={() => this.setState({open: false})}
			keyEventHandler={treeKeyEventHandler}
		/>
	};
}

const treeKeyEventHandlerResolver = (id: string) => {
	return (node: HTMLDivElement, e: KeyboardEvent) => {
		if (!["Escape", "ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Enter"].includes(e.code))
			document.getElementById(`${id}-input`)?.focus();
	}
};