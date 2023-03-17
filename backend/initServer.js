const axios = require('axios');
const { setKey } = require("./keys");
const Model = require("./model/model");
const mongoose = require("mongoose");


// Used to communicate with server.js thread 
const { parentPort } = require('worker_threads');

// Run the initialization code
const initialize = async (otherServers, databaseURL) => {
  console.log('Initialization beginning');
  // Connect to database one
  mongoose.connect(databaseURL);
  const database = mongoose.connection;

  database.on("error", (error) => {
    console.log(error);
  });

  database.once("connected", () => {
  });

  // check if we can even connect to a database
  const responsiveServers = await checkStatus(otherServers);
  // if we have responsive servers
  if (responsiveServers && responsiveServers.length > 0) {
    // update database
    await updateDatabase(responsiveServers, otherServers);
    // close connection to db

    parentPort.postMessage('initialized');
  } else {
    console.log('No servers are running');
    parentPort.postMessage('initialized');

  }
};


// Listen for a message from the main thread to start initialization
parentPort.on('message', async (message) => {
  if (message.message === 'initialize') {
    try {
      await initialize(message.otherServers, message.databaseURL);
    } catch (error) {
      console.error('Initialization failed:', error);
      parentPort.postMessage('initialization_failed');
    }
  }
});

async function initAcquireLocks(row, column, otherServers) {
  const results = [];
  const requests = otherServers.map((server) => {
    return axios
      .post(
        `${server}/api/getLock`,
        { row: row, column: column },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 1000,
        }
      )
      .then((res) => res.data)
      .catch((err) => {
      });
  });

  return Promise.all(requests)
    .then((response) => {
      response.forEach((res) => {
        if (!res) {
          results.push(-1);
        } else {
          results.push(res.code);
        }
      });
      const lockedResource = results.filter((res) => res === 1);
      if (lockedResource.length > 0) {
        return false;
      }
      return true;
    })
    .catch((err) => { });
}
async function initReleaseLocks(row, column, otherServers) {
  const results = [];
  const requests = otherServers.map((server) => {
    return axios
      .post(
        `${server}/api/releaseOneLock`,
        { row: row, column: column },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 1000,
        }
      )
      .then((res) => res.data)
      .catch((err) => { });
  });

  return Promise.all(requests)
    .then((response) => {
      response.forEach((res) => {
        if (!res) {
          results.push(-1);
        } else {
          results.push(res.code);
        }
      });
      const lockedResource = results.filter((res) => res === 1);
      if (lockedResource.length > 0) {
        return false;
      }
      return true;
    })
    .catch((err) => { });
}

// returns false if no other server available
async function checkStatus(otherServers) {
  const responsiveServers = [];
  await Promise.all(otherServers.map(serverName => {
    return axios.get(serverName)
      .then(response => {
        if (response.status === 200) {
          // responsive server
          responsiveServers.push(serverName);
        } 
      })
      .catch(error => {
        // do nothing, server not on
      });
  }));

  if (responsiveServers.length === 0) {
    // no server running
    return null;
  } else {
    // at least one server running
    return responsiveServers;
  }
}

async function updateDatabase(responsiveServers, otherServers) {

  // For every cell
  for (let row = 0; row < 200; row++) {
    console.log(`row ${row} done`);
    for (let col = 0; col < 200; col++) {
      // Acquire locks

      const keyStatus = await initAcquireLocks(row, col, otherServers);
      // if keystatus is true, then we have the lock
      if (keyStatus) {
        setKey(row, col, 1);
        // Find the row and column in database of current server
        await Model.findOne({ row: row, column: col })
          .then(async (doc) => {

            // For 1st working server 
            const server = responsiveServers[0];

            // get color and timestamp 
            await axios.get(`${server}/api/getOne`, {
              params: {
                row: row,
                column: col
              }
            })
              .then(async (response) => {
                // if pixel has been updated
                if (response.data.timestamp > doc.timestamp) {
                  // update database
                  doc.color = response.data.color;
                  doc.timestamp = response.data.timestamp;
                  await doc.save();
                  console.log(`Updated document: ${doc}`);
                }
              })
              .catch((error) => {
                // error in api call
              });

              setKey(row, col, 0);
              initReleaseLocks(row, col, otherServers);
          })
          .catch((err) => {
            // error with db
          });





      }

    }
  }
}