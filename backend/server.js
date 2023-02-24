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
const port = 4000;
const corsOptions ={
   origin:'*', 
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200,
}
app.use(cors(corsOptions)) // Use this after the variable declaration

app.use("/api", routes);
app.use(express.json());
app.get("/", (req, res) => {
	res.send("Hello World!");
});

const server = app.listen(port, () => {
	console.log(`listening on *: ${port}`);
});
