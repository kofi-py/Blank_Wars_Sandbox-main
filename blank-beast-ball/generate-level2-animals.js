const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';

// Level 2 animals - Volcano theme
const ANIMALS = [
    {
        name: 'eagle',
        prompt: 'A fierce eagle with wings spread, diving pose, aggressive look, brown and white feathers, sharp talons extended, game-ready low poly 3D model',
        filename: 'eagle.glb'
    },
    {
        name: 'rhino',
        prompt: 'A charging rhinoceros, muscular build, horn forward, angry expression, gray skin with battle scars, running pose, game-ready low poly 3D model',
        filename: 'rhino.glb'
    },
    {
        name: 'snake',
        prompt: 'A large cobra snake in striking pose, hood spread, fangs visible, vibrant red and orange scales (lava colors), coiled body ready to attack, game-ready low poly 3D model',
        filename: 'snake.glb'
    }
];

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_BASE,
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
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

function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const file = fs.createWriteStream(filepath);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', reject);
    });
}

async function generateAnimal(animal) {
    console.log(`\n🎨 Generating ${animal.name}...`);

    // Create text-to-3D task
    const taskData = {
        mode: 'preview',
        prompt: animal.prompt,
        art_style: 'realistic',
        negative_prompt: 'low quality, blurry, cartoon'
    };

    const task = await makeRequest('POST', '/v2/text-to-3d', taskData);

    if (!task.result) {
        console.error(`❌ Failed to create task for ${animal.name}`);
        return null;
    }

    const taskId = task.result;
    console.log(`   Task ID: ${taskId}`);

    // Poll for completion
    let status = 'PENDING';
    while (status === 'PENDING' || status === 'IN_PROGRESS') {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s

        const result = await makeRequest('GET', `/v2/text-to-3d/${taskId}`);
        status = result.status;

        if (result.progress) {
            console.log(`   Progress: ${result.progress}%`);
        }

        if (status === 'SUCCEEDED') {
            console.log(`   ✅ ${animal.name} generated!`);

            // Download GLB
            const modelUrl = result.model_urls.glb;
            const filepath = path.join(__dirname, 'models', animal.filename);
            await downloadFile(modelUrl, filepath);
            console.log(`   📥 Downloaded to ${filepath}`);

            return filepath;
        } else if (status === 'FAILED') {
            console.error(`   ❌ Generation failed for ${animal.name}`);
            return null;
        }
    }
}

async function main() {
    console.log('🌋 Starting Level 2 Animal Generation (Volcano Theme)...');
    console.log(`⏰ Generating ${ANIMALS.length} animals (will take ~6-8 minutes)`);

    // Create models directory if it doesn't exist
    const modelsDir = path.join(__dirname, 'models');
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir);
    }

    // Generate all animals
    for (const animal of ANIMALS) {
        await generateAnimal(animal);
    }

    console.log('\n🎉 All Level 2 animals generated!');
    console.log('Models saved to:', modelsDir);
}

main().catch(console.error);
