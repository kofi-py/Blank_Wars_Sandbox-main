const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';

function makeRequest(method, apiPath, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_BASE,
            path: apiPath,
            method: method,
            headers: {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${responseData}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(outputPath, () => {});
            reject(err);
        });
    });
}

async function pollTaskStatus(taskId, taskType = 'text-to-3d') {
    const maxAttempts = 120; // 10 minutes max
    const pollInterval = 5000; // 5 seconds

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const status = await makeRequest('GET', `/v2/${taskType}/tasks/${taskId}`);

        console.log(`   Status: ${status.status} (${i * 5}s elapsed)`);

        if (status.status === 'SUCCEEDED') {
            return status;
        } else if (status.status === 'FAILED' || status.status === 'EXPIRED') {
            throw new Error(`Task failed with status: ${status.status}`);
        }
    }

    throw new Error('Task timed out');
}

async function generateAnimatedAchilles() {
    console.log('⚔️  Generating animated Achilles model...\n');

    try {
        // Step 1: Create text-to-3D task with enable_pbr for better quality
        console.log('Step 1: Creating 3D model generation task...');
        const createResponse = await makeRequest('POST', '/v2/text-to-3d', {
            mode: 'preview',
            prompt: 'Greek warrior Achilles in heroic battle stance, muscular build, wearing bronze armor and red cape, holding spear and shield, dynamic action pose, high detail, game character',
            art_style: 'realistic',
            negative_prompt: 'low quality, blurry, deformed, multiple people, sitting, lying down',
            enable_pbr: true,
            should_remesh: true
        });

        if (!createResponse.result) {
            throw new Error('Failed to create task: ' + JSON.stringify(createResponse));
        }

        const taskId = createResponse.result;
        console.log(`   Task ID: ${taskId}\n`);

        // Step 2: Poll for completion
        console.log('Step 2: Waiting for model generation (2-3 minutes)...');
        const completedTask = await pollTaskStatus(taskId, 'text-to-3d');

        console.log('\n✅ Model generated successfully!');
        console.log(`   Model URL: ${completedTask.model_urls.glb}\n`);

        // Step 3: Download the model
        console.log('Step 3: Downloading animated model...');
        const modelPath = path.join(__dirname, 'models', 'achilles.glb');
        const backupPath = path.join(__dirname, 'models', 'achilles_backup.glb');

        // Backup existing model
        if (fs.existsSync(modelPath)) {
            console.log('   Backing up existing achilles.glb...');
            fs.copyFileSync(modelPath, backupPath);
        }

        await downloadFile(completedTask.model_urls.glb, modelPath);
        console.log(`   ✅ Saved to: ${modelPath}\n`);

        // Download thumbnail if available
        if (completedTask.thumbnail_url) {
            const thumbPath = path.join(__dirname, 'models', 'achilles_thumb.png');
            await downloadFile(completedTask.thumbnail_url, thumbPath);
            console.log(`   ✅ Thumbnail saved to: ${thumbPath}\n`);
        }

        console.log('🎉 Achilles model generation complete!');
        console.log('\nNote: Meshy text-to-3D models come with basic rigging.');
        console.log('For animations, you may need to:');
        console.log('1. Use the model with Three.js skeletal animation');
        console.log('2. Or upload to Mixamo (mixamo.com) to add animations');
        console.log('3. Or use a tool like Blender to rig and animate\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

generateAnimatedAchilles();
