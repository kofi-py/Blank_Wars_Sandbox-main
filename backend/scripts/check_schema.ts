
import { query } from '../src/database';

async function checkSchema() {
    try {
        console.log('Checking archetypes table...');
        const archCols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'archetypes'
    `);
        console.log(archCols.rows);

        console.log('\nChecking characters table...');
        const charCols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'characters'
    `);
        console.log(charCols.rows);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
