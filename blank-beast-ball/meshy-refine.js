const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';

// Make API request
function makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_BASE,
            path: endpoint,
            method: method,
            headers: {
                'Authorization': `Bearer ${MESHY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Download file from URL
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(filepath);
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

// Generate HIGH QUALITY 3D model (two-step process)
async function generateModelRefine(prompt, artStyle = 'realistic', negativePrompt = '') {
    console.log(`\n🎨 STEP 1: Generating preview first...`);

    // STEP 1: Generate preview
    const previewPayload = {
        mode: 'preview',
        prompt: prompt,
        art_style: artStyle,
        negative_prompt: negativePrompt
    };

    console.log('📝 Creating preview task...');
    const previewTask = await makeRequest('POST', '/v2/text-to-3d', previewPayload);

    if (!previewTask.result) {
        throw new Error('Failed to create preview: ' + JSON.stringify(previewTask));
    }

    const previewTaskId = previewTask.result;
    console.log(`✅ Preview task created: ${previewTaskId}`);

    // Wait for preview to complete
    let previewResult;
    let attempts = 0;
    while (attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        previewResult = await makeRequest('GET', `/v2/text-to-3d/${previewTaskId}`);
        console.log(`📊 Preview status: ${previewResult.status} (${attempts * 5}s)`);

        if (previewResult.status === 'SUCCEEDED') break;
        if (previewResult.status === 'FAILED') {
            throw new Error('Preview failed');
        }
        attempts++;
    }

    console.log('\n🎨 STEP 2: Refining to high quality...');

    // STEP 2: Refine the preview
    const refinePayload = {
        mode: 'refine',
        preview_task_id: previewTaskId,
        enable_pbr: true,
        topology: 'quad'
    };

    const task = await makeRequest('POST', '/v2/text-to-3d', refinePayload);

    if (!task.result) {
        throw new Error('Failed to create refine task: ' + JSON.stringify(task));
    }

    console.log(`✅ Refine task created: ${task.result}`);

    // Poll for refine completion (takes longer - up to 3-5 minutes)
    let result;
    let refineAttempts = 0;
    const maxAttempts = 100; // 8+ minutes max

    while (refineAttempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        result = await makeRequest('GET', `/v2/text-to-3d/${task.result}`);
        console.log(`📊 Refine status: ${result.status} (${refineAttempts * 5}s elapsed)`);

        if (result.status === 'SUCCEEDED') {
            break;
        } else if (result.status === 'FAILED') {
            throw new Error('Refine failed: ' + JSON.stringify(result));
        }

        refineAttempts++;
    }

    if (result.status !== 'SUCCEEDED') {
        throw new Error('Generation timed out after ' + (attempts * 5) + ' seconds');
    }

    console.log(`✅ HIGH QUALITY MODEL READY!`);
    return result;
}

// Main function - generate Achilles with top quality
async function generateAchillesHighQuality() {
    console.log('🚀 GENERATING HIGH QUALITY ACHILLES MODEL');
    console.log('⏰ This will take 3-5 minutes for best results\n');

    const modelsDir = path.join(__dirname, 'models');
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir);
    }

    try {
        const prompt = `Achilles Greek warrior hero from Troy, muscular athletic build, wearing bronze armor with gold accents,
        ornate greek helmet with red plume, leather battle skirt, bronze greaves, holding round shield and spear,
        heroic powerful stance, detailed bronze textures, weathered battle-worn armor, ancient greek warrior aesthetic,
        game character, full body, T-pose for rigging`;

        const negativePrompt = 'modern, sci-fi, low quality, blurry, cartoon, anime, distorted, deformed';

        const result = await generateModelRefine(prompt, 'realistic', negativePrompt);

        // Download high-quality GLB
        if (result.model_urls && result.model_urls.glb) {
            const filename = 'achilles_hq.glb';
            const filepath = path.join(modelsDir, filename);

            console.log(`\n⬇️  Downloading HIGH QUALITY GLB...`);
            await downloadFile(result.model_urls.glb, filepath);
            console.log(`💾 Saved: ${filename}`);

            // Get file size
            const stats = fs.statSync(filepath);
            console.log(`📦 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        }

        // Download thumbnail
        if (result.thumbnail_url) {
            const thumbPath = path.join(modelsDir, 'achilles_hq_thumb.png');
            await downloadFile(result.thumbnail_url, thumbPath);
            console.log(`🖼️  Thumbnail saved`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✨ HIGH QUALITY ACHILLES MODEL GENERATED!');
        console.log('='.repeat(60));
        console.log('\nModel features:');
        console.log('✅ Refine quality (highest setting)');
        console.log('✅ PBR materials (realistic lighting)');
        console.log('✅ Detailed textures and materials');
        console.log('✅ Optimized topology');
        console.log('✅ Ready for game use!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// Run it
generateAchillesHighQuality().catch(console.error);
