const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';

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

async function pollTaskStatus(taskId, endpoint) {
    const maxAttempts = 120;
    const pollInterval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        const status = await makeRequest('GET', `/openapi/${endpoint}/${taskId}`);

        console.log(`   Status: ${status.status} (${i * 5}s elapsed)`);

        if (status.status === 'SUCCEEDED') return status;
        if (status.status === 'FAILED' || status.status === 'EXPIRED') {
            throw new Error(`Task failed: ${status.status}`);
        }
    }
    throw new Error('Timeout');
}

async function generateProperAchilles() {
    console.log('⚔️  Generating PROPER Achilles with correct parameters...\n');

    try {
        // Step 1: Generate base model with CORRECT parameters
        console.log('Step 1: Generating base model with is_a_t_pose=true...');
        const createResponse = await makeRequest('POST', '/v2/text-to-3d', {
            mode: 'preview',
            prompt: 'full body Greek warrior Achilles character, muscular athletic build, wearing bronze armor breastplate and helmet, red cape, holding spear and shield, heroic warrior, game character',
            art_style: 'realistic',  // NOT sculpture!
            ai_model: 'latest',       // Use Meshy 6
            topology: 'quad',         // Better for rigging
            is_a_t_pose: true,       // THIS IS THE KEY PARAMETER I MISSED!
            should_remesh: true,
            negative_prompt: 'statue, pedestal, base, platform, sculpture, relief, 2d, flat, multiple people, sitting, lying down'
        });

        const taskId = createResponse.result;
        console.log(`   Task ID: ${taskId}\n`);

        console.log('Waiting for model generation (2-3 minutes)...');
        const completedModel = await pollTaskStatus(taskId, 'v2/text-to-3d');
        console.log('✅ Base model generated!\n');

        // Step 2: Rig the model
        console.log('Step 2: Rigging the model...');
        const rigResponse = await makeRequest('POST', '/openapi/v1/rigging', {
            model_url: completedModel.model_urls.glb,
            height_meters: 1.8
        });

        const rigTaskId = rigResponse.result;
        console.log(`   Rig Task ID: ${rigTaskId}\n`);

        const riggedModel = await pollTaskStatus(rigTaskId, 'v1/rigging');
        console.log('✅ Model rigged!\n');

        // Step 3: Apply all 4 animations
        for (const [animName, actionId] of Object.entries(ANIMATIONS)) {
            console.log(`Step 3: Applying ${animName} animation (action ${actionId})...`);

            const animResponse = await makeRequest('POST', '/openapi/v1/animations', {
                rig_task_id: rigTaskId,
                action_id: actionId
            });

            const animTaskId = animResponse.result;
            console.log(`   Anim Task ID: ${animTaskId}`);

            const completedAnim = await pollTaskStatus(animTaskId, 'v1/animations');
            console.log(`   ✅ ${animName} complete!`);

            const outputPath = path.join(__dirname, 'models', `achilles_${animName}.glb`);
            await downloadFile(completedAnim.result.animation_glb_url, outputPath);
            console.log(`   💾 Saved: achilles_${animName}.glb\n`);
        }

        console.log('🎉 SUCCESS! Achilles with all animations complete!');
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

generateProperAchilles();
