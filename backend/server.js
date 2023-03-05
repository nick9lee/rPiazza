// Hidden file, contains database URL
require("dotenv").config();

const routes = require("./routes/routes");
const express = require("express");
const mongoose = require("mongoose");
const mongoString = process.env.DATABASE_URL;
const Model = require("./model/model");

// Connect to database
mongoose.connect(mongoString);
const database = mongoose.connection;

database.on("error", (error) => {
	console.log(error);
});

database.once("connected", () => {
	console.log("Database Connected");
});

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
	socket.on("newData", handleChange(data));
	// Listen for disconnect from clients
	socket.on("disconnect", () => {
		console.log("user disconnected");
	});
});

server.listen(port, () => {
	console.log("listening on *:" + port);
});

// each entry has a key
// when other server calls for key, this server checks if it is currently locking it
// if not then send a bad response
// if yes then drop it

// get request function (to ask for lock)
function getKey(row, col) {
	let query = new URLSearchParams({
		row: row,
		col: col,
	});

	fetch("localhost:" + process.env.OTHERPORT + "/getKey?" + query.toString(), {
		method: "GET",
		headers: {
			accept: "application/json",
			"content-type": "application/json",
		},
	})
		.then((res) => res.json())
		.then((data) => {
			console.log(data);
		})
		.catch((err) => console.error(err));
}

// post request to tell other server to save to its own database.

let keys = new Array(200).fill().map(() => new Array(200).fill(0));

function handleChange(data) {
	// aquire lock
	let result = getKey(data.row, data.col);
	// send to other server

	console.log(data);

	// Convert the string to a JavaScript object
	const newData = JSON.parse(data);

	// Update the document in the database based on the ID
	Model.findByIdAndUpdate(
		newData._id,
		{ $set: { color: newData.color, timestamp: newData.timestamp } },
		{ new: true }
	)
		.then((doc) => {
			console.log(`Updated document: ${doc}`);
			io.emit("update", data);
			socket.emit("update-success", doc); // emit a success message back to the client
		})
		.catch((err) => {
			console.error(`Error updating document: ${err}`);
			socket.emit("update-failure", err); // emit an error message back to the client
		});
}
