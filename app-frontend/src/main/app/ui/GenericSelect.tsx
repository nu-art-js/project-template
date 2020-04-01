import * as React from "react";
import Select, {components} from "react-select";

type Props<T> = {
	options?: T[]
	selectedOption?: T
	onChange: (t: T) => void
	styles: any;
	presentation: (t: T) => string
	placeholder?: string | undefined
	components?: any | undefined
	isDisabled?: boolean
}

type State = {
	menuIsOpen: boolean
}

const icon__arrowClose = require('@res/images/icon__arrowClose.svg');
const icon__arrowOpen = require('@res/images/icon__arrowOpen.svg');

export class GenericSelect<T extends object>
	extends React.Component<Props<T>, State> {

	constructor(props: Props<T>) {
		super(props);
		this.state = {
			menuIsOpen: false
		};
		this.handleSelection = this.handleSelection.bind(this);
	}

	render() {
		const items: SelectItem[] = [];
		const options = this.props.options;
		let value: SelectItem | undefined = undefined;
		if (options) {
			const selectedOption = this.props.selectedOption;
			options.forEach((option, idx) => {
				const item: SelectItem = {label: this.props.presentation(option), value: "" + idx};
				if (selectedOption) {
					if (option === selectedOption) {
						value = item;
					}
				}
				items.push(item);
			});
		}
		return <Select
			options={items}
			value={value}
			onChange={item => this.handleSelection(item as SelectItem)}
			onMenuClose={() => this.setState({menuIsOpen: false})}
			onMenuOpen={() => this.setState({menuIsOpen: true})}
			styles={this.props.styles}
			placeholder={this.props.placeholder}
			components={this.props.components? this.props.components : {
				IndicatorSeparator: () => null,
				DropdownIndicator: (_props: any) => (
					<components.DropdownIndicator {..._props}>
						<img src={this.state.menuIsOpen ? icon__arrowClose : icon__arrowOpen} alt="arrow"/>
					</components.DropdownIndicator>
				)
			}}
			isDisabled={this.props.isDisabled}
		/>;
	}

	handleSelection(item: SelectItem) {
		if (!this.props.options)
			return;
		const idx = Number(item.value);
		const option = this.props.options[idx];
		this.props.onChange(option);
	}

}

class SelectItem {
	value?: string;
	label: string;

	constructor(s: string) {
		this.value = s;
		this.label = s;
	}
}
