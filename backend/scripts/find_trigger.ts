
import { query } from '../src/database';

async function findTrigger() {
    try {
        console.log('Finding trigger for function auto_unlock_starters...');
        const result = await query(`
      SELECT tgname, tgrelid::regclass as table_name
      FROM pg_trigger 
      WHERE tgfoid = 'auto_unlock_starters'::regproc;
    `);
        console.log(result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

findTrigger();
