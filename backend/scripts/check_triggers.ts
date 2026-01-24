import { query } from '../src/database/postgres';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkTriggers() {
    try {
        const result = await query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'characters'
    `);
        console.log('Triggers:', result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTriggers();
