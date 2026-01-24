
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

console.log('
✓ Found task IDs:', Object.keys(taskIds).length);
console.log(JSON.stringify(taskIds, null, 2));

fs.writeFileSync('meshy-task-ids.json', JSON.stringify(taskIds, null, 2));
console.log('
✓ Saved to meshy-task-ids.json');
