// Level 3 - Arctic Ice Course
// Hardest level with slippery mechanics and extreme hazards

function createLevel3Course() {
    obstacles = [];

    // Initialize ball physics system
    ballPhysics = new BallPhysicsManager();

    // ARCTIC ICE COURSE - Expert difficulty
    // Starting platform (ice blue)
    createPlatform(0, 0, 0, 12, 0.5, 12, 0x4682B4, 'Iceberg Start'); // Steel blue

    // === SECTION 1: ICY SPIRAL ===
    // Spiral pattern going left then right
    ballPhysics.createBall(new THREE.Vector3(-4, 0, -6), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-7, 2, -10), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-10, 0, -14), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-7, 2, -18), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-4, 0, -22), 'green', 2.5);

    // LEFT ICE SHELF
    createPlatform(-10, 4, -28, 8, 0.5, 6, 0x87CEEB, 'Ice Shelf'); // Sky blue

    // === SECTION 2: PENDULUM PATH ===
    // Swinging pattern
    ballPhysics.createBall(new THREE.Vector3(-8, 4, -34), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-4, 2, -38), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 0, -42), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(4, 2, -46), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(8, 4, -50), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(12, 2, -54), 'blue', 2.5);

    // RIGHT GLACIER
    createPlatform(15, 5, -60, 8, 0.5, 6, 0xB0E0E6, 'Glacier Point'); // Powder blue

    // === SECTION 3: DIAMOND FORMATION ===
    // Diamond shape requiring precision
    ballPhysics.createBall(new THREE.Vector3(15, 5, -66), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(12, 3, -70), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(8, 0, -74), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(4, 3, -70), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 5, -66), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-4, 2, -74), 'blue', 2.5);

    // CENTER PLATFORM
    createPlatform(0, 3, -80, 10, 0.5, 8, 0x4682B4, 'Frozen Lake'); // Steel blue

    // === SECTION 4: AVALANCHE ZONE ===
    // Scattered pattern like falling debris
    ballPhysics.createBall(new THREE.Vector3(-6, 3, -86), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-2, 5, -90), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(2, 2, -94), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(6, 4, -98), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(10, 0, -102), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(6, 3, -106), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(2, 5, -110), 'blue', 2.5);

    // HIGH LEDGE
    createPlatform(8, 6, -116, 8, 0.5, 6, 0x87CEEB, 'Peak Ledge'); // Sky blue

    // === SECTION 5: BLIZZARD GAUNTLET ===
    // Fast alternating pattern
    ballPhysics.createBall(new THREE.Vector3(6, 6, -122), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(2, 4, -126), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-2, 2, -130), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-6, 4, -134), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-10, 6, -138), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-6, 3, -142), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-2, 5, -146), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(2, 2, -150), 'green', 2.5);

    // SUMMIT PLATFORM
    createPlatform(0, 7, -156, 10, 0.5, 6, 0xB0E0E6, 'Summit'); // Powder blue

    // === SECTION 6: FINAL DESCENT ===
    // Last challenge before finish
    ballPhysics.createBall(new THREE.Vector3(-3, 7, -162), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 5, -166), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(3, 3, -170), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 0, -174), 'blue', 2.5);

    // Add balls to scene
    ballPhysics.addBallsToScene(scene);

    // === LEVEL 3 HAZARDS ===
    if (animalHazards) {
        // Sliding penguins across ice
        animalHazards.createSlidingPenguin(-10, 4.5, -28, 'horizontal', 0.15);
        animalHazards.createSlidingPenguin(8, 6.5, -116, 'horizontal', 0.12);

        // Roaring polar bears (intimidating but slow)
        animalHazards.createRoaringPolarBear(0, 3.5, -80, 0.01);
        animalHazards.createRoaringPolarBear(0, 7.5, -156, 0.015);

        // Walrus tusk swipes
        animalHazards.createWalrusTusk(15, 5.5, -60, 0.025);
        animalHazards.createWalrusTusk(-8, 5, -138, 0.02);

        // Mix in some previous hazards
        animalHazards.createDivingEagle(0, 15, -100, 3, 5);
        animalHazards.createLavaSnake(0, 4, -80, 0.02); // Ice snake variant
        animalHazards.createFallingCow(0, 20, -140, 12, 3, 6); // Rare
        animalHazards.createNinjaStarfish(5, 7, -150, 0.025);
    }

    // === FINISH PLATFORM ===
    createPlatform(0, 5, -180, 14, 0.5, 14, 0xFFD700, 'Victory Peak'); // Gold

    // Ice water/frozen sea
    const iceGeometry = new THREE.PlaneGeometry(200, 200);
    const iceMaterial = new THREE.MeshPhongMaterial({
        color: 0x1E90FF, // Dodger blue
        emissive: 0x4169E1,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const ice = new THREE.Mesh(iceGeometry, iceMaterial);
    ice.rotation.x = -Math.PI / 2;
    ice.position.y = DEATH_Y + 5;
    scene.add(ice);

    console.log('❄️ Level 3: Arctic Ice Course loaded!');
}

function setupArcticEnvironment() {
    // Arctic sky - light blue/white
    scene.background = new THREE.Color(0xADD8E6); // Light blue
    scene.fog = new THREE.Fog(0xE0FFFF, 40, 140); // Light cyan fog

    // Lighting - cool tones for arctic
    const ambientLight = scene.children.find(child => child.type === 'AmbientLight');
    if (ambientLight) {
        ambientLight.color.setHex(0xCCEEFF); // Cool blue ambient
        ambientLight.intensity = 1.0;
    }

    const directionalLight = scene.children.find(child => child.type === 'DirectionalLight');
    if (directionalLight) {
        directionalLight.color.setHex(0xFFFFFF); // Bright white sun
        directionalLight.intensity = 1.2;
    }

    // Add icy glow from below
    const iceGlow = new THREE.PointLight(0x4FC3F7, 1.5, 80);
    iceGlow.position.set(0, -3, -90); // Under the course
    scene.add(iceGlow);

    console.log('❄️ Arctic environment setup complete!');
}
