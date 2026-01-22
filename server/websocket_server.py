import asyncio
import websockets
import cv2
import json
import logging
import base64
import sys
import os

# Add project root to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from hand_tracking.gesture_controller import GestureController

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CerberusServer")

class CerberusServer:
    def __init__(self, host="localhost", port=8765):
        self.host = host
        self.port = port
        self.clients = set()
        self.gesture_controller = GestureController()
        self.cap = cv2.VideoCapture(0)
        
        if not self.cap.isOpened():
            logger.error("Could not open webcam.")
        else:
            logger.info("Webcam opened successfully.")

    async def register(self, websocket):
        self.clients.add(websocket)
        logger.info(f"Client connected. Total: {len(self.clients)}")

    async def unregister(self, websocket):
        self.clients.remove(websocket)
        logger.info(f"Client disconnected. Total: {len(self.clients)}")

    # Fixed signature for newer websockets library
    async def handler(self, websocket):
        await self.register(websocket)
        try:
            async for message in websocket:
                pass
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister(websocket)

    async def broadcast_gestures(self):
        logger.info("Starting gesture broadcast loop...")
        while True:
            if not self.cap.isOpened():
                await asyncio.sleep(1)
                continue

            ret, frame = self.cap.read()
            if not ret:
                await asyncio.sleep(0.01)
                continue

            # Process frame
            # Mirror the frame for intuitive interaction
            frame = cv2.flip(frame, 1)
            
            # We resize frame for bandwidth optimization (e.g., 320x240)
            small_frame = cv2.resize(frame, (320, 240))
            gesture_data, annotated_frame = self.gesture_controller.process_frame(frame)
            
            # Encode frame to base64
            # We use the annotated frame if available, else original
            img_to_send = annotated_frame if annotated_frame is not None else frame
            img_to_send = cv2.resize(img_to_send, (320, 240))
            _, buffer = cv2.imencode('.jpg', img_to_send, [cv2.IMWRITE_JPEG_QUALITY, 70])
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            
            if gesture_data:
                gesture_data["image"] = jpg_as_text
            else:
                gesture_data = {"is_tracking": False, "image": jpg_as_text}

            # Broadcast
            if self.clients:
                message = json.dumps(gesture_data)
                # Helper for broadcasting to all clients
                websockets.broadcast(self.clients, message)
            
            # Target ~30 FPS for network
            await asyncio.sleep(0.033)

    async def start(self):
        logger.info(f"Starting server on ws://{self.host}:{self.port}")
        # Newer websockets.serve passes only websocket to handler by default
        server = await websockets.serve(self.handler, self.host, self.port)
        
        await asyncio.gather(
            server.wait_closed(),
            self.broadcast_gestures()
        )

if __name__ == "__main__":
    server = CerberusServer()
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        logger.info("Server stopped.")
        if server.cap:
            server.cap.release()
