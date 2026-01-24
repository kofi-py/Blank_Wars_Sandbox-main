import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { Water } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Water.js';
import { Sky } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Sky.js';
import { WaterfallShader } from './WaterfallShader.js?v=41';
import { RapidsShader } from './RapidsShader.js?v=41';
import { WaterParticleSystem, createSplashSystem, createMistSystem, createSpraySystem } from './ParticleSystem.js?v=41';

// Game state
const gameState = {
    isPlaying: false,
    health: 100,
    distance: 0,
    score: 0,
    speed: 0,
    targetSpeed: 0.4,
    duckPosition: 0,
    startTime: 0,
    isJumping: false,
    jumpVelocity: 0,
    jumpHeight: 0,
    baseHeight: 0.3,
    waveTime: 0,
    // Physics-based motion
    duckVelocityX: 0,
    duckVelocityY: 0,
    duckAngularVelX: 0,
    duckAngularVelZ: 0,
    duckRotationX: 0,
    duckRotationZ: 0,
    // Level progression
    level: 1,
    levelThreshold: 1500, // Distance to reach next level
    // Waterfall tracking
    hasTakenWaterfallDamage: false
};

// Wave physics function - calculates wave height at any point
const getWaveHeight = (x, z, time) => {
    // Gentler waves so duck doesn't sink underwater
    const wave1 = Math.sin(x * 0.4 + time * 2) * 0.15;      // Gentle swell
    const wave2 = Math.cos(z * 0.3 + time * 1.5) * 0.12;    // Cross wave
    const wave3 = Math.sin((x + z) * 0.2 + time * 1.8) * 0.10; // Diagonal
    const ripple = Math.sin(x * 1.2 + z * 0.8 + time * 3) * 0.05; // Ripples

    return wave1 + wave2 + wave3 + ripple;
};

// Calculate wave slope for tilting
const getWaveSlope = (x, z, time, delta = 0.1) => {
    const h1 = getWaveHeight(x - delta, z, time);
    const h2 = getWaveHeight(x + delta, z, time);
    const h3 = getWaveHeight(x, z - delta, time);
    const h4 = getWaveHeight(x, z + delta, time);

    return {
        x: (h2 - h1) / (delta * 2), // Pitch (forward/back tilt)
        z: (h4 - h3) / (delta * 2)  // Roll (side to side tilt)
    };
};

// Calculate wave forces - pushes the duck around!
const getWaveForces = (x, z, time) => {
    const delta = 0.2;

    // Sample wave heights in a grid around the duck
    const hCenter = getWaveHeight(x, z, time);
    const hLeft = getWaveHeight(x - delta, z, time);
    const hRight = getWaveHeight(x + delta, z, time);
    const hFront = getWaveHeight(x, z - delta, time);
    const hBack = getWaveHeight(x, z + delta, time);

    // Calculate pressure differences -> forces
    const forceX = (hRight - hLeft) * 0.8; // Lateral push
    const forceZ = (hBack - hFront) * 0.5; // Forward/back push

    // Buoyancy based on submersion
    const targetHeight = gameState.baseHeight + hCenter;
    const currentHeight = gameState.duckPosition;
    const buoyancy = (targetHeight - currentHeight) * 0.15;

    return { x: forceX, y: buoyancy, z: forceZ };
};

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 100, 3000); // Much further fog distance to see canyon walls extend

// Camera
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    5000 // Increased far plane to see distant canyon walls
);

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('gameCanvas'),
    antialias: true,
    powerPreference: 'high-performance'
});
renderer.setClearColor(0x87CEEB);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ===== ENHANCED PHOTOREALISTIC LIGHTING =====
// Warmer ambient light for sunny canyon feel
const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.5);
scene.add(ambientLight);

// Main sun light - bright, warm, from above
const directionalLight = new THREE.DirectionalLight(0xfff5e6, 1.5); // Increased intensity
directionalLight.position.set(15, 35, 10); // Higher, more dramatic angle
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096; // Higher quality shadows!
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.camera.left = -60;
directionalLight.shadow.camera.right = 60;
directionalLight.shadow.camera.top = 60;
directionalLight.shadow.camera.bottom = -60;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 200;
directionalLight.shadow.bias = -0.0001;
scene.add(directionalLight);

// Hemisphere light for sky/ground bounce lighting
const hemiLight = new THREE.HemisphereLight(
    0x87CEEB,  // Sky color (blue)
    0x8B7355,  // Ground color (brownish for canyon floor)
    0.6        // Increased intensity
);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

// Add subtle fill light from canyon reflection
const fillLight = new THREE.DirectionalLight(0xff9966, 0.3); // Warm orange fill
fillLight.position.set(-20, 10, 5);
fillLight.castShadow = false; // No shadows for fill
scene.add(fillLight);

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                 ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ===== REAL 3D WATER SETUP =====
let realWater, sky;

// Water sections for infinite river
const waterSections = [];

const createRealWater = () => {
    // Create MULTIPLE water sections for infinite river!
    for (let i = 0; i < 5; i++) {
        const waterGeometry = new THREE.PlaneGeometry(30, 300); // 30 wide, 300 long sections

        const waterSection = new Water(waterGeometry, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load(
                'https://threejs.org/examples/textures/waternormals.jpg',
                (texture) => {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }
            ),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x4a6b5c, // Colorado River color (muddy greenish-brown)
            distortionScale: 3.5, // Rougher water for rapids
            fog: scene.fog !== undefined
        });

        waterSection.rotation.x = -Math.PI / 2;
        waterSection.position.y = 0;
        waterSection.position.z = i * 300 - 300; // Spread them out
        scene.add(waterSection);
        waterSections.push(waterSection);
    }

    realWater = waterSections[0]; // Keep reference for time updates

    // Add realistic sky
    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const sun = new THREE.Vector3();

    // Sun position
    const elevation = 2;
    const azimuth = 180;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    realWater.material.uniforms['sunDirection'].value.copy(sun).normalize();

    scene.environment = pmremGenerator.fromScene(sky).texture;

    console.log('Real 3D water with shaders initialized!');
};

// Update water animation and cycle sections
const updateRealWater = () => {
    const DROP_Z = -200; // TESTING: Waterfall location (must match game loop constant)

    // Update all water sections
    waterSections.forEach(section => {
        // Handle cascade shader (stored as object with material property)
        if (section.isCascade && section.material) {
            section.material.uniforms['time'].value += 1.0 / 60.0;
        } else if (section.material && section.material.uniforms && section.material.uniforms['time']) {
            // Regular water section
            section.material.uniforms['time'].value += 1.0 / 60.0;

            // Cycle water sections for infinite river
            if (section.position) {
                // Check if this is upper water (y=0) or lower water (y=-30)
                const isLowerWater = section.userData && section.userData.isLowerWater;

                // Cycle when section gets too far behind camera
                if (section.position.z - camera.position.z > 200) {
                    const newZ = section.position.z - 1500; // 5 sections * 300 units

                    // IMPORTANT: Upper water must STOP at the cliff edge!
                    if (isLowerWater) {
                        // Lower water can cycle freely (it's already below the cliff)
                        section.position.z = newZ;
                    } else {
                        // Upper water: Let it cycle right up to the cliff edge!
                        // Each section is 300 units, so stop when it would go PAST the cliff
                        if (newZ > DROP_Z - 150) { // Stop at the cliff edge
                            section.position.z = newZ;
                            console.log(`♻️ Cycling upper water to z=${newZ.toFixed(0)}`);
                        } else {
                            console.log(`🚫 Upper water at z=${section.position.z.toFixed(0)} NOT cycling (would go past cliff at ${DROP_Z})`);
                        }
                    }
                }
            }
        }
    });
};

// ===== PHOTOREALISTIC COLORADO RIVER CANYON =====
//
// FUTURE: Real-world terrain using APIs
// Options researched:
// 1. **Mapbox Terrain-RGB API** - Real-world elevation data encoded in RGB tiles
//    - Decode: elevation = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
//    - Use with three-geo library: https://github.com/w3reality/three-geo
//    - Can generate terrain from GPS coordinates anywhere on Earth
//
// 2. **NASA SRTM (Shuttle Radar Topography Mission)** - Public domain elevation data
//    - 30m resolution, global coverage (56°S to 60°N)
//    - Access via OpenTopography or Google Earth Engine
//    - Free but requires NASA Earthdata login
//
// 3. **Procedural heightmaps** - Current approach (noise-based)
//    - Fast, no API calls, fully customizable
//    - Good for game-like terrain
//
// For production: Recommend Mapbox + three-geo for photorealistic landscapes
//
let leftRiverbank, rightRiverbank;
let riverbedTerrain;
let terrainSegments = [];
let waterfallLocations = []; // Track where terrain drops occur

// Perlin-like noise function for natural terrain
const noise2D = (x, z) => {
    // Simple pseudo-Perlin noise using sine waves
    const n1 = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3.0;
    const n2 = Math.sin(x * 0.3 + 1.414) * Math.cos(z * 0.3 + 2.718) * 1.5;
    const n3 = Math.sin(x * 0.7 + 2.414) * Math.cos(z * 0.7 + 1.618) * 0.7;
    const n4 = Math.sin(x * 1.5 + 3.14) * Math.cos(z * 1.5 + 0.618) * 0.3;
    return n1 + n2 + n3 + n4;
};

// Global elevation function - defines the river's elevation at any Z position
const getTerrainElevation = (z) => {
    // Create major elevation changes with dramatic drops for waterfalls
    let baseElevation = 0;

    // Check if we're near a waterfall location
    for (let wf of waterfallLocations) {
        const distanceToWaterfall = z - wf.z;

        if (distanceToWaterfall > -30 && distanceToWaterfall < 10) {
            // Before the waterfall - gradual ramp down
            const factor = (distanceToWaterfall + 30) / 40;
            baseElevation -= wf.dropHeight * (1 - factor);
        } else if (distanceToWaterfall >= 10) {
            // After the waterfall - already dropped
            baseElevation -= wf.dropHeight;
        }
    }

    // Add gentle rolling hills (reduced from 8 and 5 to 3 and 2)
    baseElevation += Math.sin(z * 0.02) * 3 + Math.cos(z * 0.03) * 2;

    return baseElevation;
};

const createRiverBanks = () => {
    const textureLoader = new THREE.TextureLoader();

    // Load natural terrain textures from Poly Haven
    const grassColorMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/aerial_grass_rock/aerial_grass_rock_diff_2k.jpg'
    );
    const grassNormalMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/aerial_grass_rock/aerial_grass_rock_nor_gl_2k.jpg'
    );
    const grassRoughnessMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/aerial_grass_rock/aerial_grass_rock_rough_2k.jpg'
    );

    // Configure texture wrapping
    [grassColorMap, grassNormalMap, grassRoughnessMap].forEach(tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(20, 50);
    });

    const bankMaterial = new THREE.MeshStandardMaterial({
        map: grassColorMap,
        normalMap: grassNormalMap,
        roughnessMap: grassRoughnessMap,
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    // Create sloping terrain banks - smaller segments for smoother elevation changes
    const segmentLength = 50; // Shorter segments for smoother transitions
    const numSegments = 60;

    for (let seg = 0; seg < numSegments; seg++) {
        const zPos = -seg * segmentLength;

        // Get terrain elevation at this position
        const elevation = getTerrainElevation(zPos);

        // Single layer banks on each side - simpler and cleaner
        const bankWidth = 20;
        const bankHeight = 12;

        // Left bank
        const leftGeom = new THREE.BoxGeometry(bankWidth, bankHeight, segmentLength);
        const leftMesh = new THREE.Mesh(leftGeom, bankMaterial.clone());
        leftMesh.position.set(
            -25, // Far to the left
            elevation + bankHeight / 2, // Positioned based on terrain elevation
            zPos
        );
        leftMesh.receiveShadow = true;
        leftMesh.castShadow = true;
        scene.add(leftMesh);

        if (seg === 0) {
            leftRiverbank = leftMesh;
        }

        // Right bank
        const rightGeom = new THREE.BoxGeometry(bankWidth, bankHeight, segmentLength);
        const rightMesh = new THREE.Mesh(rightGeom, bankMaterial.clone());
        rightMesh.position.set(
            25, // Far to the right
            elevation + bankHeight / 2,
            zPos
        );
        rightMesh.receiveShadow = true;
        rightMesh.castShadow = true;
        scene.add(rightMesh);

        if (seg === 0) {
            rightRiverbank = rightMesh;
        }
    }

    console.log('✅ Natural textured river banks created!');

    // Add rocks and terrain features to banks for realistic appearance
    addBankDetails(leftRiverbank, rightRiverbank);

    // CREATE NATURAL 3D RIVERBED TERRAIN (under water)
    createRiverbed();

    // Add 3D vegetation and scenery
    addVegetation();
};

// Add realistic rock outcroppings and terrain details to river banks
const addBankDetails = (leftBank, rightBank) => {
    const textureLoader = new THREE.TextureLoader();

    // Load rock textures
    const rockColorMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_03/rock_03_diff_1k.jpg'
    );
    const rockNormalMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_03/rock_03_nor_gl_1k.jpg'
    );

    const rockMaterial = new THREE.MeshStandardMaterial({
        map: rockColorMap,
        normalMap: rockNormalMap,
        roughness: 0.95,
        metalness: 0.0
    });

    // Add many rocks along both banks to create natural terrain
    for (let side = -1; side <= 1; side += 2) {
        const xPos = side * 25; // Position on left or right bank

        // Create 100+ rocks along each bank
        for (let i = 0; i < 120; i++) {
            const z = (i - 60) * 8 + (Math.random() - 0.5) * 5; // Spread along river
            const rockSize = 0.5 + Math.random() * 2.5; // Varied sizes

            // Use different geometry for variety
            let rockGeometry;
            const rockType = Math.random();
            if (rockType < 0.4) {
                rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
            } else if (rockType < 0.7) {
                rockGeometry = new THREE.IcosahedronGeometry(rockSize, 0);
            } else {
                rockGeometry = new THREE.SphereGeometry(rockSize, 6, 5);
            }

            const rock = new THREE.Mesh(rockGeometry, rockMaterial.clone());

            // Position rocks on the bank surface
            rock.position.set(
                xPos + (Math.random() - 0.5) * 12, // Scattered across bank width
                2 + Math.random() * 6, // Various heights on bank
                z + 18 // Along the river
            );

            // Random rotation for natural look
            rock.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            // Slight scale variation
            const scaleVar = 0.8 + Math.random() * 0.4;
            rock.scale.set(scaleVar, scaleVar * (0.7 + Math.random() * 0.6), scaleVar);

            rock.castShadow = true;
            rock.receiveShadow = true;
            scene.add(rock);
        }

        // Add some larger boulder clusters
        for (let i = 0; i < 15; i++) {
            const z = (i - 7) * 30 + (Math.random() - 0.5) * 15;
            const group = new THREE.Group();

            // Create cluster of 3-6 boulders
            const numBoulders = 3 + Math.floor(Math.random() * 4);
            for (let j = 0; j < numBoulders; j++) {
                const boulderSize = 1.5 + Math.random() * 2;
                const boulderGeom = new THREE.DodecahedronGeometry(boulderSize, 1);
                const boulder = new THREE.Mesh(boulderGeom, rockMaterial.clone());

                boulder.position.set(
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 4
                );

                boulder.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );

                boulder.castShadow = true;
                boulder.receiveShadow = true;
                group.add(boulder);
            }

            group.position.set(xPos + (Math.random() - 0.5) * 10, 3, z + 18);
            scene.add(group);
        }
    }

    console.log('✅ Added 250+ rocks and boulders for realistic river bank terrain!');
};

// Create natural 3D riverbed terrain under the water
const createRiverbed = () => {
    const textureLoader = new THREE.TextureLoader();

    // Load riverbed textures (muddy rock/sand)
    const riverbedColorMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brown_mud_03/brown_mud_03_diff_2k.jpg'
    );
    const riverbedNormalMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brown_mud_03/brown_mud_03_nor_gl_2k.jpg'
    );
    const riverbedRoughnessMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brown_mud_03/brown_mud_03_rough_2k.jpg'
    );

    [riverbedColorMap, riverbedNormalMap, riverbedRoughnessMap].forEach(tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(10, 50);
    });

    const riverbedMaterial = new THREE.MeshStandardMaterial({
        map: riverbedColorMap,
        normalMap: riverbedNormalMap,
        roughnessMap: riverbedRoughnessMap,
        roughness: 0.95,
        metalness: 0.0,
        color: 0x6b5442 // Brown/tan riverbed
    });

    // HIGH SUBDIVISION for natural terrain
    const riverbedGeometry = new THREE.PlaneGeometry(40, 1000, 256, 512);
    const positions = riverbedGeometry.attributes.position.array;

    // Create NATURAL TERRAIN with Perlin-like noise
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];

        // Multiple octaves of noise for natural terrain
        const height =
            noise2D(x * 0.15, z * 0.15) * 2.5 +        // Large features
            noise2D(x * 0.4, z * 0.4) * 1.2 +          // Medium bumps
            noise2D(x * 1.0, z * 1.0) * 0.5 +          // Small details
            (Math.random() - 0.5) * 0.3;               // Micro variation

        positions[i + 1] = height - 3; // Position below water
    }

    riverbedGeometry.computeVertexNormals();

    riverbedTerrain = new THREE.Mesh(riverbedGeometry, riverbedMaterial);
    riverbedTerrain.rotation.x = -Math.PI / 2;
    riverbedTerrain.position.y = -2;
    riverbedTerrain.receiveShadow = true;
    scene.add(riverbedTerrain);

    console.log('✅ Natural riverbed terrain created with Perlin noise!');
};

// Add 3D trees, rocks, and natural scenery
const addVegetation = () => {
    const textureLoader = new THREE.TextureLoader();

    // Load rock textures
    const rockColorMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_03/rock_03_diff_1k.jpg'
    );
    const rockNormalMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_03/rock_03_nor_gl_1k.jpg'
    );

    [rockColorMap, rockNormalMap].forEach(tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    });

    const rockMaterial = new THREE.MeshStandardMaterial({
        map: rockColorMap,
        normalMap: rockNormalMap,
        roughness: 0.9,
        metalness: 0.0
    });

    // Tree and vegetation materials
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a2511,
        roughness: 0.9
    });

    const foliageMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d5a2d,
        roughness: 0.8
    });

    // Scatter trees and rocks along OUTER EDGES of riverbanks
    for (let side = -1; side <= 1; side += 2) {
        const xBase = side * 32; // Far outer edge of banks

        for (let i = 0; i < 50; i++) { // More trees
            const z = (Math.random() - 0.5) * 400;
            const xOffset = (Math.random() - 0.5) * 6; // Slight variation
            const x = xBase + xOffset;

            // Random choice: tree or rock cluster
            if (Math.random() < 0.6) {
                // Create simple tree
                const tree = new THREE.Group();

                // Trunk
                const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
                const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                trunk.position.y = 2;
                trunk.castShadow = true;
                tree.add(trunk);

                // Foliage (cone shape)
                const foliageGeometry = new THREE.ConeGeometry(2, 5, 8);
                const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                foliage.position.y = 5.5;
                foliage.castShadow = true;
                tree.add(foliage);

                tree.position.set(x, 8, z); // Raised to top of bank
                tree.scale.set(
                    0.8 + Math.random() * 0.6,
                    0.8 + Math.random() * 0.6,
                    0.8 + Math.random() * 0.6
                );
                scene.add(tree);
            } else {
                // Create rock cluster
                const rockGroup = new THREE.Group();

                for (let j = 0; j < 2 + Math.floor(Math.random() * 3); j++) {
                    const rockGeometry = new THREE.DodecahedronGeometry(0.5 + Math.random() * 1, 0);
                    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
                    rock.position.set(
                        (Math.random() - 0.5) * 2,
                        (Math.random() * 0.5),
                        (Math.random() - 0.5) * 2
                    );
                    rock.rotation.set(
                        Math.random() * Math.PI,
                        Math.random() * Math.PI,
                        Math.random() * Math.PI
                    );
                    rock.castShadow = true;
                    rockGroup.add(rock);
                }

                rockGroup.position.set(x, 0, z);
                scene.add(rockGroup);
            }
        }
    }

    console.log('3D vegetation and natural scenery added!');

    // Add rocks IN the river for Colorado character
    addRiverRocks();
};

// Helper function to create a single tree (for spawning)
const createTree = () => {
    const tree = new THREE.Group();

    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a2511,
        roughness: 0.9
    });

    const foliageMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d5a2d,
        roughness: 0.8
    });

    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Foliage (cone shape)
    const foliageGeometry = new THREE.ConeGeometry(2, 5, 8);
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 5.5;
    foliage.castShadow = true;
    tree.add(foliage);

    tree.scale.set(
        0.8 + Math.random() * 0.6,
        0.8 + Math.random() * 0.6,
        0.8 + Math.random() * 0.6
    );

    tree.userData.type = 'tree';
    return tree;
};

// Helper function to create a rock cluster (for spawning)
const createRockCluster = () => {
    const rockGroup = new THREE.Group();

    const textureLoader = new THREE.TextureLoader();
    const rockColorMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_03/rock_03_diff_1k.jpg'
    );
    const rockNormalMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_03/rock_03_nor_gl_1k.jpg'
    );

    const rockMaterial = new THREE.MeshStandardMaterial({
        map: rockColorMap,
        normalMap: rockNormalMap,
        roughness: 0.95,
        metalness: 0.0
    });

    const numRocks = 2 + Math.floor(Math.random() * 4);
    for (let j = 0; j < numRocks; j++) {
        const rockSize = 0.5 + Math.random() * 1.5;
        const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
        const rock = new THREE.Mesh(rockGeometry, rockMaterial.clone());
        rock.position.set(
            (Math.random() - 0.5) * 2,
            (Math.random() * 0.5),
            (Math.random() - 0.5) * 2
        );
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        rockGroup.add(rock);
    }

    rockGroup.userData.type = 'rocks';
    return rockGroup;
};

// Add boulders in the river water
const addRiverRocks = () => {
    const textureLoader = new THREE.TextureLoader();

    const rockColorMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_03/rock_03_diff_1k.jpg'
    );
    const rockNormalMap = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_03/rock_03_nor_gl_1k.jpg'
    );

    const rockMaterial = new THREE.MeshStandardMaterial({
        map: rockColorMap,
        normalMap: rockNormalMap,
        roughness: 0.95,
        metalness: 0.0
    });

    // Scatter large boulders in the river water
    for (let i = 0; i < 50; i++) {
        const rockGeometry = new THREE.DodecahedronGeometry(1 + Math.random() * 2, 0);
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);

        rock.position.set(
            (Math.random() - 0.5) * 20, // Across river width
            -0.5 + Math.random() * 0.5, // Partially submerged
            (Math.random() - 0.5) * 600  // Along river length
        );

        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }

    console.log('River rocks added for rapids effect!');
};

// Draw riverbank landscape with trees and grass
const drawRiverbankLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight * 0.6);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight * 0.6);

    // Ground/grass
    const grassGradient = ctx.createLinearGradient(0, canvasHeight * 0.6, 0, canvasHeight);
    grassGradient.addColorStop(0, '#8FBC8F');
    grassGradient.addColorStop(1, '#6B8E23');
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, canvasHeight * 0.6, canvasWidth, canvasHeight * 0.4);

    // Draw trees along the bank
    for (let i = 0; i < 15; i++) {
        const x = (offset + i * 150) % canvasWidth;
        const treeHeight = 40 + Math.sin(i * 0.5) * 20;
        const y = canvasHeight * 0.6 - treeHeight;

        // Tree trunk
        ctx.fillStyle = '#4a2511';
        ctx.fillRect(x - 3, y + treeHeight - 15, 6, 15);

        // Tree foliage
        ctx.fillStyle = '#2d5a2d';
        ctx.beginPath();
        ctx.arc(x, y + 5, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#3a6e3a';
        ctx.beginPath();
        ctx.arc(x - 6, y + 8, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x + 6, y + 8, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add some rocks/bushes
    for (let i = 0; i < 20; i++) {
        const x = (offset + i * 100 + 50) % canvasWidth;
        const y = canvasHeight * 0.65 + Math.random() * (canvasHeight * 0.3);

        ctx.fillStyle = '#556B2F';
        ctx.beginPath();
        ctx.arc(x, y, 5 + Math.random() * 5, 0, Math.PI * 2);
        ctx.fill();
    }
};

// Update river banks with parallax scrolling
const updateRiverBanks = (speed) => {
    if (!leftBankWall || !rightBankWall) return;

    if (!leftBankWall.userData.frameCount) leftBankWall.userData.frameCount = 0;
    leftBankWall.userData.frameCount++;

    if (leftBankWall.userData.frameCount % 3 !== 0) {
        leftBankWall.position.z = camera.position.z;
        rightBankWall.position.z = camera.position.z;
        return;
    }

    const scrollSpeed = speed * 15;

    // Update left bank
    const leftData = leftBankWall.userData;
    leftData.offset += scrollSpeed;
    leftData.ctx.clearRect(0, 0, leftData.canvasWidth, leftData.canvasHeight);
    drawRiverbankLandscape(leftData.ctx, leftData.offset, leftData.canvasWidth, leftData.canvasHeight);
    leftData.texture.needsUpdate = true;

    // Update right bank
    const rightData = rightBankWall.userData;
    rightData.offset += scrollSpeed;
    rightData.ctx.clearRect(0, 0, rightData.canvasWidth, rightData.canvasHeight);
    drawRiverbankLandscape(rightData.ctx, rightData.offset, rightData.canvasWidth, rightData.canvasHeight);
    rightData.texture.needsUpdate = true;

    leftBankWall.position.z = camera.position.z;
    rightBankWall.position.z = camera.position.z;
};

// Load rubber duck model
let duck;
let duckModel = null;
let duckModelLoaded = false;

// Splash particles system
const splashParticles = [];
const createSplash = (x, y, z, intensity) => {
    const particleCount = Math.floor(intensity * 8) + 3;

    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 4, 4);
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.8
        });
        const particle = new THREE.Mesh(geometry, material);

        particle.position.set(
            x + (Math.random() - 0.5) * 0.5,
            y + Math.random() * 0.2,
            z + (Math.random() - 0.5) * 0.5
        );

        // Random velocity
        particle.userData.velocity = {
            x: (Math.random() - 0.5) * 0.15,
            y: 0.08 + Math.random() * 0.12,
            z: (Math.random() - 0.5) * 0.15
        };
        particle.userData.life = 1.0;

        scene.add(particle);
        splashParticles.push(particle);
    }
};

// Update splash particles
const updateSplashParticles = () => {
    for (let i = splashParticles.length - 1; i >= 0; i--) {
        const particle = splashParticles[i];

        // Apply physics
        particle.userData.velocity.y -= 0.008; // Gravity
        particle.position.x += particle.userData.velocity.x;
        particle.position.y += particle.userData.velocity.y;
        particle.position.z += particle.userData.velocity.z;

        // Fade out
        particle.userData.life -= 0.02;
        particle.material.opacity = particle.userData.life * 0.8;

        // Remove dead particles
        if (particle.userData.life <= 0) {
            scene.remove(particle);
            splashParticles.splice(i, 1);
        }
    }
};

const loader = new GLTFLoader();
loader.load('Rubber Duck.glb', (gltf) => {
    duckModel = gltf.scene;

    // Scale down and rotate to look more duck-like
    duckModel.scale.set(0.8, 0.8, 0.8);
    duckModel.rotation.y = Math.PI; // Face forward

    // Enable shadows
    duckModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    duckModelLoaded = true;
    console.log('Rubber duck model loaded successfully!');
}, undefined, (error) => {
    console.error('Error loading duck model:', error);
});

// Create rubber duck
const createDuck = () => {
    const duckGroup = new THREE.Group();

    // Use 3D model if loaded, otherwise fallback to procedural duck
    if (duckModelLoaded && duckModel) {
        const duckClone = duckModel.clone();
        duckClone.position.set(0, 0, 0);
        duckGroup.add(duckClone);
    } else {
        // Fallback procedural duck
        const yellowColor = 0xFFD700;
        const orangeColor = 0xFF8C00;

        const bodyGeometry = new THREE.SphereGeometry(1, 16, 16);
        bodyGeometry.scale(1.2, 1, 1.4);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: yellowColor,
            roughness: 0.3,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        duckGroup.add(body);

        const headGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 1.3, -0.8);
        head.castShadow = true;
        duckGroup.add(head);

        const beakGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
        const beakMaterial = new THREE.MeshStandardMaterial({ color: orangeColor });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 1.2, -1.4);
        duckGroup.add(beak);

        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.25, 1.5, -1.1);
        duckGroup.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.25, 1.5, -1.1);
        duckGroup.add(rightEye);

        const tailGeometry = new THREE.ConeGeometry(0.3, 0.5, 8);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.rotation.x = -Math.PI / 4;
        tail.position.set(0, 0.8, 1.2);
        duckGroup.add(tail);

        const wingGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        wingGeometry.scale(0.5, 1, 1.2);

        const leftWing = new THREE.Mesh(wingGeometry, bodyMaterial);
        leftWing.position.set(-0.9, 0.5, 0);
        duckGroup.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeometry, bodyMaterial);
        rightWing.position.set(0.9, 0.5, 0);
        duckGroup.add(rightWing);
    }

    duckGroup.position.set(0, 0.2, 0);
    duckGroup.rotation.y = 0;

    return duckGroup;
};

// Create river surface
const riverSegments = [];
const createRiverSegment = (z) => {
    const segment = new THREE.Group();

    // Water surface with animated ripples - higher detail
    const waterGeometry = new THREE.PlaneGeometry(20, 20, 32, 32);
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x2F6B9A,
        transparent: true,
        opacity: 0.8,
        roughness: 0.2,
        metalness: 0.6,
        emissive: 0x1a4d6d,
        emissiveIntensity: 0.1
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0;
    water.receiveShadow = true;

    // Store original vertices for animation
    water.userData.originalPositions = water.geometry.attributes.position.array.slice();

    segment.add(water);

    // Add flowing foam streaks (more river-like)
    for (let i = 0; i < 15; i++) {
        const foamLength = 1 + Math.random() * 2;
        const foamGeometry = new THREE.PlaneGeometry(0.3, foamLength);
        const foamMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.4 + Math.random() * 0.3
        });
        const foam = new THREE.Mesh(foamGeometry, foamMaterial);
        foam.rotation.x = -Math.PI / 2;
        foam.rotation.z = (Math.random() - 0.5) * 0.3; // Slight angle
        foam.position.set(
            (Math.random() - 0.5) * 18,
            0.02,
            (Math.random() - 0.5) * 18
        );
        foam.userData.speed = 0.05 + Math.random() * 0.05;
        segment.add(foam);
    }

    // Add some bubbles
    for (let i = 0; i < 10; i++) {
        const bubbleGeometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 8, 8);
        const bubbleMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.5
        });
        const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        bubble.position.set(
            (Math.random() - 0.5) * 18,
            0.05,
            (Math.random() - 0.5) * 18
        );
        bubble.userData.bobSpeed = 0.02 + Math.random() * 0.02;
        segment.add(bubble);
    }

    segment.position.z = z;
    segment.userData.time = Math.random() * 100;
    return segment;
};

// Obstacles array
const obstacles = [];

// Create stick obstacle
const createStick = (lane, z) => {
    const stickGroup = new THREE.Group();

    const stickGeometry = new THREE.CylinderGeometry(0.15, 0.15, 4, 8);
    const stickMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2511 });
    const stick = new THREE.Mesh(stickGeometry, stickMaterial);
    stick.rotation.z = Math.PI / 2;
    stick.rotation.y = Math.random() * Math.PI;
    stick.position.y = 0;
    stick.castShadow = true;
    stickGroup.add(stick);

    stickGroup.position.set(lane, 0, z);
    stickGroup.userData = { type: 'stick', damage: 10 };

    return stickGroup;
};

// Create rock obstacle
const createRock = (lane, z) => {
    const rockGroup = new THREE.Group();

    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.9
    });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.y = 0.5;
    rock.castShadow = true;
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rockGroup.add(rock);

    rockGroup.position.set(lane, 0, z);
    rockGroup.userData = { type: 'rock', damage: 20 };

    return rockGroup;
};

// Create WHITE WATER RAPIDS with foam, rocks, and spray
const createRapids = (z) => {
    const rapidsGroup = new THREE.Group();
    const rapidsLength = 40;

    // White foamy water surface
    const foamGeometry = new THREE.PlaneGeometry(35, rapidsLength, 16, 32);
    const foamPositions = foamGeometry.attributes.position.array;

    // Add turbulent bumps to foam surface
    for (let i = 0; i < foamPositions.length; i += 3) {
        const x = foamPositions[i];
        const z = foamPositions[i + 2];
        foamPositions[i + 1] = Math.sin(x * 0.5) * 0.3 + Math.cos(z * 0.3) * 0.2;
    }
    foamGeometry.computeVertexNormals();

    const foamMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        emissive: 0xffffff,
        emissiveIntensity: 0.4,
        roughness: 0.9,
        side: THREE.DoubleSide
    });

    const foam = new THREE.Mesh(foamGeometry, foamMaterial);
    foam.rotation.x = -Math.PI / 2;
    foam.position.y = 0.3; // Slightly above water
    rapidsGroup.add(foam);

    // Add rocks creating the rapids - with a CLEAR PATH through the middle!
    const numRocks = 8 + Math.floor(Math.random() * 5);
    const pathWidth = 8; // Clear 8-unit wide path for duck to navigate

    for (let i = 0; i < numRocks; i++) {
        const rockSize = 1.5 + Math.random() * 2;
        const rockGeom = new THREE.DodecahedronGeometry(rockSize, 1);
        const rockMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.95,
            metalness: 0.0
        });
        const rock = new THREE.Mesh(rockGeom, rockMat);

        // Place rocks on LEFT or RIGHT side, keeping middle clear
        const side = Math.random() < 0.5 ? -1 : 1;
        const minDistanceFromCenter = pathWidth / 2 + rockSize;
        const maxDistanceFromCenter = 12;
        const distanceFromCenter = minDistanceFromCenter + Math.random() * (maxDistanceFromCenter - minDistanceFromCenter);

        rock.position.set(
            side * distanceFromCenter, // Keep path clear!
            -0.5 + Math.random() * 0.5, // Mostly submerged
            (Math.random() - 0.5) * rapidsLength
        );
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        rapidsGroup.add(rock);
    }

    // Create spray particle system
    const sprayCount = 800;
    const sprayGeometry = new THREE.BufferGeometry();
    const sprayPositions = new Float32Array(sprayCount * 3);
    const sprayVelocities = new Float32Array(sprayCount * 3);

    for (let i = 0; i < sprayCount; i++) {
        const i3 = i * 3;
        sprayPositions[i3] = (Math.random() - 0.5) * 30;
        sprayPositions[i3 + 1] = Math.random() * 2;
        sprayPositions[i3 + 2] = (Math.random() - 0.5) * rapidsLength;

        sprayVelocities[i3] = (Math.random() - 0.5) * 0.4;
        sprayVelocities[i3 + 1] = Math.random() * 0.8 + 0.3;
        sprayVelocities[i3 + 2] = (Math.random() - 0.5) * 0.3;
    }

    sprayGeometry.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));
    sprayGeometry.setAttribute('velocity', new THREE.BufferAttribute(sprayVelocities, 3));

    const sprayMaterial = new THREE.PointsMaterial({
        color: 0xddffff,
        size: 0.3,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    const spray = new THREE.Points(sprayGeometry, sprayMaterial);
    rapidsGroup.add(spray);

    rapidsGroup.position.z = z;
    rapidsGroup.userData = {
        type: 'rapids',
        damage: 15,
        length: rapidsLength,
        spray: sprayGeometry,
        foamMesh: foam,
        turbulenceStrength: 0.5 + Math.random() * 0.5
    };

    return rapidsGroup;
};

// Create SHADER-BASED WHITE WATER RAPIDS (NEW - Production Quality)
const createShaderRapids = (z) => {
    const rapidsGroup = new THREE.Group();
    const rapidsLength = 60;  // Much longer
    const rapidsWidth = 50;   // Much wider - cover most of river

    // Create water sheet with RapidsShader
    const waterGeometry = new THREE.PlaneGeometry(rapidsWidth, rapidsLength, 64, 128);

    // Add slight bumps to geometry for better light interaction
    const positions = waterGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        positions[i + 1] = Math.sin(x * 0.5) * 0.2 + Math.cos(z * 0.3) * 0.15;
    }
    waterGeometry.computeVertexNormals();

    // Create rapids shader material
    const waterMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(RapidsShader.uniforms),
        vertexShader: RapidsShader.vertexShader,
        fragmentShader: RapidsShader.fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    // Make rapids VERY visible - use Color for vec3 color uniforms
    waterMaterial.uniforms.waterColor.value = new THREE.Color(0.2, 0.4, 0.6);  // Blue water
    waterMaterial.uniforms.foamColor.value = new THREE.Color(1.0, 1.0, 1.0);   // Pure white foam
    waterMaterial.uniforms.flowSpeed.value = 3.0;                                 // Very fast flowing
    waterMaterial.uniforms.turbulence.value = 2.5;                                // High turbulence
    waterMaterial.uniforms.foamThreshold.value = 0.3;                             // LOTS of foam (lower threshold)

    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.5; // Just above water surface
    waterMesh.frustumCulled = false; // Don't cull
    waterMesh.renderOrder = 10; // Render on top
    rapidsGroup.add(waterMesh);

    console.log('🔥🔥🔥 RAPIDS MESH CREATED v41 🔥🔥🔥 - position y:', waterMesh.position.y, 'size:', rapidsWidth, 'x', rapidsLength);

    // Add rocks with clear path
    const numRocks = 8 + Math.floor(Math.random() * 5);
    const pathWidth = 8;

    for (let i = 0; i < numRocks; i++) {
        const rockSize = 1.5 + Math.random() * 2;
        const rockGeom = new THREE.DodecahedronGeometry(rockSize, 1);
        const rockMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.95,
            metalness: 0.0
        });
        const rock = new THREE.Mesh(rockGeom, rockMat);

        const side = Math.random() < 0.5 ? -1 : 1;
        const minDistanceFromCenter = pathWidth / 2 + rockSize;
        const maxDistanceFromCenter = 12;
        const distanceFromCenter = minDistanceFromCenter + Math.random() * (maxDistanceFromCenter - minDistanceFromCenter);

        rock.position.set(
            side * distanceFromCenter,
            -0.3,
            (Math.random() - 0.5) * rapidsLength
        );
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        rapidsGroup.add(rock);
    }

    // Add GPU particle spray system
    const spraySystem = createSpraySystem(renderer, new THREE.Vector3(0, 0.5, 0));
    spraySystem.emitterSpread = 3.0;
    rapidsGroup.add(spraySystem.getMesh());

    rapidsGroup.position.z = z;
    rapidsGroup.userData = {
        type: 'shader_rapids',
        damage: 5,  // Less damage - gradual instead of instant death
        length: rapidsLength,
        waterMaterial: waterMaterial,
        spraySystem: spraySystem,
        turbulenceStrength: 0.5 + Math.random() * 0.5
    };

    return rapidsGroup;
};

// Create REAL WATERFALL with actual terrain elevation drop
const createShaderWaterfall = (z) => {
    const waterfallGroup = new THREE.Group();
    const dropHeight = 6;  // 6 meter drop
    const width = 35;
    const riverWidth = 30;

    console.log('🌊 Creating REAL waterfall with terrain drop at z=' + z);

    // ===== 1. UPPER WATER LEVEL (before the drop) =====
    const upperWaterGeometry = new THREE.PlaneGeometry(riverWidth, 25);
    const upperWater = new Water(upperWaterGeometry, {
        textureWidth: 256,
        textureHeight: 256,
        waterNormals: new THREE.TextureLoader().load(
            'https://threejs.org/examples/textures/waternormals.jpg',
            (texture) => {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }
        ),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x2F6B9A,
        distortionScale: 3.0,
        fog: scene.fog !== undefined
    });
    upperWater.rotation.x = -Math.PI / 2;
    upperWater.position.set(0, 0, -12.5);  // Extends upstream
    waterfallGroup.add(upperWater);

    // ===== 2. CLIFF FACE (the drop) =====
    const cliffGeometry = new THREE.BoxGeometry(width, dropHeight, 3);
    const cliffMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a3a3a,
        roughness: 0.95,
        metalness: 0.0
    });
    const cliff = new THREE.Mesh(cliffGeometry, cliffMaterial);
    cliff.position.set(0, -dropHeight / 2, 0);
    cliff.castShadow = true;
    cliff.receiveShadow = true;
    waterfallGroup.add(cliff);

    // ===== 3. FALLING WATER SHEET (shader waterfall effect) =====
    const fallGeometry = new THREE.PlaneGeometry(riverWidth * 0.9, dropHeight, 32, 64);
    const fallMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(WaterfallShader.uniforms),
        vertexShader: WaterfallShader.vertexShader,
        fragmentShader: WaterfallShader.fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    fallMaterial.uniforms.waterColor.value.set(0.7, 0.9, 1.0);
    fallMaterial.uniforms.foamColor.value.set(1.0, 1.0, 1.0);
    fallMaterial.uniforms.opacity.value = 0.85;
    fallMaterial.uniforms.flowSpeed.value = 2.5;

    const waterfall = new THREE.Mesh(fallGeometry, fallMaterial);
    waterfall.position.set(0, -dropHeight / 2, 1.5);
    waterfallGroup.add(waterfall);

    // ===== 4. LOWER WATER LEVEL (after the drop) =====
    const lowerWaterGeometry = new THREE.PlaneGeometry(riverWidth, 35);
    const lowerWater = new Water(lowerWaterGeometry, {
        textureWidth: 256,
        textureHeight: 256,
        waterNormals: new THREE.TextureLoader().load(
            'https://threejs.org/examples/textures/waternormals.jpg',
            (texture) => {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }
        ),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x2F6B9A,
        distortionScale: 3.0,
        fog: scene.fog !== undefined
    });
    lowerWater.rotation.x = -Math.PI / 2;
    lowerWater.position.set(0, -dropHeight, 20);  // Extends downstream, LOWER
    waterfallGroup.add(lowerWater);

    // ===== 5. FOAM POOL at bottom =====
    const foamGeometry = new THREE.PlaneGeometry(riverWidth, 8);
    const foamMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        emissive: 0xffffff,
        emissiveIntensity: 0.2
    });
    const foam = new THREE.Mesh(foamGeometry, foamMaterial);
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(0, -dropHeight + 0.2, 4);
    waterfallGroup.add(foam);

    // ===== 6. PARTICLES =====
    const mist = createMistSystem(renderer, new THREE.Vector3(0, 0, 0));
    waterfallGroup.add(mist.getMesh());

    const splash = createSplashSystem(renderer, new THREE.Vector3(0, -dropHeight, 2));
    splash.emissionRate = 150;
    waterfallGroup.add(splash.getMesh());

    waterfallGroup.position.z = z;
    waterfallGroup.userData = {
        type: 'shader_waterfall',
        damage: 20,
        dropHeight: dropHeight,
        waterMaterial: fallMaterial,
        upperWater: upperWater,
        lowerWater: lowerWater,
        topMist: mist,
        bottomSplash: splash
    };

    console.log('✅ Waterfall created with upper water y=0, lower water y=' + (-dropHeight));

    return waterfallGroup;
};

// Create floating log/root obstacle
const createLog = (lane, z, waterLevel = 0) => {
    const logGroup = new THREE.Group();

    // Main log
    const logGeometry = new THREE.CylinderGeometry(0.4, 0.5, 6, 12);
    const logMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a2511,
        roughness: 0.9
    });
    const log = new THREE.Mesh(logGeometry, logMaterial);
    log.rotation.z = Math.PI / 2; // Horizontal
    log.rotation.y = (Math.random() - 0.5) * 0.5; // Slight angle
    log.position.y = 0.2; // Floating on water
    log.castShadow = true;
    logGroup.add(log);

    // Add some branch stubs
    for (let i = 0; i < 3; i++) {
        const branchGeometry = new THREE.CylinderGeometry(0.15, 0.1, 1, 6);
        const branch = new THREE.Mesh(branchGeometry, logMaterial);
        branch.position.set(
            (Math.random() - 0.5) * 4,
            0.3,
            (Math.random() - 0.5) * 0.5
        );
        branch.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        logGroup.add(branch);
    }

    // Position at correct water level
    logGroup.position.set(lane, waterLevel, z);
    logGroup.userData = { type: 'log', damage: 15, rotationSpeed: 0.01 };

    return logGroup;
};

// Create bird of prey
const createBird = (lane, z) => {
    const birdGroup = new THREE.Group();

    // Bird body
    const bodyGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    bodyGeometry.scale(1, 0.8, 1.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2511 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 5;
    body.castShadow = true;
    birdGroup.add(body);

    // Wings
    const wingGeometry = new THREE.BoxGeometry(3, 0.2, 1);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.y = 5;
    wings.castShadow = true;
    birdGroup.add(wings);

    // Beak
    const beakGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
    const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 5, -0.8);
    birdGroup.add(beak);

    birdGroup.position.set(lane, 0, z);
    birdGroup.userData = {
        type: 'bird',
        damage: 30,
        height: 5,
        swooping: false,
        swoopSpeed: 0
    };

    return birdGroup;
};

// Create wildlife (bear on shore)
const createWildlife = (side, z) => {
    const wildlifeGroup = new THREE.Group();

    // Simple bear shape
    const bodyGeometry = new THREE.BoxGeometry(1.5, 1.2, 2);
    const furMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2511 });
    const body = new THREE.Mesh(bodyGeometry, furMaterial);
    body.position.y = 1;
    body.castShadow = true;
    wildlifeGroup.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    const head = new THREE.Mesh(headGeometry, furMaterial);
    head.position.set(0, 1.5, -1.2);
    head.castShadow = true;
    wildlifeGroup.add(head);

    // Ears
    const earGeometry = new THREE.ConeGeometry(0.2, 0.3, 8);
    const leftEar = new THREE.Mesh(earGeometry, furMaterial);
    leftEar.position.set(-0.3, 2, -1.2);
    wildlifeGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeometry, furMaterial);
    rightEar.position.set(0.3, 2, -1.2);
    wildlifeGroup.add(rightEar);

    const xPosition = side === 'left' ? -12 : 12;
    wildlifeGroup.position.set(xPosition, 0, z);
    wildlifeGroup.userData = {
        type: 'wildlife',
        side: side,
        lunging: false
    };

    return wildlifeGroup;
};

// Input handling - copied from reference game
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    // Spacebar for jump
    if (e.key === ' ' && !gameState.isJumping && gameState.isPlaying) {
        e.preventDefault();
        gameState.isJumping = true;
        gameState.jumpVelocity = 0.25; // Initial jump velocity
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mobile controls
const buttonState = { left: false, right: false, gas: false, brake: false };

const initMobileControls = () => {
    const mobileControls = document.getElementById('mobileControls');
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const gasBtn = document.getElementById('gasBtn');
    const brakeBtn = document.getElementById('brakeBtn');

    if (isMobile && mobileControls) {
        mobileControls.style.display = 'flex';
    }

    if (leftBtn) {
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            buttonState.left = true;
        });
        leftBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            buttonState.left = false;
        });
    }

    if (rightBtn) {
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            buttonState.right = true;
        });
        rightBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            buttonState.right = false;
        });
    }

    if (gasBtn) {
        gasBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            buttonState.gas = true;
        });
        gasBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            buttonState.gas = false;
        });
    }

    if (brakeBtn) {
        brakeBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            buttonState.brake = true;
        });
        brakeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            buttonState.brake = false;
        });
    }
};

// Touch swipe controls
const touchState = {
    active: false,
    startX: 0,
    currentX: 0,
    direction: 0,
    intensity: 0
};

window.addEventListener('touchstart', (e) => {
    if (!gameState.isPlaying) return;
    touchState.active = true;
    touchState.startX = e.touches[0].clientX;
    touchState.currentX = e.touches[0].clientX;
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (!gameState.isPlaying || !touchState.active) return;
    touchState.currentX = e.touches[0].clientX;
    const deltaX = touchState.currentX - touchState.startX;

    if (Math.abs(deltaX) > 10) {
        touchState.direction = deltaX < 0 ? -1 : 1;
        touchState.intensity = Math.min(Math.abs(deltaX) / 100, 1);
    } else {
        touchState.direction = 0;
        touchState.intensity = 0;
    }
}, { passive: true });

window.addEventListener('touchend', () => {
    touchState.active = false;
    touchState.direction = 0;
    touchState.intensity = 0;
});

// Initialize game
const init = () => {
    duck = createDuck();
    duck.position.y = gameState.baseHeight; // Start at correct water level
    scene.add(duck);

    // Create REAL 3D water with shaders!
    createRealWater();

    // DISABLED: Complex terrain creation (causing performance issues)
    // createRiverBanks();

    // Create simple static canyon walls for visual context
    console.log('🏔️ Creating canyon walls...');
    const wallHeight = 40;
    const wallLength = 2000;
    const wallThickness = 10;
    const wallDistance = 25; // Distance from river center

    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b7355,
        roughness: 0.9,
        metalness: 0.0
    });

    // Left wall
    const leftWallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, wallLength);
    const leftWall = new THREE.Mesh(leftWallGeom, wallMaterial);
    leftWall.position.set(-wallDistance, wallHeight / 2 - 20, -wallLength / 2);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall
    const rightWallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, wallLength);
    const rightWall = new THREE.Mesh(rightWallGeom, wallMaterial);
    rightWall.position.set(wallDistance, wallHeight / 2 - 20, -wallLength / 2);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    console.log('✅ Canyon walls created');

    // Pre-generate SHADER-BASED rapids and waterfalls for visual interest
    console.log('🌊 Creating shader-based white water effects...');

    // ===== FINAL: DRAMATIC 20-FOOT WATERFALL WITH SHADER WATER =====
    console.log('🌊 Creating DRAMATIC waterfall at z=-200 with shader water');

    const dropZ = -200; // TESTING: Moved to 200m for faster testing
    const dropHeight = 30; // 30 feet = ~9 meters - DRAMATIC!
    const riverWidth = 30;
    const cliffWidth = 50;

    // Skip upper water - use existing cycling water sections
    console.log('✅ Using existing cycling water (flows to cliff edge at z=' + dropZ + ')');

    // ===== 2. CLIFF FACE (vertical drop) =====
    const cliffGeom = new THREE.BoxGeometry(cliffWidth, dropHeight, 3);
    const cliffMat = new THREE.MeshStandardMaterial({
        color: 0x3a3a3a,
        roughness: 0.95,
        metalness: 0.0
    });
    const cliff = new THREE.Mesh(cliffGeom, cliffMat);
    cliff.position.set(0, -dropHeight / 2, dropZ + 1.5); // Behind waterfall
    cliff.castShadow = true;
    cliff.receiveShadow = true;
    scene.add(cliff);

    // ===== 3. WATERFALL SHEET (cascading down) - BRIGHT AND VISIBLE =====
    const waterfallGeom = new THREE.PlaneGeometry(riverWidth, dropHeight, 32, 64);
    const waterfallMat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(WaterfallShader.uniforms),
        vertexShader: WaterfallShader.vertexShader,
        fragmentShader: WaterfallShader.fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    waterfallMat.uniforms.waterColor.value.set(0.7, 0.9, 1.0); // Bright blue
    waterfallMat.uniforms.foamColor.value.set(1.0, 1.0, 1.0); // White foam
    waterfallMat.uniforms.opacity.value = 0.95; // More opaque
    waterfallMat.uniforms.flowSpeed.value = 4.0; // Fast flow

    const waterfallSheet = new THREE.Mesh(waterfallGeom, waterfallMat);
    waterfallSheet.position.set(0, -dropHeight / 2, dropZ); // Top at y=0, bottom at y=-dropHeight
    waterfallSheet.renderOrder = 100; // Render on top
    waterfallSheet.frustumCulled = false; // Always render
    scene.add(waterfallSheet);
    waterSections.push({ material: waterfallMat, isCascade: true });
    console.log('✅ WATERFALL POSITIONED: z=' + dropZ + ' (will be seen at distance=' + Math.abs(dropZ) + 'm)');
    console.log('   Top: y=0, z=' + dropZ);
    console.log('   Bottom: y=' + (-dropHeight) + ', z=' + dropZ);

    // ===== 4. LOWER SHADER WATER (cycling sections at lower elevation) =====
    console.log('🌊 Creating MULTIPLE lower water sections for infinite flow...');

    // Create 5 cycling lower water sections (same as upper water)
    const lowerWaterLength = 300; // Match upper section length
    for (let i = 0; i < 5; i++) {
        const lowerWaterGeom = new THREE.PlaneGeometry(riverWidth, lowerWaterLength);
        const lowerWater = new Water(lowerWaterGeom, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load(
                'https://threejs.org/examples/textures/waternormals.jpg',
                (texture) => {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }
            ),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x4a6b5c,
            distortionScale: 3.5,
            fog: scene.fog !== undefined
        });
        lowerWater.rotation.x = -Math.PI / 2;
        lowerWater.position.y = -dropHeight; // At lower elevation
        // Start the first section right at the waterfall drop, spread others downstream
        lowerWater.position.z = dropZ - (i * lowerWaterLength) - lowerWaterLength / 2;
        lowerWater.userData.isLowerWater = true; // Tag for cycling logic
        scene.add(lowerWater);
        waterSections.push(lowerWater);
        console.log(`  ✅ Lower water section ${i+1}: y=${-dropHeight}, z=${lowerWater.position.z}`);
    }
    console.log('✅ All 5 lower water sections created for continuous flow');

    console.log('✅✅ WATERFALL COMPLETE: Upper water (y=0) → Waterfall → Lower water (y=' + (-dropHeight) + ')');

    // DISABLED FOR TESTING
    console.log('⚠️ Rapids DISABLED for waterfall testing');
    console.log('⚠️ Old waterfall effects DISABLED for waterfall testing');
    console.log(`✅ Testing ONE waterfall at z=${dropZ}`);

    // Old river segments no longer needed with real water
    // riverSegments array kept for compatibility but not used

    // Camera position - higher and angled for better river view
    camera.position.set(0, 12, 18); // Higher and further back
    camera.lookAt(0, 0, -10); // Look slightly ahead
};

// Start game
const startGame = () => {
    gameState.isPlaying = true;
    gameState.health = 100;
    gameState.distance = 0;
    gameState.score = 0;
    gameState.speed = gameState.targetSpeed;
    gameState.duckPosition = 0;
    gameState.startTime = Date.now();

    // Clear existing obstacles
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles.length = 0;

    document.getElementById('startScreen').classList.add('hidden');
    updateHUD();
};

// End game
const endGame = () => {
    gameState.isPlaying = false;

    const resultText = document.getElementById('resultText');
    const finalScore = document.getElementById('finalScore');

    if (gameState.health <= 0) {
        resultText.textContent = 'Your duck sank!';
    } else {
        resultText.textContent = 'Great race!';
    }

    finalScore.textContent = `Final Score: ${gameState.score} | Distance: ${Math.floor(gameState.distance)}m`;

    document.getElementById('endScreen').classList.remove('hidden');
};

// Update HUD
const updateHUD = () => {
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('health').textContent = Math.max(0, Math.floor(gameState.health));
    document.getElementById('distance').textContent = Math.floor(gameState.distance);
    document.getElementById('score').textContent = gameState.score;
};

// Collision detection
const checkCollision = (obj1, obj2, threshold = 2) => {
    const dx = obj1.position.x - obj2.position.x;
    const dz = obj1.position.z - obj2.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance < threshold;
};

// Game loop
const gameLoop = () => {
    if (gameState.isPlaying) {
        // Duck controls - using same logic as truck from reference game
        let moveSpeed = 0.15;

        // Keyboard controls
        if (keys['arrowleft'] || keys['a']) {
            gameState.duckPosition -= moveSpeed;
        }
        if (keys['arrowright'] || keys['d']) {
            gameState.duckPosition += moveSpeed;
        }

        // Virtual button controls (mobile)
        if (buttonState.left) {
            gameState.duckPosition -= moveSpeed;
        }
        if (buttonState.right) {
            gameState.duckPosition += moveSpeed;
        }

        // Touch swipe controls (mobile)
        if (touchState.active && touchState.direction !== 0) {
            const touchMoveSpeed = moveSpeed * (0.5 + touchState.intensity * 0.5);
            gameState.duckPosition += touchState.direction * touchMoveSpeed;
        }

        // Speed controls
        if (keys['arrowup'] || keys['w'] || buttonState.gas) {
            gameState.speed = Math.min(0.8, gameState.speed + 0.01);
        } else if (keys['arrowdown'] || keys['s'] || buttonState.brake) {
            gameState.speed = Math.max(0.1, gameState.speed - 0.02);
        } else {
            // Gradually return to target speed
            if (gameState.speed < gameState.targetSpeed) {
                gameState.speed = Math.min(gameState.targetSpeed, gameState.speed + 0.005);
            } else if (gameState.speed > gameState.targetSpeed) {
                gameState.speed = Math.max(gameState.targetSpeed, gameState.speed - 0.005);
            }
        }

        // Update wave time
        gameState.waveTime += 0.02;

        // ===== DETERMINE CURRENT WATER LEVEL (upper or lower) =====
        const DROP_Z = -200; // TESTING: Waterfall at 200m for faster testing
        const DROP_HEIGHT = 30;
        const currentWaterLevel = duck.position.z < DROP_Z ? -DROP_HEIGHT : 0;

        // Debug logging (log more frequently to track the issue)
        if (Math.random() < 0.05) {
            const targetDuckY = currentWaterLevel + gameState.baseHeight;
            console.log(`Distance: ${gameState.distance.toFixed(0)}m | Duck z=${duck.position.z.toFixed(1)}, y=${duck.position.y.toFixed(2)} | waterLevel=${currentWaterLevel} | targetY=${targetDuckY.toFixed(2)} | Camera y=${camera.position.y.toFixed(1)}`);
        }

        // Log when approaching waterfall (adjusted for 200m position)
        if (duck.position.z < -180 && duck.position.z > -220) {
            console.log(`🌊 WATERFALL ZONE: Distance=${gameState.distance.toFixed(0)}m, Duck z=${duck.position.z.toFixed(1)}, y=${duck.position.y.toFixed(2)}, waterLevel=${currentWaterLevel}`);
        }

        // ===== PHYSICS-BASED 3D WAVE INTERACTION =====
        // Check if duck is falling over waterfall (skip wave physics during fall)
        const FALL_TRIGGER_Z = DROP_Z + 2;
        const isFalling = duck.position.z < FALL_TRIGGER_Z && duck.position.y > currentWaterLevel + gameState.baseHeight;

        if (gameState.isJumping) {
            // Jump physics
            gameState.jumpHeight += gameState.jumpVelocity;
            gameState.jumpVelocity -= 0.015; // Gravity

            // Land back on water
            if (gameState.jumpHeight <= 0) {
                gameState.jumpHeight = 0;
                gameState.isJumping = false;
                gameState.jumpVelocity = 0;
            }

            duck.position.y = currentWaterLevel + gameState.baseHeight + gameState.jumpHeight;
            duck.rotation.x = gameState.jumpVelocity * 0.5;
        } else if (!isFalling) {
            // REAL 3D WAVE FORCES - Waves push the duck around (but NOT when falling!)
            const forces = getWaveForces(duck.position.x, duck.position.z, gameState.waveTime);

            // Apply lateral wave forces (waves push duck sideways)
            gameState.duckVelocityX += forces.x * 0.08;

            // Apply buoyancy/vertical forces
            const waveHeight = getWaveHeight(duck.position.x, duck.position.z, gameState.waveTime);
            const targetY = currentWaterLevel + gameState.baseHeight + waveHeight;
            gameState.duckVelocityY += (targetY - duck.position.y) * 0.12;

            // Apply drag/damping for realistic motion
            gameState.duckVelocityX *= 0.92; // Water resistance
            gameState.duckVelocityY *= 0.88; // Vertical damping

            // Update duck position with physics
            gameState.duckPosition += gameState.duckVelocityX;
            duck.position.y += gameState.duckVelocityY;

            // Apply player steering on top of wave forces
            gameState.duckPosition = Math.max(-8, Math.min(8, gameState.duckPosition));
            duck.position.x = gameState.duckPosition;

            // ANGULAR MOTION - Waves create torque/rotation
            const slope = getWaveSlope(duck.position.x, duck.position.z, gameState.waveTime);

            // Apply torque from wave slopes
            gameState.duckAngularVelX += -slope.z * 0.015; // Pitch torque
            gameState.duckAngularVelZ += slope.x * 0.015;  // Roll torque

            // Damping on angular velocity
            gameState.duckAngularVelX *= 0.90;
            gameState.duckAngularVelZ *= 0.90;

            // Update rotation
            gameState.duckRotationX += gameState.duckAngularVelX;
            gameState.duckRotationZ += gameState.duckAngularVelZ;

            // Apply limits and spring back to level
            gameState.duckRotationX *= 0.95; // Spring back
            gameState.duckRotationZ *= 0.95;

            duck.rotation.x = gameState.duckRotationX;
            duck.rotation.z = gameState.duckRotationZ;

            // Create splashes when duck moves through waves
            const verticalSpeed = Math.abs(gameState.duckVelocityY);
            const lateralSpeed = Math.abs(gameState.duckVelocityX);
            const splashIntensity = (verticalSpeed * 2 + lateralSpeed) * 0.5;

            if (splashIntensity > 0.05 && Math.random() < 0.3) {
                createSplash(duck.position.x, duck.position.y - 0.2, duck.position.z, splashIntensity);
            }
        }

        // Update splash particles
        updateSplashParticles();

        // Update REAL 3D water animation
        updateRealWater();

        // Track distance traveled
        gameState.distance += gameState.speed;
        gameState.score = Math.floor(gameState.distance * 10);

        // Check for level progression
        const newLevel = Math.floor(gameState.distance / gameState.levelThreshold) + 1;
        if (newLevel > gameState.level) {
            gameState.level = newLevel;
            console.log(`🎉 LEVEL UP! Now at Level ${gameState.level}`);

            // Increase difficulty
            gameState.targetSpeed += 0.1; // Faster current
            gameState.speed = gameState.targetSpeed;

            // Visual feedback (could add screen flash, sound, etc.)
            // TODO: Add level-up celebration effects
        }

        // Move duck forward
        duck.position.z -= gameState.speed;

        // ===== WATERFALL DROP ZONE PHYSICS - DRAMATIC FREE FALL =====
        // When duck passes the cliff edge, it should free-fall through the air!
        // (FALL_TRIGGER_Z and isFalling already defined above in wave physics section)

        // Track if we just started falling (for one-time damage)
        if (isFalling && duck.position.y > currentWaterLevel + gameState.baseHeight + 2) {
            // Duck is ABOVE the water, actively falling!

            // Apply damage once when first going over the edge
            if (!gameState.hasTakenWaterfallDamage) {
                const isPerfectJump = gameState.isJumping;

                if (isPerfectJump) {
                    console.log('🦆✨ PERFECT JUMP! Soaring over the waterfall!');
                    gameState.score += 50; // Bonus for perfect jump
                } else {
                    console.log('💦 Uh oh, going over the edge without jumping!');
                    gameState.health -= 20; // Big damage from the fall!
                }
                gameState.hasTakenWaterfallDamage = true;
            }

            // Check if duck was jumping when it went over the edge
            const isPerfectJump = gameState.isJumping;

            if (isPerfectJump) {
                // PERFECT JUMP! Smooth arc (jump physics already handled above)
                console.log(`🦆✨ Arcing gracefully! y=${duck.position.y.toFixed(1)}`);
            } else {
                // NOT jumping - free fall with tumbling
                gameState.duckVelocityY -= 0.5; // Gravity acceleration
                duck.position.y += gameState.duckVelocityY;

                // Add rotation for dramatic tumbling effect
                duck.rotation.x += 0.05;

                console.log(`🌊 FREE FALLING! y=${duck.position.y.toFixed(1)}, velocity=${gameState.duckVelocityY.toFixed(2)}`);
            }
        } else if (duck.position.y <= currentWaterLevel + gameState.baseHeight) {
            // Duck has landed on water - reset rotation and velocities
            duck.position.y = currentWaterLevel + gameState.baseHeight;
            duck.rotation.x = 0;
            gameState.duckVelocityY = 0;

            // Reset damage flag when safely back on water and past the fall zone
            if (duck.position.z < DROP_Z - 20) {
                gameState.hasTakenWaterfallDamage = false;
            }
        }

        // Camera follows duck - adjusted for river view AND elevation
        camera.position.z = duck.position.z + 18;
        // Camera follows duck's elevation (always 12 units above duck, even when below water)
        camera.position.y = duck.position.y + 12;
        camera.lookAt(duck.position.x, duck.position.y, duck.position.z - 10);

        // DISABLED: Moving terrain walls (causing performance issues and visual problems)
        // if (leftRiverbank && rightRiverbank) {
        //     leftRiverbank.position.z = camera.position.z;
        //     rightRiverbank.position.z = camera.position.z;
        // }
        // if (riverbedTerrain) {
        //     riverbedTerrain.position.z = camera.position.z;
        // }

        // Old river segment code removed - using real 3D water now

        // Spawn obstacles - logs and rapids (difficulty scales with level)
        const spawnRate = 0.02 + (gameState.level - 1) * 0.005; // Increase spawn rate per level
        if (Math.random() < spawnRate) {
            const spawnZ = camera.position.z - 80;
            let obstacle;

            // Calculate water level at spawn position
            const spawnWaterLevel = spawnZ < DROP_Z ? -DROP_HEIGHT : 0;

            // DISABLED: rapids and waterfalls for testing
            // Only spawn logs (at correct elevation)
            const lane = (Math.random() - 0.5) * 12;
            obstacle = createLog(lane, spawnZ, spawnWaterLevel);

            obstacles.push(obstacle);
            scene.add(obstacle);
        }

        // Spawn trees and rocks along river banks continuously
        if (Math.random() < 0.15) { // Frequent spawning for dense vegetation
            const side = Math.random() < 0.5 ? -1 : 1;
            const xPos = side * (30 + Math.random() * 6); // Outer edges
            const spawnZ = camera.position.z - 80;

            if (Math.random() < 0.7) {
                // Spawn tree
                const tree = createTree();
                tree.position.set(xPos, 8, spawnZ);
                scene.add(tree);
                obstacles.push(tree);
            } else {
                // Spawn rock cluster
                const rocks = createRockCluster();
                rocks.position.set(xPos, 2 + Math.random() * 4, spawnZ);
                scene.add(rocks);
                obstacles.push(rocks);
            }
        }

        // Update and check obstacles
        const deltaTime = 1 / 60; // Approximate frame time
        obstacles.forEach((obstacle, index) => {
            // Animate logs (slow spin in water)
            if (obstacle.userData.type === 'log') {
                obstacle.rotation.z += obstacle.userData.rotationSpeed;
            }

            // Animate SHADER-BASED rapids
            if (obstacle.userData.type === 'shader_rapids') {
                // Update shader time
                if (obstacle.userData.waterMaterial) {
                    obstacle.userData.waterMaterial.uniforms.time.value += deltaTime;
                }
                // Update particle system
                if (obstacle.userData.spraySystem) {
                    obstacle.userData.spraySystem.update(deltaTime);
                }
            }

            // Animate SHADER-BASED waterfalls
            if (obstacle.userData.type === 'shader_waterfall') {
                // Update shader time
                if (obstacle.userData.waterMaterial) {
                    obstacle.userData.waterMaterial.uniforms.time.value += deltaTime;
                }
                // Update upper and lower water animations
                if (obstacle.userData.upperWater) {
                    obstacle.userData.upperWater.material.uniforms['time'].value += deltaTime;
                }
                if (obstacle.userData.lowerWater) {
                    obstacle.userData.lowerWater.material.uniforms['time'].value += deltaTime;
                }
                // Update particle systems
                if (obstacle.userData.topMist) {
                    obstacle.userData.topMist.update(deltaTime);
                }
                if (obstacle.userData.bottomSplash) {
                    obstacle.userData.bottomSplash.update(deltaTime);
                }
            }

            // Animate rapids spray particles
            if (obstacle.userData.type === 'rapids' && obstacle.userData.spray) {
                const positions = obstacle.userData.spray.attributes.position.array;
                const velocities = obstacle.userData.spray.attributes.velocity.array;
                const gravity = 0.02;

                for (let i = 0; i < positions.length; i += 3) {
                    // Apply gravity
                    velocities[i + 1] -= gravity;

                    // Update positions
                    positions[i] += velocities[i];
                    positions[i + 1] += velocities[i + 1];
                    positions[i + 2] += velocities[i + 2];

                    // Reset particle if it falls below water or drifts too far
                    if (positions[i + 1] < 0 || Math.abs(positions[i]) > 20) {
                        positions[i] = (Math.random() - 0.5) * 30;
                        positions[i + 1] = Math.random() * 2;
                        positions[i + 2] = (Math.random() - 0.5) * obstacle.userData.length;
                        velocities[i] = (Math.random() - 0.5) * 0.4;
                        velocities[i + 1] = Math.random() * 0.8 + 0.3;
                        velocities[i + 2] = (Math.random() - 0.5) * 0.3;
                    }
                }

                obstacle.userData.spray.attributes.position.needsUpdate = true;

                // Animate foam surface
                if (obstacle.userData.foamMesh) {
                    obstacle.userData.foamMesh.position.y = 0.3 + Math.sin(Date.now() * 0.003) * 0.1;
                }
            }

            // Animate birds
            if (obstacle.userData.type === 'bird') {
                obstacle.children[1].rotation.y = Math.sin(Date.now() * 0.01) * 0.3;

                // Swoop down if duck is near
                if (!obstacle.userData.swooping &&
                    Math.abs(obstacle.position.z - duck.position.z) < 15 &&
                    Math.abs(obstacle.position.x - duck.position.x) < 3) {
                    obstacle.userData.swooping = true;
                    obstacle.userData.swoopSpeed = 0.2;
                }

                if (obstacle.userData.swooping) {
                    obstacle.children.forEach(child => {
                        child.position.y -= obstacle.userData.swoopSpeed;
                    });
                    obstacle.userData.height -= obstacle.userData.swoopSpeed;

                    if (obstacle.userData.height < 1) {
                        obstacle.userData.swoopSpeed = -0.1;
                    }
                    if (obstacle.userData.height > 5) {
                        obstacle.userData.swooping = false;
                    }
                }
            }

            // Wildlife lunges
            if (obstacle.userData.type === 'wildlife' && !obstacle.userData.lunging) {
                if (Math.abs(obstacle.position.z - duck.position.z) < 10) {
                    obstacle.userData.lunging = true;
                    const targetX = duck.position.x;
                    const currentX = obstacle.position.x;
                    obstacle.userData.lungeDirection = targetX > currentX ? 1 : -1;
                }
            }

            if (obstacle.userData.lunging) {
                obstacle.position.x += obstacle.userData.lungeDirection * 0.3;
            }

            // Rapids physics - push duck around with turbulence!
            if (obstacle.userData.type === 'rapids' || obstacle.userData.type === 'shader_rapids') {
                const duckDist = Math.abs(duck.position.z - obstacle.position.z);
                const duckX = Math.abs(duck.position.x);

                // Tighter collision zone - must be IN the rapids area (within length/5 and horizontally centered)
                if (duckDist < obstacle.userData.length / 5 && duckX < 20) {
                    // Duck is in the rapids!
                    const turbulence = obstacle.userData.turbulenceStrength;

                    // Random lateral forces from turbulent water
                    const lateralForce = (Math.random() - 0.5) * turbulence * 0.3;
                    gameState.duckVelocityX += lateralForce;

                    // Vertical bobbing in rough water
                    gameState.duckVelocityY += (Math.random() - 0.5) * turbulence * 0.15;

                    // Rotate duck from turbulence
                    gameState.duckAngularVelX += (Math.random() - 0.5) * turbulence * 0.02;
                    gameState.duckAngularVelZ += (Math.random() - 0.5) * turbulence * 0.03;

                    // Gradual damage from rough water - only 2% chance per frame
                    if (Math.random() < 0.02) {
                        gameState.health -= 1;
                    }
                }
            }

            // Shader waterfall physics - dramatic drop!
            if (obstacle.userData.type === 'shader_waterfall') {
                const duckDist = Math.abs(duck.position.z - obstacle.position.z);
                if (duckDist < 8 && !obstacle.userData.hasHitDuck) {
                    // Duck goes over waterfall!
                    const dropHeight = obstacle.userData.dropHeight;

                    gameState.duckVelocityY = -2.0; // Big downward velocity
                    gameState.health -= obstacle.userData.damage;

                    // Spin the duck!
                    gameState.duckAngularVelX += 0.2;
                    gameState.duckAngularVelZ += 0.15;

                    obstacle.userData.hasHitDuck = true;
                    setTimeout(() => { obstacle.userData.hasHitDuck = false; }, 2000);
                }
            }

            // Collision detection - check for obstacles
            if (checkCollision(duck, obstacle)) {
                if (obstacle.userData.type === 'rapids' || obstacle.userData.type === 'shader_rapids') {
                    // Rapids already handled above with physics
                    // Extra damage if you hit a rock
                    gameState.health -= obstacle.userData.damage || 15;
                    gameState.score -= 20;
                } else if (obstacle.userData.type === 'shader_waterfall') {
                    // Waterfall already handled above
                } else {
                    // Regular obstacles - check if duck can jump over
                    const isHighEnough = gameState.jumpHeight > 1.5;

                    if (!isHighEnough) {
                        gameState.health -= obstacle.userData.damage || 10;
                        gameState.score -= 50;

                        // Remove obstacle after collision
                        scene.remove(obstacle);
                        obstacles.splice(index, 1);
                    } else {
                        // Successfully jumped over! Bonus points
                        gameState.score += 100;
                    }
                }
            }

            // Remove obstacles that are too far behind
            if (obstacle.position.z - camera.position.z > 30) {
                scene.remove(obstacle);
                obstacles.splice(index, 1);
            }
        });

        // Check if health depleted
        if (gameState.health <= 0) {
            endGame();
        }

        updateHUD();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
};

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// UI Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', () => {
        document.getElementById('endScreen').classList.add('hidden');
        startGame();
    });

    initMobileControls();
    init();
    gameLoop();
});
