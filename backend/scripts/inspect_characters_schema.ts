
import { query } from '../src/database';

async function inspectCharacters() {
    try {
        const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'characters'
      ORDER BY column_name;
    `);
        console.log('Characters Schema:', result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectCharacters();
