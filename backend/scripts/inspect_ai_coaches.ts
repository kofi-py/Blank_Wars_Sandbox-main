
import { query } from '../src/database';

async function inspectAICoaches() {
    try {
        const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ai_coaches'
      ORDER BY column_name;
    `);
        console.log(result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectAICoaches();
