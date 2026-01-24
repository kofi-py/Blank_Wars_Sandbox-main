import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { Water as WaterOld } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Water.js';
import { Water as Water2 } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Water2.js';
import { Reflector } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Reflector.js';
import { Refractor } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Refractor.js';
import { Sky } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Sky.js';
import { WaterfallShader } from './WaterfallShader.js?v=41';
import { RapidsShader } from './RapidsShader.js?v=41';
import { WaterParticleSystem, createSplashSystem, createMistSystem, createSpraySystem } from './ParticleSystem.js?v=41';
import { SplinePathSystem } from './SplinePathSystem_v2.js';

// CDN base URL for 3D models
const MODEL_CDN_BASE = 'https://cdn.jsdelivr.net/gh/Green003-CPAIOS/blank-wars-models@main/minigames/rubber-duck-river-race/';

// Game state
const gameState = {
    isPlaying: false,
    health: 100,
    distance: 0,
    score: 0,
    speed: 0,
    targetSpeed: 0.4,
    duckPosition: 0, // Lateral position (left/right)
    startTime: 0,
    isJumping: false,
    jumpVelocity: 0,
    jumpHeight: 0,
    baseHeight: 0.2, // Duck sits ON water surface (was -0.4 which was underwater!)
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
    hasTakenWaterfallDamage: false,
    // Grace period to prevent immediate damage on start
    startGracePeriod: 0,
    // Invincibility frames after taking damage (prevents getting stuck on rocks)
    invincibilityFrames: 0,
    // 🎢 SPLINE PATH SYSTEM
    splineT: 0, // Position on spline (0.0 to 1.0)
    currentSection: null, // Current themed section
    // Paddle boost mechanic
    paddleBoost: 0, // Current paddle boost multiplier
    lastPaddleTime: 0, // Last time space was pressed for paddling
    paddleTapCount: 0, // Number of recent taps
    // 🏁 Duck Racing
    position: 1, // Current race position
    totalDucks: 2000, // Total ducks in race
    duckNumber: null // Player's duck number
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

// 🎢 Spline Path System for curved log flume course
let splinePath = null;

// 🦅 Eagle variables (module-level scope)
let eagle = null;
let eagleHasAttacked = false;
let eagleAttackTime = 0;
let eagleHasGrabbedDuck = false;
let eagleGrabTime = 0; // Track when duck was grabbed
let duckOriginalPosition = null;
let eagleCirclePhase = 0; // Track circling animation

// 🦅 Eagle swooping arc variables
let eagleSwoopStartPos = null; // Starting position of swoop (high up)
let eagleSwoopTargetX = 0; // Duck's X position when attack started
let eagleSwoopTargetZ = 0; // Duck's Z position when attack started
let eagleSwoopWaterLevel = 0; // Water level at attack point
let eagleSwoopHasTouchedWater = false; // Track if eagle's claws hit water
let eagleCommittedX = null; // X position eagle commits to (stops tracking after this)
let eagleHasCommitted = false; // Has eagle committed to attack lane?

// 🦆 Duck dramatic fall variables
let duckIsFalling = false; // Track if duck is in dramatic fall
let duckFallVelocity = 0; // Vertical fall velocity
let duckFallStartY = 0; // Y position where fall started

// 🦆🦆🦆 Competitor Ducks System
let competitorDucks = []; // Array of all competitor ducks
const NUM_COMPETITORS = 10; // Number of competitor ducks
const DUCK_COLORS = [
    0xB0E0E6,  // Powder blue
    0x7FDBDA,  // Light teal
    0xC2B280,  // Sand
    0xFFDAB9,  // Peach
    0xFFB6C1,  // Blush pink
    0xFFFDD0,  // Cream
    0xF5F5DC,  // Light beige
    0x87CEEB,  // Sky blue
    0xFBCEB1,  // Apricot
    0xFFC0D9   // Rosewater
];

// 🏁 Finish line cutscene variables
let finishLineCutsceneActive = false;
let finishLineCutsceneStartTime = 0;
let finishLineCameraPosition = null;
let originalCameraPosition = null;

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
    // DISABLED: Old Z-based water cycling and animation
    // The new spline-based water sections are animated in the main game loop
    // This function is kept for legacy compatibility but does nothing now
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
    // Use the spline's actual elevation to make terrain follow the drops
    if (!splinePath) return 0;

    const distance = Math.abs(z); // Distance along path
    const t = splinePath.distanceToT(distance);
    const pathPoint = splinePath.getPointAt(t);

    return pathPoint.y; // Return actual spline elevation
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

    // DISABLED: Bank decoration rocks - textures fail to load (404 errors)
    // addBankDetails(leftRiverbank, rightRiverbank);

    // CREATE NATURAL 3D RIVERBED TERRAIN (under water)
    createRiverbed();

    // Add 3D vegetation and scenery
    addVegetation();

    // Add clouds to the sky
    addClouds();
};

// Add realistic rock outcroppings and terrain details to river banks
const addBankDetails = (leftBank, rightBank) => {
    // Simple rock material - no external textures needed
    const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B7355, // Brown-grey rock color
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
    // DISABLED - doesn't follow curved path, blocks view at curves
    // scene.add(riverbedTerrain);

    console.log('✅ Natural riverbed terrain created with Perlin noise!');
};

// Add clouds to the sky
const addClouds = () => {
    const cloudMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });

    // Create 30-40 clouds scattered around the sky
    for (let i = 0; i < 35; i++) {
        // Each cloud is a group of spheres
        const cloud = new THREE.Group();

        // 3-6 puffs per cloud
        const numPuffs = 3 + Math.floor(Math.random() * 4);
        for (let j = 0; j < numPuffs; j++) {
            const puffSize = 8 + Math.random() * 6;
            const puffGeometry = new THREE.SphereGeometry(puffSize, 8, 8);
            const puff = new THREE.Mesh(puffGeometry, cloudMaterial);

            puff.position.set(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 15
            );

            puff.scale.set(1, 0.6 + Math.random() * 0.3, 1); // Flatten slightly
            cloud.add(puff);
        }

        // Position clouds high in the sky, spread out
        cloud.position.set(
            (Math.random() - 0.5) * 200, // Spread across width
            40 + Math.random() * 30,     // High in sky (40-70 units up)
            (Math.random() - 0.5) * 2000 // Along the course
        );

        scene.add(cloud);
    }

    console.log('☁️ Added clouds to the sky!');
};

// Add 3D trees, rocks, and natural scenery
const addVegetation = () => {
    // Simple rock material - no external textures needed
    const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B7355, // Brown-grey rock color
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

    // Simple rock material - no external textures needed
    const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B7355, // Brown-grey rock color
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
loader.load(MODEL_CDN_BASE + 'Rubber_Ducky_1111020056_texture.glb', (gltf) => {
    duckModel = gltf.scene;

    // DEBUG: Check model bounds
    const box = new THREE.Box3().setFromObject(duckModel);
    const size = box.getSize(new THREE.Vector3());
    console.log(`📦 Duck model size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);

    // Scale and rotate new meshy.ai duck model
    duckModel.scale.set(1.5, 1.5, 1.5); // Larger scale for better visibility
    duckModel.rotation.x = 0;
    duckModel.rotation.y = Math.PI; // Face forward (down the river)
    duckModel.rotation.z = 0;

    // DEBUG: Log what textures the model is trying to load
    duckModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
                console.log('🔍 Material:', child.material.name || 'unnamed');
                if (child.material.map) console.log('  - Color map:', child.material.map.image?.src || 'embedded');
                if (child.material.normalMap) console.log('  - Normal map:', child.material.normalMap.image?.src || 'embedded');
                if (child.material.roughnessMap) console.log('  - Roughness map:', child.material.roughnessMap.image?.src || 'embedded');
            }
        }
    });

    duckModelLoaded = true;
    console.log('✅ New meshy.ai rubber duck model loaded successfully!');

    // If duck already exists (was created with fallback), replace it with the real model
    if (duck) {
        const oldPosition = duck.position.clone();
        const oldRotation = duck.rotation.clone();
        scene.remove(duck);
        duck = createDuck();
        duck.position.copy(oldPosition);
        duck.rotation.copy(oldRotation);
        scene.add(duck);
        console.log('🔄 Replaced fallback duck with new model');
    }
}, undefined, (error) => {
    console.error('❌ Error loading new duck model:', error);
});

// Add race number flag on pole to duck
const addNumberBadgeToDuck = (duckGroup, number) => {
    // Remove old flag assembly if exists
    const oldFlag = duckGroup.getObjectByName('flagAssembly');
    if (oldFlag) {
        duckGroup.remove(oldFlag);
    }

    // Create group for flag and pole
    const flagAssembly = new THREE.Group();
    flagAssembly.name = 'flagAssembly';

    // Thin wire pole - EXACT COPY from competitor duck code
    const poleHeight = 1.6;
    const poleRadius = 0.01;
    const poleGeometry = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 4);
    const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0xC0C0C0,
        roughness: 0.3,
        metalness: 0.9
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = poleHeight / 2;
    flagAssembly.add(pole);

    // Create canvas with number - EXACT COPY from competitor duck code
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 128, 90);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 126, 88);
    ctx.fillStyle = '#000000';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), 64, 45);

    // Create flag - EXACT COPY from competitor duck code
    const flagTexture = new THREE.CanvasTexture(canvas);
    const flagMaterial = new THREE.MeshBasicMaterial({
        map: flagTexture,
        side: THREE.DoubleSide
    });
    const flagWidth = 0.6;
    const flagHeight = 0.4;
    const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight);
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(flagWidth / 2, poleHeight - flagHeight / 2, 0);
    flagAssembly.add(flag);

    // Position flag at center back of duck - EXACT COPY from competitor duck code
    flagAssembly.position.set(0, 0.65, 1.0);
    flagAssembly.rotation.y = 0;
    duckGroup.add(flagAssembly);  // Add to duckGroup, NOT duckModel!

    console.log(`🚩 Added race flag #${number} on pole to duck`);
};

// Create rubber duck
const createDuck = () => {
    const duckGroup = new THREE.Group();

    // Use 3D model if loaded, otherwise fallback to procedural duck
    if (duckModelLoaded && duckModel) {
        const duckClone = duckModel.clone();
        duckClone.position.set(0, 0.5, 0); // Raise duck up by 0.5 units
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
    duckGroup.rotation.y = 0; // No rotation

    return duckGroup;
};

// 🦆🦆🦆 Create Competitor Duck (uses SAME 3D model as player!)
const createCompetitorDuck = (color, raceNumber) => {
    const duckGroup = new THREE.Group();

    // Use the SAME 3D model as player duck if loaded
    if (duckModelLoaded && duckModel) {
        const duckClone = duckModel.clone();
        duckClone.position.set(0, 0.5, 0); // Same as player duck

        // Change the color by traversing the model and updating materials
        duckClone.traverse((child) => {
            if (child.isMesh && child.material) {
                // Clone the material so we don't affect other ducks
                child.material = child.material.clone();
                // Tint the material with the competitor color
                child.material.color.setHex(color);
            }
        });

        duckGroup.add(duckClone);
    } else {
        // Fallback to procedural duck if model not loaded yet
        const bodyGeometry = new THREE.SphereGeometry(0.8, 8, 8);
        bodyGeometry.scale(1, 0.8, 1.2);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        duckGroup.add(body);

        const headGeometry = new THREE.SphereGeometry(0.45, 8, 8);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 1.5, -0.5);
        duckGroup.add(head);

        const beakGeometry = new THREE.ConeGeometry(0.2, 0.45, 6);
        const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xFF8800 });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 1.4, -1.0);
        duckGroup.add(beak);
    }

    // Race number flags removed

    // 🤖 AI Skill Level System - Adjusted for 10 competitive ducks
    // Determine AI skill level based on duck number
    const skillRoll = Math.random();
    let aiSkill, baseSpeed, aiType;

    if (skillRoll < 0.20) { // 20% Ultra Elite - YOUR MAIN RIVALS! (2 ducks)
        aiSkill = 'ultra-elite';
        baseSpeed = 0.66 + Math.random() * 0.04; // 0.66-0.70 speed (very close to your max!)
        aiType = 'champion'; // The best of the best
    } else if (skillRoll < 0.50) { // 30% Very Elite - TOUGH COMPETITION (3 ducks)
        aiSkill = 'very-elite';
        baseSpeed = 0.62 + Math.random() * 0.04; // 0.62-0.66 speed (really fast)
        aiType = 'aggressive'; // Will try to stay ahead
    } else if (skillRoll < 0.80) { // 30% Semi-Elite - CHALLENGING PACK (3 ducks)
        aiSkill = 'semi-elite';
        baseSpeed = 0.57 + Math.random() * 0.05; // 0.57-0.62 speed (challenging)
        aiType = 'aggressive'; // Will try to stay ahead
    } else { // 20% Good racers (2 ducks)
        aiSkill = 'good';
        baseSpeed = 0.50 + Math.random() * 0.10; // 0.50-0.60 speed
        aiType = 'competitive'; // Will speed up if behind
    }

    // Store metadata - AI pilot attributes
    duckGroup.userData = {
        isCompetitor: true,
        raceNumber: raceNumber,
        color: color,
        xPosition: 0, // X position relative to path (-8 to 8)
        baseSpeed: baseSpeed,
        currentSpeed: baseSpeed, // Actual speed (can vary)
        aiSkill: aiSkill, // 'elite', 'good', or 'average'
        aiType: aiType, // 'aggressive', 'competitive', or 'casual'
        steerDirection: 0, // -1 left, 0 center, 1 right
        steerCooldown: 0, // Frames until next steer decision
        boostCooldown: 0, // Frames until can boost again
        distance: 0, // Distance along course
        health: 100,
        isJumping: false, // Can jump over obstacles
        jumpHeight: 0, // Current jump height
        jumpVelocity: 0 // Jump velocity
    };

    return duckGroup;
};

// 🦆🦆🦆 Spawn all competitor ducks at starting line
const spawnCompetitorDucks = () => {
    console.log(`🦆🦆🦆 Spawning ${NUM_COMPETITORS} competitor ducks...`);

    // Clear any existing competitor ducks
    competitorDucks.forEach(duck => {
        if (duck && duck.parent) {
            scene.remove(duck);
        }
    });
    competitorDucks = [];

    // Get starting position
    const startT = splinePath.distanceToT(0);
    const startPos = splinePath.getPointAt(startT);

    // Create shuffled race numbers 1-150 for competitor ducks
    const raceNumbers = Array.from({length: NUM_COMPETITORS}, (_, i) => i + 1);
    // Shuffle race numbers so they're not in order
    for (let i = raceNumbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [raceNumbers[i], raceNumbers[j]] = [raceNumbers[j], raceNumbers[i]];
    }

    // Spawn ducks in a grid formation - PLAYER STARTS IN MIDDLE OF PACK
    const ducksPerRow = 15;
    const rowSpacing = 3;
    const duckSpacing = 1.8;
    const totalRows = Math.ceil(NUM_COMPETITORS / ducksPerRow);
    const middleRow = Math.floor(totalRows / 2);

    for (let i = 0; i < NUM_COMPETITORS; i++) {
        const row = Math.floor(i / ducksPerRow);
        const col = i % ducksPerRow;

        // Assign unique color to each duck (sequentially)
        const color = DUCK_COLORS[i % DUCK_COLORS.length];

        // Sequential race number from shuffled array (1-150)
        const raceNumber = raceNumbers[i];

        const competitorDuck = createCompetitorDuck(color, raceNumber);

        // Position in grid - spread AROUND player (half ahead, half behind)
        const xPos = (col - ducksPerRow / 2) * duckSpacing;

        // Place ducks both ahead and behind player
        // Player is at distance 15 (middle), ducks from 0 to 30
        const distance = row * rowSpacing;
        const duckT = splinePath.distanceToT(distance);
        const duckPos = splinePath.getPointAt(duckT);

        competitorDuck.position.set(xPos, duckPos.y + 0.2, duckPos.z);
        competitorDuck.userData.xPosition = xPos;
        competitorDuck.userData.distance = distance;
        competitorDuck.userData.duckIndex = i; // Store index for special speed boosts

        scene.add(competitorDuck);
        competitorDucks.push(competitorDuck);
    }

    console.log(`✅ Spawned ${competitorDucks.length} competitor ducks!`);
};

// 🦆🦆🦆 Update all competitor ducks (called every frame)
const updateCompetitorDucks = (deltaTime) => {
    competitorDucks.forEach(duck => {
        if (!duck.userData) return;

        // 🦅 Check if this duck was grabbed by eagle
        if (duck.userData.grabbedByEagle) {
            const grabElapsed = (Date.now() - duck.userData.eagleGrabTime) / 1000;
            if (grabElapsed < 2) {
                // Duck is being carried - move it up and away
                duck.position.y += 1.5;
                duck.position.x += (Math.random() - 0.5) * 0.2;
                return; // Skip normal AI behavior
            } else {
                // Eagle drops the duck!
                duck.userData.grabbedByEagle = false;
                duck.userData.health -= 50; // Take damage from eagle
                console.log(`💀 Competitor duck #${duck.userData.raceNumber} was dropped by eagle! Health: ${duck.userData.health}`);
                if (duck.userData.health <= 0) {
                    duck.visible = false; // Duck is out!
                    return;
                }
            }
        }

        // 🤖 AI PILOT - Competitive racing behavior

        // Check if player is nearby (for competitive behavior)
        const distanceToPlayer = Math.abs(duck.userData.distance - gameState.distance);
        const isNearPlayer = distanceToPlayer < 20; // Within 20 units

        // AI Type Behaviors
        if (duck.userData.aiType === 'aggressive') {
            // Elite racers: ALWAYS AT FULL THROTTLE (only slowed by obstacles)
            duck.userData.currentSpeed = duck.userData.baseSpeed;
        } else if (duck.userData.aiType === 'competitive') {
            // Good racers: Speed up if falling behind
            if (isNearPlayer && duck.userData.distance < gameState.distance - 5) {
                // Falling behind! Speed up slightly
                duck.userData.currentSpeed = Math.min(duck.userData.baseSpeed * 1.05, 0.75);
            } else {
                duck.userData.currentSpeed = duck.userData.baseSpeed;
            }
        } else {
            // Average racers: Steady pace with slight variation
            duck.userData.currentSpeed = duck.userData.baseSpeed * (0.95 + Math.random() * 0.1);
        }

        // Move duck forward at current speed (same scale as player)
        let speedMultiplier = 80; // Base speed multiplier

        // Special speed boosts for specific ducks - modest boosts for fair competition
        if (duck.userData.duckIndex === 0) {
            speedMultiplier = 84; // Duck #0 (powder blue) is 5% faster
        } else if (duck.userData.duckIndex === 1) {
            speedMultiplier = 82.4; // Duck #1 (light teal) is 3% faster
        }

        duck.userData.distance += duck.userData.currentSpeed * deltaTime * speedMultiplier;

        // AI Steering logic - Elite tiers make faster, smarter decisions - INCREASED frequency for more evasive maneuvers
        let steerInterval;
        if (duck.userData.aiSkill === 'ultra-elite') {
            steerInterval = 8; // Ultra fast reactions (nearly doubled frequency)
        } else if (duck.userData.aiSkill === 'very-elite' || duck.userData.aiSkill === 'semi-elite') {
            steerInterval = 12; // Fast reactions (increased)
        } else if (duck.userData.aiSkill === 'good') {
            steerInterval = 25; // More responsive
        } else {
            steerInterval = 40; // More active
        }

        if (duck.userData.steerCooldown <= 0) {
            duck.userData.steerCooldown = steerInterval + Math.floor(Math.random() * 15); // Reduced randomness for more consistent evasion

            // Elite AI tiers: More strategic steering - MORE EVASIVE (less straight)
            if (duck.userData.aiSkill === 'ultra-elite') {
                // Ultra elite: 50% straight, 25% left, 25% right (more evasive)
                const rand = Math.random();
                if (rand < 0.50) duck.userData.steerDirection = 0;
                else if (rand < 0.75) duck.userData.steerDirection = -1;
                else duck.userData.steerDirection = 1;
            } else if (duck.userData.aiSkill === 'very-elite' || duck.userData.aiSkill === 'semi-elite') {
                // Very/Semi elite: 45% straight, 27.5% left, 27.5% right (more evasive)
                const rand = Math.random();
                if (rand < 0.45) duck.userData.steerDirection = 0;
                else if (rand < 0.725) duck.userData.steerDirection = -1;
                else duck.userData.steerDirection = 1;
            } else {
                // Regular AI: More random evasive steering
                const rand = Math.random();
                if (rand < 0.35) duck.userData.steerDirection = -1;
                else if (rand < 0.70) duck.userData.steerDirection = 1;
                else duck.userData.steerDirection = 0;
            }
        }
        duck.userData.steerCooldown--;

        // Apply steering - elite tiers steer more precisely
        let steerSpeed;
        if (duck.userData.aiSkill === 'ultra-elite' || duck.userData.aiSkill === 'very-elite') {
            steerSpeed = 0.05; // Very precise
        } else if (duck.userData.aiSkill === 'semi-elite') {
            steerSpeed = 0.06; // Precise
        } else {
            steerSpeed = 0.08; // Normal
        }
        if (duck.userData.steerDirection !== 0) {
            duck.userData.xPosition += duck.userData.steerDirection * steerSpeed;
        }

        // Avoid walls - steer away from edges
        if (duck.userData.xPosition < -7) {
            duck.userData.xPosition += 0.15; // Push away from left wall
        } else if (duck.userData.xPosition > 7) {
            duck.userData.xPosition -= 0.15; // Push away from right wall
        }

        duck.userData.xPosition = Math.max(-8, Math.min(8, duck.userData.xPosition)); // Hard limit

        // 🦆 AI JUMP DETECTION - look ahead for obstacles
        if (!duck.userData.isJumping) {
            obstacles.forEach(obstacle => {
                if (obstacle.userData.type === 'rock' || obstacle.userData.type === 'log') {
                    const distAhead = obstacle.position.z - duck.position.z;
                    const xDist = Math.abs(obstacle.position.x - duck.userData.xPosition);

                    // Elite tiers jump earlier and more accurately - INCREASED for more jumps
                    let jumpDistance;
                    if (duck.userData.aiSkill === 'ultra-elite') {
                        jumpDistance = 15; // Ultra elite: jump very early (50% increase)
                    } else if (duck.userData.aiSkill === 'very-elite') {
                        jumpDistance = 13; // Very elite: jump early (44% increase)
                    } else if (duck.userData.aiSkill === 'semi-elite') {
                        jumpDistance = 11; // Semi elite: jump ahead (37% increase)
                    } else if (duck.userData.aiSkill === 'good') {
                        jumpDistance = 9; // Good: decent anticipation (50% increase)
                    } else {
                        jumpDistance = 7; // Average: basic jumping (40% increase)
                    }

                    if (distAhead > 0 && distAhead < jumpDistance && xDist < 4) {
                        // Obstacle ahead! Jump!
                        duck.userData.isJumping = true;
                        duck.userData.jumpHeight = 0;
                        duck.userData.jumpVelocity = 0.25; // Jump strength
                    }
                }
            });
        }

        // 🦆 AI JUMP PHYSICS
        if (duck.userData.isJumping) {
            duck.userData.jumpHeight += duck.userData.jumpVelocity;
            duck.userData.jumpVelocity -= 0.015; // Gravity

            if (duck.userData.jumpHeight <= 0) {
                duck.userData.jumpHeight = 0;
                duck.userData.isJumping = false;
            }
        }

        // Get position along spline
        const t = splinePath.distanceToT(duck.userData.distance);
        const pathPos = splinePath.getPointAt(t);

        // Update position (includes jump height)
        duck.position.x = duck.userData.xPosition;
        duck.position.y = pathPos.y + 0.2 + duck.userData.jumpHeight;
        duck.position.z = pathPos.z;

        // Simple wave bobbing (only when not jumping)
        if (!duck.userData.isJumping) {
            duck.position.y += Math.sin(Date.now() * 0.002 + duck.userData.raceNumber) * 0.1;
        }

        // 🪨💥 Competitor Duck Obstacle Collision Detection & Physics
        obstacles.forEach(obstacle => {
            // Skip non-physical obstacles
            if (!obstacle.userData || !obstacle.userData.type) return;

            const dist = Math.sqrt(
                Math.pow(duck.position.x - obstacle.position.x, 2) +
                Math.pow(duck.position.z - obstacle.position.z, 2)
            );

            const COLLISION_RADIUS = 3.0; // Larger collision radius (was 2)

            if (dist < COLLISION_RADIUS) { // Within collision range
                if (obstacle.userData.type === 'rapids' || obstacle.userData.type === 'shader_rapids') {
                    // Rapids damage (reduced) but no bump back
                    duck.userData.health -= Math.floor((obstacle.userData.damage || 15) * 0.3);
                } else if (obstacle.userData.type === 'rock' || obstacle.userData.type === 'log') {
                    // Check if duck jumped high enough to clear obstacle
                    const isHighEnough = duck.userData.jumpHeight > 2.0; // Higher threshold

                    if (!isHighEnough) {
                        // Rock/log collision - STRONG BUMP BACK!
                        duck.userData.health -= obstacle.userData.damage || 7; // Direct damage, no multiplier

                        // Calculate bump direction (away from obstacle)
                        const bumpAngle = Math.atan2(duck.position.z - obstacle.position.z,
                                                       duck.position.x - obstacle.position.x);
                        const bumpForce = (COLLISION_RADIUS - dist) * 3; // Much stronger bump

                        // Bump duck sideways (X direction) - more forceful
                        duck.userData.xPosition += Math.cos(bumpAngle) * bumpForce * 1.5;
                        duck.userData.xPosition = Math.max(-8, Math.min(8, duck.userData.xPosition));

                        // Bump backward in Z - MUCH stronger (was 0.3)
                        duck.userData.distance -= bumpForce * 1.2; // Strong backward bump

                        // Also reduce speed temporarily when hitting obstacle
                        duck.userData.currentSpeed *= 0.8; // Lose 20% speed on collision
                    }
                }

                // Check if duck died from obstacle
                if (duck.userData.health <= 0) {
                    duck.visible = false; // Duck is out!
                }
            }
        });

        // Hide ducks that are very far behind (for performance) but KEEP them in array for position counting!
        if (duck.userData.distance < gameState.distance - 200) {
            if (duck.visible) {
                duck.visible = false; // Hide but don't remove from array
            }
        } else {
            if (!duck.visible) {
                duck.visible = true; // Show again if they catch up
            }
        }
    });

    // 🦆💥 Duck-to-Duck Collision Detection & Bumping
    const COLLISION_RADIUS = 2.5; // Distance at which ducks collide (increased for larger ducks)

    for (let i = 0; i < competitorDucks.length; i++) {
        const duck1 = competitorDucks[i];
        if (!duck1.userData) continue;

        // Check collision with player duck - BOTH ducks get pushed (NO SLOWDOWN!)
        const distToPlayer = Math.sqrt(
            Math.pow(duck1.position.x - duck.position.x, 2) +
            Math.pow(duck1.position.z - duck.position.z, 2)
        );
        if (distToPlayer < COLLISION_RADIUS && distToPlayer > 0.1) {
            // Calculate push angle
            const angle = Math.atan2(duck1.position.z - duck.position.z, duck1.position.x - duck.position.x);
            const pushForce = (COLLISION_RADIUS - distToPlayer) * 0.3;

            // Push competitor duck away
            duck1.userData.xPosition += Math.cos(angle) * pushForce;
            duck1.userData.xPosition = Math.max(-8, Math.min(8, duck1.userData.xPosition));

            // Push PLAYER duck away too!
            gameState.duckPosition -= Math.cos(angle) * pushForce * 0.5; // 50% force on player
            gameState.duckPosition = Math.max(-8, Math.min(8, gameState.duckPosition));
        }

        // Check collision with other competitor ducks
        for (let j = i + 1; j < competitorDucks.length; j++) {
            const duck2 = competitorDucks[j];
            if (!duck2.userData) continue;

            const dist = Math.sqrt(
                Math.pow(duck1.position.x - duck2.position.x, 2) +
                Math.pow(duck1.position.z - duck2.position.z, 2)
            );

            if (dist < COLLISION_RADIUS && dist > 0.1) {
                // Ducks collide! Push them apart (NO SLOWDOWN!)
                const angle = Math.atan2(duck1.position.z - duck2.position.z, duck1.position.x - duck2.position.x);
                const pushForce = (COLLISION_RADIUS - dist) * 0.25;

                duck1.userData.xPosition += Math.cos(angle) * pushForce;
                duck2.userData.xPosition -= Math.cos(angle) * pushForce;

                // Keep in bounds
                duck1.userData.xPosition = Math.max(-8, Math.min(8, duck1.userData.xPosition));
                duck2.userData.xPosition = Math.max(-8, Math.min(8, duck2.userData.xPosition));
            }
        }
    }

    // 🏆 Calculate player's race position
    let ducksAhead = 0;
    competitorDucks.forEach(compDuck => {
        if (compDuck.userData && compDuck.userData.distance > gameState.distance) {
            ducksAhead++;
        }
    });
    gameState.position = ducksAhead + 1; // +1 because positions start at 1, not 0
    gameState.totalDucks = competitorDucks.length + 1; // +1 for player
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

    // Varied size (0.8 to 2.5)
    const rockSize = 0.8 + Math.random() * 1.7;

    // Varied shapes - dodecahedron, icosahedron, or sphere
    let rockGeometry;
    const shapeType = Math.random();
    if (shapeType < 0.33) {
        rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
    } else if (shapeType < 0.66) {
        rockGeometry = new THREE.IcosahedronGeometry(rockSize, 0);
    } else {
        rockGeometry = new THREE.SphereGeometry(rockSize, 6, 5);
    }

    // Varied colors - greys and browns
    const colorOptions = [0x808080, 0x696969, 0x4a4a4a, 0x5a4a3a, 0x6b5d4f];
    const rockColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];

    const rockMaterial = new THREE.MeshStandardMaterial({
        color: rockColor,
        roughness: 0.85 + Math.random() * 0.15
    });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.y = 0.3; // Lower - just peeking out of water
    rock.castShadow = true;
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rockGroup.add(rock);

    rockGroup.position.set(lane, 0, z);
    rockGroup.userData = { type: 'rock', damage: 7 };

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
    logGroup.userData = { type: 'log', damage: 5, rotationSpeed: 0.01 };

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
    const key = e.key.toLowerCase();

    // Prevent repeat key events (only count initial press)
    if (keys[key]) return;

    keys[key] = true;

    // Spacebar for jump
    if (e.key === ' ' && !gameState.isJumping && gameState.isPlaying) {
        e.preventDefault();
        gameState.isJumping = true;
        gameState.jumpVelocity = 0.4; // Initial jump velocity - increased for clearing waterfalls
    }

    // Track paddle taps (UP or W key)
    if ((key === 'arrowup' || key === 'w') && gameState.isPlaying) {
        const now = Date.now();
        const timeSinceLastTap = now - gameState.lastPaddleTime;

        // Count as rapid tap if within 500ms of last tap
        if (timeSinceLastTap < 500) {
            gameState.paddleTapCount++;
        } else {
            gameState.paddleTapCount = 1; // Reset count if too slow
        }

        gameState.lastPaddleTime = now;

        // Add boost based on tap count (max 5 taps)
        gameState.paddleBoost = Math.min(gameState.paddleTapCount * 0.15, 0.75);
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
    const jumpBtn = document.getElementById('jumpBtn');
    const gasBtn = document.getElementById('gasBtn');
    const brakeBtn = document.getElementById('brakeBtn');

    // Mobile controls hidden by default - shown when game starts

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

    if (jumpBtn) {
        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!gameState.isJumping && gameState.jumpHeight === 0) {
                gameState.isJumping = true;
                gameState.jumpVelocity = 0.4; // Jump strength - matches keyboard jump
            }
        });
        jumpBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
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

// 🎢 CREATE CURVED RIVER CHANNEL ALONG SPLINE
const createCurvedRiverChannel = () => {
    console.log('🌊 Building curved river with beautiful Water shader...');

    const riverWidth = 30;

    const centerPoints = splinePath.spline.getPoints(500);
    console.log(`✅ Using ${centerPoints.length} points from spline`);

    // Create multiple Water shader sections along the curve
    const sectionLength = 100; // Length of each water section
    const numSections = 6;

    console.log(`Creating ${numSections} curved water sections...`);

    // CRITICAL FIX: Load texture ONCE and share it across all sections!
    console.log('📥 Loading shared water normals texture...');
    const sharedWaterNormalsTexture = new THREE.TextureLoader().load(
        'https://threejs.org/examples/textures/waternormals.jpg',
        function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            console.log('✅ Shared water normals texture loaded successfully!');
        },
        undefined,
        function (error) {
            console.error('❌ CRITICAL: Shared water normals texture FAILED to load:', error);
        }
    );

    console.log(`Starting water section loop: ${numSections} sections to create`);

    for (let sectionIdx = 0; sectionIdx < numSections; sectionIdx++) {
        console.log(`Creating water section ${sectionIdx + 1}/${numSections}...`);
        // Calculate which part of the spline this section covers
        // Use precise division to avoid gaps
        const pointsPerSection = centerPoints.length / numSections;
        const startIdx = Math.floor(sectionIdx * pointsPerSection);
        const endIdx = Math.min(Math.floor((sectionIdx + 1) * pointsPerSection), centerPoints.length - 1);

        if (endIdx <= startIdx) {
            console.warn(`⚠️ Skipping section ${sectionIdx + 1}: startIdx=${startIdx}, endIdx=${endIdx}`);
            continue;
        }

        // Build water geometry for this section
        const waterVertices = [];
        const waterIndices = [];
        const waterUVs = [];

        for (let i = startIdx; i <= endIdx; i++) {
            const point = centerPoints[i];
            const t = i / centerPoints.length;
            const tangent = splinePath.spline.getTangent(t);
            const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

            const leftEdge = point.clone().add(perpendicular.clone().multiplyScalar(-riverWidth / 2));
            const rightEdge = point.clone().add(perpendicular.clone().multiplyScalar(riverWidth / 2));

            const localIdx = i - startIdx;
            const uvY = localIdx / (endIdx - startIdx);

            waterVertices.push(leftEdge.x, leftEdge.y, leftEdge.z);
            waterVertices.push(rightEdge.x, rightEdge.y, rightEdge.z);
            waterUVs.push(0, uvY);
            waterUVs.push(1, uvY);

            if (i < endIdx) {
                const base = (localIdx) * 2;
                // Normal winding order
                waterIndices.push(base, base + 1, base + 2);
                waterIndices.push(base + 1, base + 3, base + 2);
            }
        }

        const waterGeometry = new THREE.BufferGeometry();
        waterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(waterVertices, 3));
        waterGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(waterUVs, 2));
        waterGeometry.setIndex(waterIndices);
        waterGeometry.computeVertexNormals();

        // WATER SHADER - Using original working shader
        const water = new WaterOld(waterGeometry, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: sharedWaterNormalsTexture,
            sunDirection: new THREE.Vector3(0.7, 0.7, 0),
            sunColor: 0xffffff,
            waterColor: 0x4a6b5c,
            distortionScale: 3.5,
            fog: scene.fog !== undefined
        });

        // Make sure it renders both sides
        water.material.side = THREE.DoubleSide;

        // Force material to be ready
        water.material.needsUpdate = true;

        // Prevent frustum culling issues (always render water)
        water.frustumCulled = false;

        // Set render order to ensure water renders on top of ground
        water.renderOrder = 10;

        scene.add(water);
        waterSections.push(water);

        console.log(`  ✅ Water section ${sectionIdx + 1} created`);
    }

    console.log('✅ Curved Water shader river created!');

    // Create SOLID canyon walls with NO GAPS
    console.log('🏔️ Building solid curved canyon walls (gap-free)...');

    const wallHeight = 40;
    const wallThickness = 20;
    const wallOffset = riverWidth / 2; // Walls aligned exactly with water edges (no gap)

    const createSolidWall = (sideOffset) => {
        const wallVertices = [];
        const wallIndices = [];
        const wallColors = [];

        // Use SAME points as water for perfect alignment
        for (let i = 0; i < centerPoints.length; i++) {
            const point = centerPoints[i];
            const t = i / centerPoints.length;
            const tangent = splinePath.spline.getTangent(t);
            const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

            // Inner edge (close to river)
            const innerBase = point.clone().add(perpendicular.clone().multiplyScalar(sideOffset));

            // FIX: Ensure wall aligns exactly with water edge
            // River is 30 units wide (±15), walls should be at exactly ±15 (water edge)
            // Keep walls at minimum 15 units from path center (exactly at water edge)
            const offsetFromPath = new THREE.Vector2(innerBase.x - point.x, innerBase.z - point.z);
            const distanceFromPath = offsetFromPath.length();
            const minDistance = 15;

            if (distanceFromPath < minDistance) {
                // Push wall outward to minimum safe distance
                offsetFromPath.normalize().multiplyScalar(minDistance);
                innerBase.x = point.x + offsetFromPath.x;
                innerBase.z = point.z + offsetFromPath.y;
            }

            const innerTop = innerBase.clone();
            innerTop.y += wallHeight;

            // Outer edge (thicker wall)
            const outerBase = point.clone().add(perpendicular.clone().multiplyScalar(sideOffset + Math.sign(sideOffset) * wallThickness));
            const outerTop = outerBase.clone();
            outerTop.y += wallHeight;

            // Add vertices - walls start BELOW water level to frame the channel properly
            wallVertices.push(innerBase.x, innerBase.y - 5, innerBase.z);
            wallVertices.push(innerTop.x, innerTop.y, innerTop.z);
            wallVertices.push(outerBase.x, outerBase.y - 5, outerBase.z);
            wallVertices.push(outerTop.x, outerTop.y, outerTop.z);

            // Add slight color variation for texture
            const rockColor = 0.54 + Math.random() * 0.1;
            for (let v = 0; v < 4; v++) {
                wallColors.push(rockColor, rockColor * 0.85, rockColor * 0.65);
            }

            // Create faces (connect to previous vertices)
            if (i > 0) {
                const curr = i * 4;
                const prev = (i - 1) * 4;

                // Inner face (6 triangles for complete coverage)
                wallIndices.push(prev, prev + 1, curr);
                wallIndices.push(prev + 1, curr + 1, curr);

                // Top face
                wallIndices.push(prev + 1, prev + 3, curr + 1);
                wallIndices.push(prev + 3, curr + 3, curr + 1);

                // Outer face
                wallIndices.push(prev + 2, curr + 2, prev + 3);
                wallIndices.push(prev + 3, curr + 2, curr + 3);

                // Bottom face (close gaps at base)
                wallIndices.push(prev, curr, prev + 2);
                wallIndices.push(prev + 2, curr, curr + 2);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(wallVertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(wallColors, 3));
        geometry.setIndex(wallIndices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x8b7355,
            roughness: 0.9,
            vertexColors: true,
            side: THREE.DoubleSide
        });

        return new THREE.Mesh(geometry, material);
    };

    // Create curved walls that follow the spline path
    const leftWall = createSolidWall(-wallOffset);
    scene.add(leftWall);

    const rightWall = createSolidWall(wallOffset);
    scene.add(rightWall);

    // Ground plane also disabled
    // const groundGeometry = new THREE.PlaneGeometry(200, splinePath.totalLength + 500);
    // const groundMaterial = new THREE.MeshStandardMaterial({
    //     color: 0x654321,
    //     roughness: 1.0
    // });
    // const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    // ground.rotation.x = -Math.PI / 2;
    // ground.position.y = -15;
    // ground.position.z = -splinePath.totalLength / 2;
    // scene.add(ground);

    console.log('✅ Curved canyon walls created (following spline path)!');
};

// Initialize game
const init = () => {
    // 🎢 CREATE SPLINE PATH SYSTEM FIRST!
    console.log('==========================================');
    console.log('🎢🎢🎢 GAME INIT STARTING 🎢🎢🎢');
    console.log('==========================================');
    console.log('🎢 Initializing Cadillac Log Flume Course...');
    splinePath = new SplinePathSystem();
    // DISABLED: Debug visualization (magenta line and green spheres)
    // splinePath.createDebugVisualization(scene);

    // 🔍 DIAGNOSTIC: Log Y elevations at various distances to check if course is backwards
    console.log('🔍 DIAGNOSTIC: Checking Y elevations along the course...');
    const testDistances = [0, 200, 400, 600, 800, 1000, 1200, 1300, 1400, 1600, 1800, 2000];
    for (const dist of testDistances) {
        const t = splinePath.distanceToT(dist);
        const point = splinePath.getPointAt(t);
        console.log(`  Distance ${dist}m: Y = ${point.y.toFixed(2)}, Z = ${point.z.toFixed(2)}`);
    }
    console.log('🔍 If Y values INCREASE as distance increases, the course is BACKWARDS!');

    // 🌊 BUILD THE CURVED RIVER!
    createCurvedRiverChannel();

    // 🏁 FINISH LINE - Checkered banner at 2000m
    const finishT = splinePath.distanceToT(2000);
    const finishPos = splinePath.getPointAt(finishT);

    // Create checkered finish line banner
    const finishLineGroup = new THREE.Group();

    // Banner support poles on each side
    const poleGeometry = new THREE.CylinderGeometry(0.3, 0.3, 15, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
    leftPole.position.set(-17, finishPos.y + 7.5, finishPos.z);
    scene.add(leftPole);

    const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
    rightPole.position.set(17, finishPos.y + 7.5, finishPos.z);
    scene.add(rightPole);

    // Checkered banner (8x4 grid of black and white squares)
    const squareSize = 2;
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 17; col++) {
            const isBlack = (row + col) % 2 === 0;
            const squareGeometry = new THREE.PlaneGeometry(squareSize, squareSize);
            const squareMaterial = new THREE.MeshStandardMaterial({
                color: isBlack ? 0x000000 : 0xffffff,
                side: THREE.DoubleSide
            });
            const square = new THREE.Mesh(squareGeometry, squareMaterial);
            square.position.set(
                -17 + (col * squareSize) + squareSize/2,
                finishPos.y + 15 - (row * squareSize) - squareSize/2,
                finishPos.z
            );
            finishLineGroup.add(square);
        }
    }
    scene.add(finishLineGroup);
    console.log(`✅ Checkered finish line banner placed at z=${finishPos.z.toFixed(1)}, y=${finishPos.y.toFixed(1)}`);

    // Initialize duck on the spline
    duck = createDuck();
    const startPos = splinePath.getPointAt(0);
    duck.position.copy(startPos);
    duck.position.x = gameState.duckPosition; // Lateral position
    duck.position.y = startPos.y + gameState.baseHeight; // On water surface
    scene.add(duck);

    console.log(`✅ Duck placed at start: x=${duck.position.x.toFixed(1)}, y=${duck.position.y.toFixed(1)}, z=${duck.position.z.toFixed(1)}`);

    // Add strategic rocks for Level 1 (sparse, well-placed obstacles)
    console.log('🪨 Placing Level 1 rocks...');
    const level1RockPositions = [
        { lane: 0, distance: 10 },    // RIGHT AT START - IMPOSSIBLE TO MISS
        { lane: -8, distance: 20 },   // Left side early
        { lane: 8, distance: 30 },    // Right side early
        { lane: 0, distance: 50 },    // Center early
        { lane: -5, distance: 100 },
        { lane: 5, distance: 150 },
        { lane: 0, distance: 200 },
        { lane: -8, distance: 300 },
        { lane: 8, distance: 350 },
        { lane: -3, distance: 450 },
        { lane: 3, distance: 500 },
        { lane: 0, distance: 600 },
        { lane: -6, distance: 700 },
        { lane: 6, distance: 800 },
        { lane: -4, distance: 900 },
        { lane: 4, distance: 1000 },
        { lane: 0, distance: 1100 },
        { lane: -7, distance: 1300 },
        { lane: 7, distance: 1400 },
        { lane: -5, distance: 1500 },
        { lane: 5, distance: 1600 },
        { lane: 0, distance: 1700 },
        { lane: -8, distance: 1850 },
        { lane: 8, distance: 1900 }
    ];

    // Place rocks without excessive logging for better performance
    level1RockPositions.forEach(pos => {
        const rockT = splinePath.distanceToT(pos.distance);
        const rockPos = splinePath.getPointAt(rockT);
        const rock = createRock(pos.lane, rockPos.z);
        // Place rocks at water level
        rock.position.y = rockPos.y;
        // Store distance for continuous water level tracking
        rock.userData.courseDistance = pos.distance;
        scene.add(rock);
        obstacles.push(rock);
    });
    console.log(`✅ Placed ${level1RockPositions.length} rocks`);

    // 🦅 Create golden eagle that swoops once
    console.log('🦅 Loading golden eagle model...');
    // Eagle variables are now declared at module level
    eagle = null;
    eagleHasAttacked = false;
    eagleAttackTime = 0;
    eagleHasGrabbedDuck = false;
    eagleGrabTime = 0;
    duckOriginalPosition = null;
    eagleSwoopStartPos = null;
    eagleSwoopTargetX = 0;
    eagleSwoopTargetZ = 0;
    eagleSwoopWaterLevel = 0;
    eagleSwoopHasTouchedWater = false;
    eagleCommittedX = null;
    eagleHasCommitted = false;
    duckIsFalling = false;
    duckFallVelocity = 0;
    duckFallStartY = 0;

    loader.load(MODEL_CDN_BASE + 'Golden eagle.glb', (gltf) => {
        eagle = gltf.scene;
        eagle.scale.set(1.5, 1.5, 1.5); // Scaled down from 3 to 1.5 (half the size)

        // Enable shadows
        eagle.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Start eagle perched on the LEFT canyon wall at 950m mark, FACING the river
        const eagleTriggerT = splinePath.distanceToT(950);
        const eagleTriggerPos = splinePath.getPointAt(eagleTriggerT);
        eagle.position.set(-28, eagleTriggerPos.y + 15, eagleTriggerPos.z); // On left canyon wall, 15 units above water
        eagle.rotation.set(0, Math.PI / 4, 0); // Face toward river and down the path
        console.log(`🦅 Eagle perched on canyon wall at z=${eagleTriggerPos.z.toFixed(1)} (will hover at 800m, attack at 1000m)`);

        scene.add(eagle);
        console.log('✅ Golden eagle model loaded');
    }, undefined, (error) => {
        console.error('Error loading eagle model:', error);
    });

    // 🎨 Create 3D WiseSage Logo Banners on canyon walls
    console.log('🎨 Creating WiseSage logo banners...');
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load('wisesage_logo.png', (logoTexture) => {
        console.log('✅ WiseSage logo texture loaded');

        // Create banner material with logo and white background
        const bannerMaterial = new THREE.MeshStandardMaterial({
            map: logoTexture,
            side: THREE.DoubleSide,
            transparent: false,
            color: 0xffffff // White background for logo
        });

        // Banner positions along the course (distance, side: 'left'/'right')
        const bannerPositions = [
            { distance: 100, side: 'left' },
            { distance: 250, side: 'right' },
            { distance: 500, side: 'left' },
            { distance: 700, side: 'right' },
            { distance: 900, side: 'left' },
            { distance: 1200, side: 'right' },
            { distance: 1400, side: 'left' }
        ];

        bannerPositions.forEach(pos => {
            // Get position along spline
            const t = splinePath.distanceToT(pos.distance);
            const pathPos = splinePath.getPointAt(t);

            // Create banner (rectangular flag)
            const bannerWidth = 12;
            const bannerHeight = 8;
            const bannerGeometry = new THREE.PlaneGeometry(bannerWidth, bannerHeight);
            const banner = new THREE.Mesh(bannerGeometry, bannerMaterial.clone());

            // Position on canyon wall
            const wallOffset = pos.side === 'left' ? -20 : 20;
            banner.position.set(
                wallOffset,
                pathPos.y + 25, // 25 units above water level
                pathPos.z
            );

            // Rotate to face inward toward river
            banner.rotation.y = pos.side === 'left' ? Math.PI / 4 : -Math.PI / 4;

            banner.castShadow = true;
            banner.receiveShadow = true;

            scene.add(banner);
            console.log(`🎨 Banner placed at ${pos.distance}m on ${pos.side} wall`);
        });

        console.log(`✅ ${bannerPositions.length} WiseSage logo banners added to canyon walls!`);
    }, undefined, (error) => {
        console.warn('⚠️ Could not load WiseSage logo texture:', error);
    });

    // 🏁 Create Starting Line Banner with WiseSage Logo - realistic hanging setup
    console.log('🏁 Creating starting line banner...');
    textureLoader.load('wisesage_logo.png', (startingLogo) => {
        console.log('✅ Starting line banner logo loaded');

        // Get starting position - place banner at 50m (well ahead of player at 15m start)
        const bannerDistance = 50;
        const bannerT = splinePath.distanceToT(bannerDistance);
        const bannerPos = splinePath.getPointAt(bannerT);

        // Create thin line/rope spanning across canyon
        const canyonWidth = 30; // Width of canyon
        const lineHeight = bannerPos.y + 15; // Height to string the line (higher up)
        const lineGeometry = new THREE.CylinderGeometry(0.05, 0.05, canyonWidth, 8);
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.8
        });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(0, lineHeight, bannerPos.z);
        line.rotation.z = Math.PI / 2; // Rotate to horizontal
        scene.add(line);

        // Create banner hanging from CENTER of line - better proportions
        const bannerWidth = 10; // Narrower to reduce stretching
        const bannerHeight = 6; // Taller for better logo proportions

        // Create white background for banner
        const bgGeometry = new THREE.PlaneGeometry(bannerWidth, bannerHeight);
        const bgMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const bannerBackground = new THREE.Mesh(bgGeometry, bgMaterial);

        // Create logo on top of white background
        const bannerGeometry = new THREE.PlaneGeometry(bannerWidth, bannerHeight);
        const bannerMaterial = new THREE.MeshStandardMaterial({
            map: startingLogo,
            side: THREE.DoubleSide,
            transparent: true
        });
        const startBanner = new THREE.Mesh(bannerGeometry, bannerMaterial);

        // Position banner hanging from center of line
        const bannerTopY = lineHeight - 0.5;

        // Position white background slightly behind logo (lower Z = farther back)
        bannerBackground.position.set(0, bannerTopY - bannerHeight / 2, bannerPos.z - 0.01);
        bannerBackground.castShadow = true;
        bannerBackground.receiveShadow = true;
        scene.add(bannerBackground);

        // Position logo in front of white background
        startBanner.position.set(0, bannerTopY - bannerHeight / 2, bannerPos.z);
        startBanner.castShadow = true;
        startBanner.receiveShadow = true;
        scene.add(startBanner);

        // Add wires connecting banner to line (left and right corners)
        const wireGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
        const wireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

        const leftWire = new THREE.Mesh(wireGeo, wireMat);
        leftWire.position.set(-bannerWidth / 2 + 0.5, bannerTopY, bannerPos.z);
        scene.add(leftWire);

        const rightWire = new THREE.Mesh(wireGeo, wireMat);
        rightWire.position.set(bannerWidth / 2 - 0.5, bannerTopY, bannerPos.z);
        scene.add(rightWire);

        // Add "Rubber Duck River Run" text below logo
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 1024;
        canvas.height = 256;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Stylized race banner font with outline and better spacing
        context.font = 'bold 64px Impact, "Arial Black", sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.letterSpacing = '4px'; // Add spacing between letters for readability

        // Add black outline for depth
        context.strokeStyle = '#000000';
        context.lineWidth = 8;
        context.strokeText('Rubber Duck River Run', canvas.width / 2, canvas.height / 2);

        // Fill with gradient for more style
        const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a5490'); // Deep blue
        gradient.addColorStop(0.5, '#2d7dd2'); // Bright blue
        gradient.addColorStop(1, '#1a5490'); // Deep blue
        context.fillStyle = gradient;
        context.fillText('Rubber Duck River Run', canvas.width / 2, canvas.height / 2);

        const textTexture = new THREE.CanvasTexture(canvas);
        const textBannerWidth = 16; // Wider to show full text
        const textBannerHeight = 3;
        const textGeometry = new THREE.PlaneGeometry(textBannerWidth, textBannerHeight);
        const textMaterial = new THREE.MeshStandardMaterial({
            map: textTexture,
            side: THREE.DoubleSide,
            transparent: true
        });
        const textBanner = new THREE.Mesh(textGeometry, textMaterial);

        // Position text below the logo banner
        const textTopY = bannerTopY - bannerHeight - 0.5;
        textBanner.position.set(0, textTopY - textBannerHeight / 2, bannerPos.z);
        textBanner.castShadow = true;
        textBanner.receiveShadow = true;
        scene.add(textBanner);

        // Add wires connecting text banner to logo banner above
        const textLeftWire = new THREE.Mesh(wireGeo, wireMat);
        textLeftWire.position.set(-textBannerWidth / 2 + 0.5, textTopY, bannerPos.z);
        scene.add(textLeftWire);

        const textRightWire = new THREE.Mesh(wireGeo, wireMat);
        textRightWire.position.set(textBannerWidth / 2 - 0.5, textTopY, bannerPos.z);
        scene.add(textRightWire);

        console.log(`✅ Starting line banner at ${bannerDistance}m - hanging from line across canyon`);
    }, undefined, (error) => {
        console.warn('⚠️ Could not load starting banner logo:', error);
    });

    // DISABLED: Old flat water
    // createRealWater();

    // DISABLED: createRiverBanks - was creating overlapping walls at x=±25 that block the water
    // createRiverBanks();

    // DISABLED: Old static canyon walls (now using curved walls)
    // console.log('🏔️ Creating canyon walls...');
    const wallHeight = 40;
    const wallLength = 2000;
    const wallThickness = 10;
    const wallDistance = 25; // Distance from river center

    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b7355,
        roughness: 0.9,
        metalness: 0.0
    });

    // DISABLED: Old straight box walls - now using curved walls that follow spline
    // const leftWallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, wallLength);
    // const leftWall = new THREE.Mesh(leftWallGeom, wallMaterial);
    // leftWall.position.set(-wallDistance, wallHeight / 2 - 20, -wallLength / 2);
    // leftWall.castShadow = true;
    // leftWall.receiveShadow = true;
    // scene.add(leftWall);

    // const rightWallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, wallLength);
    // const rightWall = new THREE.Mesh(rightWallGeom, wallMaterial);
    // rightWall.position.set(wallDistance, wallHeight / 2 - 20, -wallLength / 2);
    // rightWall.castShadow = true;
    // rightWall.receiveShadow = true;
    // scene.add(rightWall);

    // console.log('✅ Canyon walls created');

    // DISABLED: Old shader-based white water effects (now using spline-based water)
    // console.log('🌊 Creating shader-based white water effects...');

    // DISABLED: Old waterfall system (conflicts with spline water)
    // console.log('🌊 Creating DRAMATIC waterfall at z=-200 with shader water');

    /*

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
    camera.position.set(0, 12, -18); // Reversed: behind duck in new direction
    camera.lookAt(0, 0, 10); // Reversed: look ahead in positive Z direction
    */
};

// Start game
const startGame = () => {
    console.log('🎮 Starting game...');

    // === SCENE CLEANUP - Remove old competitor ducks ===
    console.log(`🧹 Cleaning up ${competitorDucks.length} old competitor ducks...`);
    competitorDucks.forEach(duck => {
        scene.remove(duck);
        // Dispose geometry and materials to free memory
        if (duck.geometry) duck.geometry.dispose();
        if (duck.material) {
            if (Array.isArray(duck.material)) {
                duck.material.forEach(mat => mat.dispose());
            } else {
                duck.material.dispose();
            }
        }
    });
    competitorDucks = [];
    console.log('✅ Scene cleanup complete');

    // Get duck number from input (or assign 101 if blank)
    const duckNumberInput = document.getElementById('duckNumber');
    const inputValue = duckNumberInput ? parseInt(duckNumberInput.value) : null;
    gameState.duckNumber = (inputValue && inputValue >= 1 && inputValue <= 101)
        ? inputValue
        : 101; // Player is duck #101 (competitors are 1-100)
    console.log(`🦆 Player duck #${gameState.duckNumber}`);

    gameState.isPlaying = true;
    gameState.health = 100;
    gameState.distance = 15; // Start in MIDDLE of pack (ducks go from 0-30m)
    gameState.score = 0;
    gameState.speed = gameState.targetSpeed;
    gameState.duckPosition = 0;
    gameState.startTime = Date.now(); // Start race timer
    gameState.splineT = splinePath.distanceToT(15); // Start in middle of pack
    gameState.level = 1; // RESET level
    gameState.position = 75; // Start in middle position (~75/151)
    gameState.duckVelocityY = 0; // RESET vertical velocity
    gameState.jumpHeight = 0; // RESET jump
    gameState.isJumping = false; // RESET jump state
    gameState.hasTakenWaterfallDamage = false; // RESET waterfall damage flag
    gameState.startGracePeriod = 30; // 30 frames (~0.5 second) grace for collision only
    gameState.startTime = Date.now();

    // Reset eagle attack
    eagleHasAttacked = false;
    eagleAttackTime = 0;
    eagleHasGrabbedDuck = false;
    eagleGrabTime = 0;
    duckOriginalPosition = null;
    eagleCirclePhase = 0;
    eagleSwoopStartPos = null;
    eagleSwoopTargetX = 0;
    eagleSwoopTargetZ = 0;
    eagleSwoopWaterLevel = 0;
    eagleSwoopHasTouchedWater = false;
    eagleCommittedX = null;
    eagleHasCommitted = false;
    duckIsFalling = false;
    duckFallVelocity = 0;
    duckFallStartY = 0;
    if (eagle) {
        const eagleTriggerT = splinePath.distanceToT(950);
        const eagleTriggerPos = splinePath.getPointAt(eagleTriggerT);
        eagle.position.set(-28, eagleTriggerPos.y + 15, eagleTriggerPos.z);
        eagle.rotation.set(0, Math.PI / 4, 0);
        console.log('🦅 Eagle reset to starting position');
    }

    // Reset finish line cutscene
    finishLineCutsceneActive = false;
    finishLineCutsceneStartTime = 0;
    finishLineCameraPosition = null;
    originalCameraPosition = null;

    console.log('✅ Game state reset');

    // Reset duck position to start
    const startPos = splinePath.getPointAt(0); // Start at beginning
    duck.position.copy(startPos);
    duck.position.y = startPos.y + gameState.baseHeight;
    duck.rotation.x = 0;
    duck.rotation.z = 0;
    console.log(`🦆 Duck reset to: x=${duck.position.x.toFixed(1)}, y=${duck.position.y.toFixed(1)}, z=${duck.position.z.toFixed(1)}, waterLevel=${startPos.y.toFixed(1)}`);

    // Race number flags removed

    // 🦆🦆🦆 Spawn competitor ducks!
    spawnCompetitorDucks();

    // Clear existing obstacles
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles.length = 0;

    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('endScreen').classList.add('hidden'); // Hide end screen too

    // Show mobile controls when game starts
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const mobileControls = document.getElementById('mobileControls');
    if (isMobile && mobileControls) {
        mobileControls.style.display = 'flex';
    }

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

    // Calculate final time
    const elapsed = Date.now() - gameState.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`;

    // Calculate composite score based on placement, health, and time
    let calculatedScore = 0;

    // Placement points (1st-15th get points)
    const placementPoints = [1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100];
    if (gameState.position <= 15) {
        calculatedScore += placementPoints[gameState.position - 1];
    }

    // Health bonus: 10 points per % health remaining
    calculatedScore += Math.max(0, Math.floor(gameState.health)) * 10;

    // Time bonus: 3000 base minus 2 points per second (faster = higher score)
    const timeBonus = Math.max(0, 3000 - (seconds * 2));
    calculatedScore += timeBonus;

    gameState.score = calculatedScore;

    finalScore.textContent = `Time: ${timeStr} | Score: ${calculatedScore} | Position: ${gameState.position}/${gameState.totalDucks}`;

    // Hide mobile controls on end screen
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) {
        mobileControls.style.display = 'none';
    }

    document.getElementById('endScreen').classList.remove('hidden');
};

// Update HUD
const updateHUD = () => {
    document.getElementById('position').textContent = gameState.position || 1;
    document.getElementById('totalDucks').textContent = gameState.totalDucks || 2000;
    document.getElementById('health').textContent = Math.max(0, Math.floor(gameState.health));
    document.getElementById('distance').textContent = Math.floor(gameState.distance);
    document.getElementById('score').textContent = gameState.score;

    // Update timer
    const elapsed = Date.now() - gameState.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('time').textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
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
    try {
    if (Math.random() < 0.05) console.log(`🔄 Loop: isPlaying=${gameState.isPlaying}, duck.z=${duck.position.z.toFixed(1)}`);
    if (gameState.isPlaying) {
        // Decrease grace period counter
        if (gameState.startGracePeriod > 0) {
            gameState.startGracePeriod--;
        }
        // Decrease invincibility frames
        if (gameState.invincibilityFrames > 0) {
            gameState.invincibilityFrames--;
        }
        // Duck controls - using same logic as truck from reference game
        let moveSpeed = 0.15;

        // Keyboard controls - NORMAL
        if (keys['arrowleft'] || keys['a']) {
            gameState.duckPosition -= moveSpeed; // Left
        }
        if (keys['arrowright'] || keys['d']) {
            gameState.duckPosition += moveSpeed; // Right
        }

        // Virtual button controls (mobile) - NORMAL
        if (buttonState.left) {
            gameState.duckPosition -= moveSpeed; // Left
        }
        if (buttonState.right) {
            gameState.duckPosition += moveSpeed; // Right
        }

        // Touch swipe controls (mobile) - NORMAL
        if (touchState.active && touchState.direction !== 0) {
            const touchMoveSpeed = moveSpeed * (0.5 + touchState.intensity * 0.5);
            gameState.duckPosition += touchState.direction * touchMoveSpeed; // Normal
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

        // 🦆🦆🦆 Update all competitor ducks
        updateCompetitorDucks(0.016); // Assuming ~60fps = 16ms

        // ===== DETERMINE CURRENT WATER LEVEL (from spline elevation) =====
        // Get the current ground/water level from the spline path
        const splineElevation = splinePath.getPointAt(gameState.splineT).y;
        const currentWaterLevel = splineElevation; // Water surface follows terrain elevation

        // Debug logging (log more frequently to track the issue)
        if (Math.random() < 0.05) {
            const targetDuckY = currentWaterLevel + gameState.baseHeight;
            console.log(`Distance: ${gameState.distance.toFixed(0)}m | Duck z=${duck.position.z.toFixed(1)}, y=${duck.position.y.toFixed(2)} | waterLevel=${currentWaterLevel} | targetY=${targetDuckY.toFixed(2)} | Camera y=${camera.position.y.toFixed(1)}`);
        }

        // ===== PHYSICS-BASED 3D WAVE INTERACTION =====
        // Check if duck is falling (detect steep downward slopes)
        const slope = splinePath.getSlopeAt(gameState.splineT);
        const isOnSteepDrop = slope < -0.2; // Steep downhill
        const isFalling = isOnSteepDrop && duck.position.y > currentWaterLevel + gameState.baseHeight + 1;

        // Check ahead for upcoming waterfall warning
        const lookAheadDistance = 50; // meters
        const lookAheadT = Math.min(1.0, gameState.splineT + (lookAheadDistance / splinePath.totalLength));
        const slopeAhead = splinePath.getSlopeAt(lookAheadT);
        const waterfallAhead = slopeAhead < -0.5; // Big drop ahead

        // Show/hide waterfall warning
        const warningElement = document.getElementById('waterfallWarning');
        if (warningElement) {
            if (waterfallAhead && !isOnSteepDrop) {
                warningElement.style.display = 'block';
            } else {
                warningElement.style.display = 'none';
            }
        }

        // Skip duck physics if eagle has grabbed the duck OR duck is in dramatic fall
        if (!eagleHasGrabbedDuck && !duckIsFalling) {
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
        } // End if (!eagleHasGrabbedDuck) - duck physics

        // 🦆💧 DRAMATIC FALL FROM EAGLE DROP
        if (duckIsFalling) {
            // Apply gravity - accelerate downward
            duckFallVelocity -= 0.8; // Gravity acceleration

            // Update duck Y position
            duck.position.y += duckFallVelocity;

            // Debug log
            if (Math.floor(Date.now() / 100) % 5 === 0) {
                console.log(`💧 Falling: y=${duck.position.y.toFixed(1)}, velocity=${duckFallVelocity.toFixed(2)}, health=${gameState.health}`);
            }

            // Get current water level
            const currentT = splinePath.distanceToT(gameState.distance);
            const currentPos = splinePath.getPointAt(currentT);
            const waterLevel = currentPos.y;

            // Check if duck hits water
            if (duck.position.y <= waterLevel + 0.2) {
                // SPLASH WITH BOUNCE!
                duck.position.y = waterLevel + 0.2;

                const fallDistance = duckFallStartY - waterLevel;
                console.log(`💦💦💦 SPLASH! Duck fell ${fallDistance.toFixed(1)} units and BOUNCES out of the water!`);

                // Create MASSIVE DRAMATIC splash
                for (let i = 0; i < 25; i++) {
                    // Create much larger splash particles
                    const geometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 6, 6); // MUCH bigger!
                    const material = new THREE.MeshBasicMaterial({
                        color: 0xFFFFFF,
                        transparent: true,
                        opacity: 0.9
                    });
                    const particle = new THREE.Mesh(geometry, material);

                    particle.position.set(
                        duck.position.x + (Math.random() - 0.5) * 5,
                        waterLevel + Math.random() * 2,
                        duck.position.z + (Math.random() - 0.5) * 5
                    );

                    // Explosive velocity upward and outward
                    particle.userData.velocity = {
                        x: (Math.random() - 0.5) * 1.5,
                        y: 0.5 + Math.random() * 1.0, // Launch upward!
                        z: (Math.random() - 0.5) * 1.5
                    };
                    particle.userData.life = 1.5; // Longer life

                    scene.add(particle);
                    splashParticles.push(particle);
                }

                // Apply damage (50% of original values for rubber duck!)
                const eagleGrabDamage = 15; // Was 30, now 15 (50%)
                const fallDamage = Math.min(15, Math.floor(fallDistance * 0.15)); // Cap at 15 (50% of 30)
                const totalDamage = eagleGrabDamage + fallDamage;

                gameState.health -= totalDamage;
                console.log(`💥 Eagle grab (${eagleGrabDamage}) + fall damage (${fallDamage}) = ${totalDamage} total! Health: ${gameState.health}`);

                // RUBBER DUCK BOUNCES! Small bounce (1-2 feet)
                gameState.isJumping = true; // Treat bounce as a jump
                gameState.jumpHeight = 1.5; // Small bounce - about 1.5 feet
                gameState.jumpVelocity = 0.15; // Small upward velocity for gentle bounce

                duckIsFalling = false; // Exit falling state

                // Prevent waterfall damage from triggering on the bounce landing
                gameState.hasTakenWaterfallDamage = true;

                console.log(`🦆 BOUNCE! Duck springs back up gently (1.5 feet)`);
            }
        }

        // Update splash particles
        updateSplashParticles();

        // Update REAL 3D water animation
        updateRealWater();

        // 🎢 SPLINE-BASED MOVEMENT SYSTEM
        // Calculate variable speed based on spline slope (reuse slope from above)
        const isUphill = slope > 0.1; // Going uphill

        // Show/hide uphill warning
        const uphillWarningElement = document.getElementById('uphillWarning');
        if (uphillWarningElement) {
            uphillWarningElement.style.display = isUphill ? 'block' : 'none';
        }

        // Apply paddle boost when going uphill
        const paddleSpeedBoost = isUphill ? gameState.paddleBoost : 0;

        // Decay paddle boost over time
        gameState.paddleBoost = Math.max(0, gameState.paddleBoost - 0.01);

        const baseSpeed = gameState.speed;
        const speedMultiplier = splinePath.getSpeedMultiplierAt(gameState.splineT);
        const actualSpeed = (baseSpeed + paddleSpeedBoost) * speedMultiplier;

        // Update position on spline (t parameter)
        const deltaT = actualSpeed / splinePath.totalLength;
        gameState.splineT += deltaT;

        // TRIGGER CUTSCENE at 1950m (50m before finish line)
        if (gameState.distance >= 1950 && gameState.isPlaying && !finishLineCutsceneActive) {
            console.log('🏁 APPROACHING FINISH LINE! Starting cutscene...');

            // Trigger finish line cutscene
            finishLineCutsceneActive = true;
            finishLineCutsceneStartTime = Date.now();

            // Store original camera position
            originalCameraPosition = camera.position.clone();

            // Set camera ahead of duck at finish line, facing backward to see duck approach
            const finishT = splinePath.distanceToT(2000);
            const finishPos = splinePath.getPointAt(finishT);
            finishLineCameraPosition = new THREE.Vector3(
                0, // Center of river
                finishPos.y + 5, // Just above water level
                finishPos.z - 15 // 15 units ahead of finish line
            );
        }

        // END GAME at 2100m (100m after finish line for cool-down float)
        if (gameState.distance >= 2100 && gameState.isPlaying) {
            console.log(`🎉 VICTORY! Final Score: ${gameState.score} | Distance: ${gameState.distance.toFixed(0)}m | Health: ${gameState.health}%`);
            gameState.isPlaying = false;
            finishLineCutsceneActive = false;
            endGame();
            return;
        }

        // Get current position on spline
        const splinePos = splinePath.getPointAt(gameState.splineT);
        const splineTangent = splinePath.getTangentAt(gameState.splineT);

        // Update duck position (spline position + lateral offset)
        // UNLESS eagle has grabbed the duck - then eagle controls position!
        if (!eagleHasGrabbedDuck) {
            duck.position.x = splinePos.x + gameState.duckPosition;
            duck.position.z = splinePos.z;
            // Y position handled by wave physics / falling physics
        }

        // Track distance traveled (actual meters along spline)
        gameState.distance = splinePath.tToDistance(gameState.splineT);
        // Score now calculated at end based on placement, health, and time

        // Update current section for themed lighting
        const newSection = splinePath.getSectionAtDistance(gameState.distance);
        if (newSection !== gameState.currentSection) {
            gameState.currentSection = newSection;
            console.log(`🎨 Entering: ${newSection.name} - ${newSection.description}`);
            // TODO: Transition lighting/fog to match section theme
        }

        // Check for level progression
        const newLevel = Math.floor(gameState.distance / gameState.levelThreshold) + 1;
        if (newLevel > gameState.level) {
            gameState.level = newLevel;
            console.log(`🎉 LEVEL UP! Now at Level ${gameState.level}`);

            // Increase difficulty
            gameState.targetSpeed += 0.1; // Faster current
            gameState.speed = gameState.targetSpeed;
        }

        // ===== DROP PHYSICS - WORKS FOR ALL DROPS NOW! =====
        // Track if we just started falling on this drop (for one-time damage)
        // BUT: Skip ALL drop physics if eagle has grabbed duck or duck is in dramatic fall!
        if (!eagleHasGrabbedDuck && !duckIsFalling && isFalling && duck.position.y > currentWaterLevel + gameState.baseHeight + 2) {
            // Duck is ABOVE the water, actively falling!

            // Apply damage once when first going over ANY drop (waterfall damage always applies!)
            if (!gameState.hasTakenWaterfallDamage && slope < -0.5) {
                // Only damage on BIG drops (slope < -0.5 = very steep)
                const isPerfectJump = gameState.isJumping;

                if (isPerfectJump) {
                    console.log('🦆✨ PERFECT JUMP over the drop!');
                } else {
                    const dropSize = Math.abs(slope) * 30; // Estimate drop height
                    const damage = Math.min(15, Math.floor(dropSize * 0.5)); // 50% damage for rubber duck! Cap at 15
                    console.log(`💦 WATERFALL DAMAGE! Fell ${dropSize.toFixed(0)}ft - ${damage} damage! Distance: ${gameState.distance.toFixed(0)}m, Health: ${gameState.health} -> ${gameState.health - damage}`);
                    gameState.health -= damage;
                }
                gameState.hasTakenWaterfallDamage = true;
            }

            // Physics: jumping vs falling
            const isPerfectJump = gameState.isJumping;

            if (isPerfectJump) {
                // PERFECT JUMP! Smooth arc (jump physics already handled above)
                if (Math.random() < 0.1) console.log(`🦆✨ Soaring! y=${duck.position.y.toFixed(1)}`);
            } else {
                // NOT jumping - free fall with tumbling
                gameState.duckVelocityY -= 0.5; // Gravity acceleration
                duck.position.y += gameState.duckVelocityY;

                // Add rotation for dramatic tumbling effect
                duck.rotation.x += 0.05;

                if (Math.random() < 0.05) console.log(`🌊 FALLING! y=${duck.position.y.toFixed(1)}`);
            }
        } else if (!eagleHasGrabbedDuck && !duckIsFalling && !isFalling && duck.position.y <= currentWaterLevel + gameState.baseHeight) {
            // Duck safely on water - reset everything (but NOT if eagle has it or dramatic fall!)
            duck.position.y = currentWaterLevel + gameState.baseHeight;
            duck.rotation.x = 0;
            gameState.duckVelocityY = 0;

            // ✅ FIX: Reset damage flag when NOT on a steep drop anymore
            gameState.hasTakenWaterfallDamage = false;
        }

        // DISABLED: Moving terrain walls (causing performance issues and visual problems)
        // if (leftRiverbank && rightRiverbank) {
        //     leftRiverbank.position.z = camera.position.z;
        //     rightRiverbank.position.z = camera.position.z;
        // }
        // if (riverbedTerrain) {
        //     riverbedTerrain.position.z = camera.position.z;
        // }

        // Old river segment code removed - using real 3D water now

        // Spawn obstacles - 5% chance per frame (2.5x increase from 2%)
        const spawnRate = 0.05;
        const activeDynamicObstacles = obstacles.filter(o => o.userData.type === 'log' || o.userData.type === 'rock').length;
        if (Math.random() < spawnRate && activeDynamicObstacles < 25) { // Increased cap to 25
            const spawnZ = camera.position.z - 80;
            const spawnDistance = Math.abs(spawnZ);

            // Waterfall drop zones - don't spawn near edges
            const dropZones = [
                {start: 190, end: 270},   // Drop 1 buffer
                {start: 390, end: 470},   // Drop 2 buffer
                {start: 590, end: 670},   // Drop 3 buffer
                {start: 790, end: 870},   // Drop 4 buffer
                {start: 990, end: 1070},  // Drop 5 buffer
                {start: 1190, end: 1270}, // Drop 6 buffer
                {start: 1390, end: 1480}  // Drop 7 buffer
            ];

            // Check if spawn position is in a drop zone
            const inDropZone = dropZones.some(zone =>
                spawnDistance >= zone.start && spawnDistance <= zone.end
            );

            if (!inDropZone) {
                const lane = (Math.random() - 0.5) * 10; // Narrower lane range
                let obstacle;

                // Calculate water level at spawn position based on spline
                const spawnT = splinePath.distanceToT(spawnDistance);
                const spawnWaterLevel = splinePath.getPointAt(spawnT).y;

                // Random obstacle type - 50% logs, 50% rocks
                const obstacleType = Math.random();
                if (obstacleType < 0.5) {
                    // Spawn log
                    obstacle = createLog(lane, spawnZ, spawnWaterLevel);
                } else {
                    // Spawn rock
                    obstacle = createRock(lane, spawnZ);
                    obstacle.position.y = spawnWaterLevel; // Set to water level
                }

                // Store course distance for accurate water level tracking
                obstacle.userData.courseDistance = spawnDistance;

                obstacles.push(obstacle);
                scene.add(obstacle);
            }
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
            // REMOVED: Rock Y position update - rocks are STATIC obstacles
            // They should stay at their initial placement height, not follow water dynamically

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

            // UPDATE LOG AND ROCK Y POSITIONS - directly set to water level
            if (obstacle.userData && (obstacle.userData.type === 'log' || obstacle.userData.type === 'rock')) {
                // All obstacles should have courseDistance set at creation
                if (obstacle.userData.courseDistance !== undefined) {
                    const obstacleT = splinePath.distanceToT(obstacle.userData.courseDistance);
                    const waterLevel = splinePath.getPointAt(obstacleT).y;

                    // Directly set Y to water level - rocks sit AT water level, logs float slightly above
                    obstacle.position.y = waterLevel + (obstacle.userData.type === 'log' ? 0.2 : 0.1);
                }

                // Slow rotation in water for logs
                if (obstacle.userData.type === 'log' && obstacle.userData.rotationSpeed) {
                    obstacle.rotation.z += obstacle.userData.rotationSpeed;
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

                    // Gradual damage from rough water - only 1% chance per frame (50% less frequent)
                    if (Math.random() < 0.01) {
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
                    gameState.health -= Math.floor((obstacle.userData.damage || 0) * 0.5); // 50% for rubber duck!

                    // Spin the duck!
                    gameState.duckAngularVelX += 0.2;
                    gameState.duckAngularVelZ += 0.15;

                    obstacle.userData.hasHitDuck = true;
                    setTimeout(() => { obstacle.userData.hasHitDuck = false; }, 2000);
                }
            }

            // Collision detection - check for obstacles (skip during grace period)
            // Use larger collision radius for player (3.0 instead of 2.0)
            const playerCollisionDist = Math.sqrt(
                Math.pow(duck.position.x - obstacle.position.x, 2) +
                Math.pow(duck.position.z - obstacle.position.z, 2)
            );

            if (gameState.startGracePeriod === 0 && playerCollisionDist < 3.0) {
                if (obstacle.userData.type === 'rapids' || obstacle.userData.type === 'shader_rapids') {
                    // Rapids already handled above with physics
                    // Extra damage if you hit a rock (50% for rubber duck!)
                    gameState.health -= Math.floor((obstacle.userData.damage || 15) * 0.5);
                } else if (obstacle.userData.type === 'shader_waterfall') {
                    // Waterfall already handled above
                } else if (obstacle.userData.type === 'rock' || obstacle.userData.type === 'log') {
                    // Regular obstacles (rocks/logs) - check if duck can jump over
                    const isHighEnough = gameState.jumpHeight > 2.0;

                    if (!isHighEnough) {
                        // 💥 STRONG BUMP BACK PHYSICS - Obstacle collision!
                        const bumpAngle = Math.atan2(duck.position.z - obstacle.position.z,
                                                       duck.position.x - obstacle.position.x);
                        const bumpForce = (3.0 - playerCollisionDist) * 4; // Much stronger bump

                        // Bump player sideways (X direction) - STRONGER
                        gameState.duckPosition += Math.cos(bumpAngle) * bumpForce * 1.5;
                        gameState.duckPosition = Math.max(-8, Math.min(8, gameState.duckPosition));

                        // Bump player BACKWARD (Z direction) - CRITICAL!
                        const backwardBump = bumpForce * 0.8;
                        gameState.splineT -= backwardBump / splinePath.totalLength;
                        gameState.splineT = Math.max(0, gameState.splineT); // Don't go negative

                        // Apply damage only if not invincible (prevents stuck-on-rock instant death)
                        if (gameState.invincibilityFrames <= 0) {
                            gameState.health -= obstacle.userData.damage || 7; // Direct damage, no multiplier
                            gameState.invincibilityFrames = 60; // 1 second of invincibility at 60fps
                            console.log(`💥 ROCK HIT! Bumped backward ${backwardBump.toFixed(2)} units - invincible for 1s`);
                        } else {
                            console.log(`💫 Hit while invincible (${gameState.invincibilityFrames} frames left)`);
                        }

                        // DON'T remove obstacle - it stays there to block you!
                    } else {
                        // Successfully jumped over! Bonus points
                    }
                }
            }

            // Remove obstacles that are too far behind
            if (obstacle.position.z - camera.position.z > 30) {
                scene.remove(obstacle);
                obstacles.splice(index, 1);
            }
        });

        // 🦅 Golden Eagle Attack Logic
        // EAGLE HOVERING PHASE (800-1000m) - Player can see it WELL in advance!
        if (eagle && !eagleHasAttacked && gameState.distance > 800 && gameState.distance < 1000) {
            // Eagle flies from canyon wall to center, hovering and watching
            const progress = (gameState.distance - 800) / 200; // 0 to 1 as you go from 800 to 1000m
            const eagleWatchT = splinePath.distanceToT(950);
            const eagleWatchPos = splinePath.getPointAt(eagleWatchT);

            // Fly from left wall (-28) to center (0)
            const targetX = -28 + (progress * 28); // Move from -28 to 0

            // Gentle bobbing motion
            const bobTime = Date.now() * 0.001;
            eagle.position.set(
                targetX + Math.sin(bobTime) * 2, // Slight side-to-side drift
                eagleWatchPos.y + 25 + Math.sin(bobTime * 2) * 2, // Bob up and down, 25 units above water
                eagleWatchPos.z
            );

            // Eagle always faces the approaching duck
            eagle.lookAt(duck.position.x, duck.position.y + 5, duck.position.z);

            // Show warning at 850m (gives 150m to prepare!)
            if (gameState.distance > 850 && gameState.distance < 852) {
                console.log('⚠️ 🦅 EAGLE LEAVING ITS PERCH! It\'s watching you... prepare to DODGE LEFT OR RIGHT!');
            }

            // Final warning at 950m
            if (gameState.distance > 950 && gameState.distance < 952) {
                console.log('🚨 🦅 EAGLE IS ABOUT TO ATTACK! DODGE NOW!');
            }
        }

        // EAGLE ATTACK TRIGGERED (1000m+)
        if (eagle && !eagleHasAttacked && gameState.distance >= 1000 && gameState.distance < 1100) {
            eagleHasAttacked = true;
            eagleAttackTime = Date.now();

            // Position eagle high and IN FRONT for visible approach (Level 1 - fair warning!)
            const currentT = splinePath.distanceToT(gameState.distance);
            const currentPos = splinePath.getPointAt(currentT);

            // Start eagle WAY IN FRONT and HIGH so player can see it coming!
            eagleSwoopStartPos = new THREE.Vector3(
                duck.position.x - 8,  // Slightly to the side
                currentPos.y + 40,    // 40 units high (very visible)
                duck.position.z - 100  // 100 units IN FRONT - very visible!
            );
            eagle.position.copy(eagleSwoopStartPos);

            console.log(`🦅 Eagle positioned at z=${eagle.position.z.toFixed(1)}, Duck at z=${duck.position.z.toFixed(1)}, Diff=${(duck.position.z - eagle.position.z).toFixed(1)}`);

            // Lock target to duck's starting X position
            eagleSwoopTargetX = duck.position.x;
            eagleSwoopTargetZ = duck.position.z;

            // Get water level at attack point
            eagleSwoopWaterLevel = currentPos.y;
            eagleSwoopHasTouchedWater = false;
            eagleCommittedX = null; // Reset commitment
            eagleHasCommitted = false; // Reset commitment flag

            console.log(`🦅💨 EAGLE APPROACHING! Watch for it to commit to an attack lane, then DODGE!`);
        }

        if (eagle && eagleHasAttacked) {
            const elapsed = (Date.now() - eagleAttackTime) / 1000; // seconds
            const swoopDuration = 1.5; // Fast swoop - 1.5 seconds

            if (!eagleHasGrabbedDuck && elapsed < swoopDuration) {
                // 🦅 SWOOPING ARC ANIMATION - AGGRESSIVE dive toward duck!
                const progress = elapsed / swoopDuration; // 0 to 1

                // COMMITMENT MECHANIC - Level 1: commits at 25% through swoop (early = easier)
                const commitmentThreshold = 0.25; // Commits 25% through (adjust for difficulty)

                if (!eagleHasCommitted && progress >= commitmentThreshold) {
                    // EAGLE COMMITS TO ATTACK LANE!
                    eagleHasCommitted = true;
                    eagleCommittedX = eagle.position.x; // Lock current X position
                    console.log(`🦅🎯 EAGLE COMMITS TO ATTACK! Lane X=${eagleCommittedX.toFixed(1)} - DODGE NOW!`);
                }

                // Target positions
                const targetY = duck.position.y; // Duck's actual Y
                const targetZ = duck.position.z;

                // X position: Track duck UNTIL commitment, then dive straight
                if (!eagleHasCommitted) {
                    // TRACKING PHASE - follows your movement
                    const targetX = duck.position.x;
                    eagle.position.x += (targetX - eagle.position.x) * 0.25;
                } else {
                    // COMMITTED PHASE - dives straight in locked lane!
                    eagle.position.x = eagleCommittedX; // Stay in committed lane
                }

                // Z position: VERY FAST BACKWARD dive toward duck (coming from front!)
                eagle.position.z += (targetZ - eagle.position.z) * 0.35;

                // Y position: Aggressive dive down
                // First half (0 to 0.5): Dive down from start height to water level
                // Second half (0.5 to 1.0): Pull back up
                const startY = eagleSwoopStartPos.y;
                const waterY = eagleSwoopWaterLevel;

                if (progress < 0.5) {
                    // Diving down - progress 0→0.5 means startY→waterY
                    const diveProgress = progress * 2; // 0→1
                    eagle.position.y = startY + (waterY - startY) * diveProgress;
                } else {
                    // Pulling back up - progress 0.5→1 means waterY→startY
                    const pullUpProgress = (progress - 0.5) * 2; // 0→1
                    eagle.position.y = waterY + (startY - waterY) * pullUpProgress;
                }

                // Debug: Log eagle and duck positions every 0.3 seconds
                if (Math.floor(elapsed / 0.3) !== Math.floor((elapsed - 0.016) / 0.3)) {
                    const distToD = eagle.position.distanceTo(duck.position);
                    console.log(`🦅 Swoop: prog=${(progress*100).toFixed(0)}% | Eagle: (${eagle.position.x.toFixed(1)}, ${eagle.position.y.toFixed(1)}, ${eagle.position.z.toFixed(1)}) | Duck: (${duck.position.x.toFixed(1)}, ${duck.position.y.toFixed(1)}, ${duck.position.z.toFixed(1)}) | Dist: ${distToD.toFixed(1)}`);
                }

                // Eagle tilts forward during dive
                const diveAngle = Math.sin(progress * Math.PI) * 0.8; // Tilts down during middle of swoop
                eagle.rotation.x = -diveAngle; // Pitch forward
                eagle.rotation.z = Math.sin(elapsed * 10) * 0.2; // Wing flap

                // Point eagle towards target
                eagle.lookAt(duck.position.x, targetY, targetZ);

                // Check if eagle's claws touch water (at lowest point)
                if (progress > 0.4 && progress < 0.6 && !eagleSwoopHasTouchedWater) {
                    if (eagle.position.y - eagleSwoopWaterLevel < 1.5) {
                        eagleSwoopHasTouchedWater = true;
                        // Create water splash effect
                        console.log('💦 Eagle\'s claws touch the water! *SPLASH*');
                    }
                }

                // Check if eagle grabs duck during swoop
                const distToD = eagle.position.distanceTo(duck.position);
                if (distToD < 3.5) { // Within grab range (wider for visibility)
                    // Check if player is DODGING (moved out of committed attack lane)
                    let isDodging = false;
                    if (eagleHasCommitted) {
                        // After commitment, check if duck is out of the attack lane
                        const duckOffsetFromLane = Math.abs(duck.position.x - eagleCommittedX);
                        isDodging = duckOffsetFromLane > 3; // If 3+ units away from committed lane (easier!)
                    }

                    if (isDodging) {
                        // SUCCESSFUL DODGE! Try to grab a competitor duck instead
                        if (!eagleSwoopHasTouchedWater) {
                            console.log('✨🦆 YOU DODGED THE EAGLE! Nice reflexes!');
                            eagleSwoopHasTouchedWater = true; // Mark as dodged (reusing flag)

                            // 🦅🦆 Try to grab a nearby competitor duck instead!
                            let nearestDuck = null;
                            let nearestDist = Infinity;
                            competitorDucks.forEach(compDuck => {
                                if (compDuck.visible && compDuck.userData && compDuck.userData.health > 0) {
                                    const dist = eagle.position.distanceTo(compDuck.position);
                                    if (dist < 10 && dist < nearestDist) {
                                        nearestDist = dist;
                                        nearestDuck = compDuck;
                                    }
                                }
                            });

                            if (nearestDuck) {
                                // Eagle grabs the competitor duck!
                                console.log(`🦅🦆 Eagle grabbed competitor duck #${nearestDuck.userData.raceNumber} instead!`);
                                nearestDuck.userData.grabbedByEagle = true;
                                nearestDuck.userData.eagleGrabTime = Date.now();
                                nearestDuck.userData.eagleGrabStartY = nearestDuck.position.y;
                            }
                        }
                    } else {
                        // Eagle grabbed the duck!
                        eagleHasGrabbedDuck = true;
                        eagleGrabTime = Date.now(); // Start grab timer
                        duckOriginalPosition = duck.position.clone();
                        // Don't apply damage yet - wait for the fall!
                        console.log(`🦅💀 EAGLE HAS GRABBED THE DUCK! Health: ${gameState.health} (no damage yet - will apply on splash)`);
                    }
                }
            } else if (!eagleHasGrabbedDuck && elapsed >= swoopDuration) {
                // Swoop complete - Eagle flies away
                if (!eagleSwoopHasTouchedWater) {
                    console.log('🦅 Eagle completes swoop and flies away...');
                }
                eagleAttackTime = Date.now() - 10000; // Jump to fly-away phase
            } else if (eagleHasGrabbedDuck) {
                const grabElapsed = (Date.now() - eagleGrabTime) / 1000; // Time since grab

                if (grabElapsed < 3) {
                    // CARRY DUCK AWAY - duck is attached to eagle's talons
                    // Position duck in eagle's talons (very close, right underneath)
                    duck.position.x = eagle.position.x;
                    duck.position.y = eagle.position.y - 1; // Only 1 unit below - in talons!
                    duck.position.z = eagle.position.z;

                    // Fly FAST upward and away with the duck, but cap max height
                    const maxCarryHeight = eagleSwoopWaterLevel + 60; // Only 60 units above water (not 240!)
                    if (eagle.position.y < maxCarryHeight) {
                        eagle.position.y += 1.2; // MUCH faster ascent
                    }
                    eagle.position.x -= 0.4; // Move away horizontally
                    eagle.position.z -= 0.3; // Move away depth

                    // Keep eagle upright and facing away while carrying
                    eagle.rotation.set(0, Math.PI, Math.sin(grabElapsed * 8) * 0.1); // Upright, facing backward, slight roll

                    // Debug log every 30 frames (~0.5 seconds)
                    if (Math.floor(grabElapsed * 60) % 30 === 0) {
                        console.log(`🦅 Carrying duck: eagle.y=${eagle.position.y.toFixed(1)}, duck.y=${duck.position.y.toFixed(1)}, elapsed=${grabElapsed.toFixed(1)}s, health=${gameState.health}`);
                    }
                } else {
                    // DROP THE DUCK after carrying it for 3 seconds
                    eagleHasGrabbedDuck = false;
                    eagleHasAttacked = true; // Mark attack as COMPLETE so eagle won't immediately retry
                    eagleAttackTime = Date.now() - 20000; // Set time far in past to trigger fly-away phase

                    // Start dramatic fall!
                    duckIsFalling = true;
                    duckFallVelocity = 0; // Start with zero velocity
                    duckFallStartY = duck.position.y;

                    console.log(`🦅 Eagle drops the duck from ${duck.position.y.toFixed(1)} units high! Watch it fall! Health: ${gameState.health}, isFalling: ${duckIsFalling}`);

                    // Eagle flies away
                    eagle.position.y += 0.5;
                    eagle.position.x -= 0.4;
                }
            } else {
                // Eagle continues flying away
                eagle.position.y += 0.3;
                eagle.position.x -= 0.2;
                eagle.position.z -= 0.1;
            }
        }

        // Check if health depleted (but let dramatic fall finish first!)
        if (gameState.health <= 0) {
            if (duckIsFalling) {
                console.log(`⚠️ Health is ${gameState.health} but duck is falling - waiting for splash...`);
            } else {
                console.log(`💀 Health depleted (${gameState.health}) - ending game`);
                endGame();
            }
        }

        updateHUD();
    }
    console.log(`✓ After isPlaying block, about to run camera code`);

    // 🏁 CAMERA LOGIC - Runs EVERY frame (not just when playing) to fix restart freeze
    console.log(`🎬 Camera code running: cutscene=${finishLineCutsceneActive}, duck.z=${duck.position.z.toFixed(1)}`);
    if (finishLineCutsceneActive) {
        // Position camera ahead of duck, looking back to see front of duck
        camera.position.copy(finishLineCameraPosition);
        camera.lookAt(duck.position.x, duck.position.y + 1, duck.position.z);
        console.log(`📷 CUTSCENE: Camera z=${camera.position.z.toFixed(1)}, Duck z=${duck.position.z.toFixed(1)}`);
        // Cutscene continues until duck reaches 2100m (cool-down zone end)
    } else {
        // Normal camera follows duck - adjusted for river view AND elevation
        camera.position.x = duck.position.x; // Follow duck's X position
        camera.position.z = duck.position.z + 18; // Camera behind duck
        // Reduced minimum from 20 to -60 so camera follows duck down the drops more closely
        camera.position.y = Math.max(-60, duck.position.y + 16);
        camera.lookAt(duck.position.x, duck.position.y + 2, duck.position.z - 10); // Look ahead
        if (Math.random() < 0.01) { // Log occasionally
            console.log(`📷 NORMAL: Camera z=${camera.position.z.toFixed(1)}, Duck z=${duck.position.z.toFixed(1)}`);
        }
    }

    // Animate Water shader (for all curved water sections)
    waterSections.forEach((water, index) => {
        if (water.material && water.material.uniforms && water.material.uniforms['time']) {
            water.material.uniforms['time'].value += 1.0 / 60.0; // Normal flow direction

            // Debug: Check if water material is degrading
            if (Math.random() < 0.001) { // Log occasionally
                const colorValue = water.material.uniforms['waterColor']?.value;
                const colorHex = colorValue?.getHexString ? colorValue.getHexString() : colorValue;
                console.log(`Water section ${index}: time=${water.material.uniforms['time'].value.toFixed(2)}, ` +
                    `waterColor=#${colorHex}, ` +
                    `hasTexture=${!!water.material.uniforms['normalSampler']?.value}`);
            }
        } else {
            if (Math.random() < 0.01) {
                console.warn(`Water section ${index} missing shader properties!`);
            }
        }
    });

    // Only render if game is playing or at low framerate for start screen
    if (gameState.isPlaying) {
        renderer.render(scene, camera);
    } else {
        // Render at 10 FPS on start screen to save performance
        if (!gameLoop.lastStartScreenRender || Date.now() - gameLoop.lastStartScreenRender > 100) {
            renderer.render(scene, camera);
            gameLoop.lastStartScreenRender = Date.now();
        }
    }
    } catch (error) {
        console.error('❌ GAME LOOP ERROR:', error);
        console.error('Stack:', error.stack);
    }

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
        location.reload(); // Simple fix: just reload the page
    });

    initMobileControls();
    init();
    gameLoop();
});
