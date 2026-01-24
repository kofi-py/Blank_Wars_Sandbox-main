// Landscape themes for different levels
// Cycles through 15 themes, repeating after level 15

const getLandscapeTheme = (level) => {
    const themes = [
        'rural',      // Level 1: Farms, barns, fields
        'urban',      // Level 2: City buildings, skyscrapers
        'suburban',   // Level 3: Houses, yards, neighborhoods
        'desert',     // Level 4: Cacti, mesas, sand dunes
        'forest',     // Level 5: Dense trees, mountains
        'highway',    // Level 6: Overpasses, rest stops, signs
        'coastal',    // Level 7: Beach, palm trees, ocean
        'winter',     // Level 8: Snow, pine trees, mountains
        'autumn',     // Level 9: Fall colors, harvest
        'night',      // Level 10: Night city, lights
        'space',      // Level 11: Stars, planets, nebulas
        'underwater', // Level 12: Ocean floor, fish, coral
        'fantasy',    // Level 13: Castles, dragons, magic
        'volcanic',   // Level 14: Lava, ash, eruptions
        'arctic'      // Level 15: Aurora, ice formations, tundra
    ];

    return themes[(level - 1) % 15];
};

const drawThemedLandscape = (ctx, offset, theme, canvasWidth = 2048, canvasHeight = 512) => {
    // FAILSAFE: Fill entire canvas FIRST
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw based on theme
    switch(theme) {
        case 'rural':
            drawRuralLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'urban':
            drawUrbanLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'suburban':
            drawSuburbanLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'desert':
            drawDesertLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'forest':
            drawForestLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'highway':
            drawHighwayLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'coastal':
            drawCoastalLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'winter':
            drawWinterLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'autumn':
            drawAutumnLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'night':
            drawNightLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'space':
            drawSpaceLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'underwater':
            drawUnderwaterLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'fantasy':
            drawFantasyLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'volcanic':
            drawVolcanicLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        case 'arctic':
            drawArcticLandscape(ctx, offset, canvasWidth, canvasHeight);
            break;
        default:
            drawRuralLandscape(ctx, offset, canvasWidth, canvasHeight);
    }
};

// LEVEL 1: RURAL FARM (current design)
const drawRuralLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.4, '#B0D4F1');
    skyGradient.addColorStop(1, '#D4E8F7');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 8; i++) {
        const x = (i * 300 + offset * 0.3) % (canvasWidth + 300);
        const y = 30 + Math.sin(i * 0.8) * 40;
        const size = 25 + Math.sin(i * 1.3) * 15;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.7, y - size * 0.3, size * 0.8, 0, Math.PI * 2);
        ctx.arc(x - size * 0.7, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }

    // Mountains
    ctx.fillStyle = '#7A8A6D';
    for (let i = 0; i < 5; i++) {
        const x = (i * 500 + offset * 1.2) % (canvasWidth + 500);
        ctx.beginPath();
        ctx.moveTo(x - 280, 200);
        ctx.lineTo(x - 200, 120 + Math.sin(i) * 20);
        ctx.lineTo(x - 120, 160);
        ctx.lineTo(x - 40, 100 + Math.cos(i) * 25);
        ctx.lineTo(x + 40, 140);
        ctx.lineTo(x + 120, 110 + Math.sin(i * 1.5) * 20);
        ctx.lineTo(x + 200, 170);
        ctx.lineTo(x + 280, 200);
        ctx.fill();
    }

    // Ground
    ctx.fillStyle = '#4A7C4A';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Barns and silos
    for (let i = 0; i < 6; i++) {
        const x = (i * 400 + offset * 2.2) % (canvasWidth + 400);
        if (i % 2 === 0) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x - 35, 140, 70, 60);
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.moveTo(x - 40, 140);
            ctx.lineTo(x, 110);
            ctx.lineTo(x + 40, 140);
            ctx.fill();
        } else {
            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(x - 15, 120, 30, 80);
            ctx.fillStyle = '#8B0000';
            ctx.beginPath();
            ctx.arc(x, 120, 18, Math.PI, 0);
            ctx.fill();
        }
    }

    // Trees
    for (let i = 0; i < 25; i++) {
        const x = (i * 95 + offset * 2.5) % (canvasWidth + 95);
        ctx.fillStyle = '#654321';
        ctx.fillRect(x - 6, 170, 12, 30);
        ctx.fillStyle = '#3A7D3A';
        ctx.beginPath();
        ctx.arc(x, 155, 22, 0, Math.PI * 2);
        ctx.fill();
    }

    // Fence
    ctx.fillStyle = '#8B7355';
    for (let i = 0; i < 35; i++) {
        const x = (i * 65 + offset * 3) % (canvasWidth + 65);
        ctx.fillRect(x - 3, 190, 6, 20);
    }
};

// LEVEL 2: URBAN CITY
const drawUrbanLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.6, '#B0C4DE');
    skyGradient.addColorStop(1, '#D3D3D3');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Distant cityscape silhouette
    ctx.fillStyle = '#4A4A5A';
    for (let i = 0; i < 12; i++) {
        const x = (i * 200 + offset * 0.8) % (canvasWidth + 200);
        const height = 100 + Math.sin(i * 1.5) * 50;
        ctx.fillRect(x - 40, 200 - height, 80, height);
    }

    // Ground - concrete
    ctx.fillStyle = '#6B6B6B';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Skyscrapers
    for (let i = 0; i < 8; i++) {
        const x = (i * 280 + offset * 1.8) % (canvasWidth + 280);
        const height = 120 + (i % 3) * 40;
        const width = 60 + (i % 2) * 20;

        ctx.fillStyle = i % 3 === 0 ? '#5A5A6A' : '#4A4A5A';
        ctx.fillRect(x - width/2, 200 - height, width, height);

        // Windows
        ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
        for (let row = 0; row < height / 12; row++) {
            for (let col = 0; col < 4; col++) {
                ctx.fillRect(x - width/2 + col * 12 + 5, 200 - height + row * 12 + 3, 8, 8);
            }
        }
    }

    // Street elements
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 15; i++) {
        const x = (i * 150 + offset * 2.5) % (canvasWidth + 150);
        ctx.fillRect(x - 3, 175, 6, 25); // Street lights
        ctx.beginPath();
        ctx.arc(x, 172, 8, 0, Math.PI * 2);
        ctx.fill();
    }
};

// LEVEL 3: SUBURBAN
const drawSuburbanLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.5, '#B0E0E6');
    skyGradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Hills
    ctx.fillStyle = '#8FBC8F';
    for (let i = 0; i < 7; i++) {
        const x = (i * 350 + offset * 1.5) % (canvasWidth + 350);
        ctx.beginPath();
        ctx.moveTo(x - 200, 200);
        ctx.quadraticCurveTo(x - 100, 130, x, 160);
        ctx.quadraticCurveTo(x + 100, 190, x + 200, 200);
        ctx.fill();
    }

    // Ground - lawns
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Houses
    for (let i = 0; i < 10; i++) {
        const x = (i * 220 + offset * 2) % (canvasWidth + 220);

        // House body
        ctx.fillStyle = ['#F5DEB3', '#FFE4B5', '#FAFAD2'][i % 3];
        ctx.fillRect(x - 30, 150, 60, 50);

        // Roof
        ctx.fillStyle = ['#8B4513', '#A0522D', '#D2691E'][i % 3];
        ctx.beginPath();
        ctx.moveTo(x - 40, 150);
        ctx.lineTo(x, 120);
        ctx.lineTo(x + 40, 150);
        ctx.fill();

        // Door
        ctx.fillStyle = '#654321';
        ctx.fillRect(x - 10, 170, 20, 30);

        // Windows
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(x - 25, 160, 12, 12);
        ctx.fillRect(x + 13, 160, 12, 12);
    }

    // Trees
    for (let i = 0; i < 30; i++) {
        const x = (i * 80 + offset * 2.3) % (canvasWidth + 80);
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(x - 4, 175, 8, 25);
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(x, 165, 15, 0, Math.PI * 2);
        ctx.fill();
    }
};

// LEVEL 4: DESERT
const drawDesertLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.4, '#FFD700');
    skyGradient.addColorStop(1, '#FFA500');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Mesas/plateaus
    ctx.fillStyle = '#CD853F';
    for (let i = 0; i < 5; i++) {
        const x = (i * 450 + offset * 1) % (canvasWidth + 450);
        ctx.fillRect(x - 120, 120, 240, 80);
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(x - 120, 120, 240, 10);
        ctx.fillStyle = '#CD853F';
    }

    // Ground - sand
    ctx.fillStyle = '#EDC9AF';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Sand dunes
    ctx.fillStyle = '#DEB887';
    for (let i = 0; i < 8; i++) {
        const x = (i * 300 + offset * 1.8) % (canvasWidth + 300);
        ctx.beginPath();
        ctx.moveTo(x - 150, 200);
        ctx.quadraticCurveTo(x, 160, x + 150, 200);
        ctx.fill();
    }

    // Cacti
    for (let i = 0; i < 15; i++) {
        const x = (i * 150 + offset * 2) % (canvasWidth + 150);
        ctx.fillStyle = '#2E8B57';
        ctx.fillRect(x - 6, 160, 12, 40);
        ctx.fillRect(x - 20, 170, 14, 8);
        ctx.fillRect(x + 6, 170, 14, 8);
    }

    // Tumbleweeds
    ctx.fillStyle = '#8B7355';
    for (let i = 0; i < 10; i++) {
        const x = (i * 220 + offset * 3) % (canvasWidth + 220);
        ctx.beginPath();
        ctx.arc(x, 190, 10, 0, Math.PI * 2);
        ctx.fill();
    }
};

// LEVEL 5: FOREST/MOUNTAIN
const drawForestLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#6495ED');
    skyGradient.addColorStop(0.5, '#87CEEB');
    skyGradient.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Snow-capped mountains
    ctx.fillStyle = '#696969';
    for (let i = 0; i < 4; i++) {
        const x = (i * 550 + offset * 0.8) % (canvasWidth + 550);
        ctx.beginPath();
        ctx.moveTo(x - 250, 200);
        ctx.lineTo(x, 60);
        ctx.lineTo(x + 250, 200);
        ctx.fill();

        // Snow caps
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(x - 80, 100);
        ctx.lineTo(x, 60);
        ctx.lineTo(x + 80, 100);
        ctx.lineTo(x + 50, 100);
        ctx.lineTo(x, 80);
        ctx.lineTo(x - 50, 100);
        ctx.fill();
        ctx.fillStyle = '#696969';
    }

    // Ground - forest floor
    ctx.fillStyle = '#2F4F2F';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Dense pine trees
    for (let i = 0; i < 40; i++) {
        const x = (i * 60 + offset * 2.2) % (canvasWidth + 60);
        const height = 50 + (i % 3) * 15;

        ctx.fillStyle = '#1C4220';
        ctx.beginPath();
        ctx.moveTo(x - 15, 200);
        ctx.lineTo(x, 200 - height);
        ctx.lineTo(x + 15, 200);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x - 14, 200 - height * 0.3);
        ctx.lineTo(x, 200 - height * 0.7);
        ctx.lineTo(x + 14, 200 - height * 0.3);
        ctx.fill();
    }
};

// LEVEL 6: HIGHWAY/INDUSTRIAL
const drawHighwayLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Factories/warehouses
    ctx.fillStyle = '#555555';
    for (let i = 0; i < 6; i++) {
        const x = (i * 380 + offset * 1.5) % (canvasWidth + 380);
        ctx.fillRect(x - 60, 130, 120, 70);

        // Smokestacks
        ctx.fillRect(x - 40, 90, 15, 40);
        ctx.fillRect(x + 25, 100, 15, 30);

        // Smoke
        ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.beginPath();
        ctx.arc(x - 32, 85, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#555555';
    }

    // Ground - asphalt
    ctx.fillStyle = '#3C3C3C';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Highway overpasses
    ctx.fillStyle = '#808080';
    for (let i = 0; i < 4; i++) {
        const x = (i * 550 + offset * 1.8) % (canvasWidth + 550);
        ctx.fillRect(x - 100, 140, 200, 15);
        ctx.fillRect(x - 90, 155, 15, 45);
        ctx.fillRect(x + 75, 155, 15, 45);
    }

    // Highway signs
    ctx.fillStyle = '#2E8B57';
    for (let i = 0; i < 8; i++) {
        const x = (i * 280 + offset * 2.3) % (canvasWidth + 280);
        ctx.fillRect(x - 3, 160, 6, 40);
        ctx.fillRect(x - 25, 160, 50, 30);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 20, 165, 40, 20);
        ctx.fillStyle = '#2E8B57';
    }
};

// LEVEL 7: COASTAL/BEACH
const drawCoastalLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.6, '#B0E0E6');
    skyGradient.addColorStop(1, '#ADD8E6');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Ocean waves
    ctx.fillStyle = '#4682B4';
    ctx.fillRect(0, 150, canvasWidth, 50);

    ctx.fillStyle = '#5F9EA0';
    for (let i = 0; i < 15; i++) {
        const x = (i * 150 + offset * 2) % (canvasWidth + 150);
        ctx.beginPath();
        ctx.arc(x, 175, 15, Math.PI, 0);
        ctx.fill();
    }

    // Beach/sand
    ctx.fillStyle = '#F4A460';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Palm trees
    for (let i = 0; i < 12; i++) {
        const x = (i * 190 + offset * 2.2) % (canvasWidth + 190);

        // Trunk
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(x - 5, 140, 10, 60);

        // Fronds
        ctx.fillStyle = '#228B22';
        for (let j = 0; j < 6; j++) {
            const angle = (j / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.ellipse(x + Math.cos(angle) * 20, 140 + Math.sin(angle) * 20,
                       25, 10, angle, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Seashells and starfish
    ctx.fillStyle = '#FFB6C1';
    for (let i = 0; i < 20; i++) {
        const x = (i * 110 + offset * 2.5) % (canvasWidth + 110);
        ctx.beginPath();
        ctx.arc(x, 195, 5, 0, Math.PI * 2);
        ctx.fill();
    }
};

// LEVEL 8: WINTER
const drawWinterLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Sky - gray winter sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#B0C4DE');
    skyGradient.addColorStop(0.5, '#D3D3D3');
    skyGradient.addColorStop(1, '#E0E0E0');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Snowy mountains
    ctx.fillStyle = '#DCDCDC';
    for (let i = 0; i < 5; i++) {
        const x = (i * 480 + offset * 1) % (canvasWidth + 480);
        ctx.beginPath();
        ctx.moveTo(x - 220, 200);
        ctx.lineTo(x, 90);
        ctx.lineTo(x + 220, 200);
        ctx.fill();
    }

    // Snow-covered ground
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Snow drifts
    ctx.fillStyle = '#F0F8FF';
    for (let i = 0; i < 10; i++) {
        const x = (i * 220 + offset * 1.8) % (canvasWidth + 220);
        ctx.beginPath();
        ctx.ellipse(x, 200, 80, 20, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Bare winter trees
    for (let i = 0; i < 25; i++) {
        const x = (i * 90 + offset * 2) % (canvasWidth + 90);
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(x - 3, 155, 6, 45);

        // Branches
        ctx.strokeStyle = '#4A4A4A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 175);
        ctx.lineTo(x - 15, 165);
        ctx.moveTo(x, 170);
        ctx.lineTo(x + 12, 160);
        ctx.moveTo(x, 165);
        ctx.lineTo(x - 10, 155);
        ctx.stroke();
    }

    // Snowflakes falling
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 30; i++) {
        const x = (i * 70 + offset * 4) % (canvasWidth + 70);
        const y = ((i * 43) % 180) + 20;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
};

// LEVEL 9: AUTUMN
const drawAutumnLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#FF8C00');
    skyGradient.addColorStop(0.4, '#FFA500');
    skyGradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Hills
    ctx.fillStyle = '#8B7355';
    for (let i = 0; i < 6; i++) {
        const x = (i * 400 + offset * 1.3) % (canvasWidth + 400);
        ctx.beginPath();
        ctx.moveTo(x - 200, 200);
        ctx.quadraticCurveTo(x, 130, x + 200, 200);
        ctx.fill();
    }

    // Ground - autumn grass
    ctx.fillStyle = '#9ACD32';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Pumpkin patches
    ctx.fillStyle = '#FF4500';
    for (let i = 0; i < 15; i++) {
        const x = (i * 150 + offset * 2.5) % (canvasWidth + 150);
        ctx.beginPath();
        ctx.arc(x, 195, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Fall trees with colored leaves
    for (let i = 0; i < 20; i++) {
        const x = (i * 110 + offset * 2) % (canvasWidth + 110);
        const colors = ['#FF4500', '#FF6347', '#FFD700', '#FF8C00'];

        ctx.fillStyle = '#654321';
        ctx.fillRect(x - 5, 160, 10, 40);

        ctx.fillStyle = colors[i % 4];
        ctx.beginPath();
        ctx.arc(x, 150, 20, 0, Math.PI * 2);
        ctx.fill();

        // Falling leaves
        ctx.fillStyle = colors[(i + 1) % 4];
        for (let j = 0; j < 3; j++) {
            const leafX = x + (j - 1) * 15;
            const leafY = 175 + ((i + j) * 13) % 25;
            ctx.save();
            ctx.translate(leafX, leafY);
            ctx.rotate((i + j) * 0.5);
            ctx.beginPath();
            ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Scarecrows
    ctx.fillStyle = '#8B4513';
    for (let i = 0; i < 5; i++) {
        const x = (i * 440 + offset * 2) % (canvasWidth + 440);
        ctx.fillRect(x - 3, 160, 6, 40);
        ctx.fillRect(x - 20, 170, 40, 6);
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.arc(x, 155, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8B4513';
    }
};

// LEVEL 10: NIGHT CITY
const drawNightLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Night sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#000033');
    skyGradient.addColorStop(0.5, '#191970');
    skyGradient.addColorStop(1, '#483D8B');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Stars
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 50; i++) {
        const x = (i * 40 + offset * 0.1) % canvasWidth;
        const y = (i * 27) % 150 + 20;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Moon
    ctx.fillStyle = '#F0E68C';
    ctx.beginPath();
    ctx.arc(150, 80, 30, 0, Math.PI * 2);
    ctx.fill();

    // Ground
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // City buildings at night
    for (let i = 0; i < 10; i++) {
        const x = (i * 230 + offset * 1.5) % (canvasWidth + 230);
        const height = 100 + (i % 4) * 30;

        ctx.fillStyle = '#2A2A3A';
        ctx.fillRect(x - 40, 200 - height, 80, height);

        // Lit windows
        for (let row = 0; row < height / 15; row++) {
            for (let col = 0; col < 5; col++) {
                if (Math.random() > 0.3) {
                    ctx.fillStyle = '#FFFF00';
                    ctx.fillRect(x - 35 + col * 15, 200 - height + row * 15 + 3, 10, 10);
                }
            }
        }
    }

    // Street lights
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 20; i++) {
        const x = (i * 120 + offset * 2.5) % (canvasWidth + 120);
        ctx.fillRect(x - 2, 175, 4, 25);
        ctx.beginPath();
        ctx.arc(x, 172, 8, 0, Math.PI * 2);
        ctx.fill();

        // Light glow
        const gradient = ctx.createRadialGradient(x, 172, 5, x, 172, 25);
        gradient.addColorStop(0, 'rgba(255, 255, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, 172, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
    }

    // Neon signs
    const neonColors = ['#FF1493', '#00FFFF', '#FF4500', '#7FFF00'];
    for (let i = 0; i < 8; i++) {
        const x = (i * 280 + offset * 1.8) % (canvasWidth + 280);
        ctx.fillStyle = neonColors[i % 4];
        ctx.fillRect(x - 25, 160, 50, 20);
    }
};

// LEVEL 11: SPACE
const drawSpaceLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Deep space background
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#000000');
    skyGradient.addColorStop(0.5, '#0A0A2E');
    skyGradient.addColorStop(1, '#1A1A4A');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Stars - distant
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 100; i++) {
        const x = (i * 23 + offset * 0.05) % canvasWidth;
        const y = (i * 37) % 200 + 10;
        const size = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Nebula clouds
    for (let i = 0; i < 5; i++) {
        const x = (i * 450 + offset * 0.3) % (canvasWidth + 450);
        const colors = ['rgba(138, 43, 226, 0.3)', 'rgba(255, 20, 147, 0.3)', 'rgba(0, 191, 255, 0.3)'];
        const gradient = ctx.createRadialGradient(x, 120, 10, x, 120, 100);
        gradient.addColorStop(0, colors[i % 3]);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - 100, 50, 200, 150);
    }

    // Planets
    for (let i = 0; i < 4; i++) {
        const x = (i * 550 + offset * 1) % (canvasWidth + 550);
        const y = 100 + i * 20;
        const size = 40 + i * 10;
        const planetColors = ['#FF6347', '#4169E1', '#FFD700', '#9370DB'];

        ctx.fillStyle = planetColors[i % 4];
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Planet rings for some
        if (i % 2 === 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(x, y, size * 1.4, size * 0.3, 0.3, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Asteroids/meteors
    ctx.fillStyle = '#8B8B8B';
    for (let i = 0; i < 15; i++) {
        const x = (i * 150 + offset * 2.5) % (canvasWidth + 150);
        const size = 5 + Math.random() * 8;
        ctx.beginPath();
        ctx.arc(x, 180 + i * 5, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Space "ground" - asteroid field
    ctx.fillStyle = '#1A1A2A';
    ctx.fillRect(0, 200, canvasWidth, 312);
};

// LEVEL 12: UNDERWATER
const drawUnderwaterLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Water gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#001a33');
    skyGradient.addColorStop(0.5, '#003d5c');
    skyGradient.addColorStop(1, '#006494');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Light rays from surface
    for (let i = 0; i < 6; i++) {
        const x = (i * 400 + offset * 0.2) % (canvasWidth + 400);
        const gradient = ctx.createLinearGradient(x, 0, x + 50, canvasHeight);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, 0, 30, 200);
    }

    // Coral formations
    for (let i = 0; i < 12; i++) {
        const x = (i * 190 + offset * 1.5) % (canvasWidth + 190);
        const coralColors = ['#FF6B9D', '#FF8C94', '#FFA500', '#9D4EDD'];
        ctx.fillStyle = coralColors[i % 4];

        // Coral branches
        for (let j = 0; j < 5; j++) {
            ctx.beginPath();
            ctx.moveTo(x, 200);
            ctx.quadraticCurveTo(
                x + (j - 2) * 10 + Math.sin(i) * 5,
                180 - j * 15,
                x + (j - 2) * 15,
                160 - j * 10
            );
            ctx.lineWidth = 8 - j;
            ctx.strokeStyle = coralColors[i % 4];
            ctx.stroke();
        }
    }

    // Fish swimming
    for (let i = 0; i < 20; i++) {
        const x = (i * 120 + offset * 3) % (canvasWidth + 120);
        const y = 80 + Math.sin(i + offset * 0.02) * 40;
        const fishColors = ['#FFD700', '#FF4500', '#00CED1', '#9370DB'];

        ctx.fillStyle = fishColors[i % 4];
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.moveTo(x + 12, y);
        ctx.lineTo(x + 18, y - 5);
        ctx.lineTo(x + 18, y + 5);
        ctx.fill();
    }

    // Bubbles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 30; i++) {
        const x = (i * 80 + offset * 2) % (canvasWidth + 80);
        const y = ((i * 53 + offset * 1.5) % 180) + 20;
        const size = 3 + Math.random() * 5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ocean floor
    ctx.fillStyle = '#002147';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Sand ripples
    ctx.fillStyle = '#4A6FA5';
    for (let i = 0; i < 20; i++) {
        const x = (i * 110 + offset * 2) % (canvasWidth + 110);
        ctx.fillRect(x, 200, 80, 3);
    }
};

// LEVEL 13: FANTASY
const drawFantasyLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Magical sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#FF1493');
    skyGradient.addColorStop(0.4, '#9370DB');
    skyGradient.addColorStop(1, '#4B0082');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Floating islands
    ctx.fillStyle = '#8B7355';
    for (let i = 0; i < 5; i++) {
        const x = (i * 450 + offset * 0.8) % (canvasWidth + 450);
        const y = 80 + Math.sin(i * 1.2) * 30;

        ctx.beginPath();
        ctx.ellipse(x, y, 80, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        // Grass on island
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.ellipse(x, y - 20, 70, 15, 0, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#8B7355';
    }

    // Magical crystals
    for (let i = 0; i < 10; i++) {
        const x = (i * 220 + offset * 1.5) % (canvasWidth + 220);
        const crystalColors = ['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00'];
        ctx.fillStyle = crystalColors[i % 4];

        ctx.beginPath();
        ctx.moveTo(x, 160);
        ctx.lineTo(x - 10, 180);
        ctx.lineTo(x - 8, 200);
        ctx.lineTo(x + 8, 200);
        ctx.lineTo(x + 10, 180);
        ctx.fill();

        // Glow
        const gradient = ctx.createRadialGradient(x, 180, 5, x, 180, 25);
        gradient.addColorStop(0, `${crystalColors[i % 4]}80`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, 180, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    // Castles
    for (let i = 0; i < 3; i++) {
        const x = (i * 700 + offset * 1.2) % (canvasWidth + 700);

        // Castle walls
        ctx.fillStyle = '#696969';
        ctx.fillRect(x - 50, 120, 100, 80);

        // Towers
        ctx.fillRect(x - 60, 100, 20, 100);
        ctx.fillRect(x + 40, 100, 20, 100);

        // Tower tops (cones)
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.moveTo(x - 70, 100);
        ctx.lineTo(x - 50, 70);
        ctx.lineTo(x - 30, 100);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 30, 100);
        ctx.lineTo(x + 50, 70);
        ctx.lineTo(x + 70, 100);
        ctx.fill();
    }

    // Magic sparkles
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 40; i++) {
        const x = (i * 55 + offset * 2.5) % canvasWidth;
        const y = (i * 41) % 150 + 20;
        const size = 2 + Math.random() * 3;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ground
    ctx.fillStyle = '#4B0082';
    ctx.fillRect(0, 200, canvasWidth, 312);
};

// LEVEL 14: VOLCANIC
const drawVolcanicLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Ash-filled sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#2B2B2B');
    skyGradient.addColorStop(0.5, '#4A4A4A');
    skyGradient.addColorStop(1, '#FF4500');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Volcanoes
    ctx.fillStyle = '#3C3C3C';
    for (let i = 0; i < 4; i++) {
        const x = (i * 550 + offset * 1) % (canvasWidth + 550);

        ctx.beginPath();
        ctx.moveTo(x - 150, 200);
        ctx.lineTo(x, 80);
        ctx.lineTo(x + 150, 200);
        ctx.fill();

        // Lava glow at top
        const gradient = ctx.createRadialGradient(x, 80, 10, x, 80, 60);
        gradient.addColorStop(0, '#FF4500');
        gradient.addColorStop(0.5, '#FF6600');
        gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, 80, 60, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#3C3C3C';
    }

    // Lava flows
    ctx.fillStyle = '#FF4500';
    for (let i = 0; i < 8; i++) {
        const x = (i * 280 + offset * 2) % (canvasWidth + 280);

        ctx.beginPath();
        ctx.moveTo(x, 150);
        ctx.quadraticCurveTo(x + 10, 165, x + 5, 180);
        ctx.quadraticCurveTo(x - 5, 190, x + 10, 200);
        ctx.lineWidth = 15;
        ctx.strokeStyle = '#FF6600';
        ctx.stroke();

        ctx.lineWidth = 8;
        ctx.strokeStyle = '#FFD700';
        ctx.stroke();
    }

    // Ash/embers falling
    ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
    for (let i = 0; i < 30; i++) {
        const x = (i * 75 + offset * 3) % canvasWidth;
        const y = ((i * 47 + offset * 2) % 180) + 20;
        const size = 2 + Math.random() * 4;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ground - charred earth
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Lava cracks in ground
    ctx.strokeStyle = '#FF4500';
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
        const x = (i * 180 + offset * 1.8) % (canvasWidth + 180);
        ctx.beginPath();
        ctx.moveTo(x, 200);
        ctx.lineTo(x + 10, 220);
        ctx.lineTo(x - 5, 240);
        ctx.stroke();
    }
};

// LEVEL 15: ARCTIC
const drawArcticLandscape = (ctx, offset, canvasWidth, canvasHeight) => {
    // Night sky with aurora
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#000033');
    skyGradient.addColorStop(0.5, '#001a4d');
    skyGradient.addColorStop(1, '#003366');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Aurora Borealis
    const auroraGradient = ctx.createLinearGradient(0, 50, 0, 150);
    auroraGradient.addColorStop(0, 'rgba(0, 255, 127, 0.3)');
    auroraGradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.4)');
    auroraGradient.addColorStop(1, 'rgba(138, 43, 226, 0.3)');
    ctx.fillStyle = auroraGradient;

    for (let i = 0; i < 5; i++) {
        const x = (i * 450 + offset * 0.3) % (canvasWidth + 450);
        ctx.beginPath();
        ctx.moveTo(x - 200, 50);
        ctx.quadraticCurveTo(x - 100, 80 + Math.sin(i) * 20, x, 100);
        ctx.quadraticCurveTo(x + 100, 80 - Math.sin(i) * 20, x + 200, 50);
        ctx.quadraticCurveTo(x + 180, 90, x + 100, 120);
        ctx.quadraticCurveTo(x, 110, x - 100, 120);
        ctx.quadraticCurveTo(x - 180, 90, x - 200, 50);
        ctx.fill();
    }

    // Stars
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 60; i++) {
        const x = (i * 37 + offset * 0.05) % canvasWidth;
        const y = (i * 29) % 120 + 10;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ice mountains/glaciers
    ctx.fillStyle = '#B0E0E6';
    for (let i = 0; i < 6; i++) {
        const x = (i * 400 + offset * 1) % (canvasWidth + 400);

        ctx.beginPath();
        ctx.moveTo(x - 180, 200);
        ctx.lineTo(x, 100 + Math.sin(i) * 20);
        ctx.lineTo(x + 180, 200);
        ctx.fill();

        // Ice shine
        ctx.fillStyle = '#E0FFFF';
        ctx.beginPath();
        ctx.moveTo(x - 50, 140);
        ctx.lineTo(x, 100 + Math.sin(i) * 20);
        ctx.lineTo(x - 20, 160);
        ctx.fill();
        ctx.fillStyle = '#B0E0E6';
    }

    // Ice formations
    for (let i = 0; i < 15; i++) {
        const x = (i * 150 + offset * 1.8) % (canvasWidth + 150);
        ctx.fillStyle = '#ADD8E6';

        ctx.beginPath();
        ctx.moveTo(x - 15, 200);
        ctx.lineTo(x, 160);
        ctx.lineTo(x + 15, 200);
        ctx.fill();

        // Icicles
        ctx.fillStyle = '#E0FFFF';
        ctx.beginPath();
        ctx.moveTo(x - 5, 180);
        ctx.lineTo(x, 160);
        ctx.lineTo(x + 5, 180);
        ctx.fill();
    }

    // Snowy ground
    ctx.fillStyle = '#F0F8FF';
    ctx.fillRect(0, 200, canvasWidth, 312);

    // Snow drifts
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 12; i++) {
        const x = (i * 180 + offset * 1.5) % (canvasWidth + 180);
        ctx.beginPath();
        ctx.ellipse(x, 200, 60, 15, 0, 0, Math.PI * 2);
        ctx.fill();
    }
};
