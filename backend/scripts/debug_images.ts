
import axios from 'axios';

const BASE_URL = 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main';

async function testUrl(url: string) {
    try {
        const response = await axios.head(url);
        console.log(`✅ FOUND: ${url}`);
        return true;
    } catch (error) {
        console.log(`❌ 404:   ${url}`);
        return false;
    }
}

async function probe() {
    console.log('🔍 Probing Therapist Images (Coaching/ prefix)...');

    // Try matching local structure exactly
    await testUrl(`${BASE_URL}/Coaching/Therapy/Therapists/Carl_Jung.png`);
    await testUrl(`${BASE_URL}/Coaching/Therapy/Therapists/Fairy_Godmother_Seraphina.png`);
    await testUrl(`${BASE_URL}/Coaching/Therapy/Therapists/Zxk14bW^7.png`);
}

probe();
