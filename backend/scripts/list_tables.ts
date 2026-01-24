import { query } from '../src/database/postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function listTables() {
    try {
        const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
        console.log('Tables in DB:', result.rows.map(r => r.table_name));
    } catch (error) {
        console.error('Error:', error);
    }
}

listTables();
