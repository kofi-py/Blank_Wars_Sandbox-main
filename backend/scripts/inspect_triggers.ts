
import { query } from '../src/database';

async function inspectTriggers() {
    try {
        console.log('--- Triggers on character_spells ---');
        const result = await query(`
      SELECT tgname, pg_get_triggerdef(oid) 
      FROM pg_trigger 
      WHERE tgrelid = 'character_spells'::regclass;
    `);
        console.log(result.rows);

        console.log('\n--- Is spell_definitions a table? ---');
        const tableResult = await query(`
      SELECT table_type 
      FROM information_schema.tables 
      WHERE table_name = 'spell_definitions';
    `);
        console.log(tableResult.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectTriggers();
