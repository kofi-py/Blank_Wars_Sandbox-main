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

async function getAllImageTo3DTasks() {
    console.log('Fetching ALL Image-to-3D tasks...\n');

    try {
        let allTasks = [];
        let pageNum = 1;
        let hasMore = true;

        while (hasMore) {
            console.log(`Fetching page ${pageNum}...`);

            const response = await makeRequest(
                MESHY_API_BASE,
                'GET',
                `/openapi/v1/image-to-3d?page_num=${pageNum}&page_size=50&sort_by=-created_at`,
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

            if (pageNum > 50) break;
        }

        console.log(`\n✅ Total Image-to-3D tasks: ${allTasks.length}\n`);

        if (allTasks.length > 0) {
            fs.writeFileSync(
                '/Users/gabrielgreenstein/blank-wars-clean/blank-beast-ball/all-image-to-3d-tasks.json',
                JSON.stringify(allTasks, null, 2)
            );

            // Show summary
            console.log('Tasks found:');
            allTasks.slice(0, 20).forEach((task, i) => {
                console.log(`${i + 1}. ID: ${task.id}`);
                console.log(`   Name: ${task.name || 'Unnamed'}`);
                console.log(`   Status: ${task.status}`);
                console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
                console.log('');
            });
        } else {
            console.log('No Image-to-3D tasks found.');
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

getAllImageTo3DTasks();
