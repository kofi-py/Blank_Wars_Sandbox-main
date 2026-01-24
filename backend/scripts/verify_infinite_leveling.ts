import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';
import { CharacterProgressionService } from '../src/services/characterProgressionService';

async function verifyInfiniteLeveling() {
    console.log('🔍 Verifying Infinite Leveling Logic...');

    try {
        // 1. Check Level 100 (should exist from seed)
        console.log('\n📊 Checking Level 100 (Seeded)...');
        const req100 = await CharacterProgressionService.getLevelRequirement(100);
        if (req100) {
            console.log(`✅ Level 100: ${req100.total_xp_required} XP, Tier: ${req100.tier_title}`);
        } else {
            console.error('❌ Failed to get Level 100');
        }

        // 2. Check Level 101 (Should be generated on fly)
        console.log('\n🚀 Checking Level 101 (Dynamic Generation)...');
        const req101 = await CharacterProgressionService.getLevelRequirement(101);
        if (req101) {
            console.log(`✅ Level 101: ${req101.total_xp_required} XP, Tier: ${req101.tier_title}`);

            // Verify it was actually inserted into DB
            const dbCheck = await query('SELECT * FROM experience_levels WHERE level = 101');
            if (dbCheck.rows.length > 0) {
                console.log('✅ Level 101 persisted in database.');
            } else {
                console.error('❌ Level 101 NOT persisted in database!');
            }
        } else {
            console.error('❌ Failed to get Level 101');
        }

        // 3. Check Level 105 (Should generate 102-105)
        console.log('\n🚀 Checking Level 105 (Gap Generation)...');
        const req105 = await CharacterProgressionService.getLevelRequirement(105);
        if (req105) {
            console.log(`✅ Level 105: ${req105.total_xp_required} XP`);

            // Verify intermediate levels
            const count = await query('SELECT COUNT(*) FROM experience_levels WHERE level BETWEEN 102 AND 105');
            console.log(`✅ Generated ${count.rows[0].count} levels (102-105).`);
        }

        console.log('\n✨ Verification Complete!');
    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }
}

verifyInfiniteLeveling();
