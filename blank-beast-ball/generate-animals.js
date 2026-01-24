const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';

// Animal models to generate
const ANIMALS = [
    {
        name: 'alligator',
        prompt: 'aggressive alligator with mouth wide open showing sharp teeth, green scaly skin, realistic 3D game model, low poly, game ready, attacking pose',
        negativePrompt: 'cartoon, cute, baby, friendly'
    },
    {
        name: 'flamingo',
        prompt: 'pink flamingo standing on one leg, long curved neck, detailed feathers, realistic 3D game model, low poly, game ready, elegant pose',
        negativePrompt: 'cartoon, unrealistic colors'
    },
    {
        name: 'starfish',
        prompt: 'orange ninja starfish with 5 points, throwing star shape, dynamic spinning pose, realistic 3D game model, low poly, game ready',
        negativePrompt: 'cartoon, cute, round'
    },
    {
        name: 'cow',
        prompt: 'black and white dairy cow, spotted pattern, realistic 3D game model, low poly, game ready, standing pose',
        negativePrompt: 'cartoon, cute, baby'
    }
];

// Make API request
function makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_BASE,
            path: endpoint,
            method: method,
            headers: {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

// Download file
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

// Generate 3D model
async function generateAnimal(animal) {
    console.log(`\n🎨 Generating ${animal.name}...`);

    const payload = {
        mode: 'preview',
        prompt: animal.prompt,
        art_style: 'realistic',
        negative_prompt: animal.negativePrompt
    };

    // Create task
    console.log('📝 Creating generation task...');
    const task = await makeRequest('POST', '/v2/text-to-3d', payload);

    if (!task.result) {
        throw new Error(`Failed to create task for ${animal.name}: ${JSON.stringify(task)}`);
    }

    console.log(`✅ Task created: ${task.result}`);

    // Poll for completion
    let result;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        result = await makeRequest('GET', `/v2/text-to-3d/${task.result}`);
        console.log(`📊 Status: ${result.status} (${attempts * 5}s elapsed)`);

        if (result.status === 'SUCCEEDED') {
            break;
        } else if (result.status === 'FAILED') {
            throw new Error(`Generation failed for ${animal.name}: ${JSON.stringify(result)}`);
        }

        attempts++;
    }

    if (result.status !== 'SUCCEEDED') {
        throw new Error(`Timeout waiting for ${animal.name}`);
    }

    // Download GLB
    console.log('📥 Downloading GLB file...');
    const glbUrl = result.model_urls.glb;
    const outputPath = path.join(__dirname, 'models', `${animal.name}.glb`);

    await downloadFile(glbUrl, outputPath);
    console.log(`✅ ${animal.name}.glb saved!`);

    return outputPath;
}

// Main
async function main() {
    console.log('🚀 Starting Animal Hazard Generation...');
    console.log(`⏰ Generating ${ANIMALS.length} animals (will take ~${ANIMALS.length * 2} minutes)\n`);

    // Ensure models directory exists
    const modelsDir = path.join(__dirname, 'models');
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir);
    }

    // Generate all animals
    for (const animal of ANIMALS) {
        try {
            await generateAnimal(animal);
        } catch (error) {
            console.error(`❌ Failed to generate ${animal.name}:`, error.message);
        }
    }

    console.log('\n🎉 Animal generation complete!');
    console.log('Generated models:');
    ANIMALS.forEach(animal => {
        const filepath = path.join(modelsDir, `${animal.name}.glb`);
        if (fs.existsSync(filepath)) {
            console.log(`  ✅ ${animal.name}.glb`);
        } else {
            console.log(`  ❌ ${animal.name}.glb (failed)`);
        }
    });
}

main().catch(console.error);
