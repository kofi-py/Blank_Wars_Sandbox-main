const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const MESHY_API_BASE = 'api.meshy.ai';

// This is the preview task ID from the V2 generation
const PREVIEW_TASK_ID = '019a0395-34b5-76c6-b917-9593e2952e48';

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
    const maxAttempts = 180;
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
    console.log('⚔️  Generating Achilles V4 with PROPER texture preservation\n');
    console.log(`📋 Using existing preview task ID: ${PREVIEW_TASK_ID}`);
    console.log('📋 Workflow: Refine (textures) → Rig WITH texture_image_url → Animate\n');

    try {
        // ===== STEP 1: Generate REFINE model =====
        console.log('Step 1: Generating REFINE model (adding textures to existing preview)...');
        const refineResponse = await makeRequest(
            MESHY_API_BASE,
            'POST',
            '/openapi/v2/text-to-3d',
            {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            {
                mode: 'refine',
                preview_task_id: PREVIEW_TASK_ID
            }
        );

        const refineTaskId = refineResponse.result;
        console.log(`   Refine Task ID: ${refineTaskId}\n`);

        console.log('Waiting for refine model generation (5-10 minutes)...');
        const completedRefine = await pollMeshyTask(refineTaskId, '/openapi/v2/text-to-3d');
        console.log('✅ Refine model (with textures) generated!\n');

        // Extract texture URL from refine result
        const textureUrl = completedRefine.texture_urls[0].base_color;
        console.log(`📸 Texture URL: ${textureUrl}\n`);

        // ===== STEP 2: Rig the model WITH texture preservation =====
        console.log('Step 2: Rigging the model WITH texture_image_url parameter...');
        const rigResponse = await makeRequest(
            MESHY_API_BASE,
            'POST',
            '/openapi/v1/rigging',
            {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            {
                model_url: completedRefine.model_urls.glb,
                height_meters: 1.8,
                texture_image_url: textureUrl  // ⭐ THIS IS THE KEY - preserve textures!
            }
        );

        const rigTaskId = rigResponse.result;
        console.log(`   Rig Task ID: ${rigTaskId}\n`);

        const riggedModel = await pollMeshyTask(rigTaskId, '/openapi/v1/rigging');
        console.log('✅ Model rigged WITH TEXTURES!\n');

        // ===== STEP 3: Apply all 4 animations =====
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

            const outputPath = path.join(__dirname, 'models', `achilles_v4_${animName}.glb`);
            await downloadFile(completedAnim.result.animation_glb_url, outputPath);
            console.log(`   💾 Saved: achilles_v4_${animName}.glb\n`);
        }

        console.log('🎉 SUCCESS! Achilles V4 with PRESERVED TEXTURES complete!');
        console.log('\n📝 What V4 has:');
        console.log('  ✅ Used texture_image_url parameter during rigging');
        console.log('  ✅ Textures should be preserved through rigging and animation');
        console.log('  ✅ Bronze armor, red cape, skin tones should be visible');
        console.log(`\n💡 Key fix: Passed texture_image_url to rigging API`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
