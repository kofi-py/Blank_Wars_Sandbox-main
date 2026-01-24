
import axios from 'axios';

const REMOTE_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main';

const BASE_DIRS = [
    '', 'HQ', 'Headquarters', 'Furniture', 'Assets', 'Images', 'Scenes',
    'HQ/Living Quarters', 'Headquarters/Living Quarters', 'Headquarters/Living_Quarters',
    'Headquarters/ConfessionalUntitled folder/Confessional/Spartan Apartment',
    'Headquarters/New Character Images_Nov24'
];

const SUB_DIRS = [
    'bed', 'bunk_bed', 'floor',
    'beds', 'bunk_beds', 'floors',
    'Bed', 'Bunk_Bed', 'Floor',
    'Beds', 'Bunk_Beds', 'Floors'
];

const CHAR_PREFIXES = ['achilles', 'Achilles'];

async function probeUrl(path: string): Promise<boolean> {
    try {
        await axios.head(`${REMOTE_IMAGE_BASE_URL}/${path}`);
        return true;
    } catch {
        return false;
    }
}

async function finalProbe() {
    console.log('Starting FINAL furniture probe...');
    let foundAny = false;

    for (const base of BASE_DIRS) {
        for (const sub of SUB_DIRS) {
            for (const char of CHAR_PREFIXES) {
                // Construct path parts
                const dirPart = base ? `${base}/${sub}` : sub;

                // Try variations of filename
                const filenames = [
                    `${char}_${sub.toLowerCase()}.png`, // achilles_bed.png
                    `${char}_${sub.toLowerCase().replace('bunk_bed', 'bunk')}.png`, // achilles_bunk.png
                    `${char}.png`, // achilles.png (inside bed folder)
                    `${sub.toLowerCase()}.png` // bed.png (generic?)
                ];

                for (const fname of filenames) {
                    const path = `${dirPart}/${fname}`;
                    // console.log(`Checking: ${path}`); // Too verbose
                    if (await probeUrl(path)) {
                        console.log(`FOUND: ${path}`);
                        foundAny = true;
                    }
                }
            }
        }
    }

    if (!foundAny) {
        console.log('❌ NO FURNITURE FOUND. The files might not be on this remote repo.');
    }
}

finalProbe();
