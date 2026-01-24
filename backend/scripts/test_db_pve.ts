import { db_adapter } from '../src/services/databaseAdapter';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testPVE() {
    console.log('🧪 Testing find_random_canonical...');
    try {
        const characters = await db_adapter.characters.find_random_canonical(1);
        console.log('✅ Random Result:', characters[0]?.name);

        console.log('🧪 Testing Kali AP...');
        const kali = await db_adapter.characters.find_by_id('kali');
        if (kali) {
            console.log(`✅ Kali Found: ${kali.name}`);
            console.log(`💪 Base Action Points: ${kali.base_action_points}`);
            if (kali.base_action_points === 4) {
                console.log('🎉 SUCCESS: Kali has 4 AP!');
            } else {
                console.error(`❌ FAILURE: Kali has ${kali.base_action_points} AP (expected 4)`);
            }
        } else {
            console.error('❌ Kali not found!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
    process.exit(0);
}

testPVE();
