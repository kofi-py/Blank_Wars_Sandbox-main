
import { query } from '../src/database';

async function verifyColumns() {
    try {
        console.log('Testing characters.species...');
        await query('SELECT species FROM characters LIMIT 1');
        console.log('✅ characters.species exists');

        console.log('Testing spell_definitions.species...');
        await query('SELECT species FROM spell_definitions LIMIT 1');
        console.log('✅ spell_definitions.species exists');
    } catch (error) {
        console.error('❌ Column verification failed:', error);
    }
}

verifyColumns();
