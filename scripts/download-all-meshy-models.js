#!/usr/bin/env node

/**
 * Download All Meshy Models
 * Uses the /web/v2/tasks endpoint that the Meshy frontend uses
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = process.env.MESHY_API_KEY || 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '..', 'models');

async function fetchTasks(pageNum = 1, pageSize = 200) {
    return new Promise((resolve, reject) => {
        const url = `https://api.meshy.ai/web/v2/tasks?pageNum=${pageNum}&pageSize=${pageSize}&sortBy=-created_at&phases=text-to-image&phases=draft&phases=generate&phases=texture&phases=stylize&phases=animate`;

        https.get(url, {
            headers: { 'Authorization': `Bearer ${MESHY_API_KEY}` }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
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
    console.log('=== Meshy Model Downloader ===\n');
    console.log('Fetching tasks from Meshy API...\n');

    const response = await fetchTasks(1, 200);

    if (!response || !response.result) {
        console.error('Failed to fetch tasks');
        process.exit(1);
    }

    const tasks = response.result;
    console.log(`Found ${tasks.length} tasks\n`);

    // Filter for tasks with downloadable models
    const downloadableTasks = tasks.filter(t => {
        return t.status === 'SUCCEEDED' &&
               t.result &&
               (t.result.generate?.modelUrl || t.result.texture?.modelUrl || t.result.stylize?.modelUrl);
    });

    console.log(`${downloadableTasks.length} tasks have downloadable models\n`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const downloads = [];

    for (const task of downloadableTasks) {
        // Get model URL from the appropriate phase
        let modelUrl = task.result.generate?.modelUrl ||
                      task.result.texture?.modelUrl ||
                      task.result.stylize?.modelUrl;

        if (!modelUrl) continue;

        // Generate a name from prompt or use task ID
        let name = 'unknown';
        if (task.args?.draft?.prompt) {
            name = task.args.draft.prompt;
        } else if (task.args?.texture?.prompt) {
            name = task.args.texture.prompt;
        } else if (task.args?.stylize?.prompt) {
            name = task.args.stylize.prompt;
        }

        name = name.toLowerCase()
                   .replace(/[^a-z0-9\s]/g, '')
                   .replace(/\s+/g, '_')
                   .substring(0, 50) || task.id.substring(0, 8);

        const charDir = path.join(OUTPUT_DIR, name);
        fs.mkdirSync(charDir, { recursive: true });

        const ext = modelUrl.includes('.glb') ? 'glb' :
                   modelUrl.includes('.obj') ? 'obj' :
                   modelUrl.includes('.fbx') ? 'fbx' : 'glb';

        const outputPath = path.join(charDir, `${name}.${ext}`);

        console.log(`Downloading: ${name}`);
        console.log(`  Task ID: ${task.id}`);
        console.log(`  Mode: ${task.mode}`);
        console.log(`  Phase: ${task.phase}`);

        try {
            await downloadFile(modelUrl, outputPath);
            console.log(`  ✓ Saved to ${outputPath}\n`);

            // Save metadata
            const metadata = {
                taskId: task.id,
                mode: task.mode,
                phase: task.phase,
                status: task.status,
                createdAt: new Date(task.createdAt).toISOString(),
                downloadedAt: new Date().toISOString(),
                modelUrl: modelUrl,
                prompt: task.args?.draft?.prompt || task.args?.texture?.prompt || task.args?.stylize?.prompt || '',
                previewUrl: task.result.previewUrl
            };

            fs.writeFileSync(
                path.join(charDir, 'metadata.json'),
                JSON.stringify(metadata, null, 2)
            );

            downloads.push({ name, path: outputPath, taskId: task.id });

        } catch (error) {
            console.log(`  ✗ Error: ${error.message}\n`);
        }
    }

    // Save manifest
    console.log('\n=== Summary ===');
    console.log(`Total tasks: ${tasks.length}`);
    console.log(`Downloadable tasks: ${downloadableTasks.length}`);
    console.log(`Successfully downloaded: ${downloads.length}`);
    console.log(`\nModels saved to: ${OUTPUT_DIR}`);

    const manifest = {
        downloadedAt: new Date().toISOString(),
        totalTasks: tasks.length,
        downloadableTasks: downloadableTasks.length,
        successfulDownloads: downloads.length,
        models: downloads
    };

    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'download_manifest.json'),
        JSON.stringify(manifest, null, 2)
    );

    console.log(`\nManifest saved to: ${path.join(OUTPUT_DIR, 'download_manifest.json')}`);
}

main().catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
});
