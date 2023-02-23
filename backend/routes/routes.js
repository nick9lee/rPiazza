const express = require('express');
const Model = require('../model/model');

const router = express.Router()

module.exports = router;

//Get all data
router.get('/getAll', async (req, res) => {
    try{
        const data = await Model.find();
        res.json(data)
    }
    catch(error){
        res.status(500).json({message: error.message})
    }
})
