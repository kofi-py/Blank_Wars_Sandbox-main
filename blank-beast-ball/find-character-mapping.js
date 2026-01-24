#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const MODELS_DIR = '/Users/gabrielgreenstein/blank-wars-clean/models';

const folders = fs.readdirSync(MODELS_DIR).filter(f => {
    const stat = fs.statSync(path.join(MODELS_DIR, f));
    return stat.isDirectory();
});

console.log('Available models and their prompts:\n');

folders.forEach(folder => {
    const metadataPath = path.join(MODELS_DIR, folder, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        console.log(`${folder.padEnd(35)} -> "${metadata.prompt}"`);
    }
});
