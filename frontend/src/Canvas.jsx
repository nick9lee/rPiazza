import React from "react";
import {
	useRef,
	useEffect,
	useState,
	useLayoutEffect,
	useCallback,
} from "react";
import "./Canvas.css";

import io from "socket.io-client";
import ColorPicker from "./ColorPicker";
import Timer from "./Timer";

const timeoutDurationMS = 15000;

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 650;

const ORIGIN = {
	x: 0,
	y: 0,
};

const ZOOM_SENSITIVITY = 500;

const ratio = 1;

// intialize the socket connection
const socket = io(import.meta.env.VITE_SOCKET_URL, {
	transport: ["websocket", "polling"],
	path: "/api/socket/",
});

/**
 * This function returns the difference between two points
 * @param {*} p1
 * @param {*} p2
 * @returns
 */
function diffPoints(p1, p2) {
	return { x: p1.x - p2.x, y: p1.y - p2.y };
}

/**
 * This function returns the sum of two points
 * @param {} p1
 * @param {*} p2
 * @returns
 */
function addPoints(p1, p2) {
	return { x: p1.x + p2.x, y: p1.y + p2.y };
}

/**
 * This function returns the point scaled by a factor
 * @param {*} p1
 * @param {number} scale
 * @returns
 */
function scalePoint(p1, scale) {
	return { x: p1.x / scale, y: p1.y / scale };
}

function Canvas() {
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
	const [paintedCanvas, setPaintedCanvas] = useState(null);
	const [isConnected, setIsConnected] = useState(socket.connected);
	const [isTimedOut, setIsTimedOut] = useState(false);
	const [timeoutTimer, setTimeoutTimer] = useState(0);

	// This useEffect is called when the component is mounted and it loads up the
	// canvas from the server and sets up the socket connection
	useEffect(() => {
		// do the primary fetch
		let ignore = false;
		fetch(import.meta.env.VITE_SERVER_URL + "/getAll", {
			method: "GET",
			headers: {
				accept: "application/json",
				"content-type": "application/json",
			},
		})
			.then((res) => res.json())
			.then((data) => {
				// set the canvas
				if (!ignore) {
					setPaintedCanvas(data);
				}
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
			const parsed = JSON.parse(data);
			setPaintedCanvas((old) => {
				const canvas = [...old];
				canvas[parsed.row] = [...canvas[parsed.row]];
				canvas[parsed.row][parsed.column].color = parsed.color;
				canvas[parsed.row][parsed.column].timestamp = parsed.timestamp;
				return canvas;
			});

			setIsTimedOut(true);
			setTimeoutTimer(15);
			setTimeout(() => {
				console.log("here");
				setIsTimedOut(false);
			}, 15000);
		});

		return () => {
			if (socket.readyState === 1) {
				socket.off("connect");
				socket.off("disconnect");
				socket.off("update");
				ignore = true;
			}
		};
	}, []);

	// updates the last offset everytime that it changes so it
	// so that it can be used in the mouseMove function
	useEffect(() => {
		lastOffsetRef.current = offset;
	}, [offset]);

	// reset the canvas so the math can be computed correctly
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

	// functions for panning the canvas
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

	// function for when the mouse is released.
	// If the mouse is released and has not moved from its original position
	// then it will draw a pixel on the canvas
	const mouseUp = useCallback(
		(event) => {
			if (
				!isTimedOut &&
				lastMousePos.x === event.pageX &&
				lastMousePos.y === event.pageY
			) {
				let temp = structuredClone(paintedCanvas);
				const data = temp[relMousePos.y][relMousePos.x];
				data.color = currentColor.current ?? "#FFFFFF";
				data.timestamp += 1;

				socket.emit("newData", JSON.stringify(data));
			}
			document.removeEventListener("mousemove", mouseMove);
			document.removeEventListener("mouseup", mouseUp);
		},
		[mouseMove, paintedCanvas, lastMousePos, isTimedOut]
	);

	// function for when the mouse is pressed down
	const startPan = useCallback(
		(event) => {
			document.addEventListener("mousemove", mouseMove);
			document.addEventListener("mouseup", mouseUp);
			lastMousePosRef.current = { x: event.pageX, y: event.pageY };
			lastMousePos = { x: event.pageX, y: event.pageY };
		},
		[mouseMove, mouseUp]
	);

	// setup the canvas and the context this is executed when the
	// canvas is first loaded and everytime the canvas is reset
	useLayoutEffect(() => {
		if (canvasRef.current) {
			const renderCtx = canvasRef.current.getContext("2d");

			if (renderCtx) {
				reset(renderCtx);
			}
		}
	}, [reset]);

	// pan when offset or scale changes so that the canvas is always in the correct position
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

	// draw the canvas
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
			paintedCanvas?.forEach((row) => {
				row.forEach((col) => {
					context.fillStyle = col.color;
					context.fillRect(
						col.column * squareSize,
						col.row * squareSize,
						squareSize,
						squareSize
					);
				});
			});
		}
	}, [context, scale, offset, paintedCanvas]);

	// add event listener on canvas for mouse position
	// so we know where the mouse is at all times
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

	// add event listener on canvas for mouse wheel to zoom.
	// Tricky portion is to zoom where the mouse position is.
	useEffect(() => {
		const canvasElem = canvasRef.current;
		if (canvasElem === null) {
			return;
		}

		// Update the viewport's "origin" such that
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

	// maintain the relative mouse position when the canvas is panned or scaled
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
	return (
		<div>
			<canvas
				onMouseDown={startPan}
				id="canvas"
				ref={canvasRef}
				width="200px"
				height="200px"
			></canvas>
			<ColorPicker
				setCurrentColor={(color) => {
					currentColor.current = color;
				}}
			/>
			<Timer timeOutTimer={timeoutTimer} setTimeOutTimer={setTimeoutTimer} />
		</div>
	);
}

export default Canvas;
