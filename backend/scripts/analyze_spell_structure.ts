
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { query } from '../src/database/postgres';

async function analyzeSpellStructure() {
    try {
        console.log('--- 🕵️‍♀️ Forensic Analysis of Spell Definitions ---');

        // 1. Check 'tier' column values
        console.log('\n1. Analysis of "tier" column (Is this Strength?):');
        const tiers = await query(`SELECT tier, COUNT(*) FROM spell_definitions GROUP BY tier ORDER BY tier`);
        console.table(tiers.rows);

        // 2. Check 'required_level' distribution (Is this Strength?)
        console.log('\n2. Analysis of "required_level" (Does this group into 3 buckets?):');
        const levels = await query(`SELECT required_level, COUNT(*) FROM spell_definitions GROUP BY required_level ORDER BY required_level`);
        console.table(levels.rows);

        // 3. Check 'unlock_cost' distribution
        console.log('\n3. Analysis of "unlock_cost" (Does this group into 3 buckets?):');
        const costs = await query(`SELECT unlock_cost, COUNT(*) FROM spell_definitions GROUP BY unlock_cost ORDER BY unlock_cost`);
        console.table(costs.rows);

        // 4. Checking Spell Counts per Category/Tier/Species
        console.log('\n4a. Spells per Tier:');
        const tiers2 = await query(`SELECT tier, COUNT(*) FROM spell_definitions GROUP BY tier ORDER BY tier`);
        console.table(tiers2.rows);

        console.log('\n4b. Spells per Category:');
        const cats = await query(`SELECT category, COUNT(*) FROM spell_definitions GROUP BY category ORDER BY category`);
        console.table(cats.rows);

        console.log('\n4c. Spells per Species:');
        const species = await query(`SELECT species, COUNT(*) FROM spell_definitions WHERE species IS NOT NULL GROUP BY species ORDER BY species`);
        console.table(species.rows);

        // 5. Sample a specific group to see the "4 weak, 2 medium, 1 strong" pattern
        // We'll use 'species' as a proxy for archetype if available, or 'tier'
        if (species.rows.length > 0) {
            // Find 'demon' or fallback to first
            const demon = species.rows.find(r => r.species === 'demon');
            const sampleSpecies = demon ? 'demon' : species.rows[0].species;

            console.log(`\n5. Deep Dive into Species: ${sampleSpecies}`);
            const spells = await query(`
        SELECT name, mana_cost, cooldown_turns, unlock_cost, required_level
        FROM spell_definitions
        WHERE species = $1
        ORDER BY unlock_cost, mana_cost
      `, [sampleSpecies]);
            console.table(spells.rows);
        } else if (tiers2.rows.length > 0) {
            const sampleTier = tiers2.rows[0].tier;
            console.log(`\n5. Deep Dive into Tier: ${sampleTier}`);
            const spells = await query(`
        SELECT name, mana_cost, cooldown_turns, unlock_cost, required_level
        FROM spell_definitions
        WHERE tier = $1
        ORDER BY required_level, mana_cost
      `, [sampleTier]);
            console.table(spells.rows);
        }

    } catch (error) {
        console.error('Error analyzing database:', error);
    } finally {
        process.exit();
    }
}

analyzeSpellStructure();
