const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';
const MODEL_URL = 'https://assets.meshy.ai/5892cd31-e399-4678-ac75-0ebf3894101d/tasks/0199fab1-f898-7b0f-9040-a10db8104498/output/model.glb?Expires=4914432000&Signature=mDaL6Ikh9ZWmWywJRO9sSaRVlNs1op22OUV5TPZFFVbUqcmbc7pwYcQji7MOhLYHoDX49SJQiexO47yXu5keWZbZBjqc4FC2EBzutoqD-UfEyiYmwPQNMz7HbdAjvJOuxupgHhifNvQsMn7GUbLoJlAKiBwFh8RHjx1UssnXv81gpvNO~0qztiRPwcn9j5cy6DmnPiS2yWKb1NWSr8mMjO4-s9G7Ht5xs-YppUwrVvbqad4vdyGO2LK6MnhgbDjb04kNOktV85BJIr~tv0SegYXQW9FrPQUDnL6MaHg4qF2diRo-llt74e1tu3AB7TDchLnY-wQg631WjXY8ccOK1g__&Key-Pair-Id=KL5I0C8H7HX83';

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

async function rigAndAnimateAchilles() {
    console.log('⚔️  Rigging and animating Achilles...\n');

    try {
        // Step 1: Rig the model
        console.log('Step 1: Rigging the T-pose Achilles model...');
        const rigResponse = await makeRequest('POST', '/openapi/v1/rigging', {
            model_url: MODEL_URL,
            height_meters: 1.8
        });

        if (!rigResponse.result) {
            throw new Error('Failed to start rigging: ' + JSON.stringify(rigResponse));
        }

        const rigTaskId = rigResponse.result;
        console.log(`   Rig Task ID: ${rigTaskId}\n`);

        const riggedModel = await pollRigStatus(rigTaskId);
        console.log('✅ Model rigged successfully!\n');

        // Step 2: Apply animations
        for (const [animName, actionId] of Object.entries(ANIMATIONS)) {
            console.log(`Step 2: Applying ${animName} animation (action ${actionId})...`);

            const animResponse = await makeRequest('POST', '/openapi/v1/animations', {
                rig_task_id: rigTaskId,
                action_id: actionId
            });

            if (!animResponse.result) {
                throw new Error(`Failed to start ${animName}: ${JSON.stringify(animResponse)}`);
            }

            const animTaskId = animResponse.result;
            console.log(`   Anim Task ID: ${animTaskId}`);

            const completedAnim = await pollAnimStatus(animTaskId);
            console.log(`   ✅ ${animName} complete!`);

            const outputPath = path.join(__dirname, 'models', `achilles_${animName}.glb`);
            await downloadFile(completedAnim.result.animation_glb_url, outputPath);
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

rigAndAnimateAchilles();
