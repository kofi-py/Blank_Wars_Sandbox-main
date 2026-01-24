
import { query } from '../src/database';
import { config } from 'dotenv';

config();

async function checkState() {
    try {
        console.log('🔍 Checking recent migrations...');
        const migrations = await query('SELECT * FROM migration_log ORDER BY version DESC LIMIT 5');
        console.table(migrations.rows);

        console.log('\n🔍 Checking auto_unlock_starters definition...');
        const funcDef = await query(`
      SELECT prosrc 
      FROM pg_proc 
      WHERE proname = 'auto_unlock_starters'
    `);

        if (funcDef.rows.length > 0) {
            console.log('Function Source:');
            console.log(funcDef.rows[0].prosrc);
        } else {
            console.log('❌ Function auto_unlock_starters NOT FOUND');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkState();
