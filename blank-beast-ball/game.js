// Blank Wars Character Data
const BLANK_WARS_CHARACTERS = {
    achilles: {
        id: 'achilles',
        name: 'Achilles',
        title: 'Hero of Troy',
        avatar: '⚔️',
        archetype: 'warrior',
        rarity: 'legendary',
        origin_era: 'Ancient Greece (1200 BCE)',
        backstory: 'The greatest warrior of the Trojan War, nearly invincible in combat but driven by rage and honor.',
        baseStats: { strength: 95, agility: 85, intelligence: 60, vitality: 90, wisdom: 45, charisma: 80 },
        color: 0x8B4513,
        accentColor: 0xFFD700
    },
    merlin: {
        id: 'merlin',
        name: 'Merlin',
        title: 'Archmage of Camelot',
        avatar: '🔮',
        archetype: 'mage',
        rarity: 'mythic',
        origin_era: 'Medieval Britain (5th-6th century)',
        backstory: 'The legendary wizard advisor to King Arthur, master of ancient magic and prophecy.',
        baseStats: { strength: 30, agility: 50, intelligence: 98, vitality: 70, wisdom: 95, charisma: 85 },
        color: 0x9370DB,
        accentColor: 0x4B0082
    },
    cleopatra: {
        id: 'cleopatra',
        name: 'Cleopatra VII',
        title: 'Last Pharaoh of Egypt',
        avatar: '👑',
        archetype: 'leader',
        rarity: 'epic',
        origin_era: 'Ptolemaic Egypt (69-30 BCE)',
        backstory: 'The brilliant and charismatic final pharaoh of Ancient Egypt, master of politics and ancient mysteries.',
        baseStats: { strength: 50, agility: 70, intelligence: 95, vitality: 80, wisdom: 90, charisma: 98 },
        color: 0xFFD700,
        accentColor: 0x4169E1
    },
    holmes: {
        id: 'holmes',
        name: 'Sherlock Holmes',
        title: 'Consulting Detective',
        avatar: '🔍',
        archetype: 'scholar',
        rarity: 'rare',
        origin_era: 'Victorian London (1880s-1910s)',
        backstory: 'The world\'s first consulting detective, master of observation and deductive reasoning.',
        baseStats: { strength: 40, agility: 60, intelligence: 98, vitality: 55, wisdom: 85, charisma: 70 },
        color: 0x8B4513,
        accentColor: 0xFFD700
    },
    dracula: {
        id: 'dracula',
        name: 'Count Dracula',
        title: 'Lord of the Undead',
        avatar: '🧛',
        archetype: 'mystic',
        rarity: 'legendary',
        origin_era: 'Gothic Victorian (1897)',
        backstory: 'The immortal vampire lord of Transylvania, master of dark magic and eternal night.',
        baseStats: { strength: 85, agility: 80, intelligence: 75, vitality: 90, wisdom: 70, charisma: 85 },
        color: 0x8B0000,
        accentColor: 0xFF0000
    },
    joan: {
        id: 'joan',
        name: 'Joan of Arc',
        title: 'The Maid of Orleans',
        avatar: '⚡',
        archetype: 'leader',
        rarity: 'epic',
        origin_era: 'Medieval France (1412-1431)',
        backstory: 'The peasant girl who became a saint, led France to victory against the English through divine visions.',
        baseStats: { strength: 80, agility: 75, intelligence: 70, vitality: 85, wisdom: 90, charisma: 95 },
        color: 0x4169E1,
        accentColor: 0xFFD700
    },
    sun_wukong: {
        id: 'sun_wukong',
        name: 'Sun Wukong',
        title: 'The Monkey King',
        avatar: '🐒',
        archetype: 'trickster',
        rarity: 'mythic',
        origin_era: 'Chinese Mythology',
        backstory: 'The immortal Monkey King, master of 72 transformations and legendary troublemaker of Heaven.',
        baseStats: { strength: 90, agility: 98, intelligence: 80, vitality: 85, wisdom: 75, charisma: 80 },
        color: 0xFF8C00,
        accentColor: 0xFFD700
    },
    robin_hood: {
        id: 'robin_hood',
        name: 'Robin Hood',
        title: 'Prince of Thieves',
        avatar: '🏹',
        archetype: 'trickster',
        rarity: 'rare',
        origin_era: 'Medieval England',
        backstory: 'The legendary outlaw of Sherwood Forest who stole from the rich to give to the poor.',
        baseStats: { strength: 70, agility: 90, intelligence: 75, vitality: 70, wisdom: 65, charisma: 85 },
        color: 0x228B22,
        accentColor: 0x8B4513
    },
    billy_the_kid: {
        id: 'billy_the_kid',
        name: 'Billy the Kid',
        title: 'The Outlaw',
        avatar: '🤠',
        archetype: 'assassin',
        rarity: 'uncommon',
        origin_era: 'American Old West (1870s-1880s)',
        backstory: 'The notorious young gunslinger of the American frontier, quick on the draw and quicker to anger.',
        baseStats: { strength: 65, agility: 95, intelligence: 55, vitality: 60, wisdom: 45, charisma: 75 },
        color: 0xD2691E,
        accentColor: 0xFFD700
    },
    tesla: {
        id: 'tesla',
        name: 'Nikola Tesla',
        title: 'Master of Lightning',
        avatar: '⚡',
        archetype: 'scholar',
        rarity: 'epic',
        origin_era: 'Industrial Revolution (1856-1943)',
        backstory: 'The brilliant inventor and electrical engineer whose innovations shaped the modern world.',
        baseStats: { strength: 45, agility: 60, intelligence: 98, vitality: 65, wisdom: 80, charisma: 70 },
        color: 0x1E90FF,
        accentColor: 0xFFD700
    },
    space_cyborg: {
        id: 'space_cyborg',
        name: 'Space Cyborg',
        title: 'Galactic Mercenary',
        avatar: '🤖',
        archetype: 'tank',
        rarity: 'epic',
        origin_era: 'Cyberpunk Future (2087)',
        backstory: 'An advanced combat cyborg from the future, part organic and part machine, seeking to understand humanity.',
        baseStats: { strength: 90, agility: 50, intelligence: 80, vitality: 95, wisdom: 60, charisma: 40 },
        color: 0x708090,
        accentColor: 0x00CED1
    },
    agent_x: {
        id: 'agent_x',
        name: 'Agent X',
        title: 'Shadow Operative',
        avatar: '🕴️',
        archetype: 'assassin',
        rarity: 'rare',
        origin_era: 'Modern Espionage (1960s-Present)',
        backstory: 'An elite intelligence operative specializing in covert operations and elimination targets.',
        baseStats: { strength: 75, agility: 92, intelligence: 85, vitality: 70, wisdom: 80, charisma: 60 },
        color: 0x2F4F4F,
        accentColor: 0xC0C0C0
    },
    genghis_khan: {
        id: 'genghis_khan',
        name: 'Genghis Khan',
        title: 'Great Khan',
        avatar: '🏹',
        archetype: 'leader',
        rarity: 'legendary',
        origin_era: 'Mongol Empire (1162-1227)',
        backstory: 'The Great Khan who united the Mongol tribes and built the largest contiguous empire in history.',
        baseStats: { strength: 88, agility: 80, intelligence: 90, vitality: 85, wisdom: 85, charisma: 92 },
        color: 0x8B4513,
        accentColor: 0xFFD700
    },
    sam_spade: {
        id: 'sam_spade',
        name: 'Sam Spade',
        title: 'The Hard-Boiled Detective',
        avatar: '🕵️',
        archetype: 'detective',
        rarity: 'rare',
        origin_era: 'Noir San Francisco (1930)',
        backstory: 'The legendary private eye from The Maltese Falcon. Cold, cynical, and sharp as a razor. When his partner Miles Archer was murdered, Sam took on the case that would define noir fiction forever.',
        baseStats: { strength: 70, agility: 75, intelligence: 90, vitality: 75, wisdom: 85, charisma: 80 },
        color: 0x2F2F2F,
        accentColor: 0xC0C0C0
    },
    fenrir: {
        id: 'fenrir',
        name: 'Fenrir',
        title: 'The Great Wolf',
        avatar: '🐺',
        archetype: 'beast',
        rarity: 'legendary',
        origin_era: 'Norse Age (8th-11th century)',
        backstory: 'The monstrous wolf of Norse mythology, prophesied to devour Odin during Ragnarök.',
        baseStats: { strength: 90, agility: 95, intelligence: 40, vitality: 95, wisdom: 30, charisma: 50 },
        color: 0x708090,
        accentColor: 0xFFFFFF
    },
    frankenstein_monster: {
        id: 'frankenstein_monster',
        name: 'Frankenstein\'s Monster',
        title: 'The Created',
        avatar: '⚡',
        archetype: 'tank',
        rarity: 'rare',
        origin_era: 'Gothic Literature (1818)',
        backstory: 'The artificial being created by Victor Frankenstein, struggling with existence and seeking acceptance.',
        baseStats: { strength: 98, agility: 30, intelligence: 65, vitality: 98, wisdom: 60, charisma: 25 },
        color: 0x556B2F,
        accentColor: 0xFFD700
    },
    rilak_trelkar: {
        id: 'rilak_trelkar',
        name: 'Rilak Trelkar',
        title: 'Alien Observer',
        avatar: '👽',
        archetype: 'scholar',
        rarity: 'rare',
        origin_era: 'Modern UFO Era (1947-Present)',
        backstory: 'An extraterrestrial being studying human civilization with advanced technology and psychic abilities.',
        baseStats: { strength: 35, agility: 70, intelligence: 95, vitality: 50, wisdom: 90, charisma: 40 },
        color: 0x808080,
        accentColor: 0x00FF00
    }
};

// Game State
let scene, camera, renderer;
let player, playerVelocity, playerOnGround;
let obstacles = [];
let keys = {};
let gameState = 'menu';
let selectedCharacter = null;
let selectedLevel = 1; // Default to Level 1
let startTime, currentTime;
let modelLoader; // 3D model loader
let clock; // For animation timing
let ballPhysics; // Ball physics manager
let animalHazards; // Animal hazard manager
let animationFrameId = null; // Track animation frame for cleanup

// Physics Constants
const GRAVITY = -0.02;
const JUMP_FORCE = 0.5;
const MOVE_SPEED = 0.15; // Balanced speed for control
const PLAYER_SIZE = 0.625; // Adjusted to match 2.5x Achilles model
const DEATH_Y = -10;

// Initialize
function init() {
    console.log('=== GAME INITIALIZING ===');
    console.log('THREE.js loaded:', typeof THREE !== 'undefined');
    console.log('ModelLoader available:', typeof ModelLoader !== 'undefined');
    console.log('Document ready state:', document.readyState);
    console.log('Body exists:', !!document.body);

    // Initialize model loader
    if (typeof ModelLoader !== 'undefined') {
        modelLoader = new ModelLoader();
        clock = new THREE.Clock();
        console.log('✅ Model loader initialized');
    } else {
        console.warn('⚠️ ModelLoader not available, will use fallback shapes');
    }

    // Small delay to ensure DOM is fully loaded
    setTimeout(() => {
        console.log('Starting character load after delay');
        loadCharacterCards();
        setupEventListeners();
        console.log('=== INITIALIZATION COMPLETE ===');
    }, 100);
}

function loadCharacterCards() {
    const container = document.getElementById('character-select');
    console.log('Loading character cards into:', container);

    if (!container) {
        console.error('character-select container not found!');
        return;
    }

    // Clear existing content
    container.innerHTML = '';

    // Create cards for each character - using innerHTML with onclick like the test button
    let cardsHTML = '';
    Object.values(BLANK_WARS_CHARACTERS).forEach(char => {
        cardsHTML += `
            <div class="character-card" onclick="window.gameStart('${char.id}')">
                <div class="char-avatar">${char.avatar}</div>
                <h2>${char.name}</h2>
                <p class="char-title">${char.title}</p>
                <p class="char-archetype">${char.archetype} • ${char.rarity}</p>
            </div>
        `;
        console.log(`Added card for ${char.name}`);
    });

    container.innerHTML = cardsHTML;

    console.log(`Loaded ${Object.keys(BLANK_WARS_CHARACTERS).length} character cards`);
}

function setupEventListeners() {
    console.log('Setting up event listeners...');

    // Character selection - use event delegation on the parent container
    const characterSelect = document.getElementById('character-select');
    if (characterSelect) {
        characterSelect.addEventListener('click', function(e) {
            console.log('Click detected on character-select!', e.target);

            // Find the character card (might click on child element)
            let card = e.target;
            while (card && !card.hasAttribute('data-character-id')) {
                card = card.parentElement;
                if (card === characterSelect) {
                    console.log('Clicked outside of a card');
                    return;
                }
            }

            if (card && card.hasAttribute('data-character-id')) {
                const characterId = card.getAttribute('data-character-id');
                console.log('=== CHARACTER SELECTED:', characterId, '===');
                startGame(characterId);
            }
        }, false);
        console.log('Event delegation listener attached to character-select');
    } else {
        console.error('character-select element not found!');
    }

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.code === 'Space' && gameState === 'playing') {
            e.preventDefault();
            jump();
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    // Menu buttons
    const restartBtn = document.getElementById('restart-btn');
    const menuBtn = document.getElementById('menu-btn');

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            console.log('Restart button clicked');
            showScreen('menu');
            resetGame();
        });
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            console.log('Menu button clicked');
            showScreen('menu');
            resetGame();
        });
    }

    // Level selection buttons
    const level1Btn = document.getElementById('level1-btn');
    const level2Btn = document.getElementById('level2-btn');
    const level3Btn = document.getElementById('level3-btn');

    if (level1Btn) {
        level1Btn.addEventListener('click', () => {
            selectedLevel = 1;
            level1Btn.classList.add('selected');
            if (level2Btn) level2Btn.classList.remove('selected');
            if (level3Btn) level3Btn.classList.remove('selected');
            console.log('Level 1 selected');
        });
    }

    if (level2Btn) {
        level2Btn.addEventListener('click', () => {
            selectedLevel = 2;
            level2Btn.classList.add('selected');
            if (level1Btn) level1Btn.classList.remove('selected');
            if (level3Btn) level3Btn.classList.remove('selected');
            console.log('Level 2 selected');
        });
    }

    if (level3Btn) {
        level3Btn.addEventListener('click', () => {
            selectedLevel = 3;
            level3Btn.classList.add('selected');
            if (level1Btn) level1Btn.classList.remove('selected');
            if (level2Btn) level2Btn.classList.remove('selected');
            console.log('Level 3 selected');
        });
    }

    console.log('All event listeners setup complete');
}

// Make startGame globally accessible for inline onclick
window.gameStart = function(characterId) {
    console.log('=== STARTING GAME VIA WINDOW ===');
    startGame(characterId);
};

async function startGame(characterId) {
    console.log('=== STARTING GAME ===');
    console.log('Character ID:', characterId);

    // Stop any existing animation loop
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log('Stopped existing animation loop');
    }

    selectedCharacter = BLANK_WARS_CHARACTERS[characterId];

    if (!selectedCharacter) {
        console.error('Character not found:', characterId);
        return;
    }

    console.log('Selected character:', selectedCharacter);

    setupScene();
    await createPlayer(); // Wait for model to load

    // Load selected level
    if (selectedLevel === 3 && typeof createLevel3Course !== 'undefined') {
        createLevel3Course();
        setupArcticEnvironment();
    } else if (selectedLevel === 2 && typeof createLevel2Course !== 'undefined') {
        createLevel2Course();
        setupVolcanoEnvironment();
    } else {
        createObstacleCourse(); // Level 1
    }

    showScreen('game');

    // Set to 'ready' state (not playing yet)
    gameState = 'ready';

    // Show controls reminder, wait for SPACE to start
    const controlsReminder = document.getElementById('controls-reminder');
    controlsReminder.style.display = 'block';

    // Wait for space key to start
    const waitForSpace = (e) => {
        if (e.code === 'Space' && gameState === 'ready') {
            e.preventDefault(); // Prevent space from triggering jump
            e.stopPropagation(); // Stop event from propagating
            controlsReminder.style.display = 'none';

            // Clear any pressed keys to prevent immediate movement
            for (let key in keys) {
                keys[key] = false;
            }

            // Add small delay before starting
            setTimeout(() => {
                gameState = 'playing';
                startTime = Date.now();
                console.log('Controls dismissed, game starting!');
            }, 200); // 200ms delay

            document.removeEventListener('keydown', waitForSpace);
        }
    };
    document.addEventListener('keydown', waitForSpace);

    document.getElementById('character-name').textContent = `${selectedCharacter.avatar} ${selectedCharacter.name}`;

    console.log('=== GAME LOADED, WAITING FOR SPACE TO START ===');
    animate();
}

function setupScene() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 150);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 20); // High overview looking down at start
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Initialize animal hazards manager
    if (typeof AnimalHazardManager !== 'undefined' && modelLoader) {
        animalHazards = new AnimalHazardManager(scene, modelLoader);
        console.log('✅ Animal hazards manager initialized');
    }

    // Lighting - brighter for 3D models
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Window resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

async function createPlayer() {
    // Try to load GLB model for ANY character
    if (modelLoader && selectedCharacter.id) {
        try {
            console.log(`Loading ${selectedCharacter.name} GLB model...`);
            player = await modelLoader.createPlayerCharacter(selectedCharacter.id, selectedCharacter, scene);
            player.position.set(0, PLAYER_SIZE, 0);
            // Rotation applied in model-loader.js
            playerVelocity = new THREE.Vector3(0, 0, 0);
            playerOnGround = false;
            console.log(`✅ ${selectedCharacter.name} model loaded!`);
            return;
        } catch (error) {
            console.error(`Failed to load ${selectedCharacter.name} model:`, error);
            // Fall through to fallback
        }
    }

    // Fallback - basic shapes
    console.log('Using fallback character shapes');
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

    player = new THREE.Group();
    player.add(body);
    player.add(head);
    player.position.set(0, PLAYER_SIZE, 0);
    player.rotation.y = 0; // Face forward (down the course)
    scene.add(player);

    playerVelocity = new THREE.Vector3(0, 0, 0);
    playerOnGround = false;
}

function createObstacleCourse() {
    obstacles = [];

    // Initialize ball physics system
    ballPhysics = new BallPhysicsManager();

    // ANIMAL BALL RUN - Snaking Wide Course
    // Starting platform (center)
    createPlatform(0, 0, 0, 12, 0.5, 12, 0x228B22, 'Start');

    // === SECTION 1: SNAKE LEFT ===
    // Go left with ball chain
    ballPhysics.createBall(new THREE.Vector3(-4, 0, -6), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-8, 0, -10), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-12, 0, -14), 'blue', 2.5);

    // LEFT LEDGE
    createPlatform(-15, 3, -20, 8, 0.5, 6, 0x4169E1, 'Left Ledge');

    // === SECTION 2: CROSS TO RIGHT ===
    // Diagonal cross from left to right
    ballPhysics.createBall(new THREE.Vector3(-12, 3, -26), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-8, 0, -30), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-4, 0, -34), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 0, -38), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(4, 0, -42), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(8, 0, -46), 'yellow', 2.5);

    // RIGHT LEDGE
    createPlatform(12, 4, -52, 8, 0.5, 6, 0x9370DB, 'Right Ledge');

    // === SECTION 3: RIGHT SIDE PATH ===
    // Continue far right
    ballPhysics.createBall(new THREE.Vector3(15, 4, -58), 'purple', 2.5);
    ballPhysics.createBall(new THREE.Vector3(15, 2, -62), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(12, 2, -66), 'green', 2.5);

    // FAR RIGHT PLATFORM
    createPlatform(15, 2, -72, 6, 0.5, 6, 0x32CD32, 'Far Right');

    // === SECTION 4: SNAKE BACK TO CENTER ===
    // Wide arc back to middle
    ballPhysics.createBall(new THREE.Vector3(12, 2, -78), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(8, 0, -82), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(4, 0, -86), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 0, -90), 'yellow', 2.5);

    // CENTER HIGH PLATFORM
    createPlatform(0, 5, -96, 10, 0.5, 6, 0xFF6347, 'High Center');

    // === SECTION 5: FORK - LEFT AND RIGHT PATHS ===
    // Left fork
    ballPhysics.createBall(new THREE.Vector3(-6, 5, -102), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-10, 3, -106), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-14, 3, -110), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-10, 0, -114), 'yellow', 2.5);

    // Right fork
    ballPhysics.createBall(new THREE.Vector3(6, 5, -102), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(10, 3, -108), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(10, 0, -114), 'red', 2.5); // Risky shortcut!

    // CONVERGE PLATFORM
    createPlatform(0, 4, -120, 12, 0.5, 6, 0xFFD700, 'Converge');

    // === SECTION 6: FINALE - TIGHTER SPACING ===
    // Gentler zigzag with closer balls
    ballPhysics.createBall(new THREE.Vector3(-8, 4, -126), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-10, 2, -130), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(-6, 2, -134), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 0, -138), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(6, 0, -142), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(10, 2, -146), 'blue', 2.5);
    ballPhysics.createBall(new THREE.Vector3(6, 2, -150), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 0, -154), 'yellow', 2.5);

    // FINAL APPROACH
    createPlatform(0, 3, -160, 10, 0.5, 6, 0x32CD32, 'Final');

    // === FINISH JUMP ===
    ballPhysics.createBall(new THREE.Vector3(-3, 3, -166), 'green', 2.5);
    ballPhysics.createBall(new THREE.Vector3(0, 3, -166), 'yellow', 2.5);
    ballPhysics.createBall(new THREE.Vector3(3, 3, -166), 'red', 2.5);

    // Add balls to scene
    ballPhysics.addBallsToScene(scene);

    // === ANIMAL HAZARDS ===
    if (animalHazards) {
        // Flying alligators - cross paths in Section 2
        animalHazards.createFlyingAlligator(-15, 5, -30, 'right', 0.015);
        animalHazards.createFlyingAlligator(15, 5, -45, 'left', 0.015);

        // Spinning flamingos - on platforms
        animalHazards.createSpinningFlamingo(-15, 4, -20, 0.02);
        animalHazards.createSpinningFlamingo(12, 5, -52, 0.02);

        // Ninja starfish - in the fork section (slower for level 1)
        animalHazards.createNinjaStarfish(-8, 6, -106, 0.015);
        animalHazards.createNinjaStarfish(8, 6, -108, 0.015);

        // Falling cows - random spawners in finale section
        animalHazards.createFallingCow(-5, 20, -135, 10, 2, 4); // Left area spawner
        animalHazards.createFallingCow(5, 20, -145, 10, 2, 4);  // Right area spawner
        animalHazards.createFallingCow(0, 20, -150, 8, 3, 5);   // Center area spawner
    }

    // === FINISH PLATFORM ===
    createPlatform(0, 5, -172, 14, 0.5, 14, 0xFFD700, 'Finish');

    // Water plane
    const waterGeometry = new THREE.PlaneGeometry(200, 200);
    const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x006994,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = DEATH_Y + 2;
    water.receiveShadow = true;
    scene.add(water);
}

function createPlatform(x, y, z, width, height, depth, color, label = null) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({ color });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, y, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    scene.add(platform);

    obstacles.push({
        type: 'platform',
        mesh: platform,
        bounds: { x, y, z, width, height, depth },
        label
    });

    return platform;
}

function createRotatingPlatform(x, y, z, width, height, depth, color, rotationSpeed) {
    const platform = createPlatform(x, y, z, width, height, depth, color);
    obstacles[obstacles.length - 1].type = 'rotating';
    obstacles[obstacles.length - 1].rotationSpeed = rotationSpeed;
}

function createMovingPlatform(x, y, z, width, height, depth, color, axis, min, max, speed, offset = 0) {
    const platform = createPlatform(x, y, z, width, height, depth, color);
    const lastObstacle = obstacles[obstacles.length - 1];
    lastObstacle.type = 'moving';
    lastObstacle.axis = axis;
    lastObstacle.min = min;
    lastObstacle.max = max;
    lastObstacle.speed = speed;
    lastObstacle.offset = offset;
    lastObstacle.initialPos = { x, y, z };
}

function createSwingingHammer(x, y, z, speed, offset = 0) {
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
    const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = -2;

    const hammerGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const hammerMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
    const hammer = new THREE.Mesh(hammerGeometry, hammerMaterial);
    hammer.position.y = -4;
    hammer.castShadow = true;

    const group = new THREE.Group();
    group.add(pole);
    group.add(hammer);
    group.position.set(x, y, z);
    scene.add(group);

    obstacles.push({
        type: 'swinging',
        mesh: group,
        hammerMesh: hammer,
        speed,
        offset,
        bounds: { x, y: y - 4, z, width: 1.5, height: 1.5, depth: 1.5 }
    });
}

function createSpinningBar(x, y, z, speed) {
    const barGeometry = new THREE.BoxGeometry(12, 0.5, 0.5);
    const barMaterial = new THREE.MeshPhongMaterial({ color: 0xFF4500 });
    const bar = new THREE.Mesh(barGeometry, barMaterial);
    bar.position.set(x, y, z);
    bar.castShadow = true;
    scene.add(bar);

    obstacles.push({
        type: 'spinning',
        mesh: bar,
        speed,
        bounds: { x, y, z, width: 12, height: 0.5, depth: 0.5 }
    });
}

// Wipeout-style Big Red Ball
function createBigBall(x, y, z, radius = 1.5) {
    const ballGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const ballMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF0000,
        shininess: 80
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(x, y, z);
    ball.castShadow = true;
    scene.add(ball);

    obstacles.push({
        type: 'bigball',
        mesh: ball,
        radius,
        initialY: y,
        bouncePhase: Math.random() * Math.PI * 2,
        bounceSpeed: 0.03,
        bounceHeight: 1.5,
        bounds: { x, y, z, width: radius * 2, height: radius * 2, depth: radius * 2 }
    });
}

// Wipeout-style Sweeper Arm (like Big Balls)
function createSweeperArm(x, y, z, armLength = 8, speed = 0.02) {
    // Central pivot
    const pivotGeometry = new THREE.CylinderGeometry(0.5, 0.5, 3, 16);
    const pivotMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const pivot = new THREE.Mesh(pivotGeometry, pivotMaterial);
    pivot.castShadow = true;

    // Padded arm
    const armGeometry = new THREE.BoxGeometry(armLength, 1.5, 1.5);
    const armMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF1493,
        shininess: 30
    });
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.position.x = armLength / 2;
    arm.castShadow = true;

    // Padded end (the knocker)
    const padGeometry = new THREE.CylinderGeometry(1.2, 1.2, 2, 16);
    const padMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF69B4,
        shininess: 50
    });
    const pad = new THREE.Mesh(padGeometry, padMaterial);
    pad.rotation.z = Math.PI / 2;
    pad.position.x = armLength;
    pad.castShadow = true;

    const group = new THREE.Group();
    group.add(pivot);
    group.add(arm);
    group.add(pad);
    group.position.set(x, y, z);
    scene.add(group);

    obstacles.push({
        type: 'sweeper',
        mesh: group,
        padMesh: pad,
        armLength,
        speed,
        bounds: { x, y, z, width: armLength * 2, height: 3, depth: 3 }
    });
}

// Wipeout-style Pusher Wall (moving padded wall)
function createPusherWall(x, y, z, width = 6, height = 3, axis = 'x', min = -3, max = 3, speed = 0.02) {
    const wallGeometry = new THREE.BoxGeometry(width, height, 1);
    const wallMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFA500,
        shininess: 30
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    scene.add(wall);

    obstacles.push({
        type: 'pusher',
        mesh: wall,
        axis,
        min,
        max,
        speed,
        initialPos: { x, y, z },
        bounds: { x, y, z, width, height, depth: 1 }
    });
}

// FLYING CHOMPING ALLIGATORS! (Leap across the path)
function createFlyingGator(platformX, platformY, platformZ, startSide = 'left', speed = 0.015, offset = 0) {
    // Alligator body
    const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 0.8);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x2D5016,
        shininess: 20
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;

    // Tail
    const tailGeometry = new THREE.ConeGeometry(0.4, 1.5, 8);
    const tailMaterial = new THREE.MeshPhongMaterial({ color: 0x1F3A0F });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.rotation.z = -Math.PI / 2;
    tail.position.x = -1.5;
    tail.castShadow = true;

    // Head/snout
    const headGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.7);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0x3A6B1E });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.x = 1.2;
    head.castShadow = true;

    // Upper jaw
    const upperJawGeometry = new THREE.BoxGeometry(0.6, 0.2, 0.6);
    const jawMaterial = new THREE.MeshPhongMaterial({ color: 0x4A7B2E });
    const upperJaw = new THREE.Mesh(upperJawGeometry, jawMaterial);
    upperJaw.position.set(1.5, 0.2, 0);

    // Lower jaw (animated)
    const lowerJaw = new THREE.Mesh(upperJawGeometry, jawMaterial);
    lowerJaw.position.set(1.5, -0.2, 0);

    // Teeth (white spikes)
    const teethGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.1);
    const teethMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
    for (let i = 0; i < 4; i++) {
        const tooth = new THREE.Mesh(teethGeometry, teethMaterial);
        tooth.position.set(1.6, 0.15, -0.2 + i * 0.13);
        upperJaw.add(tooth);

        const lowerTooth = new THREE.Mesh(teethGeometry, teethMaterial);
        lowerTooth.position.set(1.6, -0.15, -0.2 + i * 0.13);
        lowerJaw.add(lowerTooth);
    }

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFF00 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(1.3, 0.35, -0.25);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(1.3, 0.35, 0.25);

    // Assemble gator
    const gator = new THREE.Group();
    gator.add(body);
    gator.add(tail);
    gator.add(head);
    gator.add(upperJaw);
    gator.add(lowerJaw);
    gator.add(leftEye);
    gator.add(rightEye);

    // Start position (off to the side)
    const startX = startSide === 'left' ? -8 : 8;
    gator.position.set(platformX + startX, platformY + 2, platformZ);
    gator.rotation.y = startSide === 'left' ? 0 : Math.PI;

    scene.add(gator);

    obstacles.push({
        type: 'gator',
        mesh: gator,
        lowerJaw,
        platformX,
        platformY,
        platformZ,
        startSide,
        speed,
        offset,
        chompPhase: 0,
        bounds: { x: platformX, y: platformY + 2, z: platformZ, width: 2, height: 0.8, depth: 0.8 }
    });
}

// Wipeout-style Pendulum Hammer (swings horizontally across platform)
function createPendulumHammer(x, y, z, hammerWidth = 2, speed = 0.02, offset = 0, swingRange = Math.PI / 2.5) {
    // Chain/rope hanging from ceiling
    const chainGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
    const chainMaterial = new THREE.MeshPhongMaterial({ color: 0x404040 });
    const chain = new THREE.Mesh(chainGeometry, chainMaterial);
    chain.position.y = -2.5;

    // Hammer head (upside down T shape)
    const hammerBarGeometry = new THREE.BoxGeometry(hammerWidth, 0.8, 0.8);
    const hammerBarMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF1493,
        shininess: 40
    });
    const hammerBar = new THREE.Mesh(hammerBarGeometry, hammerBarMaterial);
    hammerBar.position.y = -5;
    hammerBar.castShadow = true;

    // Padded ends on hammer
    const endGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const endMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF69B4,
        shininess: 50
    });
    const leftEnd = new THREE.Mesh(endGeometry, endMaterial);
    leftEnd.position.set(-hammerWidth / 2, -5, 0);
    leftEnd.castShadow = true;

    const rightEnd = new THREE.Mesh(endGeometry, endMaterial);
    rightEnd.position.set(hammerWidth / 2, -5, 0);
    rightEnd.castShadow = true;

    // Group everything
    const group = new THREE.Group();
    group.add(chain);
    group.add(hammerBar);
    group.add(leftEnd);
    group.add(rightEnd);
    group.position.set(x, y, z);
    scene.add(group);

    obstacles.push({
        type: 'pendulum',
        mesh: group,
        hammerMesh: hammerBar,
        speed,
        offset,
        swingRange,
        hammerWidth,
        bounds: { x, y: y - 5, z, width: hammerWidth, height: 0.8, depth: 0.8 }
    });
}

function jump() {
    if (playerOnGround) {
        playerVelocity.y = JUMP_FORCE;
        playerOnGround = false;
    }
}

function updatePlayer() {
    if (gameState !== 'playing') return;

    // Apply gravity
    playerVelocity.y += GRAVITY;

    // Manual rotation with Q/E keys
    const ROTATION_SPEED = 0.05;
    if (keys['q']) {
        player.rotation.y += ROTATION_SPEED; // Rotate left
    }
    if (keys['e']) {
        player.rotation.y -= ROTATION_SPEED; // Rotate right
    }

    // Horizontal movement (relative to player rotation)
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    // Rotate movement vectors based on player's rotation
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);

    // Track if player is moving for animation
    let isMoving = false;

    if (keys['w'] || keys['arrowup']) {
        player.position.add(forward.clone().multiplyScalar(MOVE_SPEED));
        isMoving = true;
    }
    if (keys['s'] || keys['arrowdown']) {
        player.position.add(forward.clone().multiplyScalar(-MOVE_SPEED));
        isMoving = true;
    }
    if (keys['a'] || keys['arrowleft']) {
        player.position.add(right.clone().multiplyScalar(-MOVE_SPEED));
        isMoving = true;
    }
    if (keys['d'] || keys['arrowright']) {
        player.position.add(right.clone().multiplyScalar(MOVE_SPEED));
        isMoving = true;
    }

    // Update player animation based on movement
    const isJumping = !playerOnGround && playerVelocity.y !== 0;
    if (modelLoader && player) {
        modelLoader.updatePlayerAnimation(player, isMoving, isJumping);
    }

    // Apply vertical velocity
    player.position.y += playerVelocity.y;

    // Ball collision detection and bounce
    if (ballPhysics) {
        const ballCollision = ballPhysics.checkBallCollision(player.position, playerVelocity, PLAYER_SIZE / 2);

        if (ballCollision) {
            const bounceResult = ballPhysics.applyBounce(ballCollision, playerVelocity, performance.now() / 1000);
            playerOnGround = true;

            // Update combo UI
            document.getElementById('combo').textContent = `Combo: ${bounceResult.combo}x` + (bounceResult.isPerfect ? ' ⭐' : '');

            // Position player on top of ball
            player.position.y = ballCollision.position.y + ballCollision.radius + PLAYER_SIZE / 2;
        }

        // Update ball glow based on player position
        ballPhysics.updateBallGlow(player.position);
    }

    // Ground collision
    playerOnGround = false;

    for (let obstacle of obstacles) {
        if (obstacle.type === 'swinging' || obstacle.type === 'spinning') continue;

        const bounds = obstacle.bounds;
        const mesh = obstacle.mesh;

        let actualX = mesh.position.x;
        let actualY = mesh.position.y;
        let actualZ = mesh.position.z;

        if (player.position.x > actualX - bounds.width / 2 &&
            player.position.x < actualX + bounds.width / 2 &&
            player.position.z > actualZ - bounds.depth / 2 &&
            player.position.z < actualZ + bounds.depth / 2) {

            const platformTop = actualY + bounds.height / 2;

            if (player.position.y - PLAYER_SIZE <= platformTop &&
                player.position.y - PLAYER_SIZE > platformTop - 0.5 &&
                playerVelocity.y <= 0) {
                player.position.y = platformTop + PLAYER_SIZE;
                playerVelocity.y = 0;
                playerOnGround = true;

                if (obstacle.type === 'moving') {
                    player.position[obstacle.axis] = actualX;
                }

                if (obstacle.label) {
                    document.getElementById('checkpoint').textContent = `Checkpoint: ${obstacle.label}`;
                    if (obstacle.label === 'Finish') {
                        endGame(true);
                    }
                }
            }
        }
    }

    checkDangerousCollisions();

    if (player.position.y < DEATH_Y) {
        const waterMessages = [
            'Fell into the water!',
            'SPLASH! You\'re out!',
            'Into the drink!',
            'Taking a swim!',
            'WIPEOUT!'
        ];
        const randomMessage = waterMessages[Math.floor(Math.random() * waterMessages.length)];
        endGame(false, randomMessage);
    }

    // Update camera to follow player
    const cameraDistance = 15;
    const cameraHeight = 13;
    const cameraOffset = new THREE.Vector3(0, cameraHeight, cameraDistance);
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    camera.position.x = player.position.x + cameraOffset.x;
    camera.position.y = player.position.y + cameraOffset.y;
    camera.position.z = player.position.z + cameraOffset.z;
    camera.lookAt(player.position.x, player.position.y + 2, player.position.z);

    // Update timer
    currentTime = (Date.now() - startTime) / 1000;
    document.getElementById('timer').textContent = `Time: ${currentTime.toFixed(1)}s`;
}

function checkDangerousCollisions() {
    for (let obstacle of obstacles) {
        // Skip platform obstacles
        if (obstacle.type !== 'swinging' && obstacle.type !== 'spinning' &&
            obstacle.type !== 'bigball' && obstacle.type !== 'sweeper' &&
            obstacle.type !== 'pusher' && obstacle.type !== 'pendulum' &&
            obstacle.type !== 'gator') continue;

        let collisionMesh = (obstacle.type === 'swinging' || obstacle.type === 'pendulum') ? obstacle.hammerMesh : obstacle.mesh;
        let worldPos = new THREE.Vector3();
        collisionMesh.getWorldPosition(worldPos);

        const distance = player.position.distanceTo(worldPos);
        let collisionRadius = Math.max(obstacle.bounds.width, obstacle.bounds.depth) / 2 + 0.5;

        // Big balls need larger collision radius
        if (obstacle.type === 'bigball') {
            collisionRadius = obstacle.radius + 0.5;
        }

        // Pendulum needs width-based radius
        if (obstacle.type === 'pendulum') {
            collisionRadius = obstacle.hammerWidth / 2 + 0.5;
        }

        if (distance < collisionRadius) {
            // Calculate knockback direction (away from obstacle)
            const knockbackDir = new THREE.Vector3()
                .subVectors(player.position, worldPos)
                .normalize();

            // Apply knockback force based on obstacle type
            let knockbackForce = 0.5;
            if (obstacle.type === 'bigball') {
                knockbackForce = 0.8; // Bigger push from balls
            } else if (obstacle.type === 'sweeper') {
                knockbackForce = 1.2; // Strong push from sweeper arms
            } else if (obstacle.type === 'pusher') {
                knockbackForce = 0.6;
            } else if (obstacle.type === 'pendulum') {
                knockbackForce = 1.0; // Solid push from pendulum
            } else if (obstacle.type === 'gator') {
                knockbackForce = 1.5; // CHOMP! Strong sideways push from flying gator
            }

            // Apply horizontal knockback
            player.position.x += knockbackDir.x * knockbackForce;
            player.position.z += knockbackDir.z * knockbackForce;

            // Small upward bump
            if (playerVelocity.y < 0.2) {
                playerVelocity.y = 0.3;
            }

            // You only die from falling in the water, not from being hit!
        }
    }
}

function updateObstacles() {
    obstacles.forEach((obstacle) => {
        if (obstacle.type === 'rotating') {
            obstacle.mesh.rotation.y += obstacle.rotationSpeed;
        } else if (obstacle.type === 'moving') {
            const time = Date.now() * 0.001;
            const movement = Math.sin(time * obstacle.speed + obstacle.offset);
            const range = (obstacle.max - obstacle.min) / 2;
            const center = (obstacle.max + obstacle.min) / 2;
            obstacle.mesh.position[obstacle.axis] = obstacle.initialPos[obstacle.axis] + center + movement * range;

            obstacle.bounds.x = obstacle.mesh.position.x;
            obstacle.bounds.y = obstacle.mesh.position.y;
            obstacle.bounds.z = obstacle.mesh.position.z;
        } else if (obstacle.type === 'swinging') {
            const time = Date.now() * 0.001;
            const swing = Math.sin(time * obstacle.speed + obstacle.offset) * Math.PI / 3;
            obstacle.mesh.rotation.z = swing;
        } else if (obstacle.type === 'spinning') {
            obstacle.mesh.rotation.y += obstacle.speed;
        } else if (obstacle.type === 'bigball') {
            // Big balls bounce up and down
            obstacle.bouncePhase += obstacle.bounceSpeed;
            const bounce = Math.sin(obstacle.bouncePhase) * obstacle.bounceHeight;
            obstacle.mesh.position.y = obstacle.initialY + bounce;
            obstacle.bounds.y = obstacle.mesh.position.y;
        } else if (obstacle.type === 'sweeper') {
            // Sweeper arms rotate around pivot
            obstacle.mesh.rotation.y += obstacle.speed;
        } else if (obstacle.type === 'pusher') {
            // Pusher walls move back and forth
            const time = Date.now() * 0.001;
            const movement = Math.sin(time * obstacle.speed);
            const range = (obstacle.max - obstacle.min) / 2;
            const center = (obstacle.max + obstacle.min) / 2;
            obstacle.mesh.position[obstacle.axis] = obstacle.initialPos[obstacle.axis] + center + movement * range;

            obstacle.bounds.x = obstacle.mesh.position.x;
            obstacle.bounds.z = obstacle.mesh.position.z;
        } else if (obstacle.type === 'pendulum') {
            // Pendulum hammers swing horizontally
            const time = Date.now() * 0.001;
            const swing = Math.sin(time * obstacle.speed + obstacle.offset) * obstacle.swingRange;
            obstacle.mesh.rotation.z = swing;
        } else if (obstacle.type === 'gator') {
            // Flying gators jump across in an arc
            const time = Date.now() * 0.001;
            const cycleTime = (time * obstacle.speed + obstacle.offset) % (Math.PI * 2);

            // Jump across (left to right or right to left)
            const jumpProgress = Math.sin(cycleTime);
            const startX = obstacle.startSide === 'left' ? -8 : 8;
            const endX = obstacle.startSide === 'left' ? 8 : -8;
            obstacle.mesh.position.x = obstacle.platformX + startX + (endX - startX) * ((jumpProgress + 1) / 2);

            // Arc height (parabola)
            const arcHeight = Math.sin(cycleTime) * 3;
            obstacle.mesh.position.y = obstacle.platformY + 2 + Math.max(0, arcHeight);

            // Chomping jaws animation
            obstacle.chompPhase += 0.15;
            const chompAngle = Math.sin(obstacle.chompPhase) * 0.3;
            obstacle.lowerJaw.rotation.x = -chompAngle;

            // Update bounds for collision
            obstacle.bounds.x = obstacle.mesh.position.x;
            obstacle.bounds.y = obstacle.mesh.position.y;
        }
    });
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);

    // Always render the scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }

    // Only update game logic when playing
    if (gameState !== 'playing') return;

    // Update animations
    if (modelLoader && clock) {
        const delta = clock.getDelta();
        modelLoader.update(delta);
    }

    // Update animal hazards
    if (animalHazards) {
        animalHazards.update();

        // Check for collisions with hazards
        if (player) {
            const collision = animalHazards.checkPlayerCollision(player.position);
            if (collision) {
                if (collision.knockback) {
                    // Knockback instead of death
                    let knockbackDistance = 1;
                    if (collision.type === 'flying_alligator') knockbackDistance = 4;
                    if (collision.type === 'charging_rhino') knockbackDistance = 6;
                    if (collision.type === 'sliding_penguin') knockbackDistance = 3; // Penguin slide!

                    const knockbackDirection = new THREE.Vector3(
                        player.position.x - collision.model.position.x,
                        0,
                        player.position.z - collision.model.position.z
                    ).normalize();

                    player.position.x += knockbackDirection.x * knockbackDistance;
                    player.position.z += knockbackDirection.z * knockbackDistance;

                    // Bigger bounce for harder hits
                    if (collision.type === 'charging_rhino') playerVelocity.y = 0.7;
                    else if (collision.type === 'flying_alligator') playerVelocity.y = 0.5;
                    else if (collision.type === 'sliding_penguin') playerVelocity.y = 0.4;
                    else playerVelocity.y = 0.3;
                } else if (collision.crushOnly) {
                    // Cows only kill when falling (not when landed)
                    if (!collision.landed && collision.velocityY < -0.3) {
                        endGame(false, `Crushed by ${collision.type.replace(/_/g, ' ')}!`);
                    }
                } else {
                    // Instant death for other hazards
                    endGame(false, `Knocked out by ${collision.type.replace(/_/g, ' ')}!`);
                }
            }
        }
    }

    updatePlayer();
    updateObstacles();
}

function endGame(won, message = '') {
    gameState = 'gameover';

    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const finalTime = document.getElementById('final-time');
    const restartBtn = document.getElementById('restart-btn');

    if (won) {
        resultTitle.textContent = '🏆 VICTORY! 🏆';
        resultMessage.textContent = `${selectedCharacter.name} conquered the course!`;
        finalTime.textContent = `Final Time: ${currentTime.toFixed(2)}s`;

        // Progress to next level when won
        if (selectedLevel === 1) {
            if (restartBtn) {
                restartBtn.textContent = '🌋 Try Level 2!';
                restartBtn.onclick = () => {
                    selectedLevel = 2;
                    resetGame();
                    startGame(Object.keys(BLANK_WARS_CHARACTERS).find(key =>
                        BLANK_WARS_CHARACTERS[key] === selectedCharacter
                    ));
                };
            }
        } else if (selectedLevel === 2) {
            if (restartBtn) {
                restartBtn.textContent = '❄️ Try Level 3!';
                restartBtn.onclick = () => {
                    selectedLevel = 3;
                    resetGame();
                    startGame(Object.keys(BLANK_WARS_CHARACTERS).find(key =>
                        BLANK_WARS_CHARACTERS[key] === selectedCharacter
                    ));
                };
            }
        } else {
            // Beat Level 3 - You won everything!
            if (restartBtn) {
                restartBtn.textContent = '🎉 Play Again';
                restartBtn.onclick = () => {
                    showScreen('menu');
                    resetGame();
                };
            }
        }
    } else {
        resultTitle.textContent = '💥 WIPEOUT! 💥';
        resultMessage.textContent = message || 'Better luck next time!';
        finalTime.textContent = `Survived: ${currentTime.toFixed(2)}s`;

        // Reset restart button to default
        if (restartBtn) {
            restartBtn.textContent = 'Play Again';
            restartBtn.onclick = () => {
                showScreen('menu');
                resetGame();
            };
        }
    }

    showScreen('gameover');
}

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(`${screenName}-screen`).classList.remove('hidden');
}

function resetGame() {
    // Stop animation loop first
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log('Animation loop stopped on reset');
    }

    if (scene) {
        while(scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
        if (renderer) {
            document.getElementById('game-container').innerHTML = '';
        }
    }

    obstacles = [];
    keys = {};
    gameState = 'menu';
    selectedCharacter = null;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
