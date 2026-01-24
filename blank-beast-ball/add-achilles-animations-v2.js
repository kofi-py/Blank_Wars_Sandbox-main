const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';

// Animation action IDs from Meshy's library
const ANIMATIONS = {
    idle: 0,      // Idle
    walk: 30,     // Casual_Walk
    run: 16,      // RunFast
    jump: 460     // Jump (regular)
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

async function pollTaskStatus(taskId, taskType) {
    const maxAttempts = 120;
    const pollInterval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const status = await makeRequest('GET', `/openapi/v1/${taskType}/${taskId}`);

        console.log(`   Status: ${status.status} (${i * 5}s elapsed)`);

        if (status.status === 'SUCCEEDED') {
            return status;
        } else if (status.status === 'FAILED' || status.status === 'EXPIRED') {
            throw new Error(`Task failed: ${status.status}`);
        }
    }

    throw new Error('Task timed out');
}

function modelToDataUri(modelPath) {
    const data = fs.readFileSync(modelPath);
    const base64 = data.toString('base64');
    return `data:model/gltf-binary;base64,${base64}`;
}

async function addAnimationsToAchilles() {
    console.log('⚔️  Adding animations to Achilles model...\n');

    const modelPath = path.join(__dirname, 'models', 'achilles.glb');

    if (!fs.existsSync(modelPath)) {
        throw new Error('achilles.glb not found!');
    }

    try {
        // Step 1: Rig the model
        console.log('Step 1: Rigging Achilles model...');
        const modelDataUri = modelToDataUri(modelPath);

        const rigResponse = await makeRequest('POST', '/openapi/v1/rigging', {
            model_url: modelDataUri,
            height_meters: 1.8
        });

        if (!rigResponse.result) {
            throw new Error('Failed to rig model: ' + JSON.stringify(rigResponse));
        }

        const rigTaskId = rigResponse.result;
        console.log(`   Rig Task ID: ${rigTaskId}`);

        const riggedModel = await pollTaskStatus(rigTaskId, 'rigging');
        console.log('   ✅ Model rigged successfully!\n');

        // Step 2: Apply each animation
        for (const [animName, actionId] of Object.entries(ANIMATIONS)) {
            console.log(`Step 2: Applying ${animName} animation (action ${actionId})...`);

            const animResponse = await makeRequest('POST', '/openapi/v1/animations', {
                rig_task_id: rigTaskId,
                action_id: actionId
            });

            if (!animResponse.result) {
                throw new Error(`Failed to create ${animName}: ${JSON.stringify(animResponse)}`);
            }

            const animTaskId = animResponse.result;
            console.log(`   Anim Task ID: ${animTaskId}`);

            const completedAnim = await pollTaskStatus(animTaskId, 'animations');
            console.log(`   ✅ ${animName} animation applied!`);

            // Download animated model
            const outputPath = path.join(__dirname, 'models', `achilles_${animName}.glb`);
            await downloadFile(completedAnim.model_urls.glb, outputPath);
            console.log(`   💾 Saved to: achilles_${animName}.glb\n`);
        }

        console.log('🎉 All animations added to Achilles!');
        console.log('\nGenerated files:');
        console.log('  - achilles_idle.glb (Idle)');
        console.log('  - achilles_walk.glb (Casual Walk)');
        console.log('  - achilles_run.glb (Fast Run)');
        console.log('  - achilles_jump.glb (Jump)\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addAnimationsToAchilles();
