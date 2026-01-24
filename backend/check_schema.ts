
import { query } from './src/database/postgres';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
    try {
        console.log('Checking room_beds columns...');
        const result = await query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('room_beds', 'headquarters_rooms')
      ORDER BY table_name, ordinal_position
    `);

        console.table(result.rows);
        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
