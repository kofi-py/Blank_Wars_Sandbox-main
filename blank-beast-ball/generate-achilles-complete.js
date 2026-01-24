const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const MESHY_API_BASE = 'api.meshy.ai';

// Using Hugging Face API for image generation (free tier available)
const HF_API_KEY = 'hf_your_key_here'; // You'll need to get this from huggingface.co
const HF_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';

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
                if (res.headers['content-type']?.includes('application/json')) {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch (e) {
                        reject(new Error(`Parse error: ${responseData}`));
                    }
                } else {
                    resolve(responseData);
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
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

        console.log(`   Status: ${status.status} (${i * 5}s elapsed)`);

        if (status.status === 'SUCCEEDED') return status;
        if (status.status === 'FAILED' || status.status === 'EXPIRED') {
            throw new Error(`Task failed: ${status.status}`);
        }
    }
    throw new Error('Timeout');
}

async function generateImage() {
    console.log('Step 1: Generating Achilles T-pose image...');

    const prompt = "Greek warrior Achilles in T-pose, arms extended horizontally, standing straight, full body view, muscular build, wearing bronze armor and red cape, front view, white background, character reference sheet, 3D reference image";

    // Using DeepAI's free API (no API key needed for basic use)
    const response = await makeRequest(
        'api.deepai.org',
        'POST',
        '/api/text2img',
        {
            'Content-Type': 'application/json',
            'api-key': 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K' // Free quickstart key
        },
        { text: prompt }
    );

    console.log('   Image generated:', response.output_url);

    // Download the image
    const imagePath = path.join(__dirname, 'achilles_tpose.png');
    await downloadFile(response.output_url, imagePath);
    console.log('   💾 Saved:', imagePath);

    return response.output_url;
}

async function generateFromImage(imageUrl) {
    console.log('\n⚔️  Converting image to 3D and animating...\n');

    try {
        // Step 2: Generate 3D model from image
        console.log('Step 2: Converting image to 3D...');
        const createResponse = await makeRequest(
            MESHY_API_BASE,
            'POST',
            '/openapi/v1/image-to-3d',
            {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            {
                image_url: imageUrl,
                ai_model: 'latest',
                topology: 'quad',
                is_a_t_pose: true,
                should_remesh: true,
                enable_pbr: true,
                target_polycount: 50000
            }
        );

        const taskId = createResponse.result;
        console.log(`   Task ID: ${taskId}\n`);

        console.log('Waiting for 3D model generation (2-3 minutes)...');
        const completedModel = await pollMeshyTask(taskId, '/openapi/v1/image-to-3d');
        console.log('✅ 3D model generated!\n');

        // Step 3: Rig the model
        console.log('Step 3: Rigging the model...');
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

        // Step 4: Apply all 4 animations
        for (const [animName, actionId] of Object.entries(ANIMATIONS)) {
            console.log(`Step 4: Applying ${animName} animation (action ${actionId})...`);

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

async function main() {
    console.log('⚔️  COMPLETE PIPELINE: Image Generation → 3D → Rigging → Animation\n');

    const imageUrl = await generateImage();
    await generateFromImage(imageUrl);
}

main();
