#!/usr/bin/env node

/**
 * Rig and Animate Characters from Local GLB Files
 *
 * This script:
 * 1. Uploads local GLB files to a temporary hosting service
 * 2. Rigs them using Meshy rigging API
 * 3. Adds idle and run animations
 * 4. Downloads the rigged + animated models
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        reject(new Error(`API error (${res.statusCode}): ${parsed.message || data}`));
                    } else {
                        resolve(parsed);
                    }
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

async function uploadToFileIO(filePath) {
    console.log(`    Uploading ${path.basename(filePath)} to file.io...`);

    try {
        const { stdout } = await execAsync(`curl -F "file=@${filePath}" https://file.io`);
        const response = JSON.parse(stdout);

        if (response.success) {
            console.log(`    ✓ Uploaded: ${response.link}`);
            return response.link;
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        throw new Error(`Upload error: ${error.message}`);
    }
}

async function pollTask(taskId, endpoint, maxAttempts = 180) {
    console.log(`    Polling task ${taskId}...`);

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
                throw new Error(`Task failed: ${response.error || 'Unknown error'}`);
            }

            process.stdout.write(`\r    Progress: ${response.progress || 0}%...`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second poll interval
        } catch (error) {
            if (i === maxAttempts - 1) throw error;
            // Continue polling on temporary errors
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
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
        glbUrl: completed.output?.glb || completed.output,
        fbxUrl: completed.output?.fbx
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
        glbUrl: completed.output?.glb || completed.output,
        fbxUrl: completed.output?.fbx
    };
}

async function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                // Handle redirect
                return downloadFile(res.headers.location, outputPath).then(resolve).catch(reject);
            }
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
    const glbPath = path.join(modelFolder, `${modelFolderName}.glb`);

    if (!fs.existsSync(glbPath)) {
        console.log(`  ✗ GLB file not found: ${glbPath}`);
        return null;
    }

    try {
        // Create output directory for this character
        const charOutputDir = path.join(OUTPUT_DIR, gameCharacterId);
        fs.mkdirSync(charOutputDir, { recursive: true });

        // Step 1: Upload the GLB to a temporary host
        const uploadedUrl = await uploadToFileIO(glbPath);

        // Step 2: Rig the model
        const rigResult = await rigModel(uploadedUrl, gameCharacterId);

        // Download rigged model
        const riggedPath = path.join(charOutputDir, `${gameCharacterId}_rigged.glb`);
        await downloadFile(rigResult.glbUrl, riggedPath);
        console.log(`  ✓ Rigged model saved: ${riggedPath}`);

        // Step 3: Add idle animation
        const idleResult = await addAnimation(rigResult.taskId, 'idle', gameCharacterId);
        const idlePath = path.join(charOutputDir, `${gameCharacterId}_idle.glb`);
        await downloadFile(idleResult.glbUrl, idlePath);
        console.log(`  ✓ Idle animation saved: ${idlePath}`);

        // Step 4: Add run animation
        const runResult = await addAnimation(rigResult.taskId, 'run', gameCharacterId);
        const runPath = path.join(charOutputDir, `${gameCharacterId}_run.glb`);
        await downloadFile(runResult.glbUrl, runPath);
        console.log(`  ✓ Run animation saved: ${runPath}`);

        // Save processing metadata
        const processMetadata = {
            gameCharacterId,
            modelFolderName,
            sourceGlbPath: glbPath,
            uploadedUrl,
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
    console.log('RIG AND ANIMATE ALL CHARACTERS (from local files)');
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

        // Add a small delay between characters to avoid rate limiting
        if (results.length < Object.keys(CHARACTER_MAPPING).length) {
            console.log('\n  Waiting 5 seconds before next character...');
            await new Promise(resolve => setTimeout(resolve, 5000));
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
