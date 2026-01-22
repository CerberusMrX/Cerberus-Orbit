import * as THREE from 'three';

export function createCosmicWeb() {
    const group = new THREE.Group();

    // 1. Nodes (Galax Clusters)
    const nodeCount = 500;
    const nodeGeometry = new THREE.BufferGeometry();
    const nodePositions = new Float32Array(nodeCount * 3);
    const boxSize = 200;

    for (let i = 0; i < nodeCount; i++) {
        nodePositions[i * 3] = (Math.random() - 0.5) * boxSize;
        nodePositions[i * 3 + 1] = (Math.random() - 0.5) * boxSize;
        nodePositions[i * 3 + 2] = (Math.random() - 0.5) * boxSize;
    }

    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    const nodeMaterial = new THREE.PointsMaterial({
        color: 0x00d2ff,
        size: 1.5,
        sizeAttenuation: true
    });
    const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
    group.add(nodes);

    // 2. Filaments (Lines)
    // Connect nodes potentially with lines if they are close
    const positions = [];
    const maxDist = 30; // Connection distance

    for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
            const x1 = nodePositions[i * 3];
            const y1 = nodePositions[i * 3 + 1];
            const z1 = nodePositions[i * 3 + 2];

            const x2 = nodePositions[j * 3];
            const y2 = nodePositions[j * 3 + 1];
            const z2 = nodePositions[j * 3 + 2];

            const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2));

            if (dist < maxDist) {
                positions.push(x1, y1, z1);
                positions.push(x2, y2, z2);
            }
        }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x4444ff,
        opacity: 0.2,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lines);

    // Rotate slowly
    group.userData.update = (time) => {
        group.rotation.y = time * 0.02;
    };

    return group;
}
