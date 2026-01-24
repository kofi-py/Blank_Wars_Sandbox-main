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

async function pollTaskStatus(taskId) {
    const maxAttempts = 120;
    const pollInterval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const status = await makeRequest('GET', `/v1/text-to-motion/${taskId}`);

        console.log(`   Status: ${status.status} (${i * 5}s elapsed)`);

        if (status.status === 'SUCCEEDED') {
            return status;
        } else if (status.status === 'FAILED' || status.status === 'EXPIRED') {
            throw new Error(`Task failed with status: ${status.status}`);
        }
    }

    throw new Error('Task timed out');
}

async function uploadModel(modelPath) {
    const modelData = fs.readFileSync(modelPath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_BASE,
            path: '/v1/text-to-motion/upload',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch (e) {
                    reject(new Error(`Upload failed: ${responseData}`));
                }
            });
        });

        req.on('error', reject);

        // Build multipart form data
        let formData = '';
        formData += `--${boundary}\r\n`;
        formData += `Content-Disposition: form-data; name="file"; filename="achilles.glb"\r\n`;
        formData += `Content-Type: model/gltf-binary\r\n\r\n`;

        req.write(formData);
        req.write(modelData);
        req.write(`\r\n--${boundary}--\r\n`);
        req.end();
    });
}

async function addAnimationsToAchilles() {
    console.log('⚔️  Adding animations to Achilles model...\n');

    const modelPath = path.join(__dirname, 'models', 'achilles.glb');

    if (!fs.existsSync(modelPath)) {
        throw new Error('achilles.glb not found!');
    }

    const animations = [
        { name: 'idle', prompt: 'idle standing pose, relaxed warrior stance' },
        { name: 'run', prompt: 'running forward, aggressive warrior sprint' },
        { name: 'walk', prompt: 'walking forward, confident stride' },
        { name: 'jump', prompt: 'jumping upward, athletic leap' }
    ];

    try {
        // Upload the model first
        console.log('Step 1: Uploading achilles.glb to Meshy...');
        const uploadResponse = await uploadModel(modelPath);

        if (!uploadResponse.model_id) {
            throw new Error('Failed to upload model: ' + JSON.stringify(uploadResponse));
        }

        const modelId = uploadResponse.model_id;
        console.log(`   ✅ Model uploaded: ${modelId}\n`);

        // Generate each animation
        for (const anim of animations) {
            console.log(`Step 2: Generating ${anim.name} animation...`);

            const createResponse = await makeRequest('POST', '/v1/text-to-motion', {
                model_id: modelId,
                prompt: anim.prompt
            });

            if (!createResponse.result) {
                throw new Error(`Failed to create ${anim.name}: ${JSON.stringify(createResponse)}`);
            }

            const taskId = createResponse.result;
            console.log(`   Task ID: ${taskId}`);

            const completedTask = await pollTaskStatus(taskId);

            console.log(`   ✅ ${anim.name} animation generated!`);

            // Download animated model
            const outputPath = path.join(__dirname, 'models', `achilles_${anim.name}.glb`);
            await downloadFile(completedTask.model_urls.glb, outputPath);
            console.log(`   💾 Saved to: achilles_${anim.name}.glb\n`);
        }

        console.log('🎉 All animations added to Achilles!');
        console.log('\nGenerated files:');
        console.log('  - achilles_idle.glb');
        console.log('  - achilles_run.glb');
        console.log('  - achilles_walk.glb');
        console.log('  - achilles_jump.glb\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addAnimationsToAchilles();
