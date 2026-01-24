// GLB Model Loader and Animation System
class ModelLoader {
    constructor() {
        this.loader = new THREE.GLTFLoader();
        this.loadedModels = {};
        this.mixers = []; // Animation mixers
    }

    // Load a GLB model
    loadModel(modelPath, characterId) {
        return new Promise((resolve, reject) => {
            console.log(`Loading model: ${modelPath}`);

            this.loader.load(
                modelPath,
                (gltf) => {
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
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    console.log(`Loading ${characterId}: ${percent}%`);
                },
                (error) => {
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
                // Load the idle model as the base
                const model = await this.loadModel('models/achilles_v4_idle.glb', 'achilles_v4_idle');

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
                const idleAnim = this.loadedModels['achilles_v4_idle'].animations[0];
                const idleAction = mixer.clipAction(idleAnim);

                // Load run animation and add to same mixer
                await this.loadModel('models/achilles_v4_run.glb', 'achilles_v4_run');
                const runAnim = this.loadedModels['achilles_v4_run'].animations[0];
                const runAction = mixer.clipAction(runAnim);

                // Store actions for switching (only idle and run)
                playerGroup.userData.mixer = mixer;
                playerGroup.userData.actions = {
                    idle: idleAction,
                    run: runAction
                };
                playerGroup.userData.currentAnimState = 'idle';

                // Start with idle
                idleAction.play();
                playerGroup.userData.currentAction = idleAction;

                scene.add(playerGroup);
                return playerGroup;

            } else {
                // Original code for other characters
                const modelPath = `models/${characterId}.glb`;
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
        const modelPath = 'models/alligator.glb';

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
            if (isMoving) {
                targetState = 'run';
            }

            // Switch animations if state changed
            if (player.userData.currentAnimState !== targetState) {
                const currentAction = player.userData.currentAction;
                const newAction = player.userData.actions[targetState];

                if (currentAction && newAction) {
                    // Fade out current, fade in new
                    currentAction.fadeOut(0.2);
                    newAction.reset().fadeIn(0.2).play();

                    player.userData.currentAction = newAction;
                    player.userData.currentAnimState = targetState;
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
