
import { query } from '../src/database';

async function inspectUserCharacters() {
    try {
        const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_characters'
      ORDER BY column_name;
    `);
        console.log('User Characters Schema:', result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectUserCharacters();
