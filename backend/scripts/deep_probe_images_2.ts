
import axios from 'axios';

const REMOTE_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main';

const FURNITURE_GUESSES = [
    'Headquarters/ConfessionalUntitled folder/Confessional/Spartan Apartment/bed/achilles_bed.png',
    'Headquarters/ConfessionalUntitled folder/Confessional/Spartan Apartment/bunk_bed/achilles_bunk_bed.png',
    'Headquarters/ConfessionalUntitled folder/Confessional/Spartan Apartment/floor/achilles_floor.png',
    'Headquarters/New Character Images_Nov24/bed/achilles_bed.png',
    'Headquarters/New Character Images_Nov24/bunk_bed/achilles_bunk_bed.png',
    'Headquarters/New Character Images_Nov24/floor/achilles_floor.png',
    'Headquarters/Spartan Apartment/bed/achilles_bed.png',
    'Headquarters/Spartan Apartment/bunk_bed/achilles_bunk_bed.png',
    'Headquarters/Spartan Apartment/floor/achilles_floor.png',
    'Spartan Apartment/bed/achilles_bed.png',
    'Spartan Apartment/bunk_bed/achilles_bunk_bed.png',
    'Spartan Apartment/floor/achilles_floor.png'
];

const MISSING_NEW_CHARS = [
    { slug: 'aleister', guesses: ['Colosseaum/Aleister Crowley_colosseaum.png', 'Colosseaum/Aleister_Crowley_colosseaum.png', 'Colosseaum/aleister_crowley_colosseaum.png'] },
    { slug: 'archangel', guesses: ['Colosseaum/Archangel Michael_colosseaum.png', 'Colosseaum/Archangel_Michael_colosseaum.png', 'Colosseaum/archangel_michael_colosseaum.png'] },
    { slug: 'little_bo_peep', guesses: ['Colosseaum/Little Bo Peep_colosseaum.png', 'Colosseaum/Little_Bo_Peep_colosseaum.png', 'Colosseaum/little_bo_peep_colosseaum.png', 'Colosseaum/liitle_bo_peep.png'] }, // Typo guess from inventory
    { slug: 'ramses', guesses: ['Colosseaum/Ramses II_colosseaum.png', 'Colosseaum/Ramses_II_colosseaum.png', 'Colosseaum/ramses_ii_colosseaum.png', 'Colosseaum/Rames II_colosseaum.png'] },
    { slug: 'shaka_zulu', guesses: ['Colosseaum/Shaka Zulu_colosseaum.png', 'Colosseaum/Shaka_Zulu_colosseaum.png', 'Colosseaum/shaka_zulu_colosseaum.png', 'Colosseaum/zulu_colosseaum.png'] }
];

async function probeUrl(path: string): Promise<boolean> {
    try {
        await axios.head(`${REMOTE_IMAGE_BASE_URL}/${path}`);
        return true;
    } catch {
        return false;
    }
}

async function deepProbe2() {
    console.log('Starting deep probe 2...');

    console.log('\nProbing Furniture Deeply...');
    for (const path of FURNITURE_GUESSES) {
        if (await probeUrl(path)) console.log(`FOUND: ${path}`);
    }

    console.log('\nProbing Missing New Characters...');
    for (const item of MISSING_NEW_CHARS) {
        for (const guess of item.guesses) {
            if (await probeUrl(guess)) console.log(`FOUND: ${guess}`);
        }
    }
}

deepProbe2();
