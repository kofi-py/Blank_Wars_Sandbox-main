
import { query } from '../src/database';

async function inspectUserCharTriggers() {
    try {
        console.log('--- Triggers on user_characters ---');
        const result = await query(`
      SELECT tgname, pg_get_triggerdef(oid) 
      FROM pg_trigger 
      WHERE tgrelid = 'user_characters'::regclass;
    `);
        console.log(result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectUserCharTriggers();
