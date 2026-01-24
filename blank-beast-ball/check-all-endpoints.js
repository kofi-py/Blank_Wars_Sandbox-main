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

async function checkAllEndpoints() {
    const endpoints = [
        '/v1/image-to-3d',
        '/openapi/v1/image-to-3d',
        '/v2/image-to-3d',
        '/openapi/v2/image-to-3d',
        '/v1/multiimage-to-3d',
        '/openapi/v1/multiimage-to-3d',
        '/v2/multiimage-to-3d',
        '/openapi/v2/multiimage-to-3d',
        '/v1/text-to-voxel',
        '/openapi/v1/text-to-voxel'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`\n=== Checking ${endpoint} ===`);
            const response = await makeRequest(
                MESHY_API_BASE,
                'GET',
                `${endpoint}?page_size=50`,
                {
                    'Authorization': `Bearer ${MESHY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            );

            if (Array.isArray(response)) {
                console.log(`✓ Found ${response.length} items`);
                if (response.length > 0) {
                    console.log('First item:', JSON.stringify(response[0], null, 2).substring(0, 200));
                }
            } else if (response.message) {
                console.log(`✗ ${response.message}`);
            } else {
                console.log('Response:', JSON.stringify(response).substring(0, 100));
            }
        } catch (error) {
            console.log(`Error: ${error.message}`);
        }
    }
}

checkAllEndpoints().catch(console.error);
