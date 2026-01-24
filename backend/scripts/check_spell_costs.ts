import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';

async function checkSpellCosts() {
    try {
        const result = await query(`
      SELECT name, unlock_cost, rank_up_cost, rank_up_cost_r2, rank_up_cost_r3 
      FROM spell_definitions 
      LIMIT 5;
    `);
        console.log('Spell Costs:', result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSpellCosts();
