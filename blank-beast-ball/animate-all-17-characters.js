#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const MESHY_API_BASE = 'api.meshy.ai';
const MODELS_DIR = path.join(__dirname, '..', 'models');
const OUTPUT_DIR = path.join(__dirname, 'models');

// Complete mapping for all 17 game characters
const CHARACTER_MAPPING = {
    achilles: 'achilles',  // Already done
    merlin: 'arcane_sorcerer',  // Already done
    cleopatra: 'cleopatra',  // Already done
    holmes: 'sherlock',  // Already done
    dracula: 'dracula',  // Already done
    tesla: 'tesla',  // Needs retry
    space_cyborg: 'space_cyborg',  // Already done
    agent_x: 'agent_x',  // Needs retry
    sam_spade: 'sam_spade',  // Already done
    fenrir: 'fenrir',  // Needs retry
    joan: 'valors_flame',  // NEW
    robin_hood: 'forest_archer',  // NEW
    billy_the_kid: 'night_of_the_lone_ranger',  // NEW
    genghis_khan: 'the_warrior_king',  // NEW
    frankenstein_monster: 'monsters_midnight_stroll',  // NEW
    rilak_trelkar: 'rilak_trelkar',  // NEW (formerly zeta)
    sun_wukong: 'warrior_of_the_skies'  // NEW
};

const ANIMATIONS = {
    idle: 0,
    run: 16
};

const ALREADY_DONE = ['achilles', 'merlin', 'cleopatra', 'holmes', 'dracula', 'space_cyborg', 'sam_spade', 'joan', 'robin_hood', 'billy_the_kid', 'rilak_trelkar'];

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
            if (error.message.includes('404') && i < 5) {
                // Task may not be registered yet, wait
            } else {
                throw error;
            }
        }

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
    console.log(`  Adding ${animationName} animation...`);

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
    console.log(`Processing: ${gameCharacterId.toUpperCase()}`);
    console.log('='.repeat(60));

    const metadataPath = path.join(MODELS_DIR, modelFolderName, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
        console.log(`  ✗ No metadata for ${modelFolderName}`);
        return false;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const modelUrl = metadata.modelUrl;

    try {
        const rigResult = await rigModel(modelUrl, gameCharacterId);

        for (const [animName, actionId] of Object.entries(ANIMATIONS)) {
            const animResult = await addAnimation(rigResult.taskId, actionId, animName, gameCharacterId);
            const animPath = path.join(OUTPUT_DIR, `${gameCharacterId}_${animName}.glb`);
            await downloadFile(animResult.glbUrl, animPath);
            console.log(`  ✓ ${animName} saved`);
        }

        console.log(`✓ ${gameCharacterId} complete!`);
        return true;
    } catch (error) {
        console.log(`  ✗ Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('ANIMATE ALL 17 CHARACTERS');
    console.log('='.repeat(60));
    console.log(`\nTotal characters: ${Object.keys(CHARACTER_MAPPING).length}`);
    console.log(`Already done: ${ALREADY_DONE.length}`);
    console.log(`To process: ${Object.keys(CHARACTER_MAPPING).length - ALREADY_DONE.length}\n`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const [gameCharId, modelFolder] of Object.entries(CHARACTER_MAPPING)) {
        if (ALREADY_DONE.includes(gameCharId)) {
            console.log(`\nSkipping ${gameCharId} (already done)`);
            skipped++;
            continue;
        }

        if (await processCharacter(gameCharId, modelFolder)) {
            success++;
        } else {
            failed++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Success: ${success}, Failed: ${failed}, Skipped: ${skipped}`);
    console.log(`sun_wukong: MISSING MODEL - needs to be generated`);
}

main().catch(console.error);
