
import { query } from '../src/database';

async function verifyFix() {
    try {
        // 1. Check Data Type
        const colStr = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'teams' AND column_name = 'user_id'
    `;
        const colRes = await query(colStr, []);
        console.log('📊 Team User ID Type:', colRes.rows[0]);

        // 2. Check Migrations Log
        const migStr = 'SELECT version FROM migration_log ORDER BY version DESC LIMIT 5';
        const migRes = await query(migStr, []);
        console.log('📜 Latest Migrations:', migRes.rows.map(r => r.version));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

verifyFix();
