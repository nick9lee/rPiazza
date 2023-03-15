const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const dataSchema = new mongoose.Schema({
	color: {
		required: true,
		type: String,
	},
	row: {
		required: true,
		type: Number,
	},
	column: {
		required: true,
		type: Number,
	},
	timestamp: {
		required: true,
		type: Number,
	},
});

module.exports = mongoose.model("Data", dataSchema);
