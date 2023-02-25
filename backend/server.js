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

		// Convert the string to a JavaScript object
		const newData = JSON.parse(data);

      // Update the document in the database based on the ID
      Model.findByIdAndUpdate(newData._id, { $set: { color: newData.color } }, { new: true })
        .then((doc) => {
          console.log(`Updated document: ${doc}`);
		  io.emit("update", data);
          socket.emit('update-success', doc); // emit a success message back to the client
        })
        .catch((err) => {
          console.error(`Error updating document: ${err}`);
          socket.emit('update-failure', err); // emit an error message back to the client
        });

	});
	// Listen for disconnect from clients
	socket.on("disconnect", () => {
		console.log("user disconnected");
	});
});

server.listen(port, () => {
	console.log("listening on *:" + port);
});


