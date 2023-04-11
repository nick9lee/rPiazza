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
  // database error handling
  database.on("error", (error) => {
    console.log(error);
  });
  database.once("connected", () => { });

  // check if we can even connect to a database
  const responsiveServers = await checkStatus(otherServers);
  // if we have responsive servers
  if (responsiveServers && responsiveServers.length > 0) {
    // update database, waits for promise to resolve 
    await updateDatabase(responsiveServers);
    // server can now process client requests
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

/**
 * Obtains a list of servers and returns a list of active servers.
 * @param {array} otherServers - List of other servers.
 * @returns {array} - List of active servers
 * @returns {false} - If no servers available 
 */
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

/**
 * Updates server database from another server/database.
 * @param {array} responsiveServers - List of active servers
 */
function updateDatabase(responsiveServers) {
  return new Promise(async (resolve) => {
    // console.log("starting update");

    // choose random server
    const randomIndex = Math.floor(Math.random() * responsiveServers.length);
    const server = responsiveServers[randomIndex];
    let data;

    try {
      // acquire lock
      const lockResponse = await axios.post(`${server}/api/lockDatabase`);
      //console.log(lockResponse.data);
      console.log("Got db lock");

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

      // release lock, other servers can now process client requests
      await startServerComm(server);
      // update database
      await compareData(transformedArray, newData);
      // resolve promise
      resolve();
    } catch (error) {
      //console.error(error);
      console.log("Error while updating db on init, server startup will continue");
    }
  });
}

/**
 * Compares two databases and updates if needed
 * @param {array} oldData - Database from current server
 * @param {array} newData - Database from active/live server
 */
async function compareData(oldData, newData) {
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

/**
 * Releases database lock to allow server to server communication 
 * This allows for other servers to process other client requests.
 * @param {string} server - Address of server with locked database
 */
async function startServerComm(server) {
  // create a promise that will be resolved when the ack message is received
  const ackPromise = new Promise((resolve) => {
    parentPort.on("message", (message) => {
      if (message === "receivedDataAck") {
        resolve();
      }
    });
  });

  // send the message to the parent
  parentPort.postMessage("receivedData");

  // wait for the ack message to be received
  await ackPromise;

  // release lock, other servers can now process client requests
  const releaseAllRes = await axios.post(`${server}/api/releaseDatabase`);
  console.log("database lock released");
}


