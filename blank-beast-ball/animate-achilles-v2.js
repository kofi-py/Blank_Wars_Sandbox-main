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
    console.log('⚔️ Generating animated Achilles with text-to-voxel...');

    // Try text-to-voxel which supports animation
    const taskData = {
        preview_task_id: '0199fa78-ac85-73f3-983b-bba0fa4219db', // Use the base model we just made
        voxel_size: 256,
        enable_pbr: true
    };

    console.log('Converting to animated voxel model...');
    const task = await makeRequest('POST', '/v2/text-to-voxel', taskData);

    if (!task.result) {
        console.error('❌ Failed to create voxel task');
        console.log('Response:', task);
        return;
    }

    const taskId = task.result;
    console.log(`   Task ID: ${taskId}`);

    // Poll for completion
    let status = 'PENDING';
    while (status === 'PENDING' || status === 'IN_PROGRESS') {
        await new Promise(resolve => setTimeout(resolve, 10000));

        const result = await makeRequest('GET', `/v2/text-to-voxel/${taskId}`);
        status = result.status;

        if (result.progress) {
            console.log(`   Progress: ${result.progress}%`);
        }

        if (status === 'SUCCEEDED') {
            console.log('   ✅ Voxel model generated!');

            // Download
            const modelUrl = result.model_urls.glb;
            const filepath = path.join(__dirname, 'models', 'achilles.glb');
            await downloadFile(modelUrl, filepath);
            console.log(`   📥 Downloaded to ${filepath}`);

            console.log('\n🎉 Achilles model complete!');
            return;
        } else if (status === 'FAILED') {
            console.error('   ❌ Generation failed');
            return;
        }
    }
}

animateAchilles().catch(console.error);
