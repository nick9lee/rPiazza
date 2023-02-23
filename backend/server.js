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

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use('/api', routes)
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Hello World!')
})

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(port, () => {
  console.log('listening on *:' + port);
});