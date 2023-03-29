let serverLockTimeout = 60; // 10 seconds for server to acquire its key back 
let keyTimer = new Array(200).fill().map(() => new Array(200).fill());

let keys = new Array(200).fill().map(() => new Array(200).fill(0));

function getKey(row, col) {
	return keys[row][col];
}

function setKey(row, col, val) {
	keys[row][col] = val;
}

function setKeyTimer(row, col) {
	//console.log(`Timer set for row:${row}, col:${col}`);
	const lockTimerId = setTimeout(() => {
		setKey(row, col, 0);
		//console.log(`Lock released by timeout for row ${row}, column ${col}`);
	  }, serverLockTimeout * 1000);
	  // pass into array
	  keyTimer[row][col] = lockTimerId;
}

function clearKeyTimer(row, col) {
	//console.log(`Timer released for row:${row}, col:${col}`);
	clearTimeout(keyTimer[row][col]);

}

module.exports = { getKey, setKey, setKeyTimer, clearKeyTimer };

// Server 1 receives input.
// Server 1 broadcasts a lock request to all other servers (Server 2 and Server 3).
// Server 1 waits for a response from both servers for a specified timeout duration.
// If a server doesn't respond within the timeout, Server 1 assumes that server is down and proceeds without that server's lock.
// Server 1 also logs this event for future reference (or tries to restart process).
// Server 1 acquires locks from all responsive servers and saves them in its own database.
// Server 1 sends a confirmation to all other responsive servers to save the lock in their respective databases.
// Server 1 waits for confirmation that the lock has been saved from all responsive servers.
// If a server doesn't confirm within the timeout, Server 1 assumes that server is down and proceeds without that server's confirmation. Server 1 also logs this event for future reference.
// Server 1 returns the lock.
// Once the operation is complete, Server 1 releases the lock by informing all responsive servers to release their respective locks.

// --------------------------------------------------------------------------------------------------

// server restart process
// server starts with all its locks back
// use a webworker don't intialize socket untill it is done
// when server restarts it goes cell by cell, first requesting the
// lock for that cell, then asking for the value, then updating it's own database
// and returning the lock

// once it has done this for every cell, it may resume taking clients
// if another server gets input during this time, the cell can be updated

// ---------------------------

// server turn on process (first server turning on)
// try and do restart process, but if it can't get any locks because
// the other servers are not on, then it assumes it's data is correct and
// continues with its data
