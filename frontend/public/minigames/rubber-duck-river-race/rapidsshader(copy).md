/**
 * RapidsShader.js
 * WORKING rapids shader with visible white foam
 */

import * as THREE from 'three';

export const RapidsShader = {
    uniforms: {
        time: { value: 0 },
        waterColor: { value: new THREE.Color(0.1, 0.3, 0.5) },
        foamColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
        flowSpeed: { value: 2.0 },
        turbulence: { value: 1.8 },
        foamThreshold: { value: 0.6 }
    },

    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
            vUv = uv;
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform float time;
        uniform vec3 waterColor;
        uniform vec3 foamColor;
        uniform float flowSpeed;
        uniform float turbulence;
        uniform float foamThreshold;

        varying vec2 vUv;
        varying vec3 vPos;

        // Simple noise
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), f.x),
                       mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }

        void main() {
            vec2 uv = vUv * 8.0;
            float t = time * flowSpeed;

            // Multi-layer flowing turbulence for realistic rapids
            float n1 = noise(uv + vec2(t * 0.5, t * 0.3));
            float n2 = noise(uv * 2.0 + vec2(t * 1.2, t * 0.8));
            float n3 = noise(uv * 4.0 - vec2(t * 0.7, t * 1.1));
            float turbulenceNoise = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2) * turbulence;

            // Create foam with better contrast
            float foam = smoothstep(foamThreshold - 0.1, foamThreshold + 0.2, turbulenceNoise);

            // Add fast-moving streaks for directional flow
            float streak1 = smoothstep(0.35, 0.65, noise(uv * 3.0 + vec2(t * 2.5, 0.0)));
            float streak2 = smoothstep(0.4, 0.6, noise(uv * 5.0 + vec2(t * 3.0, t * 0.5)));
            foam = max(foam, max(streak1 * 0.8, streak2 * 0.6));

            // Add churning effect with rotating patterns
            float angle = t * 0.5;
            vec2 rotatedUv = vec2(
                uv.x * cos(angle) - uv.y * sin(angle),
                uv.x * sin(angle) + uv.y * cos(angle)
            );
            float churn = noise(rotatedUv * 2.0) * 0.3;
            foam = clamp(foam + churn, 0.0, 1.0);

            // Enhanced color mixing with more contrast
            vec3 color = mix(waterColor, foamColor, foam * foam); // Square for more contrast

            // Add subtle shimmer to foam
            float shimmer = sin(t * 5.0 + foam * 10.0) * 0.1 + 0.9;
            color *= shimmer;

            // Brighten overall and increase saturation
            color *= 1.4;

            gl_FragColor = vec4(color, 0.98);
        }
    `
};
