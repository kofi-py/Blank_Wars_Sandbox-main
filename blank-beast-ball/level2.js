// Level 2 - Volcano Course
// Harder obstacles, tighter spacing, lava theme

function createLevel2Course() {
    obstacles = [];

    // Initialize ball physics system
    ballPhysics = new BallPhysicsManager();

    // VOLCANO COURSE - More challenging patterns
    // Starting platform (smaller than level 1)
    createPlatform(0, 0, 0, 10, 0.5, 10, 0x8B0000, 'Start'); // Dark red

    // === SECTION 1: NARROW SNAKE ===
    // Moderate zigzag pattern
    ballPhysics.createBall(new THREE.Vector3(-3, 0, -6), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-6, 2, -10), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-4, 0, -14), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-2, 0, -18), 'yellow', 2.5); // Yellow to reach height 3
    ballPhysics.createBall(new THREE.Vector3(-5, 1, -22), 'green', 2.5); // Extra ball for easier jump

    // LEFT PLATFORM
    createPlatform(-8, 3, -24, 6, 0.5, 6, 0xFF4500, 'Lava Ledge'); // Orange-red

    // === SECTION 2: RAPID CROSS ===
    // Diagonal with mixed ball heights
    ballPhysics.createBall(new THREE.Vector3(-6, 3, -28), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-3, 0, -32), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 2, -36), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(3, 0, -40), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(6, 3, -44), 'green', 2.5);

    // RIGHT PLATFORM (smaller)
    createPlatform(10, 4, -50, 6, 0.5, 5, 0xB22222, 'Fire Rock'); // Firebrick

    // === SECTION 3: TRIPLE CHOICE ===
    // Three paths with different difficulties
    // Left path (safest)
    ballPhysics.createBall(new THREE.Vector3(8, 4, -56), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(6, 2, -62), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(4, 0, -68), 'green', 2.5); // Green for easier landing

    // Middle path (medium)
    ballPhysics.createBall(new THREE.Vector3(10, 5, -58), 'yellow', 2.5); // Yellow can reach from height 4
    ballPhysics.createBall(new THREE.Vector3(8, 2, -66), 'green', 2.5); // Green for safety

    // Right path (faster shortcut)
    ballPhysics.createBall(new THREE.Vector3(12, 6, -60), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(10, 1, -70), 'green', 2.5); // Green at height 1 for easier reach

    // MERGE PLATFORM
    createPlatform(5, 2, -75, 8, 0.5, 5, 0xCD5C5C, 'Merge Point'); // Indian red

    // === SECTION 4: PRECISION JUMPS ===
    // Moderate-sized balls
    ballPhysics.createBall(new THREE.Vector3(2, 2, -80), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-2, 3, -84), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-6, 2, -88), 'yellow', 2.5); // Yellow to reach height 5
    ballPhysics.createBall(new THREE.Vector3(-8, 2, -92), 'yellow', 2.5); // Raised to height 2
    ballPhysics.createBall(new THREE.Vector3(-9, 3, -96), 'green', 2.5); // Extra ball to reach platform

    // CENTER PLATFORM
    createPlatform(-10, 5, -98, 7, 0.5, 5, 0xFF6347, 'Crater Edge'); // Tomato

    // === SECTION 5: CHAOS SECTION ===
    // Multiple path options
    ballPhysics.createBall(new THREE.Vector3(-12, 5, -104), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-8, 3, -108), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-10, 2, -112), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-6, 0, -116), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-3, 2, -120), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 3, -124), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(3, 0, -128), 'blue', 2.5);

    // FINAL PLATFORM
    createPlatform(5, 4, -132, 8, 0.5, 5, 0x8B0000, 'Summit'); // Dark red

    // === SECTION 6: FINALE - GAUNTLET ===
    // Final stretch
    ballPhysics.createBall(new THREE.Vector3(3, 4, -137), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 2, -141), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-3, 3, -145), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 0, -149), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(2, 2, -153), 'green', 2.5);

    // Add balls to scene
    ballPhysics.addBallsToScene(scene);

    // === LEVEL 2 HAZARDS ===
    if (animalHazards) {
        // Dive-bombing eagles (slower, later in level)
        animalHazards.createDivingEagle(0, 15, -60, 5, 7);
        animalHazards.createDivingEagle(-8, 15, -100, 5, 7);

        // Charging rhino (one slower one, on left platform)
        animalHazards.createChargingRhino(-8, 3.5, -24, 'horizontal', 0.08);

        // Lava snakes slithering (fewer, slower, later sections)
        animalHazards.createLavaSnake(10, 4.5, -50, 0.015);
        animalHazards.createLavaSnake(-10, 5.5, -110, 0.015);

        // Keep some Level 1 hazards (but not at the beginning!)
        animalHazards.createSpinningFlamingo(-10, 5.5, -98, 0.015); // Moved to later platform
        animalHazards.createNinjaStarfish(-3, 6, -120, 0.02);
        animalHazards.createFallingCow(0, 20, -145, 10, 2, 5); // Less frequent
    }

    // === FINISH PLATFORM ===
    createPlatform(0, 5, -160, 12, 0.5, 12, 0xFFD700, 'Victory'); // Gold

    // Lava instead of water
    const lavaGeometry = new THREE.PlaneGeometry(200, 200);
    const lavaMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF4500,
        emissive: 0xFF0000,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const lava = new THREE.Mesh(lavaGeometry, lavaMaterial);
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = DEATH_Y + 5;
    scene.add(lava);

    console.log('🌋 Level 2: Volcano Course loaded!');
}

function setupVolcanoEnvironment() {
    // Volcano sky - orange/red sunset
    scene.background = new THREE.Color(0xFF6347); // Tomato red
    scene.fog = new THREE.Fog(0xFF4500, 40, 120); // Orange-red fog

    // Lighting - warmer for volcano
    const ambientLight = scene.children.find(child => child.type === 'AmbientLight');
    if (ambientLight) {
        ambientLight.color.setHex(0xFFAA88); // Warm ambient
        ambientLight.intensity = 0.8;
    }

    const directionalLight = scene.children.find(child => child.type === 'DirectionalLight');
    if (directionalLight) {
        directionalLight.color.setHex(0xFFAA66); // Warm directional
        directionalLight.intensity = 1.0;
    }

    // Add volcano glow
    const volcanoGlow = new THREE.PointLight(0xFF3300, 2, 100);
    volcanoGlow.position.set(0, -5, -80); // Under the course
    scene.add(volcanoGlow);

    console.log('🌋 Volcano environment setup complete!');
}
