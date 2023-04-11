import React from "react";
import "./ColorPicker.css";

const COLORS = [
	"#FFFFFF",
	"#E4E4E4",
	"#888888",
	"#222222",
	"#FFA7D1",
	"#E50000",
	"#E59500",
	"#A06A42",
	"#E5D900",
	"#94E044",
	"#02BE01",
	"#00D3DD",
	"#0083C7",
	"#0000EA",
	"#CF6EE4",
	"#820080",
];

function ColorPicker({ setCurrentColor }) {
	function changeColor(color) {
		setCurrentColor(color);
		let currentSelection = document.getElementsByClassName("selected");
		if (currentSelection.length !== 0) {
			currentSelection[0].textContent = "";
			currentSelection[0].classList.remove("selected");
		}
		document.getElementById(color).classList.add("selected");
		document.getElementById(color).textContent = "selected";
	}

	return (
		<div className="colorContainer">
			<div className="colorSelector">
				{COLORS.map((col) => {
					return (
						<div
							id={col}
							key={col}
							className="color"
							style={{
								backgroundColor: col,
							}}
							onClick={() => changeColor(col)}
						></div>
					);
				})}
			</div>
		</div>
	);
}

export default ColorPicker;
