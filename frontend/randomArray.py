import json
import random

# Define color list
colors = ['#FFFFFF', '#E4E4E4', '#888888', '#222222', '#FFA7D1', '#E50000', '#E59500', '#A06A42', '#E5D900', '#94E044', '#02BE01', '#00D3DD', '#0083C7', '#0000EA', '#CF6EE4', '#820080']

# Create 2D array
array_2d = []
for i in range(200):
    row = []
    for j in range(200):
        # Choose random color from list
        color = random.choice(colors)
        # Create JSON object
        obj = {'x': j, 'y': i, 'color': color}
        # Append object to row
        row.append(obj)
    # Append row to 2D array
    array_2d.append(row)

# Write to file
with open('output.json', 'w') as f:
    json.dump(array_2d, f, indent=4)