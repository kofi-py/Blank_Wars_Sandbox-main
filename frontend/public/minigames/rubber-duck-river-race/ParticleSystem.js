/**
 * ParticleSystem.js
 * GPU-accelerated particle system for water spray, mist, and splashes
 */

import * as THREE from 'three';

export class WaterParticleSystem {
    constructor(renderer, particleCount = 2000) {
        this.renderer = renderer;
        this.particleCount = particleCount;

        // Create particle geometry
        this.geometry = new THREE.BufferGeometry();

        // Particle attributes
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const lifetimes = new Float32Array(particleCount);
        const sizes = new Float32Array(particleCount);

        // Initialize particles
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // Start positions (will be updated)
            positions[i3] = 0;
            positions[i3 + 1] = 0;
            positions[i3 + 2] = 0;

            // Random velocities
            velocities[i3] = (Math.random() - 0.5) * 2;
            velocities[i3 + 1] = Math.random() * 3 + 1;
            velocities[i3 + 2] = (Math.random() - 0.5) * 2;

            // Lifetime (0 = dead, 1 = just spawned)
            lifetimes[i] = Math.random();

            // Random sizes
            sizes[i] = Math.random() * 0.3 + 0.1;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        this.geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Create particle material with custom shader
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0xddffff) },
                particleTexture: { value: this.createParticleTexture() }
            },
            vertexShader: `
                attribute float lifetime;
                attribute float size;

                varying float vLifetime;

                void main() {
                    vLifetime = lifetime;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * lifetime;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform sampler2D particleTexture;

                varying float vLifetime;

                void main() {
                    vec4 texColor = texture2D(particleTexture, gl_PointCoord);

                    // Fade out over lifetime
                    float alpha = texColor.a * vLifetime * 0.6;

                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(this.geometry, this.material);

        // Physics constants
        this.gravity = -9.8;
        this.drag = 0.98;

        // Emitter properties
        this.emitterPosition = new THREE.Vector3(0, 0, 0);
        this.emissionRate = 50; // particles per second
        this.accumulatedTime = 0;
    }

    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Create radial gradient for soft particle
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    setEmitter(position, direction = new THREE.Vector3(0, 1, 0), spread = 1.0) {
        this.emitterPosition.copy(position);
        this.emitterDirection = direction.normalize();
        this.emitterSpread = spread;
    }

    emit(count = 1) {
        const positions = this.geometry.attributes.position.array;
        const velocities = this.geometry.attributes.velocity.array;
        const lifetimes = this.geometry.attributes.lifetime.array;
        const sizes = this.geometry.attributes.size.array;

        for (let emitted = 0; emitted < count; emitted++) {
            // Find dead particle
            for (let i = 0; i < this.particleCount; i++) {
                if (lifetimes[i] <= 0) {
                    const i3 = i * 3;

                    // Reset position to emitter
                    positions[i3] = this.emitterPosition.x;
                    positions[i3 + 1] = this.emitterPosition.y;
                    positions[i3 + 2] = this.emitterPosition.z;

                    // Set velocity with spread
                    const spreadX = (Math.random() - 0.5) * this.emitterSpread;
                    const spreadY = (Math.random() - 0.5) * this.emitterSpread * 0.5;
                    const spreadZ = (Math.random() - 0.5) * this.emitterSpread;

                    velocities[i3] = this.emitterDirection.x * 2 + spreadX;
                    velocities[i3 + 1] = this.emitterDirection.y * 3 + spreadY + 1;
                    velocities[i3 + 2] = this.emitterDirection.z * 2 + spreadZ;

                    // Reset lifetime
                    lifetimes[i] = 1.0;

                    // Random size
                    sizes[i] = Math.random() * 0.3 + 0.1;

                    break;
                }
            }
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.velocity.needsUpdate = true;
        this.geometry.attributes.lifetime.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
    }

    update(deltaTime) {
        const positions = this.geometry.attributes.position.array;
        const velocities = this.geometry.attributes.velocity.array;
        const lifetimes = this.geometry.attributes.lifetime.array;

        // Update each particle
        for (let i = 0; i < this.particleCount; i++) {
            if (lifetimes[i] > 0) {
                const i3 = i * 3;

                // Apply gravity
                velocities[i3 + 1] += this.gravity * deltaTime;

                // Apply drag
                velocities[i3] *= this.drag;
                velocities[i3 + 1] *= this.drag;
                velocities[i3 + 2] *= this.drag;

                // Update position
                positions[i3] += velocities[i3] * deltaTime;
                positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
                positions[i3 + 2] += velocities[i3 + 2] * deltaTime;

                // Decay lifetime
                lifetimes[i] -= deltaTime * 0.5;

                // Kill particle if below ground
                if (positions[i3 + 1] < 0) {
                    lifetimes[i] = 0;
                }
            }
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.velocity.needsUpdate = true;
        this.geometry.attributes.lifetime.needsUpdate = true;

        // Continuous emission
        this.accumulatedTime += deltaTime;
        const particlesToEmit = Math.floor(this.accumulatedTime * this.emissionRate);
        if (particlesToEmit > 0) {
            this.emit(particlesToEmit);
            this.accumulatedTime -= particlesToEmit / this.emissionRate;
        }

        // Update time uniform
        this.material.uniforms.time.value += deltaTime;
    }

    getMesh() {
        return this.particles;
    }
}

// Factory function for creating splash systems
export function createSplashSystem(renderer, position) {
    const system = new WaterParticleSystem(renderer, 500);
    system.setEmitter(position, new THREE.Vector3(0, 1, 0), 2.0);
    system.emissionRate = 100;
    return system;
}

// Factory function for creating mist systems
export function createMistSystem(renderer, position) {
    const system = new WaterParticleSystem(renderer, 1000);
    system.setEmitter(position, new THREE.Vector3(0, 0.5, -0.3), 3.0);
    system.emissionRate = 80;
    system.gravity = -2; // Lighter particles
    return system;
}

// Factory function for creating spray systems (rapids/waterfalls)
export function createSpraySystem(renderer, position) {
    const system = new WaterParticleSystem(renderer, 1500);
    system.setEmitter(position, new THREE.Vector3(0, 1, 0), 2.5);
    system.emissionRate = 120;
    return system;
}
