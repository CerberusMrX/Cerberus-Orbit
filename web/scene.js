import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { GestureHandler } from './gestures.js';
import { createSolarSystem } from './solar_system.js';
import { createGalaxy } from './galaxy.js';
import { createCosmicWeb } from './cosmic_web.js';
import { createStarfield } from './starfield.js';

class SceneManager {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.mode = 'SOLAR'; // SOLAR, GALAXY, COSMIC

        this.setupScene();
        this.setupPostProcessing();

        this.gestureHandler = new GestureHandler(this);
        this.gestureHandler.connect();

        this.raycaster = new THREE.Raycaster();

        this.clock = new THREE.Clock();

        // Remove loading text
        document.getElementById('loading').style.opacity = 0;

        this.animate();

        // Window Resize
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Global access for UI buttons
        window.switchMode = (mode) => this.switchMode(mode);
    }

    setupScene() {
        this.scene = new THREE.Scene();

        // Nebula gradient background
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, '#0a0a15');
        gradient.addColorStop(0.5, '#1a1a3a');
        gradient.addColorStop(1, '#050510');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        const bgTexture = new THREE.CanvasTexture(canvas);
        this.scene.background = bgTexture;

        this.scene.fog = new THREE.FogExp2(0x050510, 0.00008);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000);
        this.camera.position.set(0, 50, 100);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Fallback controls (Mouse)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
        this.scene.add(ambientLight);

        // Initial Content
        this.currentGroup = new THREE.Group();
        this.scene.add(this.currentGroup);

        // Add persistent starfield
        this.starfield = createStarfield();
        this.scene.add(this.starfield);

        this.loadModeContent('SOLAR');
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2.0, 0.5, 0.7);
        bloomPass.threshold = 0.05;
        bloomPass.strength = 2.0;
        bloomPass.radius = 0.8;
        this.composer.addPass(bloomPass);
    }

    clearScene() {
        // Dispose geometries and materials to avoid leaks
        while (this.currentGroup.children.length > 0) {
            const object = this.currentGroup.children[0];
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
            this.currentGroup.remove(object);
        }
    }

    loadModeContent(mode) {
        this.clearScene();

        // Reset Camera
        this.camera.position.set(0, 50, 100);
        this.controls.target.set(0, 0, 0);

        if (mode === 'SOLAR') {
            // Simple black background
            this.scene.background = new THREE.Color(0x000000);
            this.scene.fog = new THREE.FogExp2(0x000000, 0.00008);

            const system = createSolarSystem();
            this.currentGroup.add(system);
        } else if (mode === 'GALAXY') {
            // Simple black background for Galaxy
            this.scene.background = new THREE.Color(0x000000);
            this.scene.fog = new THREE.FogExp2(0x000000, 0.00005);

            const galaxy = createGalaxy();
            this.currentGroup.add(galaxy);
            this.camera.position.set(0, 100, 200);
        } else if (mode === 'COSMIC') {
            // Simple black background for Cosmic Web
            this.scene.background = new THREE.Color(0x000000);
            this.scene.fog = new THREE.FogExp2(0x000000, 0.00003);

            const web = createCosmicWeb();
            this.currentGroup.add(web);
        }

        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active-mode'));
    }

    switchMode(newMode) {
        console.log("Switching to", newMode);
        this.mode = newMode;
        this.loadModeContent(newMode);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    updateGestureTransforms(data) {
        // data: { x, y, z, pinch_dist, gesture }

        // Example: Orbit camera based on hand x/y
        if (data.is_tracking) {
            // Determine interaction based on gesture type
            if (data.gesture === "PINCH") {
                // Zoom
                // Move camera forward/backward
                const zoomSpeed = 2.0;
                // Simple approach: move camera along view vector
                const vec = new THREE.Vector3();
                this.camera.getWorldDirection(vec);

                // If pinch is tight (small dist), maybe steady?
                // Actually usually pinch drag = zoom. 
                // Let's us Z movement for zoom as per requirements: "Hand depth (Z movement) → Scale universe"
                // But requirements also said "Pinch → Zoom in/out"

                // Let's use Pinch for precise scaling? Or Z for dolly.
                // Let's implement Requirements: "Pinch -> Zoom in/out"

                // We need a state to track pinch delta.
                // For now, let's map Hand Z to Camera Zoom (Dolly)

                // Mapping Hand Z (-0.1 to 0.1 approx) to Camera movement
                // this.camera.position.z += data.z * 1.0; 
            } else if (data.gesture === "NAVIGATE") {
                // Rotate Scene
                // OrbitControls usually handles this, we can override or manipulate spherical coords

                // Map Hand X/Y to Rotation
                // data.x is -1 to 1.
                const rotSpeed = 0.05;
                if (Math.abs(data.x) > 0.1) {
                    this.scene.rotation.y += data.x * rotSpeed;
                }
                if (Math.abs(data.y) > 0.1) {
                    this.scene.rotation.x += data.y * rotSpeed;
                }
            }
        }
    }

    checkInteractions() {
        if (this.mode !== 'SOLAR') {
            document.getElementById('details-panel').style.opacity = 0;
            return;
        }

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // Flatten integration: traverse group to find planets
        // Note: currentGroup has children which are Groups (PlanetPivot), inside those are Meshes (Planet)
        // We can use recursive intersect
        const intersects = this.raycaster.intersectObjects(this.currentGroup.children, true);

        let found = false;
        for (let i = 0; i < intersects.length; i++) {
            if (intersects[i].object.userData && intersects[i].object.userData.isPlanet) {
                found = true;
                const data = intersects[i].object.userData;
                this.updateDetailsPanel(data);
                break;
            }
        }

        if (!found) {
            document.getElementById('details-panel').style.opacity = 0;
        }
    }

    updateDetailsPanel(data) {
        document.getElementById('details-panel').style.opacity = 1;
        document.getElementById('detail-title').innerText = data.name;
        document.getElementById('detail-desc').innerText = data.desc;

        // Sun or Planet specific distance display
        if (data.name === "The Sun") {
            document.getElementById('detail-dist').innerText = "CENTER";
            document.getElementById('detail-size').innerText = "1,392,700 KM";
        } else {
            document.getElementById('detail-dist').innerText = data.dist + " M KM";
            document.getElementById('detail-size').innerText = Math.round(data.size * 1000) + " KM";
        }

        // New fields
        document.getElementById('detail-temp').innerText = data.temp || "N/A";
        document.getElementById('detail-atmos').innerText = data.atmosphere || "N/A";
        document.getElementById('detail-gravity').innerText = data.gravity || "N/A";
        document.getElementById('detail-day').innerText = data.day || "N/A";
        document.getElementById('detail-moons').innerText = data.moons || "0";
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // Animate Scene Objects
        if (this.currentGroup) {
            this.currentGroup.children.forEach(child => {
                if (child.userData.update) {
                    child.userData.update(time);
                }
            });
        }

        // Animate Starfield
        if (this.starfield && this.starfield.userData.update) {
            this.starfield.userData.update(time);
        }

        this.checkInteractions();

        this.controls.update(); // Damping
        this.composer.render();

        // Update FPS HUD
        document.getElementById('fps-counter').innerText = 'FPS: ' + Math.round(1 / delta);
    }
}

// Start
new SceneManager();
