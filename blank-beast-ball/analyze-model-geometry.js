#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const MODELS_DIR = '/Users/gabrielgreenstein/blank-wars-clean/models';

const FAILED_MODELS = {
    tesla: 'tesla',
    agent_x: 'agent_x',
    fenrir: 'fenrir',
    genghis_khan: 'the_warrior_king',
    frankenstein_monster: 'monsters_midnight_stroll',
    sun_wukong: 'warrior_of_the_skies'
};

function analyzeGLB(filePath) {
    const buffer = fs.readFileSync(filePath);
    const fileSize = buffer.length;

    // GLB format: 12-byte header + chunks
    // Header: magic (4 bytes), version (4 bytes), length (4 bytes)
    const magic = buffer.toString('ascii', 0, 4);
    const version = buffer.readUInt32LE(4);
    const length = buffer.readUInt32LE(8);

    if (magic !== 'glTF') {
        return { error: 'Not a valid GLB file' };
    }

    // Read first chunk (JSON)
    const chunkLength = buffer.readUInt32LE(12);
    const chunkType = buffer.readUInt32LE(16);

    if (chunkType === 0x4E4F534A) { // JSON chunk
        const jsonData = buffer.toString('utf8', 20, 20 + chunkLength);
        const gltf = JSON.parse(jsonData);

        return {
            fileSize: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
            version,
            meshes: gltf.meshes?.length || 0,
            nodes: gltf.nodes?.length || 0,
            materials: gltf.materials?.length || 0,
            textures: gltf.textures?.length || 0,
            animations: gltf.animations?.length || 0,
            skins: gltf.skins?.length || 0,
            cameras: gltf.cameras?.length || 0,
            hasScene: !!gltf.scene,
            sceneCount: gltf.scenes?.length || 0,
            primitiveCount: gltf.meshes?.reduce((sum, mesh) =>
                sum + (mesh.primitives?.length || 0), 0) || 0,
            vertexAttributes: gltf.meshes?.[0]?.primitives?.[0]?.attributes
                ? Object.keys(gltf.meshes[0].primitives[0].attributes)
                : []
        };
    }

    return { error: 'Could not read JSON chunk' };
}

console.log('GEOMETRY ANALYSIS OF FAILED MODELS\n');
console.log('='.repeat(80));

for (const [charName, folderName] of Object.entries(FAILED_MODELS)) {
    const modelPath = path.join(MODELS_DIR, folderName, `${folderName}.glb`);
    const metadataPath = path.join(MODELS_DIR, folderName, 'metadata.json');

    console.log(`\n${charName.toUpperCase()} (${folderName})`);
    console.log('-'.repeat(80));

    if (!fs.existsSync(modelPath)) {
        console.log('  ERROR: Model file not found');
        continue;
    }

    const analysis = analyzeGLB(modelPath);

    if (analysis.error) {
        console.log(`  ERROR: ${analysis.error}`);
        continue;
    }

    console.log(`  File Size: ${analysis.fileSize}`);
    console.log(`  GLB Version: ${analysis.version}`);
    console.log(`  Meshes: ${analysis.meshes}`);
    console.log(`  Nodes: ${analysis.nodes}`);
    console.log(`  Materials: ${analysis.materials}`);
    console.log(`  Textures: ${analysis.textures}`);
    console.log(`  Primitives: ${analysis.primitiveCount}`);
    console.log(`  Vertex Attributes: ${analysis.vertexAttributes.join(', ')}`);
    console.log(`  Pre-existing Animations: ${analysis.animations}`);
    console.log(`  Pre-existing Skins: ${analysis.skins}`);
    console.log(`  Has Scene: ${analysis.hasScene}`);
    console.log(`  Scene Count: ${analysis.sceneCount}`);

    // Read metadata
    if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        console.log(`  Generation Phase: ${metadata.phase}`);
        console.log(`  Generation Mode: ${metadata.mode}`);
    }

    // Potential issues
    const issues = [];
    if (analysis.skins > 0) issues.push('Already rigged (has skins)');
    if (analysis.animations > 0) issues.push('Already has animations');
    if (!analysis.hasScene) issues.push('No scene defined');
    if (analysis.meshes === 0) issues.push('No meshes');
    if (analysis.primitiveCount === 0) issues.push('No primitives');
    if (!analysis.vertexAttributes.includes('POSITION')) issues.push('Missing POSITION attribute');
    if (!analysis.vertexAttributes.includes('NORMAL')) issues.push('Missing NORMAL attribute');

    if (issues.length > 0) {
        console.log(`  ⚠️  POTENTIAL ISSUES:`);
        issues.forEach(issue => console.log(`      - ${issue}`));
    } else {
        console.log(`  ✓ No obvious geometry issues detected`);
    }
}

console.log('\n' + '='.repeat(80));
console.log('\nCONCLUSION:');
console.log('Models failing Meshy rigging likely have one or more of these issues:');
console.log('  1. Already rigged (pre-existing skeleton/skins)');
console.log('  2. Non-standard T-pose or pose detection issues');
console.log('  3. Mesh topology incompatible with auto-rigging');
console.log('  4. Missing or malformed vertex data');
console.log('  5. Complex multi-mesh structure');
console.log('  6. Non-humanoid proportions (animals, creatures)');
