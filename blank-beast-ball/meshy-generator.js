const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';

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
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Download file from URL
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(filepath);
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

// Generate 3D model from text
async function generateModel(prompt, artStyle = 'realistic', negativePrompt = '') {
    console.log(`\n🎨 Generating: ${prompt}`);

    const payload = {
        mode: 'preview',
        prompt: prompt,
        art_style: artStyle,
        negative_prompt: negativePrompt
    };

    // Create task
    const task = await makeRequest('POST', '/v2/text-to-3d', payload);
    console.log(`📝 Task created: ${task.result}`);

    // Poll for completion
    let result;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        result = await makeRequest('GET', `/v2/text-to-3d/${task.result}`);
        console.log(`📊 Status: ${result.status} (${attempts * 5}s)`);

        if (result.status === 'SUCCEEDED') {
            break;
        } else if (result.status === 'FAILED') {
            throw new Error('Generation failed');
        }

        attempts++;
    }

    if (result.status !== 'SUCCEEDED') {
        throw new Error('Generation timed out');
    }

    console.log(`✅ Model ready!`);
    return result;
}

// Main generation script
async function generateGameAssets() {
    console.log('🚀 Starting Meshy 3D Asset Generation...\n');

    const modelsDir = path.join(__dirname, 'models');
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir);
    }

    const assets = [
        {
            name: 'achilles',
            prompt: 'Greek warrior Achilles in bronze armor with spear and shield, heroic pose, muscular build, game character',
            artStyle: 'realistic'
        },
        {
            name: 'dracula',
            prompt: 'Count Dracula vampire in black cape with fangs, pale skin, gothic Victorian style, game character',
            artStyle: 'realistic'
        },
        {
            name: 'alligator',
            prompt: 'Cartoon alligator with big chomping teeth, green scales, flying pose, animated style, game character',
            artStyle: 'cartoon'
        },
        {
            name: 'cleopatra',
            prompt: 'Egyptian queen Cleopatra in golden headdress and royal dress, elegant pose, game character',
            artStyle: 'realistic'
        }
    ];

    for (const asset of assets) {
        try {
            console.log(`\n${'='.repeat(50)}`);
            const result = await generateModel(asset.prompt, asset.artStyle);

            // Download GLB file
            if (result.model_urls && result.model_urls.glb) {
                const filename = `${asset.name}.glb`;
                const filepath = path.join(modelsDir, filename);

                console.log(`⬇️  Downloading GLB...`);
                await downloadFile(result.model_urls.glb, filepath);
                console.log(`💾 Saved: ${filename}`);
            }

            // Also save thumbnail
            if (result.thumbnail_url) {
                const thumbPath = path.join(modelsDir, `${asset.name}_thumb.png`);
                await downloadFile(result.thumbnail_url, thumbPath);
                console.log(`🖼️  Saved thumbnail`);
            }

        } catch (error) {
            console.error(`❌ Failed to generate ${asset.name}:`, error.message);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✨ Generation complete! Check the models/ folder');
}

// Run it
generateGameAssets().catch(console.error);
