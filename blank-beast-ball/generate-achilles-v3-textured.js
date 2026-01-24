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
    const maxAttempts = 180; // Increased for refine mode which takes longer
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
    console.log('⚔️  Generating Achilles V3 with REFINE MODE for actual textures\n');
    console.log('⏱️  This will take longer (~10-15 min total) but will produce TEXTURED models\n');

    try {
        // Step 1: Generate base 3D model WITH TEXTURES
        console.log('Step 1: Generating base 3D model with REFINE mode (includes textures)...');
        const createResponse = await makeRequest(
            MESHY_API_BASE,
            'POST',
            '/openapi/v2/text-to-3d',
            {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            {
                mode: 'refine',  // ⭐ THIS IS THE KEY CHANGE - refine mode includes textures!
                prompt: 'full body Greek warrior Achilles in T-pose, arms extended horizontally 90 degrees, standing straight upright, detailed realistic human face with strong masculine features, short dark hair, athletic muscular build, wearing shiny bronze metallic armor breastplate, bronze greaves, Corinthian helmet with bright red feather plume on top, flowing red fabric cape attached at shoulders, tanned skin, heroic powerful stance, game-ready character model, clean separated elements, volumetric 3D',
                art_style: 'realistic',
                ai_model: 'latest',
                topology: 'quad',
                is_a_t_pose: true,
                should_remesh: true,
                negative_prompt: 'statue, pedestal, base, platform, sculpture, relief, 2d, flat, low poly, cartoonish, multiple people, sitting, lying down, side view, back view, strings, wires, connecting strands, threads, cables, ropes between body parts, web, mesh connections, helmet connected to cape, plume connected to cape, facial hair, beard'
            }
        );

        const taskId = createResponse.result;
        console.log(`   Task ID: ${taskId}\n`);

        console.log('Waiting for 3D model generation with textures (5-10 minutes)...');
        const completedModel = await pollMeshyTask(taskId, '/openapi/v2/text-to-3d');
        console.log('✅ 3D model with textures generated!\n');

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

            const outputPath = path.join(__dirname, 'models', `achilles_v3_${animName}.glb`);
            await downloadFile(completedAnim.result.animation_glb_url, outputPath);
            console.log(`   💾 Saved: achilles_v3_${animName}.glb\n`);
        }

        console.log('🎉 SUCCESS! Achilles V3 with ACTUAL TEXTURES complete!');
        console.log('\n📝 What V3 should have:');
        console.log('  ✅ Bronze metallic armor with proper materials');
        console.log('  ✅ Red cape and plume with fabric textures');
        console.log('  ✅ Tanned skin with facial features');
        console.log('  ✅ Clean separated elements (no strands)');
        console.log('\n💡 Key difference: Used mode: "refine" instead of "preview"');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
