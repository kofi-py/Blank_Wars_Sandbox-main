
import { query } from '../src/database';

async function inspectSchemas() {
    try {
        console.log('--- Characters Schema ---');
        const charResult = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'characters'
      ORDER BY column_name;
    `);
        console.log(charResult.rows);

        console.log('\n--- Spell Definitions Schema ---');
        const spellResult = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'spell_definitions'
      ORDER BY column_name;
    `);
        console.log(spellResult.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectSchemas();
