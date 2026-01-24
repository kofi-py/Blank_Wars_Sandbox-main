
import { query } from '../src/database';

async function inspectTeams() {
    try {
        const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'teams'
      ORDER BY column_name;
    `);
        console.log('Teams Schema:', result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectTeams();
