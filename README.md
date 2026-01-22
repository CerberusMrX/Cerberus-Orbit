# 🌌 Cerberus Orbit: Gesture-Controlled Cosmology

Cerberus Orbit is a cutting-edge, interactive 3D space visualization platform that allows users to explore the cosmos using real-time hand gestures. Powered by **Three.js** for rendering and **AI-driven computer vision** for tracking, it provides a seamless, "Iron Man"-like interface for celestial exploration.

---

## ✨ Key Features

- 👐 **Gesture-Driven Interaction**: Rotate, zoom, and navigate the universe without a mouse or keyboard.
- 🪐 **Detailed Solar System**: Photorealistic planets with comprehensive scientific data including atmosphere, gravity, moons, and temperatures.
- 🌌 **Galactic & Cosmic Scales**: Switch between the local Solar System, the Milky Way Galaxy, and the large-scale structure of the Cosmic Web.
- 🛰️ **Intelligent Targeting**: "Point-and-Fly" navigation to travel across the solar system instantly.
- 📊 **Real-time HUD**: Sci-fi inspired interface providing live feedback on system status and celestial data.

---

## 🎮 Control Guide

| Gesture | Icon | Action |
| :--- | :---: | :--- |
| **Fist** | ✊ | **Rotate**: Clench your hand to rotate the planets or the entire scene. |
| **Pinch** | 🤏 | **Zoom**: Change the distance between thumb and index finger to zoom in/out. |
| **Point** | ☝️ | **Select/Pan**: Point at a planet to see details, or point at space to pan the view. |

---

## 🛠️ Technical Stack

- **Frontend**: [Three.js](https://threejs.org/) (WebGL), Vanilla JavaScript, CSS3.
- **Backend**: Python 3.10+, WebSockets (`websockets` library).
- **Hand Tracking**: [Google MediaPipe](https://google.github.io/mediapipe/) (Hand Landmarker).
- **Filtering**: One Euro Filter for smooth, jitter-free hand movement.

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have Python installed. It is recommended to use a virtual environment.

### 2. Setup
Run the launcher to install dependencies and start all servers automatically.

```bash
.\start.bat
```

### 3. Explore
Open your browser and navigate to:
`http://localhost:8000`

---

## 📂 Project Structure

- `web/`: The frontend application (HTML/JS/Textures).
- `server/`: WebSocket server for streaming tracking data to the browser.
- `hand_tracking/`: AI logic for hand landmark detection and gesture classification.
- `data/`: AI model files (`hand_landmarker.task`).

---

## 🛡️ Developer Note
Cerberus Orbit is designed for high-performance visual storytelling. Ensure you have a working webcam and adequate lighting for the best hand-tracking experience.

Developed by the Sudeepa Wanigarathne. 🐺✨
