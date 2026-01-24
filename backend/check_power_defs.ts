
import { query } from './src/database/postgres';

async function checkPowerDefinitions() {
    try {
        const result = await query('SELECT * FROM power_definitions LIMIT 5');
        console.log('Power Definitions:', result.rows);

        const columns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'power_definitions'
    `);
        console.log('Columns:', columns.rows.map((r: any) => r.column_name));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkPowerDefinitions();
