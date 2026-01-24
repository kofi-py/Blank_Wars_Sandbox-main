const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';

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

async function animateAchilles() {
    console.log('⚔️ Generating animated Achilles model...');

    // Step 1: Create text-to-3D task
    const taskData = {
        mode: 'preview',
        prompt: 'Achilles Greek warrior, muscular heroic build, bronze armor and helmet, holding spear and shield, battle ready stance, ancient Greek warrior, game-ready low poly 3D model',
        art_style: 'realistic',
        negative_prompt: 'low quality, blurry, cartoon'
    };

    console.log('Step 1: Creating base 3D model...');
    const task = await makeRequest('POST', '/v2/text-to-3d', taskData);

    if (!task.result) {
        console.error('❌ Failed to create task');
        return;
    }

    const taskId = task.result;
    console.log(`   Task ID: ${taskId}`);

    // Poll for 3D model completion
    let status = 'PENDING';
    let modelUrl = null;

    while (status === 'PENDING' || status === 'IN_PROGRESS') {
        await new Promise(resolve => setTimeout(resolve, 10000));

        const result = await makeRequest('GET', `/v2/text-to-3d/${taskId}`);
        status = result.status;

        if (result.progress) {
            console.log(`   Progress: ${result.progress}%`);
        }

        if (status === 'SUCCEEDED') {
            modelUrl = result.model_urls.glb;
            console.log('   ✅ Base 3D model generated!');
        } else if (status === 'FAILED') {
            console.error('   ❌ Generation failed');
            return;
        }
    }

    // Step 2: Download the base model first (backup)
    const baseModelPath = path.join(__dirname, 'models', 'achilles_base.glb');
    await downloadFile(modelUrl, baseModelPath);
    console.log(`   📥 Base model saved to ${baseModelPath}`);

    // Step 3: Use text-to-animate API
    console.log('\nStep 2: Adding animation to model...');

    const animateData = {
        object_prompt: 'Achilles Greek warrior running forward, heroic battle charge',
        animation_prompt: 'running forward, heroic sprint, battle charge animation',
        art_style: 'realistic'
    };

    const animTask = await makeRequest('POST', '/v1/text-to-animate', animateData);

    if (!animTask.result) {
        console.error('❌ Failed to create animation task');
        console.log('Using base model without animation');
        return;
    }

    const animTaskId = animTask.result;
    console.log(`   Animation Task ID: ${animTaskId}`);

    // Poll for animation completion
    status = 'PENDING';
    while (status === 'PENDING' || status === 'IN_PROGRESS') {
        await new Promise(resolve => setTimeout(resolve, 10000));

        const result = await makeRequest('GET', `/v1/text-to-animate/${animTaskId}`);
        status = result.status;

        if (result.progress) {
            console.log(`   Animation Progress: ${result.progress}%`);
        }

        if (status === 'SUCCEEDED') {
            console.log('   ✅ Animation generated!');

            // Download animated GLB
            const animatedModelUrl = result.model_urls.glb;
            const filepath = path.join(__dirname, 'models', 'achilles.glb');
            await downloadFile(animatedModelUrl, filepath);
            console.log(`   📥 Animated model saved to ${filepath}`);

            console.log('\n🎉 Achilles animated model complete!');
            return;
        } else if (status === 'FAILED') {
            console.error('   ❌ Animation failed');
            console.log('Using base model without animation');
            return;
        }
    }
}

animateAchilles().catch(console.error);
