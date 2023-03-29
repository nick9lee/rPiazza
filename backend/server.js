// Hidden file, contains database URL
require("dotenv").config({ path: `./env/.env.${process.env.NODE_ENV}` });

const fetch = require("node-fetch");
const routes = require("./routes/routes");
const axios = require("axios");
const express = require("express");
const mongoose = require("mongoose");
const Model = require("./model/model");
const { getKey, setKey, setKeyTimer, clearKeyTimer } = require("./keys");
const otherServers = [process.env.SECOND_HOST, process.env.THIRD_HOST];

const app = express();
const { Worker } = require("worker_threads");
const initWorker = new Worker("./initServer.js");

const port = process.env.PORT || 4000; // default to 4000 if PORT is not set


// Connect to database one
mongoose.connect(process.env.DATABASE_URL);
const database = mongoose.connection;

database.on("error", (error) => {
	console.log(error);
	process.exit();

});

database.once("connected", () => {
	console.log(`Database for ${process.env.NODE_ENV} Connected`);
});



const cors = require("cors");
const corsOptions = {
	origin: "*",
	credentials: true, //access-control-allow-credentials:true
	optionSuccessStatus: 200,
};
app.use(cors(corsOptions)); // Use this after the variable declaration

const http = require("http");
const server = http.createServer(app);
const clientSockets = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
	transports: ["websocket", "polling"],
	path: "/api/socket/",
});

app.use("/api", routes);
app.use(express.json());

app.get("/api/status", (req, res) => {
	res.send("Good!");
});

// Listen for a message from the worker thread
initWorker.on("message", (message) => {
	if (message === "initialized") {
		// clients can now connect
		console.log('init completed');
		clientSockets.on("connection", (socket) => {
			console.log("a user connected");
			// Listen for new data from clients
			socket.on("newData", (data) => handleChange(data));
			// Listen for disconnect from clients
			socket.on("disconnect", () => {
				console.log("user disconnected");
			});
		});
	} else if (message === "receivedData") {
		// other servers can now communicate with this server
		//	console.log('data loading completed');
		server.listen(port, () => {
			console.log("listening on *:" + port);
		});
		initWorker.postMessage("receivedDataAck");
	}
});

// Initialize the worker thread
initWorker.postMessage({
	message: "initialize",
	otherServers: otherServers,
	databaseURL: process.env.DATABASE_URL,
});

async function handleChange(data) {
	const newData = JSON.parse(data);
	console.log("new data incoming: ");
	console.log(newData);
	const keyStatus = await acquireLocks(newData.row, newData.column);
	if (getKey(newData.row, newData.column) === 0) {
		setKey(newData.row, newData.column, 1);
		let releaseRes = [];
		// if keystatus is true, then we have the lock
		if (keyStatus) {
			Model.findOneAndUpdate(
				{ row: newData.row, column: newData.column },
				{ $set: { color: newData.color, timestamp: newData.timestamp } },
				{ new: true }
			)
				.then(async (doc) => {
					console.log(`Updated document: ${doc}`);
					clientSockets.emit("update", data);
					// save success, release locks
					setKey(newData.row, newData.column, 0);
					// release result is not important since if a server fails to save it will auto restart, meaning the all locks are released
					releaseRes = [];
					releaseRes = await releaseLocks(
						newData.row,
						newData.column,
						newData.color,
						newData.timestamp
					);
					console.log("releaseRes", releaseRes);
				})
				.catch((err) => {
					clientSockets.emit("update-failure", err);
					console.error(`Error updating document: ${err}`);
					setKey(newData.row, newData.column, 0);
					process.exit();
					// unable to save, release lock before leaving
				});
		} else {
			setKey(newData.row, newData.column, 0);
			// key is unavailable so don't update and drop the request
		}
	}
}

async function acquireLocks(row, column) {
	const results = [];
	const requests = otherServers.map((server) => {
		return axios
			.post(
				`${server}/api/getLock`,
				{ row: row, column: column },
				{
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					timeout: 1000,
				}
			)
			.then((res) => res.data)
			.catch((err) => { });
	});

	return Promise.all(requests)
		.then((response) => {
			response.forEach((res) => {
				if (!res) {
					results.push(-1);
				} else {
					results.push(res.code);
				}
			});
			const lockedResource = results.filter((res) => res === 1);
			if (lockedResource.length > 0) {
				return false;
			}
			return true;
		})
		.catch((err) => { });
}

async function releaseLocks(row, column, color, timestamp) {
	const results = [];
	const requests = otherServers.map((server) => {
		return axios
			.post(
				`${server}/api/releaseLock`,
				{ row: row, column: column, color: color, timestamp: timestamp },
				{
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					timeout: 1000,
				}
			)
			.then((res) => res.data)
			.catch((err) => { });
	});

	return Promise.all(requests)
		.then((response) => {
			response.forEach((res) => {
				if (!res) {
					results.push(-1);
				} else {
					results.push(res.code);
				}
			});
			const lockedResource = results.filter((res) => res === 1);
			if (lockedResource.length > 0) {
				return false;
			}
			return true;
		})
		.catch((err) => { });
}

app.post("/api/getLock", async (req, res) => {
	const { row, column } = req.body;
	const key = getKey(row, column);
	if (key === 0) {
		setKey(row, column, 1);
		setKeyTimer(row, column);
		res.send({ code: 0 });
	} else {
		res.send({ code: 1 });
	}
});


app.post("/api/releaseLock", async (req, res) => {
	const { row, column, color, timestamp } = req.body;
	const keyState = getKey(row, column);
	if (keyState === 1) {
		await Model.findOneAndUpdate(
			{ row: row, column: column },
			{ $set: { color: color, timestamp: timestamp } },
			{ new: true }
		)
			.then((doc) => {
				console.log(`Updated document: ${doc}`);
				clientSockets.emit("update", JSON.stringify(doc));
				clearKeyTimer(row, column);
				setKey(row, column, 0);
				res.send({ saved: true });
			})
			.catch((err) => {
				console.error(`Error updating document: ${err}`);
				res.send({ saved: false });
				process.exit();
			});
	}
});


/// use this to demo database failure
if (port == 4000) {
	const timeout = setTimeout(() => {
		mongoose.connection.close(() => {
			console.log('MongoDB connection closed due to application timeout');
		});
	}, 60000);
}


setTimeout(function () {
	// Listen for the 'exit' event.
	// This is emitted when our app exits.
	process.on("exit", function () {
		console.log("Restarting");
		// Close server 
		server.close();
		// Close WebSocket connections
		clientSockets.close();
		// Terminate the worker thread
		initWorker.terminate();
		// Disconnect from the database
		mongoose.disconnect();
		//  Resolve the `child_process` module, and `spawn`
		//  a new process.
		//  The `child_process` module lets us
		//  access OS functionalities by running any bash command.`.
		const child = require("child_process").spawn(process.argv.shift(), process.argv, {
			cwd: process.cwd(),
			detached: true,
			stdio: "inherit",
		});

		child.unref();
	});
}, 1000);


/**{
 * code: 0 or 1
 * } */
