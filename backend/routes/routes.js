const express = require("express");
const Model = require("../model/model");

const router = express.Router();


const { getKey, setKey, setKeyTimer, clearKeyTimer } = require("../keys");

//Get all data
router.get("/getAll", async (req, res) => {
	try {
		const data = await Model.find().sort({ row: 1, column: 1 });
		let transformedArray = [...Array(200)].map((e) => Array(200));
		data.forEach((entry, index) => {
			transformedArray[entry.row][entry.column] = entry;
		});
		res.json(transformedArray);
	} catch (error) {
		res.status(500).json({ message: error.message });
		process.exit();

	}

});

router.post("/lockDatabase", async (req, res) => {
	for (let row = 0; row < 200; row++) {
		for (let col = 0; col < 200; col++) {
			// for every pixel
			let lockObtained = false;
			while (!lockObtained) {
				if (getKey(row, col) === 0) {
					setKey(row, col, 1);
					setKeyTimer(row, col, 300); // 5 minute timer
					console.log(`locked row:${row} col:${col}`)
					lockObtained = true;
				} else {
					// delay for 100 milliseconds before trying again
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			}
		}
	}
	console.log("Database Lock Done")
	// send response indicating success
	res.send({ code: 0 });
});

router.post("/releaseDatabase", async (req, res) => {
	for (let row = 0; row < 200; row++) {
		for (let col = 0; col < 200; col++) {
			// for every pixel
			setKey(row, col, 0);
			clearKeyTimer(row, col);
		}
	}
	console.log("Database Release Done")
	// send response indicating success
	res.send({ code: 0 });
});
// Get key endpoint



module.exports = router;