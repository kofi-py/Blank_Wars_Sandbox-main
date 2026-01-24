
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { query } from '../src/database/postgres';

async function checkExperienceLevels() {
    try {
        console.log('--- 🔍 Checking experience_levels table ---');
        const result = await query(`
      SELECT to_regclass('public.experience_levels') as table_exists;
    `);
        console.log('Table Exists:', result.rows[0].table_exists);

        if (result.rows[0].table_exists) {
            const count = await query('SELECT count(*) FROM experience_levels');
            console.log('Row count:', count.rows[0].count);
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        process.exit();
    }
}

checkExperienceLevels();
