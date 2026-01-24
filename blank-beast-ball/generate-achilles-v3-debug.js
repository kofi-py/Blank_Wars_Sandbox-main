const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const MESHY_API_BASE = 'api.meshy.ai';

const ANIMATIONS = {
    idle: 0,
    walk: 30,
    run: 16,
    jump: 460
};

function makeRequest(hostname, method, apiPath, headers, data = null) {
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
                // Log raw response for debugging
                console.log('📥 Raw API Response:', responseData);
                try {
                    const parsed = JSON.parse(responseData);
                    console.log('✅ Parsed response:', JSON.stringify(parsed, null, 2));
                    resolve(parsed);
                } catch (e) {
                    reject(new Error(`Parse error: ${responseData}`));
                }
            });
        });

        req.on('error', reject);
        if (data) {
            console.log('📤 Request data:', JSON.stringify(data, null, 2));
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function main() {
    console.log('⚔️  Testing Achilles generation with REFINE mode - DEBUG VERSION\n');

    try {
        // Step 1: Generate base 3D model WITH TEXTURES
        console.log('Step 1: Generating base 3D model with REFINE mode (includes textures)...');
        const createResponse = await makeRequest(
            MESHY_API_BASE,
            'POST',
            '/openapi/v2/text-to-3d',
            {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            {
                mode: 'refine',
                prompt: 'full body Greek warrior Achilles in T-pose, arms extended horizontally 90 degrees, standing straight upright, detailed realistic human face with strong masculine features, short dark hair, athletic muscular build, wearing shiny bronze metallic armor breastplate, bronze greaves, Corinthian helmet with bright red feather plume on top, flowing red fabric cape attached at shoulders, tanned skin, heroic powerful stance, game-ready character model, clean separated elements, volumetric 3D',
                art_style: 'realistic',
                ai_model: 'latest',
                topology: 'quad',
                is_a_t_pose: true,
                should_remesh: true,
                negative_prompt: 'statue, pedestal, base, platform, sculpture, relief, 2d, flat, low poly, cartoonish, multiple people, sitting, lying down, side view, back view, strings, wires, connecting strands, threads, cables, ropes between body parts, web, mesh connections, helmet connected to cape, plume connected to cape, facial hair, beard'
            }
        );

        console.log('\n📋 Full create response object:', createResponse);
        console.log('📋 Task ID from response.result:', createResponse.result);

        if (!createResponse.result) {
            console.error('❌ ERROR: No task ID returned from API!');
            console.error('This could mean:');
            console.error('  - API rejected the request');
            console.error('  - Invalid parameters');
            console.error('  - API key issue');
            console.error('  - Response format changed');
            process.exit(1);
        }

        console.log(`\n✅ Task created successfully with ID: ${createResponse.result}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

main();
