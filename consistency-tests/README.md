# Consistency Tests

Tests to see if the system is consistent.

## URLs

urls are defined in constants.py 

change them if you want to use two servers or 1 server.

## Scenario 1

Two users click on the same tile at the same time with same timestamp. Whoever gets the lock first, will be the one who writes to the lock first.

## Scenario 2

users modifying the same tile at the same time with different timestamps. The one with the lower timestamp will be the one who writes the tile.

## Scenario 3

users modifying different tiles at the same time concurrently. Both should be able to save at the same time. 
