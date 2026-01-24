
import axios from 'axios';
import fs from 'fs';

const REMOTE_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main';

const FURNITURE_PREFIXES = [
    'bunk_bed', 'bed', 'floor',
    'Furniture/bunk_bed', 'Furniture/bed', 'Furniture/floor',
    'HQ/Living Quarters/bunk_bed', 'HQ/Living Quarters/bed', 'HQ/Living Quarters/floor',
    'Headquarters/Living Quarters/bunk_bed', 'Headquarters/Living Quarters/bed', 'Headquarters/Living Quarters/floor',
    'Headquarters/bunk_bed', 'Headquarters/bed', 'Headquarters/floor',
    'Living Quarters/bunk_bed', 'Living Quarters/bed', 'Living Quarters/floor',
    'Assets/bunk_bed', 'Assets/bed', 'Assets/floor',
    'furniture/bunk_bed', 'furniture/bed', 'furniture/floor'
];

const MISSING_ORIGINALS = [
    { slug: 'joan_of_arc', variants: ['Group Activities'] },
    { slug: 'merlin', variants: ['Group Activities', 'Therapy'] },
    { slug: 'robin_hood', variants: ['Group Activities'] },
    { slug: 'sherlock_holmes', variants: ['Therapy'] }
];

const NEW_CHARACTERS = [
    'aleister', 'archangel', 'don_quixote', 'jack_the_ripper', 'kali', 'kangaroo', 'karna',
    'little_bo_peep', 'mami_wata', 'napoleon', 'quetzalcoatl', 'ramses', 'shaka_zulu', 'unicorn', 'velociraptor'
];

async function probeUrl(path: string): Promise<boolean> {
    try {
        await axios.head(`${REMOTE_IMAGE_BASE_URL}/${path}`);
        return true;
    } catch {
        return false;
    }
}

async function deepProbe() {
    console.log('Starting deep probe...');
    const found: string[] = [];

    // 1. Probe Furniture
    console.log('\nProbing Furniture...');
    const testChar = 'achilles';
    for (const prefix of FURNITURE_PREFIXES) {
        // Check standard naming
        const path1 = `${prefix}/${testChar}_${prefix.split('/').pop()}.png`;
        const path2 = `${prefix}/${testChar}_${prefix.split('/').pop()?.replace('bunk_bed', 'bunk')}.png`; // Try 'bunk' vs 'bunk_bed'

        // Check capitalized naming
        const path3 = `${prefix}/Achilles_${prefix.split('/').pop()?.replace(/_/g, ' ')}.png`;

        if (await probeUrl(path1)) { console.log(`FOUND: ${path1}`); found.push(path1); }
        if (await probeUrl(path2)) { console.log(`FOUND: ${path2}`); found.push(path2); }
        if (await probeUrl(path3)) { console.log(`FOUND: ${path3}`); found.push(path3); }
    }

    // 2. Probe Missing Originals
    console.log('\nProbing Missing Originals...');
    for (const item of MISSING_ORIGINALS) {
        for (const variant of item.variants) {
            const base = item.slug;
            const folder = variant;

            // Variations to try
            const paths = [
                `${folder}/${base}_${variant.toLowerCase().replace(' ', '_')}_1.png`, // Standard
                `${folder}/${base}_${variant.toLowerCase().replace(' ', '_')}_01.png`, // 01 suffix
                `${folder}/${base}_1.png`, // Short suffix
                `${folder}/${base.replace(/_/g, ' ')}_${variant}_1.png`, // Spaces in name
                `${folder}/${base.split('_')[0]}_${variant.toLowerCase().replace(' ', '_')}_1.png` // First name only (e.g. joan)
            ];

            for (const p of paths) {
                if (await probeUrl(p)) {
                    console.log(`FOUND: ${p}`);
                    found.push(p);
                }
            }
        }
    }

    // 3. Probe New Characters (Sample check)
    console.log('\nProbing New Characters (Colosseaum sample)...');
    for (const char of NEW_CHARACTERS) {
        const path = `Colosseaum/${char}_colosseaum.png`;
        if (await probeUrl(path)) {
            console.log(`FOUND: ${path}`);
            found.push(path);
        } else {
            // Try capitalized
            const capPath = `Colosseaum/${char.charAt(0).toUpperCase() + char.slice(1)}_colosseaum.png`;
            if (await probeUrl(capPath)) {
                console.log(`FOUND: ${capPath}`);
                found.push(capPath);
            } else {
                console.log(`MISSING: ${path}`);
            }
        }
    }
}

deepProbe();
