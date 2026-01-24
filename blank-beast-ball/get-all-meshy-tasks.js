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
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch (e) {
                    reject(new Error(`Parse error: ${responseData}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function getAllTasks() {
    console.log('Fetching ALL Meshy tasks with pagination...\n');

    try {
        let allTasks = [];
        let pageNum = 1;
        let hasMore = true;

        while (hasMore) {
            console.log(`Fetching page ${pageNum}...`);

            const response = await makeRequest(
                MESHY_API_BASE,
                'GET',
                `/openapi/v2/text-to-3d?page_num=${pageNum}&page_size=50&sort_by=-created_at`,
                {
                    'Authorization': `Bearer ${MESHY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            );

            if (Array.isArray(response)) {
                allTasks = allTasks.concat(response);
                console.log(`  Got ${response.length} tasks`);

                if (response.length < 50) {
                    hasMore = false;
                }
                pageNum++;
            } else {
                hasMore = false;
            }

            // Safety limit
            if (pageNum > 50) {
                console.log('Reached page limit (50 pages = 2500 tasks)');
                break;
            }
        }

        console.log(`\n✅ Total tasks fetched: ${allTasks.length}\n`);

        // Save to file
        fs.writeFileSync(
            '/Users/gabrielgreenstein/blank-wars-clean/blank-beast-ball/all-meshy-tasks.json',
            JSON.stringify(allTasks, null, 2)
        );
        console.log('Saved to: all-meshy-tasks.json\n');

        // Find unique prompts to identify character types
        const uniquePrompts = {};
        allTasks.forEach(task => {
            const promptStart = task.prompt?.substring(0, 100) || 'No prompt';
            if (!uniquePrompts[promptStart]) {
                uniquePrompts[promptStart] = [];
            }
            uniquePrompts[promptStart].push({
                id: task.id,
                mode: task.mode,
                status: task.status,
                hasTextures: task.mode === 'refine' && task.texture_urls && task.texture_urls.length > 0
            });
        });

        console.log('Unique character types found:');
        Object.entries(uniquePrompts).forEach(([prompt, tasks]) => {
            const texturedTasks = tasks.filter(t => t.hasTextures);
            console.log(`\n${prompt}...`);
            console.log(`  Total: ${tasks.length} tasks (${texturedTasks.length} with textures)`);
            if (texturedTasks.length > 0) {
                console.log(`  Textured IDs: ${texturedTasks.map(t => t.id).join(', ')}`);
            }
        });

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

getAllTasks();
