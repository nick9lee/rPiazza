import asyncio
import websockets

async def client():
    async with websockets.connect("ws://localhost:8765") as websocket:
        while True:
            data = await websocket.recv()
            x, y, color = data.split(",")
            print(f"x: {x}, y: {y}, color: {color}")

asyncio.run(client())
