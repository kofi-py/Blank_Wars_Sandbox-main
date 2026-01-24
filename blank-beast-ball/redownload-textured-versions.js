#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const MODELS_DIR = '/Users/gabrielgreenstein/blank-wars-clean/models';

const FAILED_MODELS = {
    tesla: 'Tesla',
    agent_x: 'Agent X',
    fenrir: 'Fenrir',
    the_warrior_king: 'The Warrior King',
    monsters_midnight_stroll: "Monster's Midnight Stroll",
    warrior_of_the_skies: 'Warrior of the Skies'
};

async function fetchTasks() {
    return new Promise((resolve, reject) => {
        const url = 'https://api.meshy.ai/web/v2/tasks?pageNum=1&pageSize=200&sortBy=-created_at&phases=texture';
        https.get(url, {
            headers: { 'Authorization': `Bearer ${MESHY_API_KEY}` }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
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

async function main() {
    console.log('Fetching textured models from Meshy...\n');

    const response = await fetchTasks();
    const tasks = response.result || [];

    console.log(`Found ${tasks.length} texture-phase tasks\n`);

    for (const [folderName, promptName] of Object.entries(FAILED_MODELS)) {
        console.log(`\nSearching for: ${promptName} (${folderName})`);

        const task = tasks.find(t =>
            t.status === 'SUCCEEDED' &&
            t.phase === 'texture' &&
            t.args?.draft?.prompt?.toLowerCase().includes(promptName.toLowerCase())
        );

        if (!task) {
            console.log(`  ✗ No textured version found`);
            continue;
        }

        const modelUrl = task.result?.texture?.modelUrl;
        if (!modelUrl) {
            console.log(`  ✗ No model URL in texture result`);
            continue;
        }

        const charDir = path.join(MODELS_DIR, folderName);
        const outputPath = path.join(charDir, `${folderName}_textured.glb`);

        console.log(`  ✓ Found textured version (task: ${task.id.substring(0,8)}...)`);
        console.log(`  Downloading...`);

        try {
            await downloadFile(modelUrl, outputPath);
            console.log(`  ✓ Downloaded to ${outputPath}`);

            // Update metadata
            const metadataPath = path.join(charDir, 'metadata_textured.json');
            fs.writeFileSync(metadataPath, JSON.stringify({
                taskId: task.id,
                phase: task.phase,
                mode: task.mode,
                status: task.status,
                prompt: promptName,
                modelUrl,
                downloadedAt: new Date().toISOString()
            }, null, 2));

        } catch (error) {
            console.log(`  ✗ Download failed: ${error.message}`);
        }
    }

    console.log('\n\nDone!');
}

main().catch(console.error);
