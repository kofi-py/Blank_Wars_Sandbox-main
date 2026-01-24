const { execSync } = require('child_process');
const fs = require('fs');

// Use osascript to control Safari and extract network data
const script = `
tell application "Safari"
    activate
    delay 1

    -- Get current URL to verify we're on Meshy
    set currentURL to URL of current tab of window 1

    -- Open Web Inspector
    tell application "System Events"
        keystroke "i" using {command down, option down}
        delay 2

        -- Click Network tab (assuming standard position)
        -- This is a best effort - may need adjustment

        -- Refresh the page to capture network requests
        keystroke "r" using {command down}
        delay 5
    end tell

    return currentURL
end tell
`;

try {
    console.log('Attempting to control Safari and capture network data...');

    // This won't work perfectly but let's try
    const result = execSync(`osascript -e '${script.replace(/'/g, "\\'")}'`, { encoding: 'utf8' });
    console.log('Safari URL:', result.trim());

    console.log('\nSince direct network capture requires Safari Extensions or browser automation,');
    console.log('trying alternative: Reading Safari debug logs...');

} catch (error) {
    console.log('Safari automation failed. Trying alternative approach...');
}

// Alternative: Use Chrome DevTools Protocol with Safari
// Safari 16.4+ supports CDP
const cdpScript = `
const CDP = require('chrome-remote-interface');

async function captureSafariNetwork() {
    try {
        const client = await CDP({ port: 9222 }); // Safari Remote Debugging port
        const { Network, Page } = client;

        const requests = [];

        await Network.enable();

        Network.responseReceived((params) => {
            if (params.response.url.includes('meshy.ai')) {
                console.log('Captured:', params.response.url);
                requests.push(params);
            }
        });

        await Page.navigate({ url: 'https://app.meshy.ai/my-assets' });

        setTimeout(() => {
            fs.writeFileSync('safari-network-data.json', JSON.stringify(requests, null, 2));
            console.log('Saved network data');
            client.close();
        }, 10000);

    } catch (error) {
        console.log('CDP connection failed:', error.message);
        console.log('\\nFalling back to HAR file parsing...');
    }
}

captureSafariNetwork();
`;

// Check if chrome-remote-interface is available
try {
    require.resolve('chrome-remote-interface');
    console.log('\nAttempting CDP connection to Safari...');
    eval(cdpScript);
} catch (e) {
    console.log('\nCDP not available. Installing and trying HAR export method...');

    // Final fallback: Parse Safari's Web Inspector export
    const harParser = `
const fs = require('fs');

// Instructions for user to export HAR file
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  AUTOMATED HAR FILE EXTRACTION                              ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log('In Safari:');
console.log('1. Go to https://app.meshy.ai/my-assets');
console.log('2. Open Web Inspector (Cmd+Option+I)');
console.log('3. Go to Network tab');
console.log('4. Refresh the page (Cmd+R)');
console.log('5. Right-click any request → Export HAR');
console.log('6. Save as: meshy-network.har in this directory');
console.log('');
console.log('Then run: node parse-har.js');
console.log('');

// Create the HAR parser
const parserCode = \`
const fs = require('fs');

if (!fs.existsSync('meshy-network.har')) {
    console.log('❌ meshy-network.har not found');
    console.log('Please export from Safari Web Inspector first');
    process.exit(1);
}

const har = JSON.parse(fs.readFileSync('meshy-network.har', 'utf8'));
const taskIds = {};

har.log.entries.forEach(entry => {
    const url = entry.request.url;

    // Look for Meshy API calls
    if (url.includes('api.meshy.ai') && entry.response.content.text) {
        try {
            const data = JSON.parse(entry.response.content.text);

            // Extract task IDs from responses
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item.id && item.name) {
                        taskIds[item.name || item.id] = item.id;
                    }
                });
            } else if (data.result && Array.isArray(data.result)) {
                data.result.forEach(item => {
                    if (item.id && item.name) {
                        taskIds[item.name || item.id] = item.id;
                    }
                });
            } else if (data.id) {
                taskIds[data.name || data.id] = data.id;
            }
        } catch (e) {
            // Not JSON
        }
    }
});

console.log('\\n✓ Found task IDs:', Object.keys(taskIds).length);
console.log(JSON.stringify(taskIds, null, 2));

fs.writeFileSync('meshy-task-ids.json', JSON.stringify(taskIds, null, 2));
console.log('\\n✓ Saved to meshy-task-ids.json');
\`;

fs.writeFileSync('parse-har.js', parserCode);
console.log('✓ Created parse-har.js');
`;

    eval(harParser);
}
