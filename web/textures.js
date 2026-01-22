import * as THREE from 'three';

export class TextureGenerator {
    constructor() { }

    createPlanetTexture(type, color1, color2) {
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Fill Background
        ctx.fillStyle = '#' + color1.getHexString();
        ctx.fillRect(0, 0, size, size);

        if (type === 'api_gas') {
            this.drawGasGiant(ctx, size, color1, color2);
        } else if (type === 'api_rocky') {
            this.drawRocky(ctx, size, color1, color2);
        } else if (type === 'api_sun') {
            this.drawSun(ctx, size, color1, color2);
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    // Perlin-ish noise simplified
    noise(x, y) {
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }

    drawGasGiant(ctx, size, c1, c2) {
        // Horizontal bands
        const gradient = ctx.createLinearGradient(0, 0, 0, size);
        gradient.addColorStop(0, '#' + c1.getHexString());
        gradient.addColorStop(0.2, '#' + c2.getHexString());
        gradient.addColorStop(0.4, '#' + c1.getHexString());
        gradient.addColorStop(0.6, '#' + c2.getHexString());
        gradient.addColorStop(0.8, '#' + c1.getHexString());
        gradient.addColorStop(1, '#' + c2.getHexString());

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Add turbulence
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = Math.random() < 0.5 ? '#000' : '#fff';
            ctx.fillRect(0, Math.random() * size, size, Math.random() * 20);
        }
    }

    drawRocky(ctx, size, c1, c2) {
        // Craters and noise
        ctx.fillStyle = '#' + c2.getHexString();
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = Math.random() * 3;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Large Craters
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = Math.random() * 50 + 10;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#000';
            ctx.fill();
        }
    }

    drawSun(ctx, size, c1, c2) {
        // Plasma noise
        for (let i = 0; i < 3000; i++) {
            ctx.fillStyle = Math.random() < 0.5 ? '#ffaa00' : '#ffff00';
            ctx.globalAlpha = 0.1;
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = Math.random() * 60;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
