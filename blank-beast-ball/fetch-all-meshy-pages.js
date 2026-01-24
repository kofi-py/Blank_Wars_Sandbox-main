const https = require('https');
const fs = require('fs');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const MESHY_API_BASE = 'api.meshy.ai';

function makeRequest(hostname, method, apiPath, headers) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: hostname,
            path: apiPath,
            method: method,
            headers: headers
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    resolve(data);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function getAllTasksAllPages() {
    console.log('Fetching ALL Meshy tasks across all pages...\n');

    const allTasks = [];
    let pageNum = 1;
    let hasMore = true;

    while (hasMore) {
        console.log(`Fetching page ${pageNum}...`);

        const response = await makeRequest(
            MESHY_API_BASE,
            'GET',
            `/v2/text-to-3d?page_size=50&page_num=${pageNum}`,
            {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        );

        if (Array.isArray(response) && response.length > 0) {
            allTasks.push(...response);
            console.log(`  Found ${response.length} tasks on page ${pageNum}`);
            pageNum++;
        } else {
            hasMore = false;
            console.log(`  No more tasks found`);
        }
    }

    console.log(`\nTotal tasks found: ${allTasks.length}\n`);

    // Save all tasks to file
    fs.writeFileSync('all-meshy-tasks.json', JSON.stringify(allTasks, null, 2));
    console.log('Saved all tasks to all-meshy-tasks.json\n');

    // List unique prompts
    const uniquePrompts = new Set();
    allTasks.forEach(task => {
        const promptSnippet = task.prompt.substring(0, 80);
        uniquePrompts.add(promptSnippet);
    });

    console.log('Unique model types:');
    uniquePrompts.forEach(prompt => {
        console.log(`  - ${prompt}...`);
    });
}

getAllTasksAllPages().catch(console.error);
