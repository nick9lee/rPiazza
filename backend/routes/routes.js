const express = require("express");
const Model = require("../model/model");

const router = express.Router();

module.exports = router;

//Get all data
router.get("/getAll", async (req, res) => {
	try {
		const data = await Model.find();
		let transformedArray = [...Array(200)].map((e) => Array(200));
		data.forEach((entry, index) => {
			transformedArray[entry.row][entry.column] = entry;
		});
		res.json(transformedArray);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});
