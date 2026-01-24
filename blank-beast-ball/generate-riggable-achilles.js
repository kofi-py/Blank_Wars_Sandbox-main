const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';

// Animation action IDs
const ANIMATIONS = {
    idle: 0,
    walk: 30,
    run: 16,
    jump: 460
};

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
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch (e) {
                    reject(new Error(`Parse error: ${responseData}`));
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
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

async function pollTaskStatus(taskId, taskType) {
    const maxAttempts = 120;
    const pollInterval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        const status = await makeRequest('GET', `/v2/${taskType}/tasks/${taskId}`);

        console.log(`   Status: ${status.status} (${i * 5}s elapsed)`);

        if (status.status === 'SUCCEEDED') return status;
        if (status.status === 'FAILED' || status.status === 'EXPIRED') {
            throw new Error(`Task failed: ${status.status}`);
        }
    }
    throw new Error('Timeout');
}

async function pollRigStatus(taskId) {
    const maxAttempts = 120;
    const pollInterval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        const status = await makeRequest('GET', `/openapi/v1/rigging/${taskId}`);

        console.log(`   Status: ${status.status} (${i * 5}s elapsed)`);

        if (status.status === 'SUCCEEDED') return status;
        if (status.status === 'FAILED' || status.status === 'EXPIRED') {
            throw new Error(`Rig failed: ${status.status}`);
        }
    }
    throw new Error('Timeout');
}

async function pollAnimStatus(taskId) {
    const maxAttempts = 120;
    const pollInterval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        const status = await makeRequest('GET', `/openapi/v1/animations/${taskId}`);

        console.log(`   Status: ${status.status} (${i * 5}s elapsed)`);

        if (status.status === 'SUCCEEDED') return status;
        if (status.status === 'FAILED' || status.status === 'EXPIRED') {
            throw new Error(`Anim failed: ${status.status}`);
        }
    }
    throw new Error('Timeout');
}

async function generateAnimatedAchilles() {
    console.log('⚔️  Generating riggable Achilles model with animations...\n');

    try {
        // Step 1: Generate base model in T-pose for rigging
        console.log('Step 1: Generating base Achilles model (T-pose for rigging)...');
        const createResponse = await makeRequest('POST', '/v2/text-to-3d', {
            mode: 'preview',
            prompt: 'Greek warrior Achilles standing in T-pose, arms extended horizontally, muscular build, wearing bronze armor, heroic proportions, game character ready for rigging',
            art_style: 'realistic',
            negative_prompt: 'low quality, blurry, arms down, action pose, multiple people',
            enable_pbr: true,
            should_remesh: true
        });

        const taskId = createResponse.result;
        console.log(`   Task ID: ${taskId}\n`);

        console.log('Waiting for model generation (2-3 minutes)...');
        const completedModel = await pollTaskStatus(taskId, 'text-to-3d');
        console.log('✅ Base model generated!\n');

        // Step 2: Rig the model
        console.log('Step 2: Rigging the model...');
        const rigResponse = await makeRequest('POST', '/openapi/v1/rigging', {
            model_url: completedModel.model_urls.glb,
            height_meters: 1.8
        });

        const rigTaskId = rigResponse.result;
        console.log(`   Rig Task ID: ${rigTaskId}\n`);

        const riggedModel = await pollRigStatus(rigTaskId);
        console.log('✅ Model rigged!\n');

        // Step 3: Apply animations
        for (const [animName, actionId] of Object.entries(ANIMATIONS)) {
            console.log(`Step 3: Applying ${animName} animation...`);

            const animResponse = await makeRequest('POST', '/openapi/v1/animations', {
                rig_task_id: rigTaskId,
                action_id: actionId
            });

            const animTaskId = animResponse.result;
            console.log(`   Anim Task ID: ${animTaskId}`);

            const completedAnim = await pollAnimStatus(animTaskId);
            console.log(`   ✅ ${animName} complete!`);

            const outputPath = path.join(__dirname, 'models', `achilles_${animName}.glb`);
            await downloadFile(completedAnim.model_urls.glb, outputPath);
            console.log(`   💾 Saved: achilles_${animName}.glb\n`);
        }

        console.log('🎉 Achilles with all animations complete!');
        console.log('\nGenerated:');
        console.log('  - achilles_idle.glb');
        console.log('  - achilles_walk.glb');
        console.log('  - achilles_run.glb');
        console.log('  - achilles_jump.glb\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

generateAnimatedAchilles();
