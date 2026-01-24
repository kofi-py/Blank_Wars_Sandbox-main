/**
 * WaterfallShader.js
 * WORKING waterfall shader with flowing water
 */

import * as THREE from 'three';

export const WaterfallShader = {
    uniforms: {
        time: { value: 0 },
        waterColor: { value: new THREE.Color(0.4, 0.7, 1.0) },
        foamColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
        flowSpeed: { value: 3.0 },
        opacity: { value: 0.9 }
    },

    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform float time;
        uniform vec3 waterColor;
        uniform vec3 foamColor;
        uniform float flowSpeed;
        uniform float opacity;

        varying vec2 vUv;

        float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
            vec2 uv = vUv;
            uv.y += time * flowSpeed * 0.3;

            // Vertical flow noise
            float n = noise(vec2(uv.x * 10.0, uv.y * 5.0));
            float foamLine = smoothstep(0.45, 0.55, fract(uv.y * 10.0 + n));

            // Add horizontal variation
            float sideFoam = smoothstep(0.0, 0.1, uv.x) + smoothstep(0.9, 1.0, uv.x);
            float foam = max(foamLine, sideFoam * 0.6);

            vec3 color = mix(waterColor, foamColor, foam);
            color *= 1.1;

            gl_FragColor = vec4(color, opacity);
        }
    `
};
