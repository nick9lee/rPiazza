import asyncio
import websockets
import random

async def stream(websocket, path):
    colors = ["#FFFFFF", "#E4E4E4", "#888888", "#222222", "#FFA7D1", "#E50000", "#E59500", "#A06A42", "#E5D900", "#94E044", "#02BE01", "#00D3DD", "#0083C7", "#0000EA", "#CF6EE4", "#820080"]
    while True:
        x = random.randint(0, 199)
        y = random.randint(0, 199)
        color = random.choice(colors)
        data = f"{x},{y},{color}"
        await websocket.send(data)
        await asyncio.sleep(1)

async def server():
    async with websockets.serve(stream, "localhost", 8765):
        await asyncio.Future()  # run forever

asyncio.run(server())
