// Hidden file, contains database URL
require("dotenv").config();
const fetch = require("node-fetch");

const routes = require("./routes/routes");
const express = require("express");
const mongoose = require("mongoose");
const mongoString = process.env.DATABASE_URL;
const Model = require("./model/model");
const { getKey, setKey } = require("./keys");



/* To re-create database
// Insert data one at a time using a double for loop
for (let row = 0; row < 200; row++) {
	for (let col = 0; col < 200; col++) {
	  const newData = new Model({
		color: "#888888",
		row: row,
		column: col,
		timestamp: 0
	  });
  
	  newData.save((err) => {
		if (err) {
		  console.error(err);
		}
	  });
	}
  }
  */

const app = express();

const port = process.env.PORT || 4000; // default to 4000 if PORT is not set

if(port == 4000) {
	// Connect to database one
	mongoose.connect(process.env.DATABASE_URL);
	const database = mongoose.connection;

	database.on("error", (error) => {
	console.log(error);
});

	database.once("connected", () => {
	console.log("Database one Connected");
});
} else {
	// Connect to database two
	mongoose.connect(process.env.DATABASE_TWO_URL);
	const database = mongoose.connection;

	database.on("error", (error) => {
	console.log(error);
});

database.once("connected", () => {
	console.log("Database two Connected");
});
}

const cors = require("cors");
const corsOptions = {
	origin: "*",
	credentials: true, //access-control-allow-credentials:true
	optionSuccessStatus: 200,
};
app.use(cors(corsOptions)); // Use this after the variable declaration

const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
	transports: ["websocket", "polling"],
});

app.use("/api", routes);
app.use(express.json());
app.get("/", (req, res) => {
	res.send("Hello World!");
});

io.on("connection", (socket) => {
	console.log("a user connected");

	// Receives json from client with new data, updates database, then broadcasts to all connected clients
	// Listen for 'newData' event from client
	socket.on("newData", (data) => handleChange(data, socket));
	// Listen for disconnect from clients
	socket.on("disconnect", () => {
		console.log("user disconnected");
	});
});

server.listen(port, () => {
	console.log("listening on *:" + port);
});

async function getLock(data) {
	let query = new URLSearchParams({
		id: data._id,
		row: data.row,
		column: data.column,
		timestamp: data.timestamp,
		color: data.color,
	});
	let url = "http://localhost:"+ process.env.OTHERPORT + "/api/getKey?" + query;

	return await fetch(url, {
		method: "GET",
		headers: {
			accept: "application/json",
			"content-type": "application/json",
		},
	})
		.then((res) => res.json())
		.then((json) => {
			if(json.locked === false){
				setKey(data.row, data.column, 1);
				return true;
			}
			return false;
		})
		.catch((err) => console.error(err));
}

async function handleChange(data, socket) {
	// aquire lock
	const newData = JSON.parse(data);
	let result = await getLock(newData);
	console.log(result, "here");
	if(result === true){
		Model.findByIdAndUpdate(
			newData._id,
			{ $set: { color: newData.color, timestamp: newData.timestamp } },
			{ new: true }
		)
			.then((doc) => {
				console.log(`Updated document: ${doc}`);
				io.emit("update", data);
				socket.emit("update-success", doc); // emit a success message back to the client
				setKey(newData.row, newData.column, 0);
			})
			.catch((err) => {
				console.error(`Error updating document: ${err}`);
				socket.emit("update-failure", err); // emit an error message back to the client
			});
	}
	else{
		console.log("locked");
	}
}

app.get("/api/getKey", async (req, res) => {
	try {
		let row = parseInt(req.query.row);
		let column = parseInt(req.query.column);
		let key = getKey(row, column);
		console.log("row: " + row + " column: " + column + " key: " + key);
		if(key === 0) {
			try {
				let id = req.query.id;
				let color = req.query.color;
				let timestamp = parseInt(req.query.timestamp) + 1;
				let result  = await Model.findByIdAndUpdate(
					id,
					{ $set: { color: color, timestamp: timestamp } },
					{ new: true }
				)
					.then((doc) => {
						console.log(`Updated document: ${doc}`);
						io.emit("update", req.query);
						return true;
					})
					.catch((err) => {
						console.error(`Error updating document: ${err}`);
						return false;
					});
				if(result == false){
					throw new Error("could not save");
				}
				// save in local server
				return res.status(200).json({ locked: false });
			} catch (err) {
				console.error(err);
				return res.status(409).send("could not save");
			}
		}else{
			return res.status(423).json({ locked: true });
		}
	} catch (err) {
		console.error(err);
		return res.status(400).send("there was an error");
	}
});