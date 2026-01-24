import fs from 'fs';
import path from 'path';

// Configuration
const REMOTE_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main';
const LOCAL_IMAGE_BASE_PATH = '/Users/gabrielgreenstein/Blank-Wars_Images-2';

// Replicated Logic from characterImageUtils.ts
const getCharacterImagePath = (
    character_name: string,
    variant: string,
    facility: 'spartan' | 'mansion' = 'spartan'
): string => {
    const base_name = character_name.toLowerCase().replace(/\s+/g, '_');

    let relativePath = '';

    switch (variant) {
        case 'progression':
            relativePath = `Progression/${base_name}_progression_1.png`;
            break;
        case 'equipment':
            relativePath = `Equipment/${base_name}_equipment.png`;
            break;
        case 'training':
            relativePath = `Training/${base_name}_training_1.png`;
            break;
        case 'therapy':
            relativePath = `Therapy/${base_name}_therapy_1.png`;
            break;
        case 'finance':
            relativePath = `Finance/${base_name}_finance_1.png`;
            break;
        case 'group_activities':
            relativePath = `Group Activities/${base_name}_group_activity_1.png`;
            break;
        case 'clubhouse':
            relativePath = `Clubhouse/${base_name}_clubhouse.png`;
            break;
        case 'graffiti':
            relativePath = `Graffiti Wall/${base_name}_graffiti.png`;
            break;
        case 'community_board':
            relativePath = `Community Board/${base_name}_community_board.png`;
            break;
        case 'colosseaum':
            relativePath = `Colosseaum/${base_name}_colosseaum.png`;
            break;
        case 'confessional':
            const facilityFolder = facility === 'mansion' ? 'Team Mansion' : 'Spartan_Apartment';
            const facilitySuffix = facility === 'mansion' ? 'mansion' : 'spartan_apt';
            relativePath = `Confessional/${facilityFolder}/${base_name}_confessional_${facilitySuffix}.png`;
            break;
        case 'furniture_bed':
            relativePath = `Headquarters/Living_Quarters/bed/${base_name}_bed.png`;
            break;
        case 'furniture_floor':
            relativePath = `Headquarters/Living_Quarters/floor/${base_name}_floor.png`;
            break;
        case 'furniture_bunk':
            relativePath = `Headquarters/Living_Quarters/bunk_bed/${base_name}_bunk_bed.png`;
            break;
        default:
            return '';
    }

    return `${REMOTE_IMAGE_BASE_URL}/${relativePath}`;
};

// Verification Logic
const verifyAsset = (name: string, variant: string, description: string) => {
    const remoteUrl = getCharacterImagePath(name, variant);
    const relativePath = remoteUrl.replace(`${REMOTE_IMAGE_BASE_URL}/`, '');
    const localPath = path.join(LOCAL_IMAGE_BASE_PATH, relativePath);

    if (fs.existsSync(localPath)) {
        console.log(`✅ PASS: ${description} -> Found: ${relativePath}`);
    } else {
        console.error(`❌ FAIL: ${description} -> Missing: ${relativePath}`);
        console.error(`   (Checked: ${localPath})`);
    }
};

console.log('--- Verifying Image Fixes ---\n');

// 1. Verify Naming Mismatches (Little Bo Peep)
console.log('1. Verifying Little Bo Peep (Underscores)...');
verifyAsset('little_bo_peep', 'progression', 'Little Bo Peep Progression');
verifyAsset('little_bo_peep', 'equipment', 'Little Bo Peep Equipment');
verifyAsset('little_bo_peep', 'training', 'Little Bo Peep Training');
verifyAsset('little_bo_peep', 'therapy', 'Little Bo Peep Therapy');
verifyAsset('little_bo_peep', 'finance', 'Little Bo Peep Finance');
verifyAsset('little_bo_peep', 'group_activities', 'Little Bo Peep Group');
verifyAsset('little_bo_peep', 'clubhouse', 'Little Bo Peep Clubhouse');
verifyAsset('little_bo_peep', 'graffiti', 'Little Bo Peep Graffiti');
verifyAsset('little_bo_peep', 'community_board', 'Little Bo Peep Community Board');

// 2. Verify Naming Mismatches (Shaka Zulu)
console.log('\n2. Verifying Shaka Zulu (Full Name)...');
verifyAsset('shaka_zulu', 'progression', 'Shaka Zulu Progression');
verifyAsset('shaka_zulu', 'equipment', 'Shaka Zulu Equipment');
verifyAsset('shaka_zulu', 'training', 'Shaka Zulu Training');

// 3. Verify Colosseaum Typos
console.log('\n3. Verifying Colosseaum Typos...');
verifyAsset('little_bo_peep', 'colosseaum', 'Little Bo Peep Colosseaum');
verifyAsset('shaka_zulu', 'colosseaum', 'Shaka Zulu Colosseaum');
// Manual checks for non-standard names (Ramses, Raptor)
const ramsesPath = path.join(LOCAL_IMAGE_BASE_PATH, 'Colosseaum/ramses_colosseaum.png');
if (fs.existsSync(ramsesPath)) console.log('✅ PASS: Ramses Colosseaum -> Found'); else console.error('❌ FAIL: Ramses Colosseaum -> Missing');

const raptorPath = path.join(LOCAL_IMAGE_BASE_PATH, 'Colosseaum/raptor_colosseaum.png');
if (fs.existsSync(raptorPath)) console.log('✅ PASS: Raptor Colosseaum -> Found'); else console.error('❌ FAIL: Raptor Colosseaum -> Missing');

// 4. Verify JPG -> PNG Conversions
console.log('\n4. Verifying PNG Conversions...');
verifyAsset('fenrir', 'furniture_bed', 'Fenrir Bed (PNG)');
verifyAsset('sam_spade', 'furniture_bed', 'Sam Spade Bed (PNG)');

// 5. Verify Confessional Standardization
console.log('\n5. Verifying Confessional (Spartan Apartment)...');
verifyAsset('achilles', 'confessional', 'Achilles Confessional');
verifyAsset('aleister', 'confessional', 'Aleister Confessional');
verifyAsset('little_bo_peep', 'confessional', 'Little Bo Peep Confessional');

// 6. Verify Furniture Path (Headquarters/Living_Quarters)
console.log('\n6. Verifying Furniture Path...');
verifyAsset('achilles', 'furniture_bed', 'Achilles Bed');
verifyAsset('achilles', 'furniture_floor', 'Achilles Floor');

console.log('\n--- Verification Complete ---');
