import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';

async function findCurrencyColumns() {
    try {
        const result = await query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE column_name LIKE '%cents%' 
         OR column_name LIKE '%coins%'
         OR column_name LIKE '%currency%'
      ORDER BY table_name, column_name;
    `);
        console.log('Currency Columns Found:', result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

findCurrencyColumns();
