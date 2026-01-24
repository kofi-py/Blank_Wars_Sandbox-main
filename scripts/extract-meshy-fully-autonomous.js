#!/usr/bin/env node

/**
 * Fully Autonomous Meshy Extractor
 * Handles everything including navigating to the page and refreshing
 */

const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = process.env.MESHY_API_KEY || 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const OUTPUT_DIR = path.join(__dirname, '..', 'models');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function runAppleScript(script) {
    try {
        const result = execSync(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`, { encoding: 'utf-8' });
        return result.trim();
    } catch (error) {
        console.error('AppleScript error:', error.message);
        return null;
    }
}

async function makeApiRequest(apiPath) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.meshy.ai',
            path: apiPath,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${MESHY_API_KEY}` }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: 'Parse error', raw: data });
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
            file.on('finish', () => file.close(() => resolve(outputPath)));
        }).on('error', reject);
    });
}

async function main() {
    console.log('=== Fully Autonomous Meshy Model Extractor ===\n');

    // Step 1: Switch to Meshy tab or navigate to My Assets
    console.log('Step 1: Navigating to Meshy My Assets...');
    const navScript = `
        const safari = Application('Safari');
        safari.activate();
        if (safari.windows.length === 0) {
            safari.Document().make();
        }
        safari.windows[0].currentTab.url = 'https://app.meshy.ai/my-assets';
        'navigated';
    `;
    runAppleScript(navScript);
    console.log('  Waiting 5 seconds for page to load...');
    await sleep(5000);

    // Step 2: Install network capture hook
    console.log('\nStep 2: Installing network capture hook...');
    const hookScript = `
        const safari = Application('Safari');
        const script = \`
        (function() {
            if (window.__meshyNetworkCapture) {
                return 'already installed';
            }
            window.__meshyNetworkCapture = { requests: [], started: new Date().toISOString() };
            const origFetch = window.fetch;
            window.fetch = function(...args) {
                const url = args[0];
                const capture = { type: 'fetch', url: typeof url === 'string' ? url : url.url, timestamp: new Date().toISOString() };
                return origFetch.apply(this, args).then(response => {
                    const cloned = response.clone();
                    if (capture.url.includes('meshy.ai')) {
                        cloned.text().then(body => {
                            capture.status = response.status;
                            capture.bodyPreview = body.substring(0, 1000);
                            window.__meshyNetworkCapture.requests.push(capture);
                        }).catch(() => {});
                    }
                    return response;
                });
            };
            const origOpen = XMLHttpRequest.prototype.open;
            const origSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                this.__captureInfo = { type: 'xhr', method: method, url: url, timestamp: new Date().toISOString() };
                return origOpen.call(this, method, url, ...rest);
            };
            XMLHttpRequest.prototype.send = function(...args) {
                if (this.__captureInfo && this.__captureInfo.url.includes('meshy.ai')) {
                    const info = this.__captureInfo;
                    this.addEventListener('load', function() {
                        info.status = this.status;
                        info.responsePreview = this.responseText.substring(0, 1000);
                        window.__meshyNetworkCapture.requests.push(info);
                    });
                }
                return origSend.apply(this, args);
            };
            return 'installed';
        })();
        \`;
        safari.doJavaScript(script, {in: safari.windows[0].currentTab});
    `;
    const hookResult = runAppleScript(hookScript);
    console.log(`  Hook result: ${hookResult}`);

    // Step 3: Refresh the page to capture network requests
    console.log('\nStep 3: Refreshing page to trigger API calls...');
    const refreshScript = `
        const safari = Application('Safari');
        const se = Application('System Events');
        safari.activate();
        delay(0.5);
        se.keystroke('r', {using: 'command down'});
        'refreshed';
    `;
    runAppleScript(refreshScript);
    console.log('  Waiting 15 seconds for page to fully load and API calls to complete...');
    await sleep(15000);

    // Step 4: Retrieve network requests
    console.log('\nStep 4: Retrieving captured network data...');
    const getNetworkScript = `
        const safari = Application('Safari');
        const script = \`
        (function() {
            if (!window.__meshyNetworkCapture) {
                return JSON.stringify({error: 'Not installed'});
            }
            return JSON.stringify(window.__meshyNetworkCapture, null, 2);
        })();
        \`;
        safari.doJavaScript(script, {in: safari.windows[0].currentTab});
    `;
    const networkDataRaw = runAppleScript(getNetworkScript);

    let networkData;
    try {
        networkData = JSON.parse(networkDataRaw);
    } catch (e) {
        console.error('  Failed to parse network data');
        networkData = { requests: [] };
    }

    console.log(`  Captured ${networkData.requests ? networkData.requests.length : 0} requests`);

    // Extract task IDs from network requests
    const taskIdsFromNetwork = new Set();
    if (networkData.requests) {
        for (const req of networkData.requests) {
            console.log(`  Request: ${req.url}`);
            // Extract UUIDs from URLs
            const matches = req.url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi);
            if (matches) {
                matches.forEach(id => taskIdsFromNetwork.add(id));
            }
            // Also check response body
            if (req.bodyPreview || req.responsePreview) {
                const body = req.bodyPreview || req.responsePreview;
                const bodyMatches = body.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi);
                if (bodyMatches) {
                    bodyMatches.forEach(id => taskIdsFromNetwork.add(id));
                }
            }
        }
    }

    console.log(`\n  Extracted ${taskIdsFromNetwork.size} unique task IDs from network`);

    // Step 5: Also extract from page DOM
    console.log('\nStep 5: Extracting task IDs from page DOM...');
    const domExtractScript = `
        const safari = Application('Safari');
        const script = \`
        (function() {
            const taskIds = new Set();
            const images = document.querySelectorAll('img[src*="meshy"], img[src*="task"]');
            images.forEach(img => {
                const match = img.src.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
                if (match) taskIds.add(match[1]);
            });
            const links = document.querySelectorAll('a[href*="task"], a[href*="meshy"]');
            links.forEach(link => {
                const match = link.href.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
                if (match) taskIds.add(match[1]);
            });
            return JSON.stringify(Array.from(taskIds));
        })();
        \`;
        safari.doJavaScript(script, {in: safari.windows[0].currentTab});
    `;
    const domIdsRaw = runAppleScript(domExtractScript);
    let domIds = [];
    try {
        domIds = JSON.parse(domIdsRaw);
    } catch (e) {}

    domIds.forEach(id => taskIdsFromNetwork.add(id));
    console.log(`  Total unique IDs: ${taskIdsFromNetwork.size}`);

    const allTaskIds = Array.from(taskIdsFromNetwork);

    // Step 6: Validate each task ID
    console.log('\nStep 6: Validating task IDs via Meshy API...\n');
    const validTasks = [];
    const endpoints = [
        '/openapi/v2/text-to-3d/',
        '/v1/image-to-3d/',
        '/openapi/v1/rigging/',
        '/openapi/v1/animations/'
    ];

    for (const taskId of allTaskIds) {
        console.log(`  Checking ${taskId}...`);
        for (const endpoint of endpoints) {
            try {
                const response = await makeApiRequest(`${endpoint}${taskId}`);
                if (response && !response.error && response.status && response.model_urls) {
                    console.log(`    ✓ Valid at ${endpoint}`);
                    validTasks.push({
                        taskId,
                        endpoint,
                        data: response
                    });
                    break;
                }
            } catch (e) {}
        }
    }

    console.log(`\n✓ Found ${validTasks.length} valid model tasks`);

    if (validTasks.length === 0) {
        console.log('\nNo valid models found. Saving debug data...');
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'network_debug.json'),
            JSON.stringify({ networkData, allTaskIds }, null, 2)
        );
        console.log(`Debug data saved to ${path.join(OUTPUT_DIR, 'network_debug.json')}`);
        return;
    }

    // Step 7: Download models
    console.log('\nStep 7: Downloading models...\n');
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    for (const task of validTasks) {
        const { taskId, endpoint, data } = task;

        if (data.status !== 'SUCCEEDED') {
            console.log(`  Skipping ${taskId} (status: ${data.status})`);
            continue;
        }

        const modelUrls = data.model_urls;
        const glbUrl = modelUrls.glb || modelUrls.obj || modelUrls.usdz;

        if (!glbUrl) {
            console.log(`  Skipping ${taskId} (no download URL)`);
            continue;
        }

        const name = (data.prompt || data.name || taskId).toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 50);
        const charDir = path.join(OUTPUT_DIR, name);
        fs.mkdirSync(charDir, { recursive: true });

        const ext = glbUrl.includes('.glb') ? 'glb' : glbUrl.includes('.obj') ? 'obj' : 'usdz';
        const outputPath = path.join(charDir, `${name}.${ext}`);

        console.log(`  Downloading ${name}...`);
        try {
            await downloadFile(glbUrl, outputPath);
            console.log(`    ✓ Saved to ${outputPath}`);

            // Save metadata
            fs.writeFileSync(path.join(charDir, 'metadata.json'), JSON.stringify({
                taskId,
                endpoint,
                downloadedAt: new Date().toISOString(),
                modelUrls,
                prompt: data.prompt || data.name
            }, null, 2));
        } catch (error) {
            console.log(`    ✗ Error: ${error.message}`);
        }
    }

    console.log('\n=== Complete ===');
    console.log(`Downloaded ${validTasks.length} models to ${OUTPUT_DIR}`);
}

main().catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
});
