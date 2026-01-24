import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';

async function checkCharactersSchema() {
    try {
        const tableInfo = await query(`
      SELECT table_type 
      FROM information_schema.tables 
      WHERE table_name = 'characters'
    `);
        console.log('Table Type:', tableInfo.rows[0]?.table_type);

        const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'characters'
      ORDER BY ordinal_position;
    `);
        const columns = result.rows.map(row => row.column_name).join(', ');
        console.log('Characters Columns:', columns);
    } catch (error) {
        console.error('Error:', error);
    }
}

checkCharactersSchema();
