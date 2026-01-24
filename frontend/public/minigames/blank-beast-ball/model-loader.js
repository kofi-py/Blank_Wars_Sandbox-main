// GLB Model Loader and Animation System
const MODEL_CDN_BASE = 'https://cdn.jsdelivr.net/gh/Green003-CPAIOS/blank-wars-models@main/minigames/blank-beast-ball/';

class ModelLoader {
    constructor() {
        this.loader = new THREE.GLTFLoader();

        // Setup DRACOLoader for compressed models
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/libs/draco/');
        this.loader.setDRACOLoader(dracoLoader);

        this.loadedModels = {};
        this.mixers = []; // Animation mixers
    }

    // Load a GLB model with timeout
    loadModel(modelPath, characterId) {
        return new Promise((resolve, reject) => {
            console.log(`Loading model: ${modelPath}`);

            // Add timeout to catch hanging loads
            const timeout = setTimeout(() => {
                console.error(`⏰ TIMEOUT loading ${characterId} after 30s`);
                reject(new Error(`Timeout loading ${characterId}`));
            }, 30000);

            this.loader.load(
                modelPath,
                (gltf) => {
                    clearTimeout(timeout);
                    const model = gltf.scene;
                    model.userData.animations = gltf.animations;

                    // Store for reuse
                    this.loadedModels[characterId] = {
                        scene: model,
                        animations: gltf.animations
                    };

                    console.log(`✅ Loaded ${characterId}`, gltf.animations.length, 'animations');
                    resolve(model);
                },
                (progress) => {
                    // Only log every 25% to reduce spam
                    if (progress.total > 0) {
                        const percent = Math.floor(progress.loaded / progress.total * 100);
                        if (percent % 25 === 0) {
                            console.log(`Loading ${characterId}: ${percent}%`);
                        }
                    } else {
                        // Log loaded bytes when total is unknown
                        console.log(`Loading ${characterId}: ${(progress.loaded / 1024).toFixed(0)}KB loaded`);
                    }
                },
                (error) => {
                    clearTimeout(timeout);
                    console.error(`Failed to load ${characterId}:`, error);
                    reject(error);
                }
            );
        });
    }

    // Create player character from GLB model
    async createPlayerCharacter(characterId, selectedCharacter, scene) {
        try {
            // For Achilles, load ONE model and all animations onto it (like test environment)
            if (characterId === 'achilles') {
                // Load the idle model as the base (using v4 - smaller file size for CDN)
                const model = await this.loadModel(MODEL_CDN_BASE + 'achilles_v4_idle.glb', 'achilles_idle');

                // Scale it
                const scaleFactor = 2.5;
                model.scale.set(scaleFactor, scaleFactor, scaleFactor);

                // Position higher so feet match physics collision
                model.position.set(0, 0.5, 0);
                model.rotation.y = Math.PI;

                // Enable shadows
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                const playerGroup = new THREE.Group();
                playerGroup.add(model);
                playerGroup.userData.model = model;
                playerGroup.userData.characterId = characterId;

                // Create ONE mixer on the model
                const mixer = new THREE.AnimationMixer(model);
                this.mixers.push(mixer);

                // Load all animation clips onto this ONE mixer
                const idleAnim = this.loadedModels['achilles_idle'].animations[0];
                const idleAction = mixer.clipAction(idleAnim);

                // Load run animation and add to same mixer (using v4 - smaller file size for CDN)
                await this.loadModel(MODEL_CDN_BASE + 'achilles_v4_run.glb', 'achilles_run');
                const runAnim = this.loadedModels['achilles_run'].animations[0];
                const runAction = mixer.clipAction(runAnim);

                // Load jump animation
                await this.loadModel(MODEL_CDN_BASE + 'achilles_v4_jump.glb', 'achilles_jump');
                const jumpAnim = this.loadedModels['achilles_jump'].animations[0];
                const jumpAction = mixer.clipAction(jumpAnim);
                jumpAction.setLoop(THREE.LoopOnce); // Jump plays once, not looping
                jumpAction.clampWhenFinished = true; // Hold last frame until we switch
                // Speed up animation to fit in-game jump duration (~0.5s jump, 3.7s animation)
                jumpAction.timeScale = 5.0;
                console.log('🏋️ Jump animation loaded:', jumpAnim?.name, 'duration:', jumpAnim?.duration, 'timeScale:', jumpAction.timeScale);

                // Store actions for switching (idle, run, and jump)
                playerGroup.userData.mixer = mixer;
                playerGroup.userData.actions = {
                    idle: idleAction,
                    run: runAction,
                    jump: jumpAction
                };
                playerGroup.userData.currentAnimState = 'idle';

                // Start with idle
                idleAction.play();
                playerGroup.userData.currentAction = idleAction;

                scene.add(playerGroup);
                return playerGroup;

            } else {
                // Original code for other characters
                const modelPath = MODEL_CDN_BASE + `${characterId}.glb`;
                const model = await this.loadModel(modelPath, characterId);

                model.scale.set(2, 2, 2);
                model.position.set(0, 1, 0);
                model.rotation.y = Math.PI;

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                const playerGroup = new THREE.Group();
                playerGroup.add(model);
                playerGroup.userData.model = model;
                playerGroup.userData.characterId = characterId;

                if (this.loadedModels[characterId].animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(model);
                    this.mixers.push(mixer);
                    const idleAnim = this.loadedModels[characterId].animations.find(a =>
                        a.name.toLowerCase().includes('idle') ||
                        a.name.toLowerCase().includes('run')
                    );
                    if (idleAnim) {
                        const action = mixer.clipAction(idleAnim);
                        action.play();
                        playerGroup.userData.mixer = mixer;
                        playerGroup.userData.currentAction = action;
                    }
                }

                scene.add(playerGroup);
                return playerGroup;
            }

        } catch (error) {
            console.error(`Failed to load character model, using fallback`);
            return this.createFallbackPlayer(selectedCharacter, scene);
        }
    }

    // Fallback to basic shapes if model fails to load
    createFallbackPlayer(selectedCharacter, scene) {
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 16);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: selectedCharacter.color,
            shininess: 30
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.position.y = 0.75;

        const headGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        const headMaterial = new THREE.MeshPhongMaterial({
            color: selectedCharacter.accentColor,
            shininess: 50
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.castShadow = true;
        head.position.y = 1.8;

        const player = new THREE.Group();
        player.add(body);
        player.add(head);
        player.userData.isFallback = true;

        scene.add(player);
        return player;
    }

    // Create animated alligator
    async createAlligator(platformX, platformY, platformZ, startSide, speed, offset, scene) {
        const modelPath = MODEL_CDN_BASE + 'alligator.glb';

        try {
            const model = await this.loadModel(modelPath, 'alligator');

            // Clone the model for multiple instances
            const gatorModel = model.clone();
            gatorModel.scale.set(0.8, 0.8, 0.8);

            // Enable shadows
            gatorModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                }
            });

            const gator = new THREE.Group();
            gator.add(gatorModel);

            // Start position
            const startX = startSide === 'left' ? -8 : 8;
            gator.position.set(platformX + startX, platformY + 2, platformZ);
            gator.rotation.y = startSide === 'left' ? 0 : Math.PI;

            // Setup chomping animation if available
            if (this.loadedModels['alligator'].animations.length > 0) {
                const mixer = new THREE.AnimationMixer(gatorModel);
                this.mixers.push(mixer);

                const chompAnim = this.loadedModels['alligator'].animations[0];
                const action = mixer.clipAction(chompAnim);
                action.play();
                gator.userData.mixer = mixer;
            }

            scene.add(gator);
            return gator;

        } catch (error) {
            console.error('Failed to load alligator model, using fallback');
            return null; // Will use the basic gator we already have
        }
    }

    // Update all animations
    update(delta) {
        this.mixers.forEach(mixer => {
            if (mixer) mixer.update(delta);
        });
    }

    // Update player animation based on movement
    updatePlayerAnimation(player, isMoving, isJumping = false) {
        // For Achilles with action-based animations
        if (player.userData.actions) {
            let targetState = 'idle';

            // Priority: jump > run > idle
            if (isJumping && player.userData.actions.jump) {
                targetState = 'jump';
            } else if (isMoving) {
                targetState = 'run';
            }

            // Switch animations if state changed
            if (player.userData.currentAnimState !== targetState) {
                const currentAction = player.userData.currentAction;
                const newAction = player.userData.actions[targetState];

                console.log(`🔄 Animation switch: ${player.userData.currentAnimState} → ${targetState}`,
                    'hasJumpAction:', !!player.userData.actions.jump,
                    'newAction:', !!newAction);

                if (currentAction && newAction) {
                    // Jump animation is triggered directly in jump() function for instant start
                    // This handles transitions back from jump to run/idle
                    currentAction.fadeOut(0.15);
                    currentAction.paused = false; // Unpause in case it was the frozen jump pose
                    newAction.reset().fadeIn(0.15).play();

                    player.userData.currentAction = newAction;
                    player.userData.currentAnimState = targetState;
                    console.log(`✅ Switched to ${targetState} animation`);
                } else {
                    console.log(`❌ Animation switch failed - currentAction:`, !!currentAction, 'newAction:', !!newAction);
                }
            }
        } else {
            // Original animation code for other characters
            if (!player.userData.mixer) return;

            const animations = player.userData.model ?
                this.loadedModels[player.userData.characterId]?.animations : null;

            if (!animations) return;

            const targetAnim = isMoving ?
                animations.find(a => a.name.toLowerCase().includes('run') || a.name.toLowerCase().includes('walk')) :
                animations.find(a => a.name.toLowerCase().includes('idle'));

            if (targetAnim && player.userData.currentAction?.getClip() !== targetAnim) {
                const newAction = player.userData.mixer.clipAction(targetAnim);

                if (player.userData.currentAction) {
                    player.userData.currentAction.fadeOut(0.2);
                }

                newAction.reset().fadeIn(0.2).play();
                player.userData.currentAction = newAction;
            }
        }
    }
}

// Export for use in game.js
window.ModelLoader = ModelLoader;
