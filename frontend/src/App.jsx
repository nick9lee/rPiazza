import {
	useRef,
	useEffect,
	useState,
	useLayoutEffect,
	useCallback,
} from "react";
import "./App.css";

import io from "socket.io-client";

import randomArray from "./output.json";

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

const CANVAS_WIDTH = 1300;
const CANVAS_HEIGHT = 850;

const ORIGIN = {
	x: 0,
	y: 0,
};

const ZOOM_SENSITIVITY = 500;

const { devicePixelRatio: ratio = 1 } = window;

const socket = io("http://localhost:4000");

function diffPoints(p1, p2) {
	return { x: p1.x - p2.x, y: p1.y - p2.y };
}

function addPoints(p1, p2) {
	return { x: p1.x + p2.x, y: p1.y + p2.y };
}

function scalePoint(p1, scale) {
	return { x: p1.x / scale, y: p1.y / scale };
}

function App() {
	const canvasRef = useRef(null);
	const [context, setContext] = useState(null);
	const [scale, setScale] = useState(null);
	const [offset, setOffset] = useState(ORIGIN);
	const [mousePos, setMousePos] = useState(ORIGIN);
	const [relMousePos, setRelMousePos] = useState(ORIGIN);
	const [viewportTopLeft, setViewportTopLeft] = useState(ORIGIN);
	const lastMousePosRef = useRef(ORIGIN);
	const lastOffsetRef = useRef(ORIGIN);
	const currentColor = useRef(null);
	let lastMousePos = null;
	let [paintedCanvas, setPaintedCanvas] = useState(randomArray);
	const [isConnected, setIsConnected] = useState(socket.connected);

	// load the data first time the page loads
	useEffect(() => {
		// do the primary fetch
		fetch("http://localhost:4000/api/getAll", {
			headers: {
				accept: "application/json",
				"content-type": "application/json",
			},
			method: "GET",
		})
			.then((res) => res.json())
			.then((data) => {
				// set the canvas
				setPaintedCanvas(data);
				// Open the communication socket
			})
			.catch((err) => {
				console.log(err);
			});

		// setup the socket for comms
		socket.on("connect", () => {
			setIsConnected(true);
		});

		socket.on("disconnect", () => {
			setIsConnected(false);
		});

		socket.on("update", (data) => {
			const parsedData = JSON.parse(data);
			const tempCanvas = paintedCanvas;
			tempCanvas[parsedData.column][parsedData.row] = parsedData.color;
			setPaintedCanvas(tempCanvas);

			// possibly need to draw?
		});

		return () => {
			socket.off("connect");
			socket.off("disconnect");
			socket.off("update");
		};
	}, []);

	// update last offset
	useEffect(() => {
		lastOffsetRef.current = offset;
	}, [offset]);

	// reset
	const reset = useCallback((context) => {
		if (context) {
			// adjust for device pixel density
			context.canvas.width = CANVAS_WIDTH * ratio;
			context.canvas.height = CANVAS_HEIGHT * ratio;
			context.scale(ratio, ratio);
			setScale(1);

			// reset state and refs
			setContext(context);
			setOffset(ORIGIN);
			setMousePos(ORIGIN);
			setViewportTopLeft(ORIGIN);
			lastOffsetRef.current = ORIGIN;
			lastMousePosRef.current = ORIGIN;
		}
	}, []);

	// functions for panning
	const mouseMove = useCallback(
		(event) => {
			if (context) {
				const lastMousePos = lastMousePosRef.current;
				const currentMousePos = { x: event.pageX, y: event.pageY };
				lastMousePosRef.current = currentMousePos;

				const mouseDiff = diffPoints(currentMousePos, lastMousePos);
				setOffset((prev) => addPoints(prev, mouseDiff));
			}
		},
		[context]
	);

	const mouseUp = useCallback(
		(event) => {
			if (lastMousePos.x === event.pageX && lastMousePos.y === event.pageY) {
				let temp = paintedCanvas;
				temp[relMousePos.y][relMousePos.x].color =
					currentColor.current ?? "#FFFFFF";

				setPaintedCanvas(temp);

				context.fillStyle = currentColor.current;
				context.fillRect(
					relMousePos.x * (10 * scale),
					relMousePos.y * (10 * scale),
					10 * scale,
					10 * scale
				);
			}
			document.removeEventListener("mousemove", mouseMove);
			document.removeEventListener("mouseup", mouseUp);
		},
		[mouseMove, paintedCanvas, lastMousePos]
	);

	const startPan = useCallback(
		(event) => {
			document.addEventListener("mousemove", mouseMove);
			document.addEventListener("mouseup", mouseUp);
			lastMousePosRef.current = { x: event.pageX, y: event.pageY };
			lastMousePos = { x: event.pageX, y: event.pageY };
		},
		[mouseMove, mouseUp]
	);

	// setup the canvas and the context
	useLayoutEffect(() => {
		if (canvasRef.current) {
			const renderCtx = canvasRef.current.getContext("2d");

			if (renderCtx) {
				reset(renderCtx);
			}
		}
	}, [reset]);

	// pan when offset or scale changes
	useLayoutEffect(() => {
		if (context && lastOffsetRef.current) {
			const offsetDiff = scalePoint(
				diffPoints(offset, lastOffsetRef.current),
				scale
			);
			context.translate(offsetDiff.x, offsetDiff.y);
			setViewportTopLeft((prevVal) => diffPoints(prevVal, offsetDiff));
		}
	}, [context, offset, scale]);

	// draw
	useLayoutEffect(() => {
		if (context) {
			const squareSize = 10;

			// clear canvas but maintain transform
			context.save();
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			context.restore();

			context.fillStyle = "#aaa";
			context.fillRect(
				(-5000 * CANVAS_WIDTH) / scale,
				(-5000 * CANVAS_HEIGHT) / scale,
				(10000 * CANVAS_WIDTH) / scale,
				(10000 * CANVAS_HEIGHT) / scale
			);
			// change this part with real square data
			paintedCanvas.forEach((row) => {
				row.forEach((col) => {
					context.fillStyle = col.color;
					context.fillRect(
						(col.column - 1) * squareSize,
						(col.row - 1) * squareSize,
						squareSize,
						squareSize
					);
				});
			});
		}
	}, [context, scale, offset, paintedCanvas]);

	// add event listener on canvas for mouse position
	useEffect(() => {
		const canvasElem = canvasRef.current;
		if (canvasElem === null) {
			return;
		}

		function handleUpdateMouse(event) {
			event.preventDefault();
			if (canvasRef.current) {
				const viewportMousePos = { x: event.clientX, y: event.clientY };
				const topLeftCanvasPos = {
					x: canvasRef.current.offsetLeft,
					y: canvasRef.current.offsetTop,
				};
				setMousePos(diffPoints(viewportMousePos, topLeftCanvasPos));
			}
		}

		canvasElem.addEventListener("mousemove", handleUpdateMouse);
		canvasElem.addEventListener("wheel", handleUpdateMouse);
		return () => {
			canvasElem.removeEventListener("mousemove", handleUpdateMouse);
			canvasElem.removeEventListener("wheel", handleUpdateMouse);
		};
	}, []);

	useEffect(() => {
		const canvasElem = canvasRef.current;
		if (canvasElem === null) {
			return;
		}

		// this is tricky. Update the viewport's "origin" such that
		// the mouse doesn't move during scale - the 'zoom point' of the mouse
		// before and after zoom is relatively the same position on the viewport
		function handleWheel(event) {
			event.preventDefault();
			if (context) {
				const zoom = 1 - event.deltaY / ZOOM_SENSITIVITY;
				const viewportTopLeftDelta = {
					x: (mousePos.x / scale) * (1 - 1 / zoom),
					y: (mousePos.y / scale) * (1 - 1 / zoom),
				};
				const newViewportTopLeft = addPoints(
					viewportTopLeft,
					viewportTopLeftDelta
				);

				context.translate(viewportTopLeft.x, viewportTopLeft.y);
				context.scale(zoom, zoom);
				context.translate(-newViewportTopLeft.x, -newViewportTopLeft.y);

				setViewportTopLeft(newViewportTopLeft);
				setScale(scale * zoom);
			}
		}

		canvasElem.addEventListener("wheel", handleWheel);
		return () => canvasElem.removeEventListener("wheel", handleWheel);
	}, [context, mousePos.x, mousePos.y, scale]);

	// maintain the relative mouse position
	useEffect(() => {
		if (context) {
			const storedTransform = context.getTransform();
			const newRelative = context
				.getTransform()
				.invertSelf()
				.transformPoint(mousePos);
			context.setTransform(storedTransform);
			relMousePos.x = Math.floor(newRelative.x / 10);
			relMousePos.y = Math.floor(newRelative.y / 10);
		}
	}, [context, mousePos, relMousePos]);

	function changeColor(color) {
		currentColor.current = color;
		let currentSelection = document.getElementsByClassName("selected");
		if (currentSelection.length !== 0) {
			currentSelection[0].textContent = "";
			currentSelection[0].classList.remove("selected");
		}
		document.getElementById(color).classList.add("selected");
		document.getElementById(color).textContent = "selected";
	}

	return (
		<div id="main">
			<canvas
				onMouseDown={startPan}
				id="canvas"
				ref={canvasRef}
				width="200px"
				height="200px"
			></canvas>
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
		</div>
	);
}

export default App;
