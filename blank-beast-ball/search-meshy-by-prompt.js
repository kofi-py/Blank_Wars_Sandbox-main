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

async function searchMeshyModels(searchTerm) {
    console.log(`Searching for models containing: "${searchTerm}"\n`);

    try {
        // Get all text-to-3d tasks
        const response = await makeRequest(
            MESHY_API_BASE,
            'GET',
            '/openapi/v2/text-to-3d?pageSize=100&sortBy=-created_at',
            {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        );

        const tasks = response;
        if (!tasks || tasks.length === 0) {
            console.log('No tasks found');
            return;
        }

        console.log(`Found ${tasks.length} total tasks\n`);

        // Search in prompts
        const matches = tasks.filter(task =>
            (task.prompt && task.prompt.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (task.name && task.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (matches.length === 0) {
            console.log(`No models found matching "${searchTerm}"`);
            console.log('\nShowing first 10 prompts to help you search:\n');
            tasks.slice(0, 10).forEach((task, i) => {
                console.log(`${i + 1}. ${task.prompt?.substring(0, 100) || 'No prompt'}...`);
                console.log(`   ID: ${task.id}`);
                console.log(`   Mode: ${task.mode}`);
                console.log('');
            });
            return;
        }

        console.log(`Found ${matches.length} matching models:\n`);

        matches.forEach((task, index) => {
            console.log(`${index + 1}. Prompt: ${task.prompt?.substring(0, 100) || 'No prompt'}...`);
            console.log(`   ID: ${task.id}`);
            console.log(`   Mode: ${task.mode}`);
            console.log(`   Status: ${task.status}`);
            console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);

            if (task.mode === 'refine' && task.model_urls && task.texture_urls) {
                console.log(`   ✅ HAS TEXTURES - GLB URL: ${task.model_urls.glb?.substring(0, 60)}...`);
            }
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Get search term from command line
const searchTerm = process.argv[2] || 'merlin';
searchMeshyModels(searchTerm);
