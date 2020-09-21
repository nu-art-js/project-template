import * as React from 'react';
import {CSSProperties} from 'react';
import {
	Menu_Model,
	MenuListener,
	MenuModule
} from "./MenuModule";
import {BaseComponent} from "../../core/BaseComponent";
import {stopPropagation} from '../../utils/tools';
import {Tree} from "../../components/tree/Tree";
import {generateHex} from "@nu-art/ts-common";

export type MenuPosition =
	{ left: number, top: number }
	| { left: number, bottom: number }
	| { right: number, top: number }
	| { right: number, bottom: number };

const defaultStyle: CSSProperties = {
	width: 225,
	overflowX: "hidden",
	overflowY: "scroll",
	maxHeight: "60vh",
	borderRadius: 2,
	boxShadow: "1px 1px 4px 0 rgba(0, 0, 0, 0.3)",
	border: "solid 1px transparent",
	backgroundColor: "#fff",
	position: "absolute"
};

type State = {
	element?: Menu_Model
}

const overlayStyle: CSSProperties = {
	cursor: "default",
	position: "fixed",
	top: 0,
	left: 0,
	bottom: 0,
	right: 0,
	height: "100vh",
	width: "100vw",
	zIndex: 3333
}

export class PopupMenu
	extends BaseComponent<{}, State>
	implements MenuListener {

	overlayRef = React.createRef<HTMLDivElement>();

	__onMenuDisplay = (element: Menu_Model) => this.setState({element});

	__onMenuHide = (id: string) => {
		const element = this.state.element;
		if (!element || element.id !== id)
			return

		this.setState({element: undefined});
	};

	componentDidMount(): void {
		this.eventListenersEffect();
	}

	componentDidUpdate(): void {
		this.eventListenersEffect();
	}

	componentWillUnmount(): void {
		const current = this.overlayRef.current;
		if (current) {
			current.removeEventListener("mousedown", this.stopClickCascading, false);
			current.removeEventListener("mouseup", this.closeMenu, false);
		}
	}

	stopClickCascading = (e: MouseEvent) => {
		if (this.overlayRef.current === e.target)
			stopPropagation(e);
	};

	closeMenu = (e: MouseEvent) => {
		if (e.which === 3)
			return

		if (this.overlayRef.current !== e.target)
			return;

		stopPropagation(e);
		const id = this.state?.element?.id;
		id && MenuModule.hide(id)
		this.setState({element: undefined});
	};

	style = (pos: MenuPosition, css?: CSSProperties): CSSProperties => ({
		...defaultStyle,
		...css,
		...pos
	});

	render() {
		const element = this.state?.element;
		if (!element)
			return null;

		//tree instead of menu component
		return <div style={{position: "absolute"}}>
			<div id="overlay" ref={this.overlayRef} style={overlayStyle}>
				<div style={this.style(element.pos, element.css)}>
					<Tree
						id={generateHex(8)}
						adapter={element.adapter}
						onNodeClicked={element.onNodeClicked}
						indentPx={0}
					/>
				</div>
			</div>
		</div>;
	}


	private eventListenersEffect = () => {
		const _current = this.overlayRef.current;
		if (!_current)
			return;

		_current.addEventListener("mousedown", this.closeMenu, false);
	};
};