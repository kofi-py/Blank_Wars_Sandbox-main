#!/usr/bin/env node

/**
 * Add Animations to All Characters
 *
 * This script:
 * 1. Takes the downloaded GLB models
 * 2. Rigs them with Meshy API (preserving textures)
 * 3. Adds idle and run animations
 * 4. Downloads the animated models to the game directory
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

// Animation IDs from Meshy API Guide
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

async function rigModel(modelUrl, textureUrl, characterName) {
    console.log(`  Rigging ${characterName}...`);

    const rigBody = {
        model_url: modelUrl,
        height_meters: 1.8
    };

    // CRITICAL: Include texture URL if available to preserve textures through rigging
    if (textureUrl) {
        rigBody.texture_image_url = textureUrl;
        console.log(`    ✓ Including texture URL to preserve textures`);
    }

    const response = await makeRequest(
        MESHY_API_BASE,
        'POST',
        '/openapi/v1/rigging',
        {
            'Authorization': `Bearer ${MESHY_API_KEY}`,
            'Content-Type': 'application/json'
        },
        rigBody
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
            action_id: actionId  // Use action_id, not animation_type
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

    const modelFolder = path.join(MODELS_DIR, modelFolderName);
    const metadataPath = path.join(modelFolder, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
        console.log(`  ✗ Metadata not found, skipping`);
        return null;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const taskId = metadata.taskId;
    const modelUrl = metadata.modelUrl;

    if (!modelUrl) {
        console.log(`  ✗ No model URL in metadata, skipping`);
        return null;
    }

    // Fetch texture URL from API (CRITICAL for preserving textures)
    let textureUrl = null;
    if (taskId) {
        console.log(`  Fetching texture URL from API for task ${taskId}...`);
        try {
            const taskDetails = await makeRequest(
                MESHY_API_BASE,
                'GET',
                `/web/v2/tasks/${taskId}`,
                { 'Authorization': `Bearer ${MESHY_API_KEY}` }
            );

            // Try to extract texture URL from result
            if (taskDetails.result?.texture?.textureUrl) {
                textureUrl = taskDetails.result.texture.textureUrl;
            } else if (taskDetails.result?.texture_urls?.[0]?.base_color) {
                textureUrl = taskDetails.result.texture_urls[0].base_color;
            }

            if (textureUrl) {
                console.log(`  ✓ Texture URL found!`);
            } else {
                console.log(`  ⚠ Warning: No texture URL in API response, checking if texture is embedded in GLB`);
            }
        } catch (error) {
            console.log(`  ⚠ Warning: Could not fetch texture URL from API: ${error.message}`);
        }
    }

    try {
        // Step 1: Rig the model (with texture preservation)
        const rigResult = await rigModel(modelUrl, textureUrl, gameCharacterId);

        // Step 2: Add all animations (idle, run, jump)
        const animatedModels = {};

        for (const [animName, actionId] of Object.entries(ANIMATIONS)) {
            const animResult = await addAnimation(rigResult.taskId, actionId, animName, gameCharacterId);
            const animPath = path.join(OUTPUT_DIR, `${gameCharacterId}_${animName}.glb`);
            await downloadFile(animResult.glbUrl, animPath);
            console.log(`  ✓ ${animName} animation saved: ${animPath}`);
            animatedModels[animName] = `${gameCharacterId}_${animName}.glb`;
        }

        // Save processing metadata
        const processMetadata = {
            gameCharacterId,
            modelFolderName,
            sourceModelUrl: modelUrl,
            textureUrl,
            rigTaskId: rigResult.taskId,
            processedAt: new Date().toISOString(),
            animations: animatedModels
        };

        fs.writeFileSync(
            path.join(OUTPUT_DIR, `${gameCharacterId}_metadata.json`),
            JSON.stringify(processMetadata, null, 2)
        );

        console.log(`✓ ${gameCharacterId} complete with all animations!`);
        return processMetadata;

    } catch (error) {
        console.log(`  ✗ Error processing ${gameCharacterId}: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('ADD IDLE AND RUN ANIMATIONS TO ALL CHARACTERS');
    console.log('='.repeat(60));
    console.log(`\nSource models: ${MODELS_DIR}`);
    console.log(`Output directory: ${OUTPUT_DIR}\n`);
    console.log(`Characters to process: ${Object.keys(CHARACTER_MAPPING).length}`);
    console.log(`Animations: ${Object.keys(ANIMATIONS).join(', ')}\n`);

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
        animations: Object.keys(ANIMATIONS),
        characters: results
    };

    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'animation_summary.json'),
        JSON.stringify(summary, null, 2)
    );

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total characters: ${summary.totalCharacters}`);
    console.log(`Successfully processed: ${summary.successful}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Animations per character: ${Object.keys(ANIMATIONS).join(', ')}`);
    console.log(`\nAll animated models saved to: ${OUTPUT_DIR}`);
}

main().catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
});
