import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';

async function listCoachTables() {
    try {
        const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%coach%'
      ORDER BY table_name;
    `);
        console.log('Coach Tables found:', result.rows.map(r => r.table_name));

        // Also check for any 'level' tables that might be generic
        const levelTables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%level%'
      ORDER BY table_name;
    `);
        console.log('Level Tables found:', levelTables.rows.map(r => r.table_name));

    } catch (error) {
        console.error('Error:', error);
    }
}

listCoachTables();
