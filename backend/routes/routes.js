const express = require("express");
const Model = require("../model/model");

const router = express.Router();


const {getKey, setKey} = require("../keys");

//Get all data
router.get("/getAll", async (req, res) => {
	try {
		const data = await Model.find().sort({row: 1, column: 1});
		let transformedArray = [...Array(200)].map((e) => Array(200));
		data.forEach((entry, index) => {
			transformedArray[entry.row][entry.column] = entry;
		});
		res.json(transformedArray);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// Get key endpoint



module.exports = router;