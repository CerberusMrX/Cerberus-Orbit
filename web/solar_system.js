import * as THREE from 'three';

// Texture mapping for photorealistic planets
// Local textures for Sun, Mercury, Venus, Earth, Mars, Jupiter
// Online textures for Saturn, Uranus, Neptune
const TEXTURE_MAP = {
    'Mercury': 'mercury.png',
    'Venus': 'venus.png',
    'Earth': 'earth.png',
    'Mars': 'mars.png',
    'Jupiter': 'jupiter.png',
    'Saturn': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/saturn_1024.jpg',
    'Uranus': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/uranus_1024.jpg',
    'Neptune': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/neptune_1024.jpg'
};

// Data
// Data
const SUN_DATA = {
    name: "The Sun",
    size: 695.7, // Visual size for details
    dist: 0,
    color: 0xFFAA00,
    desc: "The star at the center of our solar system, providing life-sustaining energy to Earth.",
    temp: "5,500°C (Surface)",
    atmosphere: "Hydrogen, Helium",
    moons: "0",
    gravity: "274 m/s²",
    day: "25-35 Earth Days"
};

const PLANET_DATA = [
    {
        name: "Mercury", size: 2.4, dist: 25, color: 0xA5A5A5, speed: 0.02,
        desc: "The smallest planet in our solar system and closest to the Sun.",
        temp: "-173°C to 427°C", atmosphere: "Thin (O2, Na, H2)", moons: "0", gravity: "3.7 m/s²", day: "58.6 Earth Days"
    },
    {
        name: "Venus", size: 6.0, dist: 40, color: 0xE3BB76, speed: 0.015,
        desc: "Spinning in the opposite direction to most planets, Venus is the hottest planet.",
        temp: "462°C", atmosphere: "Thick CO2", moons: "0", gravity: "8.87 m/s²", day: "116.8 Earth Days"
    },
    {
        name: "Earth", size: 6.3, dist: 60, color: 0x2233FF, speed: 0.01,
        desc: "Our home planet is the only place we know of so far that's inhabited by living things.",
        temp: "-88°C to 58°C", atmosphere: "Nitrogen, Oxygen", moons: "1", gravity: "9.81 m/s²", day: "24 Hours"
    },
    {
        name: "Mars", size: 3.3, dist: 80, color: 0xDD4422, speed: 0.008,
        desc: "Mars is a dusty, cold, desert world with a very thin atmosphere.",
        temp: "-153°C to 20°C", atmosphere: "Thin CO2", moons: "2", gravity: "3.71 m/s²", day: "24.6 Hours"
    },
    {
        name: "Jupiter", size: 69.9, dist: 130, color: 0xD9A07E, speed: 0.004,
        desc: "Jupiter is more than twice as massive as the other planets of our solar system combined.",
        temp: "-110°C", atmosphere: "Hydrogen, Helium", moons: "95", gravity: "24.79 m/s²", day: "9.9 Hours"
    },
    {
        name: "Saturn", size: 58.2, dist: 190, color: 0xFCDD9C, speed: 0.003, ring: true,
        desc: "Adorned with a dazzling, complex system of icy rings.",
        temp: "-140°C", atmosphere: "Hydrogen, Helium", moons: "146", gravity: "10.44 m/s²", day: "10.7 Hours"
    },
    {
        name: "Uranus", size: 25.3, dist: 250, color: 0x4FD0E7, speed: 0.002,
        desc: "Uranus rotates at a nearly 90-degree angle from the plane of its orbit.",
        temp: "-195°C", atmosphere: "Hydrogen, Helium, Methane", moons: "27", gravity: "8.69 m/s²", day: "17.2 Hours"
    },
    {
        name: "Neptune", size: 24.6, dist: 300, color: 0x2244FF, speed: 0.001,
        desc: "Neptune is dark, cold and whipped by supersonic winds.",
        temp: "-201°C", atmosphere: "Hydrogen, Helium, Methane", moons: "14", gravity: "11.15 m/s²", day: "16.1 Hours"
    }
];

export function createSolarSystem() {
    const group = new THREE.Group();
    const textureLoader = new THREE.TextureLoader();

    // --- SUN ---
    const sunTex = textureLoader.load('textures/sun.png');
    const sunGeo = new THREE.SphereGeometry(15, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.userData = { ...SUN_DATA, isPlanet: true }; // Treat as planet for details panel

    // Multi-layered Sun Corona
    const glow1Geo = new THREE.SphereGeometry(17, 64, 64);
    const glow1Mat = new THREE.MeshBasicMaterial({
        color: 0xFFAA00,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide
    });
    const glow1 = new THREE.Mesh(glow1Geo, glow1Mat);
    sun.add(glow1);

    const glow2Geo = new THREE.SphereGeometry(20, 64, 64);
    const glow2Mat = new THREE.MeshBasicMaterial({
        color: 0xFF6600,
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide
    });
    const glow2 = new THREE.Mesh(glow2Geo, glow2Mat);
    sun.add(glow2);

    const glow3Geo = new THREE.SphereGeometry(24, 64, 64);
    const glow3Mat = new THREE.MeshBasicMaterial({
        color: 0xFF4400,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const glow3 = new THREE.Mesh(glow3Geo, glow3Mat);
    sun.add(glow3);

    const sunLight = new THREE.PointLight(0xffffff, 3.5, 1500);
    sun.add(sunLight);

    group.add(sun);

    // --- PLANETS ---
    PLANET_DATA.forEach(data => {
        const orbitGroup = new THREE.Group();
        group.add(orbitGroup);

        const r = data.size * 0.2;
        const geometry = new THREE.SphereGeometry(r, 64, 64);

        // Load realistic texture or fallback to solid color
        let material;
        const texturePath = TEXTURE_MAP[data.name];

        if (texturePath) {
            // Determine if it's a URL (starts with http) or local path
            const textureUrl = texturePath.startsWith('http') ? texturePath : `textures/${texturePath}`;
            const texture = textureLoader.load(textureUrl);
            material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.7,
                metalness: 0.2,
                emissive: new THREE.Color(data.color),
                emissiveIntensity: 0.15
            });
        } else {
            // Fallback for planets without textures
            material = new THREE.MeshStandardMaterial({
                color: data.color,
                roughness: 0.7,
                metalness: 0.2,
                emissive: new THREE.Color(data.color),
                emissiveIntensity: 0.2
            });
        }

        const planet = new THREE.Mesh(geometry, material);
        planet.position.x = data.dist;
        planet.userData = { ...data, isPlanet: true, radius: r };
        orbitGroup.add(planet);

        // Ring (Saturn)
        if (data.ring) {
            const ringGeo = new THREE.RingGeometry(r * 1.5, r * 2.5, 64);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0xCCAA88,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9,
                emissive: 0x664422,
                emissiveIntensity: 0.3
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            planet.add(ring);
        }

        // Glowing Orbital Path
        const orbitPoints = [];
        const segments = 256;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            orbitPoints.push(new THREE.Vector3(
                Math.cos(angle) * data.dist,
                0,
                Math.sin(angle) * data.dist
            ));
        }
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0xaaaaff,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        group.add(orbitLine);

        orbitGroup.userData.update = (time) => {
            orbitGroup.rotation.y = time * data.speed;
            planet.rotation.y += 0.005;
        };
    });

    return group;
}
