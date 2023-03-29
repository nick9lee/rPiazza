const axios = require("axios");
const { getKey, setKey } = require("./keys");
const Model = require("./model/model");
const mongoose = require("mongoose");
// Used to communicate with server.js thread
const { parentPort } = require("worker_threads");


// Run the initialization code
const initialize = async (otherServers, databaseURL) => {
  console.log("Initialization beginning");
  // Connect to database one
  mongoose.connect(databaseURL);
  const database = mongoose.connection;

  database.on("error", (error) => {
    console.log(error);
  });

  database.once("connected", () => { });

  // check if we can even connect to a database
  const responsiveServers = await checkStatus(otherServers);
  // if we have responsive servers
  if (responsiveServers && responsiveServers.length > 0) {
    // update database
    await updateDatabase(responsiveServers);
    // close connection to db?

    //  server can now process client requests
    parentPort.postMessage("initialized");
  } else {
    console.log("No servers are running");
    parentPort.postMessage("receivedData");
    parentPort.postMessage("initialized");
  }
};

// Listen for a message from the main thread to start initialization
parentPort.on("message", async (message) => {
  if (message.message === "initialize") {
    try {
      await initialize(message.otherServers, message.databaseURL);
    } catch (error) {
      console.error("Initialization failed:", error);
      parentPort.postMessage("initialization_failed");
    }
  }
});

// returns array of active servers, false if no other server available
async function checkStatus(otherServers) {
  const responsiveServers = [];
  await Promise.all(
    otherServers.map((serverName) => {
      return axios
        .get(serverName + "/api/status")
        .then((response) => {
          if (response.status === 200) {
            // responsive server
            responsiveServers.push(serverName);
          }
        })
        .catch((error) => {
          // do nothing, server not on
        });
    })
  );

  if (responsiveServers.length === 0) {
    // no server running
    return null;
  } else {
    // at least one server running
    return responsiveServers;
  }
}
async function updateDatabase(responsiveServers) {
  console.log("starting update");

  // choose random server
  const randomIndex = Math.floor(Math.random() * responsiveServers.length);
  const server = responsiveServers[randomIndex];
  let data;

  try {
    // acquire lock
    const lockResponse = await axios.post(`${server}/api/lockDatabase`);
    //console.log(lockResponse.data);
    //console.log("got lock");

    // get all data from server we are updating from
    const latestServer = await axios.get(`${server}/api/getAll`);
    let newData = latestServer.data;
    // console.log(newData);
    //console.log("gotAll from server");

    // get all data from own database
    const data = await Model.find().sort({ row: 1, column: 1 });
    let transformedArray = [...Array(200)].map((e) => Array(200));
    data.forEach((entry, index) => {
      transformedArray[entry.row][entry.column] = entry;
    });

    // let server know we have got all data, server port open
    parentPort.postMessage("receivedData");

    // release lock, other servers can now process client requests
    await startServerComm(server);

    // update database
    await compareAndUpdate(transformedArray, newData);
  } catch (error) {
    console.error(error);
  }
}

async function compareAndUpdate(oldData, newData) {
  //console.log(oldData.length);
  for (let row = 0; row < oldData.length; row++) {
    for (let col = 0; col < oldData[row].length; col++) {
      let oldPixel = oldData[row][col];
      let newPixel = newData[row][col];
      // if we need to update

      if (newPixel.timestamp > oldPixel.timestamp) {
        console.log(`row: ${row} col: ${col}`);
        console.log(`old pixel ts = ${oldPixel.timestamp}`);
        console.log(`new pixel ts = ${newPixel.timestamp}`);
        // acquire lock
        if (getKey(row, col) === 0) {
          setKey(row, col, 1);
          // update
          try {
            await Model.findOneAndUpdate(
              { row: newPixel.row, column: newPixel.column },
              {
                $set: { color: newPixel.color, timestamp: newPixel.timestamp },
              },
              { new: true }
            )
              .then((doc) => {
                console.log(`Updated doc in init: ${doc}`);
              })
              .catch((err) => {
                console.error(`Error updating document: ${err}`);
                // Close server 
                server.close();
                // Close WebSocket connections
                clientSockets.close();
                process.exit();
              });
          } catch (err) {
            console.error(
              `Error while finding document with row=${row} and col=${col}:`,
              err
            );
          }
          // release lock
          setKey(row, col, 0);
        } else {
          // we can assume some other server is already updating this pixel
        }
      } else {
        // doesn't need updating
      }
    }
  }
}

async function startServerComm(server) {
  // listen for ack
  parentPort.on("message", async (message) => {
    // this server can process update requests from other servers
    if (message === "receivedDataAck") {
      // release lock, client requests can now be processed
      const releaseAllRes = await axios.post(`${server}/api/releaseDatabase`);
      //console.log(releaseAllRes.data);
      //console.log("database lock released");
    }
  });
}
