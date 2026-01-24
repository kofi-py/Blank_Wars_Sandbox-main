
import { query } from '../src/database';

async function dropTrigger() {
    try {
        console.log('Dropping trigger auto_unlock_starters...');
        await query('DROP TRIGGER IF EXISTS trigger_auto_unlock_starters ON user_characters CASCADE;');
        console.log('Trigger dropped.');
    } catch (error) {
        console.error('Error dropping trigger:', error);
    }
}

dropTrigger();
