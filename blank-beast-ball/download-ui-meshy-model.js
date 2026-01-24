const https = require('https');
const fs = require('fs');
const path = require('path');

const MESHY_API_KEY = 'msy_fRifeSQJzQ5PD2pDUAFNB0wjIC1JLJxb97GZ';
const API_BASE = 'api.meshy.ai';

async function getTaskDetails(taskId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      path: `/openapi/v2/text-to-3d/${taskId}`, // Swap to /v1/image-to-3d if needed
      method: 'GET',
      headers: { 'Authorization': `Bearer ${MESHY_API_KEY}` }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const file = fs.createWriteStream(outputPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(outputPath));
      });
    }).on('error', reject);
  });
}

async function main(taskId, characterName, baseDir = 'models') {
  try {
    console.log(`Fetching task details for ${characterName} (ID: ${taskId})...`);
    const task = await getTaskDetails(taskId);

    if (task.status !== 'SUCCEEDED') throw new Error(`Task not ready: ${task.status}`);

    const charDir = path.join(baseDir, characterName);
    fs.mkdirSync(charDir, { recursive: true });

    // Download GLB
    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) throw new Error('No GLB URL found');

    const glbPath = path.join(charDir, `${characterName}_base.glb`);
    console.log(`Downloading GLB to ${glbPath}...`);
    await downloadFile(glbUrl, glbPath);
    console.log(`✓ GLB downloaded`);

    // Download textures (if present)
    if (task.texture_urls && task.texture_urls.length > 0) {
      console.log(`Downloading ${task.texture_urls.length} texture(s)...`);
      for (let i = 0; i < task.texture_urls.length; i++) {
        const tex = task.texture_urls[i];
        if (tex.base_color) {
          const texPath = path.join(charDir, `texture_${i}.png`);
          await downloadFile(tex.base_color, texPath);
          console.log(`✓ Texture ${i} downloaded`);
        }
      }
    }

    console.log(`\n✓ Downloaded ${characterName} successfully to ${charDir}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Usage: node download-ui-meshy-model.js <task_id> <character_name>
const [,, taskId, characterName] = process.argv;
if (!taskId || !characterName) {
  console.log('Usage: node download-ui-meshy-model.js <task_id> <character_name>');
  console.log('Example: node download-ui-meshy-model.js 018a210d-8ba4-705c-b111-1f1776f7f578 merlin');
  process.exit(1);
}
main(taskId, characterName);
