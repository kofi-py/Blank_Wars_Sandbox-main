const https = require('https');

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

async function main() {
    console.log('Fetching all Meshy text-to-3d tasks...\n');

    try {
        const response = await makeRequest(
            MESHY_API_BASE,
            'GET',
            '/openapi/v2/text-to-3d?pageSize=50&sortBy=-created_at',
            {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        );

        console.log('Full response:', JSON.stringify(response, null, 2));

        if (response.result && response.result.length) {
            console.log(`\nFound ${response.result.length} tasks\n`);

            // List all tasks with their names and IDs
            response.result.forEach((task, index) => {
                console.log(`${index + 1}. Name: ${task.name || 'Unnamed'}`);
                console.log(`   ID: ${task.id}`);
                console.log(`   Mode: ${task.mode}`);
                console.log(`   Status: ${task.status}`);
                console.log(`   Created: ${task.created_at}`);
                console.log('');
            });
        } else {
            console.log('No tasks found or unexpected response format');
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
