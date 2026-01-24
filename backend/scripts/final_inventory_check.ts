import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Full list of 33 characters
const CHARACTERS = [
    'achilles', 'agent_x', 'billy_the_kid', 'cleopatra', 'space_cyborg', 'dracula',
    'fenrir', 'frankenstein', 'genghis_khan', 'joan_of_arc', 'merlin', 'robin_hood',
    'sherlock_holmes', 'sun_wukong', 'tesla', 'rilak', 'sam_spade',
    'aleister', 'archangel', 'don_quixote', 'jack_the_ripper', 'kali', 'kangaroo',
    'karna', 'little_bo_peep', 'mami_wata', 'napoleon', 'quetzalcoatl', 'santa_claus',
    'shaka_zulu', 'shiva', 'thor', 'zeus'
];

const VARIANTS = [
    'progression', 'equipment', 'skills', 'performance', 'confessional', 'kitchen',
    'training', 'therapy', 'finance', 'group_activities', 'team', 'colosseaum',
    'clubhouse', 'graffiti', 'community_board'
];

const REMOTE_BASE_URL = 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main';

// Helper to construct paths manually to match the logic we expect
const getPath = (slug: string, variant: string, facility: string = 'spartan'): string => {
    const base = slug; // Assuming clean slugs for now
    switch (variant) {
        case 'progression': return `Progression/${base}_progression_1.png`;
        case 'equipment': return `Equipment/${base}_equipment.png`;
        case 'skills': return `Skills/${base}_skills.png`;
        case 'performance': return `Performance Coaching/${base}_1-on-1_1.png`;
        case 'confessional':
            const folder = facility === 'mansion' ? 'Team Mansion' : 'Spartan Apartment';
            const suffix = facility === 'mansion' ? 'mansion' : 'spartan_apt';
            return `Confessional/${folder}/${base}_confessional_${suffix}.png`;
        case 'kitchen': return `Kitchen/${base}_kitchen.png`;
        case 'training': return `Training/${base}_training_1.png`;
        case 'therapy': return `Therapy/${base}_therapy_1.png`;
        case 'finance': return `Finance/${base}_finance_1.png`;
        case 'group_activities': return `Group Activities/${base}_group_activity_1.png`;
        case 'team': return `Team/${base}_team.png`;
        case 'colosseaum': return `Colosseaum/${base}_colosseaum.png`;
        case 'clubhouse': return `Clubhouse/${base}_clubhouse.png`;
        case 'graffiti': return `Graffiti Wall/${base}_graffiti.png`;
        case 'community_board': return `Community Board/${base}_community_board.png`;
        default: return '';
    }
};

async function checkUrl(url: string): Promise<boolean> {
    try {
        await axios.head(url);
        return true;
    } catch (e) {
        return false;
    }
}

async function run() {
    console.log('Starting comprehensive inventory check...');
    const missing: string[] = [];
    const found: string[] = [];

    for (const char of CHARACTERS) {
        for (const variant of VARIANTS) {
            const path = getPath(char, variant);
            const url = `${REMOTE_BASE_URL}/${path}`;
            const exists = await checkUrl(url);

            if (exists) {
                found.push(`${char} - ${variant}`);
            } else {
                missing.push(`${char} - ${variant} (${path})`);
                process.stdout.write('x');
            }
        }
        // Check mansion confessional too
        const mansionPath = getPath(char, 'confessional', 'mansion');
        const mansionUrl = `${REMOTE_BASE_URL}/${mansionPath}`;
        if (await checkUrl(mansionUrl)) {
            found.push(`${char} - confessional (mansion)`);
        } else {
            missing.push(`${char} - confessional (mansion) (${mansionPath})`);
        }
    }

    console.log('\n\nInventory Complete.');
    console.log(`Found: ${found.length}`);
    console.log(`Missing: ${missing.length}`);

    fs.writeFileSync('missing_images_report.txt', missing.join('\n'));
    console.log('Report saved to missing_images_report.txt');
}

run();
