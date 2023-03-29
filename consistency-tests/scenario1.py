import socketio
import json
from constants import SOCKET_URL, SERVER_URL, SOCKET_URL_2, SERVER_URL_2
import threading

# create a Socket.IO client instance
sio = socketio.Client()
sio2 = socketio.Client()

# define event handler functions
@sio.event
def connect():
    print("Connected to server")

@sio.event
def disconnect():
    print("Disconnected from server")

@sio.event
def message(data):
    print("Received message from server:", data)

# define event handler functions
@sio2.event
def connect():
    print("Connected to server")

@sio2.event
def disconnect():
    print("Disconnected from server")

@sio2.event
def message(data):
    print("Received message from server:", data)

# connect to the server
sio.connect(SOCKET_URL, transports=["websocket"], socketio_path="/api/socket/")
sio2.connect(SOCKET_URL_2, transports=["websocket"], socketio_path="/api/socket/")

# define data to send
data1 = {
    "_id": '640bb476491dd0ee4aa7120a',
    "color": "#FFFFFF",
    "row": 0,
    "column": 0,
    "timestamp": 1,
    "_v": 0
}

data2 = {
    "_id": '640bb476491dd0ee4aa7120a',
    "color": "#A06A42",
    "row": 0,
    "column": 0,
    "timestamp": 1,
    "_v": 0
}

def thread_function_1(barrier):
    barrier.wait()
    sio.emit('newData', json.dumps(data1))

def thread_function_2(barrier):
    barrier.wait()
    sio2.emit('newData', json.dumps(data2))

# create a barrier for two threads
barrier = threading.Barrier(2)

# create two threads, passing the barrier as an argument
thread_1 = threading.Thread(target=thread_function_1, args=(barrier,))
thread_2 = threading.Thread(target=thread_function_2, args=(barrier,))

# start the threads
thread_1.start()
thread_2.start()

# wait for the threads to finish
thread_1.join()
thread_2.join()

# wait for messages from the server
sio.wait()
sio2.wait()

# # disconnect from the server
# sio.disconnect()
# sio2.disconnect()
