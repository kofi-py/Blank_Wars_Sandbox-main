const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const MESHY_API_BASE = 'api.meshy.ai';

const ANIMATIONS = {
    idle: 0,
    walk: 30,
    run: 16,
    jump: 460
};

function makeRequest(hostname, method, apiPath, headers, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: hostname,
            path: apiPath,
            method: method,
            headers: headers
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

async function pollMeshyTask(taskId, endpoint) {
    const maxAttempts = 120;
    const pollInterval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        const status = await makeRequest(
            MESHY_API_BASE,
            'GET',
            `${endpoint}/${taskId}`,
            {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        );

        console.log(`   Status: ${status.status} - Progress: ${status.progress}% (${i * 5}s elapsed)`);

        if (status.status === 'SUCCEEDED') return status;
        if (status.status === 'FAILED' || status.status === 'EXPIRED') {
            throw new Error(`Task failed: ${status.status}`);
        }
    }
    throw new Error('Timeout');
}

async function main() {
    console.log('⚔️  Generating Achilles using TEXT-TO-3D with proper parameters\n');

    try {
        // Step 1: Generate base 3D model
        console.log('Step 1: Generating base 3D model...');
        const createResponse = await makeRequest(
            MESHY_API_BASE,
            'POST',
            '/openapi/v2/text-to-3d',
            {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            {
                mode: 'preview',
                prompt: 'full body Greek warrior Achilles character in T-pose, arms extended horizontally, standing straight, muscular athletic build, wearing bronze armor breastplate and helmet with red plume, red cape, heroic warrior, game character, front view',
                art_style: 'realistic',
                ai_model: 'latest',
                topology: 'quad',
                is_a_t_pose: true,
                should_remesh: true,
                negative_prompt: 'statue, pedestal, base, platform, sculpture, relief, 2d, flat, multiple people, sitting, lying down, side view, back view'
            }
        );

        const taskId = createResponse.result;
        console.log(`   Task ID: ${taskId}\n`);

        console.log('Waiting for 3D model generation (2-3 minutes)...');
        const completedModel = await pollMeshyTask(taskId, '/openapi/v2/text-to-3d');
        console.log('✅ 3D model generated!\n');

        // Step 2: Rig the model
        console.log('Step 2: Rigging the model...');
        const rigResponse = await makeRequest(
            MESHY_API_BASE,
            'POST',
            '/openapi/v1/rigging',
            {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            {
                model_url: completedModel.model_urls.glb,
                height_meters: 1.8
            }
        );

        const rigTaskId = rigResponse.result;
        console.log(`   Rig Task ID: ${rigTaskId}\n`);

        const riggedModel = await pollMeshyTask(rigTaskId, '/openapi/v1/rigging');
        console.log('✅ Model rigged!\n');

        // Step 3: Apply all 4 animations
        for (const [animName, actionId] of Object.entries(ANIMATIONS)) {
            console.log(`Step 3: Applying ${animName} animation (action ${actionId})...`);

            const animResponse = await makeRequest(
                MESHY_API_BASE,
                'POST',
                '/openapi/v1/animations',
                {
                    'Authorization': `Bearer ${MESHY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                {
                    rig_task_id: rigTaskId,
                    action_id: actionId
                }
            );

            const animTaskId = animResponse.result;
            console.log(`   Anim Task ID: ${animTaskId}`);

            const completedAnim = await pollMeshyTask(animTaskId, '/openapi/v1/animations');
            console.log(`   ✅ ${animName} complete!`);

            const outputPath = path.join(__dirname, 'models', `achilles_${animName}.glb`);
            await downloadFile(completedAnim.result.animation_glb_url, outputPath);
            console.log(`   💾 Saved: achilles_${animName}.glb\n`);
        }

        console.log('🎉 SUCCESS! Achilles with all animations complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
