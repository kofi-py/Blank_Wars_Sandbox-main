#!/usr/bin/env node

/**
 * Rig and Animate All Characters for Animal Ball Run
 *
 * This script:
 * 1. Takes downloaded character models
 * 2. Rigs them using Meshy rigging API
 * 3. Adds idle and run animations
 * 4. Saves the rigged + animated models
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = process.env.MESHY_API_KEY || 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const MESHY_API_BASE = 'api.meshy.ai';
const MODELS_DIR = path.join(__dirname, '..', 'models');
const OUTPUT_DIR = path.join(__dirname, 'models');

// Character mapping from game character IDs to downloaded model names
const CHARACTER_MAPPING = {
    merlin: 'arcane_sorcerer',
    cleopatra: 'cleopatra',
    holmes: 'sherlock',
    dracula: 'dracula',
    tesla: 'tesla',
    space_cyborg: 'space_cyborg',
    agent_x: 'agent_x',
    sam_spade: 'sam_spade',
    fenrir: 'fenrir'
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
            throw new Error(`Task failed: ${response.error || 'Unknown error'}`);
        }

        process.stdout.write(`\r    Progress: ${response.progress || 0}%...`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second poll interval
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
        { model_url: modelUrl }
    );

    const taskId = response.result;
    console.log(`    Rigging task created: ${taskId}`);

    const completed = await pollTask(taskId, '/openapi/v1/rigging');
    return {
        taskId,
        glbUrl: completed.output.glb,
        fbxUrl: completed.output.fbx
    };
}

async function addAnimation(rigTaskId, animationType, characterName) {
    console.log(`  Adding ${animationType} animation...`);

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
            animation_type: animationType
        }
    );

    const taskId = response.result;
    console.log(`    Animation task created: ${taskId}`);

    const completed = await pollTask(taskId, '/openapi/v1/animations');
    return {
        taskId,
        glbUrl: completed.output.glb,
        fbxUrl: completed.output.fbx
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

    const modelFolder = path.join(MODELS_DIR, modelFolderName);
    const metadataPath = path.join(modelFolder, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
        console.log(`  ✗ Metadata not found, skipping`);
        return null;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const modelUrl = metadata.modelUrl;

    if (!modelUrl) {
        console.log(`  ✗ No model URL in metadata, skipping`);
        return null;
    }

    try {
        // Create output directory for this character
        const charOutputDir = path.join(OUTPUT_DIR, gameCharacterId);
        fs.mkdirSync(charOutputDir, { recursive: true });

        // Step 1: Rig the model
        const rigResult = await rigModel(modelUrl, gameCharacterId);

        // Download rigged model
        const riggedPath = path.join(charOutputDir, `${gameCharacterId}_rigged.glb`);
        await downloadFile(rigResult.glbUrl, riggedPath);
        console.log(`  ✓ Rigged model saved: ${riggedPath}`);

        // Step 2: Add idle animation
        const idleResult = await addAnimation(rigResult.taskId, 'idle', gameCharacterId);
        const idlePath = path.join(charOutputDir, `${gameCharacterId}_idle.glb`);
        await downloadFile(idleResult.glbUrl, idlePath);
        console.log(`  ✓ Idle animation saved: ${idlePath}`);

        // Step 3: Add run animation
        const runResult = await addAnimation(rigResult.taskId, 'run', gameCharacterId);
        const runPath = path.join(charOutputDir, `${gameCharacterId}_run.glb`);
        await downloadFile(runResult.glbUrl, runPath);
        console.log(`  ✓ Run animation saved: ${runPath}`);

        // Save processing metadata
        const processMetadata = {
            gameCharacterId,
            modelFolderName,
            sourceModelUrl: modelUrl,
            rigTaskId: rigResult.taskId,
            idleTaskId: idleResult.taskId,
            runTaskId: runResult.taskId,
            processedAt: new Date().toISOString(),
            files: {
                rigged: `${gameCharacterId}_rigged.glb`,
                idle: `${gameCharacterId}_idle.glb`,
                run: `${gameCharacterId}_run.glb`
            }
        };

        fs.writeFileSync(
            path.join(charOutputDir, 'processing_metadata.json'),
            JSON.stringify(processMetadata, null, 2)
        );

        console.log(`✓ ${gameCharacterId} complete!`);
        return processMetadata;

    } catch (error) {
        console.log(`  ✗ Error processing ${gameCharacterId}: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('RIG AND ANIMATE ALL CHARACTERS');
    console.log('='.repeat(60));
    console.log(`\nSource models: ${MODELS_DIR}`);
    console.log(`Output directory: ${OUTPUT_DIR}\n`);
    console.log(`Characters to process: ${Object.keys(CHARACTER_MAPPING).length}\n`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const results = [];

    for (const [gameCharId, modelFolder] of Object.entries(CHARACTER_MAPPING)) {
        const result = await processCharacter(gameCharId, modelFolder);
        if (result) {
            results.push(result);
        }
    }

    // Save summary
    const summary = {
        processedAt: new Date().toISOString(),
        totalCharacters: Object.keys(CHARACTER_MAPPING).length,
        successful: results.length,
        failed: Object.keys(CHARACTER_MAPPING).length - results.length,
        characters: results
    };

    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'processing_summary.json'),
        JSON.stringify(summary, null, 2)
    );

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total characters: ${summary.totalCharacters}`);
    console.log(`Successfully processed: ${summary.successful}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`\nAll processed models saved to: ${OUTPUT_DIR}`);
}

main().catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
});
