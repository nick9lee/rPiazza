const express = require('express');
const Model = require('../model/model');

const router = express.Router()

module.exports = router;

//Get by ID Method
router.get('/getOne/:id', async (req, res) => {
    try{
        const data = await Model.findById(req.params.id);
        res.json(data)
    }
    catch(error){
        res.status(500).json({message: error.message})
    }
})


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

//Get data by ID
router.get('/getOne/:id', (req, res) => {
    res.send(req.params.id)
})

//Update data by ID
router.patch('/update/:id', (req, res) => {
    res.send('Update by ID API')
})