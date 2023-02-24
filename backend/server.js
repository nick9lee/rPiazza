// Hidden file, contains database URL
require("dotenv").config();

const routes = require("./routes/routes");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const mongoString = process.env.DATABASE_URL;

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
const allowedHosts = ["http://localhost:4000", "http://localhost:5173"];
app.use(
	cors({
		origin: function (origin, callback) {
			if (!origin) return callback(null, true);

			if (allowedHosts.indexOf(origin) === -1) {
				var msg =
					"The CORS policy for this site does not allow acces from the specified origin";
				return callback(new Error(msg), false);
			}

			return callback(null, true);
		},
	})
);

const port = 4000;

app.use("/api", routes);
app.use(express.json());
app.get("/", (req, res) => {
	res.send("Hello World!");
});

const server = app.listen(port, () => {
	console.log(`listening on *: ${port}`);
});
