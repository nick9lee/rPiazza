import {
	useRef,
	useEffect,
	useState,
	useLayoutEffect,
	useCallback,
} from "react";
import "./App.css";

import Canvas from "./Canvas";

function App() {
	return (
		<div id="main">
			<Canvas />
		</div>
	);
}

export default App;
