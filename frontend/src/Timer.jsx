import React from "react";
import { useEffect } from "react";
import "./Timer.css";

function Timer({ timeOutTimer, setTimeOutTimer }) {
	useEffect(() => {
		const timer =
			timeOutTimer > 0 &&
			setInterval(() => setTimeOutTimer(timeOutTimer - 1), 1000);
		return () => clearInterval(timer);
	}, [timeOutTimer]);

	return (
		<div className="timeoutMessage">
			{timeOutTimer > 0
				? `You must wait ${timeOutTimer} seconds before making your next change.`
				: "Please make your next change."}
		</div>
	);
}

export default Timer;
