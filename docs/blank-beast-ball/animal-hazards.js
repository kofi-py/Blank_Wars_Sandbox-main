// Animal Ball Run - Hazard System
// Loads and animates 3D animal hazards

class AnimalHazardManager {
    constructor(scene, modelLoader) {
        this.scene = scene;
        this.modelLoader = modelLoader;
        this.hazards = [];
    }

    // Load animal model
    async loadAnimalModel(animalName) {
        const modelPath = `models/${animalName}.glb`;
        try {
            const model = await this.modelLoader.loadModel(modelPath, animalName);
            return model;
        } catch (error) {
            console.error(`Failed to load ${animalName}:`, error);
            return null;
        }
    }

    // Create flying alligator
    async createFlyingAlligator(x, y, z, direction = 'left', speed = 0.02) {
        const model = await this.loadAnimalModel('alligator');
        if (!model) return null;

        model.scale.set(1.5, 1.5, 1.5);
        model.position.set(x, y, z);
        model.rotation.y = direction === 'left' ? Math.PI / 2 : -Math.PI / 2;

        this.scene.add(model);

        const hazard = {
            type: 'flying_alligator',
            model: model,
            centerX: x,
            centerY: y,
            centerZ: z,
            radius: 8,
            angle: 0,
            speed: speed,
            direction: direction === 'left' ? 1 : -1,
            collisionRadius: 2,
            knockback: true // Knockback instead of instant death
        };

        this.hazards.push(hazard);
        return hazard;
    }

    // Create spinning flamingo
    async createSpinningFlamingo(x, y, z, speed = 0.03) {
        const model = await this.loadAnimalModel('flamingo');
        if (!model) return null;

        model.scale.set(2, 2, 2);
        model.position.set(x, y, z);

        this.scene.add(model);

        const hazard = {
            type: 'spinning_flamingo',
            model: model,
            x: x,
            y: y,
            z: z,
            rotationSpeed: speed,
            collisionRadius: 1.2, // Tight hitbox
            knockback: true // Knockback instead of instant death
        };

        this.hazards.push(hazard);
        return hazard;
    }

    // Create ninja starfish (projectile)
    async createNinjaStarfish(x, y, z, speed = 0.03) {
        const model = await this.loadAnimalModel('starfish');
        if (!model) return null;

        model.scale.set(1.5, 1.5, 1.5);
        model.position.set(x, y, z);

        this.scene.add(model);

        const hazard = {
            type: 'ninja_starfish',
            model: model,
            x: x,
            y: y,
            z: z,
            angle: 0,
            orbitRadius: 8, // Bigger loop for level 1
            rotationSpeed: speed,
            spinSpeed: 0.2, // Spin like a throwing star
            collisionRadius: 1.5
        };

        this.hazards.push(hazard);
        return hazard;
    }

    // Create falling cow spawner (randomly drops cows in an area)
    async createFallingCow(centerX, startY, centerZ, areaRadius = 8, minDelay = 2, maxDelay = 5) {
        const model = await this.loadAnimalModel('cow');
        if (!model) return null;

        model.scale.set(1.5, 1.5, 1.5);
        model.position.set(centerX, startY, centerZ);
        model.visible = false; // Hide until it spawns

        this.scene.add(model);

        const hazard = {
            type: 'falling_cow',
            model: model,
            velocityY: 0,
            gravity: -0.05,
            centerX: centerX,
            centerZ: centerZ,
            startY: startY,
            areaRadius: areaRadius,
            collisionRadius: 1.2, // Smaller radius - must be directly underneath
            landed: false,
            waitTime: Math.random() * (maxDelay - minDelay) * 60 + minDelay * 60, // Random initial delay
            age: 0,
            minDelay: minDelay * 60,
            maxDelay: maxDelay * 60,
            crushOnly: true // Only kill if falling, not when landed
        };

        this.hazards.push(hazard);
        return hazard;
    }

    // Update all hazards
    update() {
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const hazard = this.hazards[i];

            switch (hazard.type) {
                case 'flying_alligator':
                    // Arc movement
                    hazard.angle += hazard.speed * hazard.direction;
                    hazard.model.position.x = hazard.centerX + Math.cos(hazard.angle) * hazard.radius;
                    hazard.model.position.y = hazard.centerY + Math.sin(hazard.angle * 2) * 2;
                    hazard.model.position.z = hazard.centerZ + Math.sin(hazard.angle) * hazard.radius;

                    // Rotate to face direction of movement
                    hazard.model.rotation.y = hazard.angle + (hazard.direction > 0 ? Math.PI / 2 : -Math.PI / 2);
                    break;

                case 'spinning_flamingo':
                    // Rotate in place
                    hazard.model.rotation.y += hazard.rotationSpeed;
                    break;

                case 'ninja_starfish':
                    // Orbit in a circle
                    hazard.angle += hazard.rotationSpeed;
                    hazard.model.position.x = hazard.x + Math.cos(hazard.angle) * hazard.orbitRadius;
                    hazard.model.position.z = hazard.z + Math.sin(hazard.angle) * hazard.orbitRadius;

                    // Spin
                    hazard.model.rotation.z += hazard.spinSpeed;
                    hazard.model.rotation.y += hazard.spinSpeed * 0.5;
                    break;

                case 'falling_cow':
                    hazard.age++;

                    // Waiting to spawn
                    if (hazard.age < hazard.waitTime) {
                        hazard.model.visible = false;
                    } else if (!hazard.landed) {
                        // Spawn at random location in area
                        if (!hazard.model.visible) {
                            const randomX = hazard.centerX + (Math.random() - 0.5) * hazard.areaRadius * 2;
                            const randomZ = hazard.centerZ + (Math.random() - 0.5) * hazard.areaRadius * 2;
                            hazard.model.position.set(randomX, hazard.startY, randomZ);
                            hazard.model.visible = true;
                            hazard.velocityY = 0;
                            hazard.model.rotation.x = 0;
                        }

                        // Apply gravity
                        hazard.velocityY += hazard.gravity;
                        hazard.model.position.y += hazard.velocityY;

                        // Rotate while falling
                        hazard.model.rotation.x += 0.05;

                        // Check if landed
                        if (hazard.model.position.y < 0) {
                            hazard.model.position.y = 0;
                            hazard.landed = true;
                            hazard.landTime = hazard.age;
                        }
                    }

                    // Remove after landing and schedule next spawn
                    if (hazard.landed && hazard.age > hazard.landTime + 60) { // 1 second on ground
                        hazard.model.visible = false;
                        hazard.landed = false;
                        hazard.age = 0;
                        // Random wait time before next drop
                        hazard.waitTime = Math.random() * (hazard.maxDelay - hazard.minDelay) + hazard.minDelay;
                    }
                    break;

                case 'diving_eagle':
                    hazard.age++;

                    if (hazard.diving) {
                        // Dive down
                        hazard.velocityY -= 0.08;
                        hazard.model.position.y += hazard.velocityY;
                        hazard.model.rotation.x = Math.PI / 4; // Tilt forward

                        if (hazard.model.position.y <= 2) {
                            hazard.diving = false;
                            hazard.rising = true;
                        }
                    } else if (hazard.rising) {
                        // Rise back up
                        hazard.velocityY += 0.05;
                        hazard.model.position.y += hazard.velocityY;
                        hazard.model.rotation.x = -Math.PI / 6; // Tilt back

                        if (hazard.model.position.y >= hazard.startY) {
                            hazard.model.position.y = hazard.startY;
                            hazard.rising = false;
                            hazard.age = 0;
                            hazard.velocityY = 0;
                            hazard.model.rotation.x = 0;
                        }
                    } else if (hazard.age > hazard.waitTime) {
                        // Start diving
                        hazard.diving = true;
                        hazard.velocityY = 0;
                    }
                    break;

                case 'charging_rhino':
                    if (hazard.direction === 'horizontal') {
                        hazard.model.position.x += hazard.speed * hazard.moveDirection;

                        if (Math.abs(hazard.model.position.x - hazard.startX) > hazard.range) {
                            hazard.moveDirection *= -1;
                            hazard.model.rotation.y = hazard.moveDirection > 0 ? Math.PI / 2 : -Math.PI / 2;
                        }
                    } else {
                        hazard.model.position.z += hazard.speed * hazard.moveDirection;

                        if (Math.abs(hazard.model.position.z - hazard.startZ) > hazard.range) {
                            hazard.moveDirection *= -1;
                            hazard.model.rotation.y = hazard.moveDirection > 0 ? 0 : Math.PI;
                        }
                    }
                    break;

                case 'lava_snake':
                    // Slither in a wave pattern
                    hazard.angle += hazard.rotationSpeed;
                    hazard.model.position.x = hazard.x + Math.sin(hazard.angle) * hazard.waveRadius;
                    hazard.model.position.z = hazard.z + Math.cos(hazard.angle) * hazard.waveRadius;

                    // Undulate vertically
                    hazard.model.position.y = hazard.y + Math.sin(hazard.angle * 2) * 0.5;

                    // Rotate to face direction
                    hazard.model.rotation.y = hazard.angle + Math.PI / 2;
                    break;

                case 'sliding_penguin':
                    if (hazard.direction === 'horizontal') {
                        hazard.model.position.x += hazard.speed * hazard.moveDirection;

                        if (Math.abs(hazard.model.position.x - hazard.startX) > hazard.range) {
                            hazard.moveDirection *= -1;
                            hazard.model.rotation.y = hazard.moveDirection > 0 ? -Math.PI / 2 : Math.PI / 2;
                        }
                    } else {
                        hazard.model.position.z += hazard.speed * hazard.moveDirection;

                        if (Math.abs(hazard.model.position.z - hazard.startZ) > hazard.range) {
                            hazard.moveDirection *= -1;
                            hazard.model.rotation.y = hazard.moveDirection > 0 ? Math.PI : 0;
                        }
                    }
                    break;

                case 'roaring_polar_bear':
                    // Rotate slowly and menacingly
                    hazard.model.rotation.y += hazard.rotationSpeed;
                    break;

                case 'walrus_tusk':
                    // Rotate entire body for tusk swipe
                    hazard.angle += hazard.rotationSpeed;
                    hazard.model.rotation.y = hazard.angle;
                    break;
            }
        }
    }

    // Check collision with player
    checkPlayerCollision(playerPosition, playerRadius = 1) {
        for (const hazard of this.hazards) {
            if (hazard.type === 'falling_cow' && hazard.landed) continue;

            const distance = playerPosition.distanceTo(hazard.model.position);

            if (distance < hazard.collisionRadius + playerRadius) {
                return hazard;
            }
        }
        return null;
    }

    // === LEVEL 2 HAZARDS ===

    // Create diving eagle (swoops down periodically)
    async createDivingEagle(x, startY, z, diveDelay = 3, riseTime = 4) {
        const model = await this.loadAnimalModel('eagle');
        if (!model) return null;

        model.scale.set(2, 2, 2);
        model.position.set(x, startY, z);
        model.rotation.y = Math.PI; // Face forward

        this.scene.add(model);

        const hazard = {
            type: 'diving_eagle',
            model: model,
            x: x,
            startY: startY,
            z: z,
            velocityY: 0,
            diving: false,
            rising: false,
            waitTime: diveDelay * 60,
            riseTime: riseTime * 60,
            age: 0,
            collisionRadius: 2
        };

        this.hazards.push(hazard);
        return hazard;
    }

    // Create charging rhino (charges back and forth)
    async createChargingRhino(x, y, z, direction = 'horizontal', speed = 0.1) {
        const model = await this.loadAnimalModel('rhino');
        if (!model) return null;

        model.scale.set(1.8, 1.8, 1.8);
        model.position.set(x, y, z);

        this.scene.add(model);

        const hazard = {
            type: 'charging_rhino',
            model: model,
            startX: x,
            startZ: z,
            y: y,
            direction: direction,
            speed: speed,
            range: 10,
            moveDirection: 1,
            collisionRadius: 2.5,
            knockback: true
        };

        this.hazards.push(hazard);
        return hazard;
    }

    // Create lava snake (slithers in a pattern)
    async createLavaSnake(x, y, z, speed = 0.02) {
        const model = await this.loadAnimalModel('snake');
        if (!model) return null;

        model.scale.set(2, 2, 2);
        model.position.set(x, y, z);

        this.scene.add(model);

        const hazard = {
            type: 'lava_snake',
            model: model,
            x: x,
            y: y,
            z: z,
            angle: 0,
            waveRadius: 4,
            rotationSpeed: speed,
            collisionRadius: 1.8
        };

        this.hazards.push(hazard);
        return hazard;
    }

    // === LEVEL 3 HAZARDS ===

    // Create sliding penguin (slides back and forth fast)
    async createSlidingPenguin(x, y, z, direction = 'horizontal', speed = 0.15) {
        const model = await this.loadAnimalModel('penguin');
        if (!model) return null;

        model.scale.set(1.5, 1.5, 1.5);
        model.position.set(x, y, z);

        this.scene.add(model);

        const hazard = {
            type: 'sliding_penguin',
            model: model,
            startX: x,
            startZ: z,
            y: y,
            direction: direction,
            speed: speed,
            range: 12,
            moveDirection: 1,
            collisionRadius: 1.5,
            knockback: true
        };

        this.hazards.push(hazard);
        return hazard;
    }

    // Create roaring polar bear (stationary but deadly)
    async createRoaringPolarBear(x, y, z, rotationSpeed = 0.01) {
        const model = await this.loadAnimalModel('polar_bear');
        if (!model) return null;

        model.scale.set(2.5, 2.5, 2.5);
        model.position.set(x, y, z);

        this.scene.add(model);

        const hazard = {
            type: 'roaring_polar_bear',
            model: model,
            x: x,
            y: y,
            z: z,
            rotationSpeed: rotationSpeed,
            collisionRadius: 3 // Large and deadly
        };

        this.hazards.push(hazard);
        return hazard;
    }

    // Create walrus tusk swipe (rotates tusks in circle)
    async createWalrusTusk(x, y, z, speed = 0.025) {
        const model = await this.loadAnimalModel('walrus');
        if (!model) return null;

        model.scale.set(2, 2, 2);
        model.position.set(x, y, z);

        this.scene.add(model);

        const hazard = {
            type: 'walrus_tusk',
            model: model,
            x: x,
            y: y,
            z: z,
            angle: 0,
            rotationSpeed: speed,
            collisionRadius: 2.5
        };

        this.hazards.push(hazard);
        return hazard;
    }

    // Clear all hazards
    clear() {
        for (const hazard of this.hazards) {
            this.scene.remove(hazard.model);
        }
        this.hazards = [];
    }
}
