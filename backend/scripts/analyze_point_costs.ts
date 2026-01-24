
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { query } from '../src/database/postgres';

async function analyzePointCosts() {
    try {
        console.log('--- 💰 Analyzing Character Point Costs ---');

        // 1. Check Spell Costs
        console.log('\n--- Spells: Unlock & Rank Up Costs ---');
        const spellCosts = await query(`
      SELECT name, tier, unlock_cost, rank_up_cost_r3 
      FROM spell_definitions 
      WHERE unlock_cost IS NOT NULL 
      ORDER BY tier, unlock_cost 
      LIMIT 10;
    `);
        console.table(spellCosts.rows);

        // 2. Check Power Costs
        console.log('\n--- Powers: Unlock & Rank Up Costs ---');
        const powerCosts = await query(`
      SELECT name, tier, unlock_cost, rank_up_cost_r3 
      FROM power_definitions 
      WHERE unlock_cost IS NOT NULL 
      ORDER BY tier, unlock_cost 
      LIMIT 10;
    `);
        console.table(powerCosts.rows);

        // 3. Check for the "Signature" Tier (Tier 4)
        console.log('\n--- Signature Tier Check ---');
        const signature = await query(`
      SELECT name, tier, unlock_cost, rank_up_cost_r3 
      FROM spell_definitions 
      WHERE tier = 'signature' OR tier = 'individual'
      LIMIT 5;
    `);
        if (signature.rows.length > 0) {
            console.table(signature.rows);
        } else {
            console.log('No "signature" tier spells found (might be named differently).');
        }

    } catch (error) {
        console.error('Error analyzing database:', error);
    } finally {
        process.exit();
    }
}

analyzePointCosts();
