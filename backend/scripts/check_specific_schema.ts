
import { query } from '../src/database';

async function checkSpecificColumns() {
    try {
        console.log('Checking for specific stats in characters...');
        const charCols = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'characters' 
      AND column_name IN ('dexterity', 'intelligence', 'wisdom', 'spirit', 'mental_health', 'stress_level', 'confidence_level', 'speed')
    `);
        console.log('Found columns:', charCols.rows.map(r => r.column_name));

        console.log('\nChecking for adherence mod in archetypes...');
        const archCols = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'archetypes' 
      AND column_name LIKE '%adherence%'
    `);
        console.log('Found columns:', archCols.rows.map(r => r.column_name));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSpecificColumns();
