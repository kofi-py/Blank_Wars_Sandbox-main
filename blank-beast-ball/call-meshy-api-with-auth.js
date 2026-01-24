const https = require('https');
const fs = require('fs');

// This will use Safari's cookies if you paste them here
// Or just try different workspace/assets endpoints with the API key

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';

const endpoints = [
    '/v2/workspace/assets',
    '/v2/workspace/models',
    '/v2/assets',
    '/v2/models',
    '/openapi/v2/workspace',
    '/openapi/v2/workspace/assets',
    '/openapi/v2/assets',
    '/openapi/v2/models',
    '/openapi/v1/workspace',
    '/openapi/v1/workspace/assets',
    '/openapi/v1/assets',
    '/openapi/v1/models'
];

async function tryEndpoint(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: API_BASE,
            path: path + '?page_size=200',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.message && json.message.includes('NoMatchingRoute')) {
                        console.log(`✗ ${path} - Not found`);
                        resolve(null);
                    } else if (Array.isArray(json)) {
                        console.log(`✓ ${path} - Found ${json.length} items`);
                        resolve({ path, data: json });
                    } else if (json.result) {
                        console.log(`✓ ${path} - Found data with result key`);
                        resolve({ path, data: json });
                    } else {
                        console.log(`? ${path} - Unknown response:`, JSON.stringify(json).substring(0, 100));
                        resolve({ path, data: json });
                    }
                } catch (e) {
                    console.log(`✗ ${path} - Invalid JSON`);
                    resolve(null);
                }
            });
        });

        req.on('error', (e) => {
            console.log(`✗ ${path} - Error: ${e.message}`);
            resolve(null);
        });

        req.end();
    });
}

async function findWorkingEndpoint() {
    console.log('Trying all possible workspace/assets endpoints...\n');

    const results = [];
    for (const endpoint of endpoints) {
        const result = await tryEndpoint(endpoint);
        if (result && result.data) {
            results.push(result);
        }
    }

    if (results.length > 0) {
        console.log('\n✓ Found working endpoints!');
        results.forEach(r => {
            console.log(`\n${r.path}:`);
            fs.writeFileSync(`meshy-data-${r.path.replace(/\//g, '_')}.json`, JSON.stringify(r.data, null, 2));
            console.log(`  Saved to meshy-data-${r.path.replace(/\//g, '_')}.json`);
        });
    } else {
        console.log('\n✗ No working endpoints found');
    }
}

findWorkingEndpoint().catch(console.error);
