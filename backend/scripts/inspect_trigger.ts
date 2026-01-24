
import { query } from '../src/database';

async function inspectTrigger() {
    try {
        const result = await query(`
      SELECT pg_get_functiondef('auto_unlock_starters'::regproc);
    `);
        console.log(result.rows[0].pg_get_functiondef);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectTrigger();
