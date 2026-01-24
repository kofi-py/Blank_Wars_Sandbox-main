
import { query } from './src/database/postgres';

async function listCharacters() {
    try {
        const result = await query('SELECT id, character_id, level FROM user_characters LIMIT 20');
        console.log('User Characters:', result.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listCharacters();
