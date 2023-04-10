import {
	useRef,
	useEffect,
	useState,
	useLayoutEffect,
	useCallback,
} from "react";
import "./App.css";

import Timer from "./Timer";
import Canvas from "./Canvas";

function App() {
	return (
		<div id="main">
			<Canvas />

			<Timer />
		</div>
	);
}

export default App;
