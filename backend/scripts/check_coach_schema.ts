import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';

async function checkCoachSchema() {
    try {
        const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'coach_progression'
      ORDER BY ordinal_position;
    `);
        console.log('Coach Progression Columns:', result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

checkCoachSchema();
