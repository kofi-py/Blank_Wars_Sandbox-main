#!/usr/bin/env node

/**
 * Complete Failed Animations
 * Uses existing metadata and rig task IDs where available
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const MESHY_API_BASE = 'api.meshy.ai';
const MODELS_DIR = path.join(__dirname, '..', 'models');
const OUTPUT_DIR = path.join(__dirname, 'models');

// Merlin's rig task ID from the previous run
const MERLIN_RIG_TASK = '019a0a6e-b944-7de7-9284-7ee43a0fb211';
const HOLMES_RIG_TASK = '019a0a71-b2af-7267-80ee-abe0de06dd98';

const CHARACTERS_TO_RETRY = {
    cleopatra: 'cleopatra',
    tesla: 'tesla',
    fenrir: 'fenrir',
    agent_x: 'agent_x'
};

function makeRequest(hostname, method, apiPath, headers, body = null) {
    return new Promise((resolve, reject) => {
        const options = { hostname, method, path: apiPath, headers };
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

async function pollTask(taskId, endpoint, maxAttempts = 180) {
    console.log(`    Polling task ${taskId}...`);

    // Add initial delay to let task register
    await new Promise(resolve => setTimeout(resolve, 5000));

    for (let i = 0; i < maxAttempts; i++) {
        try {
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
                throw new Error(`Task failed: ${JSON.stringify(response)}`);
            }

            process.stdout.write(`\r    Progress: ${response.progress || 0}%...`);
        } catch (error) {
            if (error.message.includes('404')) {
                console.log(`\n    Waiting for task to register (attempt ${i+1})...`);
            } else {
                throw error;
            }
        }

        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    throw new Error('Task timeout');
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

async function completeCharacter(charId, rigTaskId) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Completing: ${charId.toUpperCase()}`);
    console.log('='.repeat(60));

    try {
        // Add run animation using existing rig
        const runResult = await addAnimation(rigTaskId, 16, 'run', charId);
        const runPath = path.join(OUTPUT_DIR, `${charId}_run.glb`);
        await downloadFile(runResult.glbUrl, runPath);
        console.log(`  ✓ run animation saved: ${runPath}`);
        console.log(`✓ ${charId} complete!`);
        return true;
    } catch (error) {
        console.log(`  ✗ Error: ${error.message}`);
        return false;
    }
}

async function retryCharacter(charId, modelFolder) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Retrying: ${charId.toUpperCase()}`);
    console.log('='.repeat(60));

    const metadataPath = path.join(MODELS_DIR, modelFolder, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
        console.log(`  ✗ No metadata`);
        return false;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const modelUrl = metadata.modelUrl;

    try {
        const rigResult = await rigModel(modelUrl, charId);

        // Add idle
        const idleResult = await addAnimation(rigResult.taskId, 0, 'idle', charId);
        const idlePath = path.join(OUTPUT_DIR, `${charId}_idle.glb`);
        await downloadFile(idleResult.glbUrl, idlePath);
        console.log(`  ✓ idle saved: ${idlePath}`);

        // Add run
        const runResult = await addAnimation(rigResult.taskId, 16, 'run', charId);
        const runPath = path.join(OUTPUT_DIR, `${charId}_run.glb`);
        await downloadFile(runResult.glbUrl, runPath);
        console.log(`  ✓ run saved: ${runPath}`);

        console.log(`✓ ${charId} complete!`);
        return true;
    } catch (error) {
        console.log(`  ✗ Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('COMPLETE FAILED ANIMATIONS');
    console.log('='.repeat(60));

    let success = 0;
    let failed = 0;

    // Complete Merlin and Holmes with existing rigs
    if (await completeCharacter('merlin', MERLIN_RIG_TASK)) success++; else failed++;
    if (await completeCharacter('holmes', HOLMES_RIG_TASK)) success++; else failed++;

    // Retry the others
    for (const [charId, folder] of Object.entries(CHARACTERS_TO_RETRY)) {
        if (await retryCharacter(charId, folder)) success++; else failed++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
