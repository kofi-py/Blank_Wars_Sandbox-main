#!/usr/bin/env node

/**
 * Autonomous Meshy Model Extractor
 *
 * This script automates the extraction of model task IDs from Meshy's My Assets page
 * and downloads them via the Meshy API.
 *
 * Requirements:
 * - Safari with "Allow JavaScript from Apple Events" enabled
 * - User must have https://app.meshy.ai/my-assets open in Safari
 * - MESHY_API_KEY environment variable set
 */

const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = process.env.MESHY_API_KEY || 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '..', 'models');

function execAppleScript(scriptPath) {
    try {
        const result = execSync(`osascript -l JavaScript "${scriptPath}"`, { encoding: 'utf-8' });
        return result.trim();
    } catch (error) {
        console.error('AppleScript error:', error.message);
        return null;
    }
}

function makeApiRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.meshy.ai',
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${MESHY_API_KEY}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        req.end();
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
            file.on('finish', () => {
                file.close(() => resolve(outputPath));
            });
        }).on('error', reject);
    });
}

async function validateTaskId(taskId) {
    console.log(`  Validating ${taskId}...`);

    // Try different endpoints
    const endpoints = [
        `/openapi/v2/text-to-3d/${taskId}`,
        `/v1/image-to-3d/${taskId}`,
        `/openapi/v1/rigging/${taskId}`,
        `/openapi/v1/animations/${taskId}`
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await makeApiRequest(endpoint);
            if (response && response.status && response.model_urls) {
                console.log(`    ✓ Valid model task at ${endpoint}`);
                return {
                    valid: true,
                    endpoint: endpoint,
                    data: response
                };
            }
        } catch (e) {
            // Continue trying other endpoints
        }
    }

    return { valid: false };
}

async function downloadModel(taskInfo, characterName) {
    const { endpoint, data } = taskInfo;

    if (data.status !== 'SUCCEEDED') {
        console.log(`    ⚠ Task status: ${data.status}, skipping download`);
        return null;
    }

    const modelUrls = data.model_urls;
    const glbUrl = modelUrls.glb || modelUrls.obj || modelUrls.usdz;

    if (!glbUrl) {
        console.log(`    ⚠ No downloadable model URL found`);
        return null;
    }

    // Create output directory
    const charDir = path.join(OUTPUT_DIR, characterName);
    fs.mkdirSync(charDir, { recursive: true });

    const ext = glbUrl.includes('.glb') ? 'glb' : glbUrl.includes('.obj') ? 'obj' : 'usdz';
    const outputPath = path.join(charDir, `${characterName}_base.${ext}`);

    console.log(`    Downloading to ${outputPath}...`);
    await downloadFile(glbUrl, outputPath);
    console.log(`    ✓ Downloaded successfully`);

    // Save metadata
    const metadataPath = path.join(charDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify({
        taskId: data.id,
        endpoint: endpoint,
        downloadedAt: new Date().toISOString(),
        modelUrls: modelUrls,
        prompt: data.prompt || data.name || 'unknown'
    }, null, 2));

    return outputPath;
}

async function main() {
    console.log('=== Autonomous Meshy Model Extractor ===\n');

    // Step 0: Verify we're on the Meshy page
    console.log('Step 0: Verifying Safari is on Meshy My Assets page...');
    const checkUrlScript = `
    const safari = Application('Safari');
    if (safari.windows.length === 0) {
        JSON.stringify({error: 'No windows'});
    } else {
        const url = safari.windows[0].currentTab.url();
        JSON.stringify({url: url});
    }
    `;

    const urlCheck = execSync(`osascript -l JavaScript -e '${checkUrlScript.replace(/'/g, "'\\''")}'`, {encoding: 'utf-8'}).trim();
    let urlInfo;
    try {
        urlInfo = JSON.parse(urlCheck);
    } catch (e) {
        console.error('Could not check Safari URL');
        process.exit(1);
    }

    if (!urlInfo.url || !urlInfo.url.includes('meshy.ai')) {
        console.error(`  Error: Safari is not on Meshy page.`);
        console.error(`  Current URL: ${urlInfo.url}`);
        console.error(`  Please open https://app.meshy.ai/my-assets in Safari first.`);
        process.exit(1);
    }
    console.log(`  ✓ Confirmed on Meshy: ${urlInfo.url}\n`);

    // Step 1: Install network capture hook
    console.log('Step 1: Installing network capture hook in Safari...');
    const captureScript = path.join(__dirname, 'capture-meshy-network.scpt');
    const hookResult = execAppleScript(captureScript);
    if (!hookResult) {
        console.error('Failed to install network hook. Make sure Safari is open with My Assets page.');
        process.exit(1);
    }
    console.log('  Network hook installed\n');

    // Step 2: Wait for user to refresh/navigate
    console.log('Step 2: Please refresh the Meshy My Assets page in Safari now.');
    console.log('  Waiting 10 seconds for page to load and API calls to complete...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 2.5: Get captured network requests
    console.log('Step 2.5: Retrieving captured network requests...');
    const networkScript = path.join(__dirname, 'get-captured-network.scpt');
    const networkResult = execAppleScript(networkScript);
    let networkData = null;
    if (networkResult) {
        try {
            networkData = JSON.parse(networkResult);
            console.log(`  Captured ${networkData.requests ? networkData.requests.length : 0} network requests\n`);

            // Extract task IDs from network requests
            if (networkData.requests) {
                for (const req of networkData.requests) {
                    console.log(`  Network request: ${req.method || 'GET'} ${req.url.substring(0, 100)}`);
                }
            }
        } catch (e) {
            console.log('  Could not parse network data\n');
        }
    }

    // Step 3: Extract task IDs from the page
    console.log('Step 3: Extracting task IDs from page and network...');
    const extractScript = path.join(__dirname, 'extract-meshy-task-ids.scpt');
    const extractResult = execAppleScript(extractScript);

    if (!extractResult) {
        console.error('Failed to extract task IDs');
        process.exit(1);
    }

    let taskIds;
    try {
        taskIds = JSON.parse(extractResult);
    } catch (e) {
        console.error('Failed to parse extraction result:', extractResult);
        process.exit(1);
    }

    if (taskIds.error) {
        console.error('Error:', taskIds.error);
        process.exit(1);
    }

    console.log(`  Found ${taskIds.length} potential task IDs\n`);

    // Step 4: Validate each task ID via API
    console.log('Step 4: Validating task IDs via Meshy API...');
    const validTasks = [];

    for (const item of taskIds) {
        const validation = await validateTaskId(item.id);
        if (validation.valid) {
            validTasks.push({
                ...item,
                ...validation
            });
        }
    }

    console.log(`  ${validTasks.length} valid model tasks found\n`);

    if (validTasks.length === 0) {
        console.log('No valid model tasks found. The extracted IDs may not be model task IDs.');
        console.log('Try scrolling through the My Assets page to ensure all models are loaded.\n');

        // Save raw extraction for debugging
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'extracted_ids_debug.json'),
            JSON.stringify(taskIds, null, 2)
        );
        console.log(`Debug info saved to ${path.join(OUTPUT_DIR, 'extracted_ids_debug.json')}`);
        process.exit(0);
    }

    // Step 5: Download valid models
    console.log('Step 5: Downloading models...\n');
    const downloads = [];

    for (const task of validTasks) {
        const characterName = task.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        console.log(`Downloading: ${task.name} (${task.id})`);

        try {
            const filePath = await downloadModel(task, characterName);
            if (filePath) {
                downloads.push({ name: task.name, path: filePath });
            }
        } catch (error) {
            console.error(`  ✗ Error downloading ${task.name}:`, error.message);
        }
        console.log();
    }

    // Summary
    console.log('=== Summary ===');
    console.log(`Total task IDs extracted: ${taskIds.length}`);
    console.log(`Valid model tasks: ${validTasks.length}`);
    console.log(`Successfully downloaded: ${downloads.length}`);
    console.log(`\nModels saved to: ${OUTPUT_DIR}`);

    // Save manifest
    const manifest = {
        extractedAt: new Date().toISOString(),
        totalExtracted: taskIds.length,
        validTasks: validTasks.length,
        downloads: downloads
    };
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'download_manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
