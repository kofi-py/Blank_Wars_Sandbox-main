#!/usr/bin/env node

/**
 * Retry Failed Character Animations
 *
 * For characters that failed, this will:
 * 1. Upload local GLB to transfer.sh (temporary public URL)
 * 2. Use that fresh URL with Meshy rigging API
 * 3. Add idle and run animations
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const MESHY_API_KEY = process.env.MESHY_API_KEY || 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const MESHY_API_BASE = 'api.meshy.ai';
const MODELS_DIR = path.join(__dirname, '..', 'models');
const OUTPUT_DIR = path.join(__dirname, 'models');

const FAILED_CHARACTERS = {
    cleopatra: 'cleopatra',
    holmes: 'sherlock',
    tesla: 'tesla',
    agent_x: 'agent_x',
    fenrir: 'fenrir'
};

const ANIMATIONS = {
    idle: 0,
    run: 16
};

function makeRequest(hostname, method, apiPath, headers, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            method,
            path: apiPath,
            headers
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    return;
                }
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Parse error: ${data}`));
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function uploadToTransferSh(filePath) {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(filePath);
        const fileStream = fs.createReadStream(filePath);

        const options = {
            hostname: 'transfer.sh',
            method: 'PUT',
            path: `/${fileName}`,
            headers: {
                'Content-Type': 'application/octet-stream'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(data.trim());
                } else {
                    reject(new Error(`Upload failed: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        fileStream.pipe(req);
    });
}

async function pollTask(taskId, endpoint, maxAttempts = 180) {
    console.log(`    Polling task ${taskId}...`);

    for (let i = 0; i < maxAttempts; i++) {
        const response = await makeRequest(
            MESHY_API_BASE,
            'GET',
            endpoint + '/' + taskId,
            { 'Authorization': `Bearer ${MESHY_API_KEY}` }
        );

        if (response.status === 'SUCCEEDED') {
            console.log(`    ✓ Task completed!`);
            return response;
        } else if (response.status === 'FAILED') {
            throw new Error(`Task failed: ${response.error || JSON.stringify(response)}`);
        }

        process.stdout.write(`\r    Progress: ${response.progress || 0}%...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    throw new Error('Task timeout');
}

async function rigModel(modelUrl, characterName) {
    console.log(`  Rigging ${characterName}...`);

    const response = await makeRequest(
        MESHY_API_BASE,
        'POST',
        '/openapi/v1/rigging',
        {
            'Authorization': `Bearer ${MESHY_API_KEY}`,
            'Content-Type': 'application/json'
        },
        {
            model_url: modelUrl,
            height_meters: 1.8
        }
    );

    const taskId = response.result;
    console.log(`    Rigging task created: ${taskId}`);

    const completed = await pollTask(taskId, '/openapi/v1/rigging');
    return {
        taskId,
        glbUrl: completed.output?.glb || completed.model_urls?.glb
    };
}

async function addAnimation(rigTaskId, actionId, animationName, characterName) {
    console.log(`  Adding ${animationName} animation (action_id: ${actionId})...`);

    const response = await makeRequest(
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

    const taskId = response.result;
    console.log(`    Animation task created: ${taskId}`);

    const completed = await pollTask(taskId, '/openapi/v1/animations');
    return {
        taskId,
        glbUrl: completed.result?.animation_glb_url || completed.output?.glb
    };
}

async function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const file = fs.createWriteStream(outputPath);
            res.pipe(file);
            file.on('finish', () => file.close(() => resolve(outputPath)));
            file.on('error', reject);
        }).on('error', reject);
    });
}

async function processCharacter(gameCharacterId, modelFolderName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${gameCharacterId.toUpperCase()} (${modelFolderName})`);
    console.log('='.repeat(60));

    const modelPath = path.join(MODELS_DIR, modelFolderName, `${modelFolderName}.glb`);

    if (!fs.existsSync(modelPath)) {
        console.log(`  ✗ Model file not found: ${modelPath}`);
        return null;
    }

    try {
        // Upload to transfer.sh to get a fresh public URL
        console.log(`  Uploading model to get fresh URL...`);
        const publicUrl = await uploadToTransferSh(modelPath);
        console.log(`  ✓ Model uploaded: ${publicUrl}`);

        // Rig the model
        const rigResult = await rigModel(publicUrl, gameCharacterId);

        // Add animations
        const animatedModels = {};

        for (const [animName, actionId] of Object.entries(ANIMATIONS)) {
            const animResult = await addAnimation(rigResult.taskId, actionId, animName, gameCharacterId);
            const animPath = path.join(OUTPUT_DIR, `${gameCharacterId}_${animName}.glb`);
            await downloadFile(animResult.glbUrl, animPath);
            console.log(`  ✓ ${animName} animation saved: ${animPath}`);
            animatedModels[animName] = `${gameCharacterId}_${animName}.glb`;
        }

        console.log(`✓ ${gameCharacterId} complete with all animations!`);
        return {
            gameCharacterId,
            animations: animatedModels
        };

    } catch (error) {
        console.log(`  ✗ Error processing ${gameCharacterId}: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('RETRY FAILED CHARACTER ANIMATIONS');
    console.log('='.repeat(60));
    console.log(`\nCharacters to retry: ${Object.keys(FAILED_CHARACTERS).length}`);
    console.log(`Animations: ${Object.keys(ANIMATIONS).join(', ')}\n`);

    const results = [];

    for (const [gameCharId, modelFolder] of Object.entries(FAILED_CHARACTERS)) {
        const result = await processCharacter(gameCharId, modelFolder);
        if (result) {
            results.push(result);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total retried: ${Object.keys(FAILED_CHARACTERS).length}`);
    console.log(`Successfully processed: ${results.length}`);
    console.log(`Failed: ${Object.keys(FAILED_CHARACTERS).length - results.length}`);
}

main().catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
});
