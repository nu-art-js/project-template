import {
	blueGrey,
	blueGreyFour,
	veryLightPink,
	white
} from "@styles/colors";

export const unitStyle = {
	container: (provided: any) => ({
		...provided,
		width: 240,
		fontSize: 13,
		border: "none"
	}),
	control: (provided: any) => ({
		...provided,
		border: "none",
		backgroundColor: `${veryLightPink}50`
	}),
	input: (provided: any) => ({
		...provided,
	}),
	option: (provided: any, state: any) => ({
		...provided,
		borderBottomColor: veryLightPink,
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		color: blueGrey,
		fontSize: 13,
		fontWeight: 500,
		backgroundColor: state.isFocused ? veryLightPink : white
	}),
	placeholder: (provided: any) => ({
		...provided,
		color: blueGreyFour,
		fontWeight: 200
	}),
	singleValue: (provided: any) => ({
		...provided,
		color: blueGrey,
		fontSize: 13,
		fontWeight: 500
	})
};

export const productStyle = {
	container: (provided: any) => ({
		...provided,
		width: 130,
		fontSize: 13,
		border: "none"
	}),
	indicatorSeparator: (provided: any) => ({
		...provided,
		width: 0
	}),
	control: (provided: any) => ({
		...provided,
		border: "none",
		height: 23
	}),
	option: (provided: any, state: any) => ({
		...provided,
		borderBottomColor: veryLightPink,
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		color: blueGrey,
		fontSize: 13,
		fontWeight: 500,
		backgroundColor: state.isFocused ? veryLightPink : white
	}),
	singleValue: (provided: any) => ({
		...provided,
		color: blueGrey,
		height: 18,
		fontSize: 13,
		fontWeight: 500
	})
};