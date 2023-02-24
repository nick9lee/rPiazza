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

const app = express();
const port = 4000;
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
	socket.on("newData", (data) => {
		console.log(data);
		// create a new document using Mongoose
		// const newData = await Model.create(JSON.parse(data));
		// // save the new document to the database
		// newData.save((err, savedData) => {
		// 	if (err) {
		// 		console.log(err);
		// 	} else {
		// 		// If successful, broadcast update to all connected clients
		// 		console.log("New data saved:", savedData);
		// 	}
		// });
		io.emit("update", data);
	});
	// Listen for disconnect from clients
	socket.on("disconnect", () => {
		console.log("user disconnected");
	});
});

server.listen(port, () => {
	console.log("listening on *:" + port);
});
