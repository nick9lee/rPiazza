// Hidden file, contains database URL
require('dotenv').config();

const routes = require('./routes/routes');
const express = require('express')
const mongoose = require('mongoose');
const mongoString = process.env.DATABASE_URL


// Connect to database
mongoose.connect(mongoString);
const database = mongoose.connection;

database.on('error', (error) => {
    console.log(error)
})

database.once('connected', () => {
    console.log('Database Connected');
})

const app = express()
const port = 4000

app.use('/api', routes)
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Hello World!')
})

const server = app.listen(port, () => {
    console.log(`listening on *: ${port}`)
  });