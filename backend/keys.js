let keys = new Array(200).fill().map(() => new Array(200).fill(0));


function getKey(row, col) {
	return keys[row][col];
}


function setKey (col , row, val) {
	keys[col][row] = val;
}

module.exports = {getKey, setKey};