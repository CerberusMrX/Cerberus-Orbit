import * as THREE from 'three';

export class GestureHandler {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.ws = null;
        this.url = "ws://localhost:8765";

        this.isConnected = false;

        // History
        this.lastX = undefined;
        this.lastY = undefined;
        this.lastZ = undefined;
        this.lastPinchDist = undefined;

        // Selection & Panning State
        this.raycaster = new THREE.Raycaster();
        this.hoveredPlanet = null;
        this.selectedPlanet = null;
        this.selectionTime = 0;
        this.isPanning = false;
    }

    connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log("Connected to Gesture Server");
            document.getElementById('connection-status').innerHTML = 'WEBSOCKET: <span class="active">CONNECTED</span>';
            document.getElementById('connection-overlay').style.display = 'none';
            this.isConnected = true;
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleGestureData(data);
            } catch (e) {
                console.error("Invalid JSON", e);
            }
        };

        this.ws.onclose = () => {
            console.log("Disconnected. Retrying...");
            document.getElementById('connection-status').innerHTML = 'WEBSOCKET: <span class="disconnected">DISCONNECTED</span>';

            const overlay = document.getElementById('connection-overlay');
            overlay.style.display = 'flex';
            document.getElementById('connection-retry').style.display = 'block';

            this.isConnected = false;
            setTimeout(() => this.connect(), 2000);
        };
    }

    handleGestureData(data) {
        // Video Feed
        if (data.image) {
            const imgEl = document.getElementById('camera-feed');
            if (imgEl) imgEl.src = 'data:image/jpeg;base64,' + data.image;
        }

        const debugEl = document.getElementById('gesture-debug');

        // Reticle Logic
        let cursor = document.getElementById('gesture-cursor');

        if (!data.is_tracking) {
            debugEl.innerText = "NO HAND";
            debugEl.className = "status-item";
            if (cursor) {
                cursor.style.opacity = '0';
                cursor.style.transform = 'scale(0)';
            }
            this.lastX = undefined;
            this.lastY = undefined;
            this.lastPinchDist = undefined;
            return;
        }

        if (cursor) {
            cursor.style.display = 'block';
            cursor.style.opacity = '0.8';
        }

        debugEl.innerText = `MODE: ${data.gesture}`;
        debugEl.className = "status-item active";

        // Update Cursor position
        const screenX = (data.x + 1) * 0.5 * window.innerWidth;
        const screenY = (1 - (data.y + 1) * 0.5) * window.innerHeight;

        if (cursor) {
            cursor.style.left = `${screenX}px`;
            cursor.style.top = `${screenY}px`;

            if (data.gesture === "GRAB") {
                cursor.style.width = '20px';
                cursor.style.height = '20px';
                cursor.style.borderRadius = '50%';
                cursor.style.backgroundColor = '#ffaa00'; // Orange
                cursor.style.boxShadow = '0 0 15px #ffaa00';
                cursor.style.border = 'none';
            } else {
                // IDLE/ZOOM MODE
                // Visual Feedback: Cursor Size maps to Pinch Distance
                let size = 10;
                if (data.pinch_dist !== undefined) {
                    size = 10 + (data.pinch_dist * 400);
                }

                cursor.style.width = `${size}px`;
                cursor.style.height = `${size}px`;
                cursor.style.borderRadius = '50%';
                cursor.style.backgroundColor = 'rgba(0, 255, 255, 0.3)';
                cursor.style.border = '2px solid #00ffff';
                cursor.style.boxShadow = '0 0 10px #00ffff';
                cursor.style.transition = 'width 0.1s, height 0.1s';
            }
        }

        const controls = this.sceneManager.controls;
        if (!controls) return;

        // --- GESTURE CONTROL LOGIC ---

        // 1. FIST (GRAB) -> ROTATE (XY)
        if (data.gesture === "GRAB") {
            debugEl.innerText = `FIST: ROTATING`;

            // Reset zoom history
            this.lastPinchDist = undefined;

            if (this.lastX === undefined) {
                this.lastX = data.x;
                this.lastY = data.y;
                return;
            }

            const deltaX = data.x - this.lastX;
            const deltaY = data.y - this.lastY;
            this.lastX = data.x;
            this.lastY = data.y;

            const rotateSens = 2.5;

            if (Math.abs(deltaX) > 0.0001 || Math.abs(deltaY) > 0.0001) {
                if (this.sceneManager.currentGroup) {
                    this.sceneManager.currentGroup.rotation.y += deltaX * rotateSens;
                    this.sceneManager.currentGroup.rotation.x += deltaY * rotateSens;
                }
            }
        }
        // 2. POINT (☝️) -> SELECT / PAN / FLY-TO
        else if (data.gesture === "POINT") {
            debugEl.innerText = `POINT: NAVIGATING`;

            // Release rotation/throttle locks
            this.lastX = undefined;
            this.lastY = undefined;
            this.lastPinchDist = undefined;

            // --- SELECTION (Targeting) ---
            const ndcX = (data.x);
            const ndcY = (-data.y);

            this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.sceneManager.camera);

            // Find planets in the scene
            const planets = [];
            this.sceneManager.currentGroup.traverse(obj => {
                if (obj.userData && obj.userData.isPlanet) planets.push(obj);
            });

            const intersects = this.raycaster.intersectObjects(planets);

            if (intersects.length > 0) {
                const planet = intersects[0].object;

                // Visual Highlight
                if (this.hoveredPlanet && this.hoveredPlanet !== planet) {
                    this.hoveredPlanet.material.emissive.setHex(0x000000);
                }
                this.hoveredPlanet = planet;
                planet.material.emissive.setHex(0x444400);

                // Fly-To Logic
                this.selectionTime++;
                if (this.selectionTime > 30) {
                    debugEl.innerText = `TRAVELING TO: ${planet.userData.name}`;
                    const targetPos = new THREE.Vector3();
                    planet.getWorldPosition(targetPos);

                    this.sceneManager.controls.target.lerp(targetPos, 0.1);

                    const camDir = new THREE.Vector3().subVectors(targetPos, this.sceneManager.camera.position).normalize();
                    this.sceneManager.camera.position.addScaledVector(camDir, 1.0);

                    this.sceneManager.controls.update();
                }
            } else {
                // Pointing at empty space -> PANNING
                if (this.hoveredPlanet) {
                    this.hoveredPlanet.material.emissive.setHex(0x000000);
                    this.hoveredPlanet = null;
                }
                this.selectionTime = 0;

                if (this.lastX === undefined) {
                    this.lastX = data.x;
                    this.lastY = data.y;
                } else {
                    const dx = data.x - this.lastX;
                    const dy = data.y - this.lastY;
                    this.lastX = data.x;
                    this.lastY = data.y;

                    const panSpeed = 50.0;
                    const right = new THREE.Vector3();
                    const up = new THREE.Vector3();
                    this.sceneManager.camera.matrix.extractBasis(right, up, new THREE.Vector3());

                    this.sceneManager.camera.position.addScaledVector(right, -dx * panSpeed);
                    this.sceneManager.camera.position.addScaledVector(up, dy * panSpeed);
                    this.sceneManager.controls.target.addScaledVector(right, -dx * panSpeed);
                    this.sceneManager.controls.target.addScaledVector(up, dy * panSpeed);
                    this.sceneManager.controls.update();
                }
            }
        }
        // 3. IDLE + DISTANCE -> THROTTLE ZOOM
        else {
            if (data.pinch_dist !== undefined) {
                debugEl.innerText = `THROTTLE: ${data.pinch_dist.toFixed(3)}`;

                this.lastX = undefined;
                this.lastY = undefined;

                const camera = this.sceneManager.camera;
                const controls = this.sceneManager.controls;
                const dir = new THREE.Vector3();
                camera.getWorldDirection(dir);

                let throttle = 0;
                const upperThreshold = 0.12;
                const lowerThreshold = 0.06;

                if (data.pinch_dist > upperThreshold) {
                    throttle = (data.pinch_dist - upperThreshold) * 6.0;
                } else if (data.pinch_dist < lowerThreshold) {
                    throttle = (data.pinch_dist - lowerThreshold) * 12.0;
                }

                if (Math.abs(throttle) > 0.005) {
                    const distToTarget = camera.position.distanceTo(controls.target);

                    const minBaseSpeed = (throttle < 0) ? 0.5 : 0.2;

                    const distFactor = Math.min(distToTarget, 500) * 0.08;
                    let moveSpeed = (throttle * distFactor);

                    if (throttle < 0) {
                        moveSpeed = Math.min(moveSpeed, throttle * 2.0);
                    }

                    const maxSpeed = 20.0;
                    moveSpeed = Math.max(-maxSpeed, Math.min(maxSpeed, moveSpeed));

                    if (moveSpeed > 0 && moveSpeed > distToTarget * 0.8) {
                        moveSpeed = distToTarget * 0.2;
                    }

                    // SAFETY: Prevent zooming too close (clipping)
                    const minDistance = 5.0;
                    if (moveSpeed > 0 && distToTarget - moveSpeed < minDistance) {
                        moveSpeed = Math.max(0, distToTarget - minDistance);
                    }

                    camera.position.addScaledVector(dir, moveSpeed);
                    // FIXED: Don't move the target! Moving the target along with the camera results in zero zoom change.
                    // controls.target.addScaledVector(dir, moveSpeed); 
                    controls.update();
                }
            }
        }
    }
}
