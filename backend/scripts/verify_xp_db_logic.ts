import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';
import { CharacterProgressionService } from '../src/services/characterProgressionService';

async function verifyXPLogic() {
    console.log('🔍 Verifying XP Database Logic...');

    try {
        // 1. Verify table existence and data
        console.log('\n📊 Checking experience_levels table...');
        const result = await query('SELECT COUNT(*) FROM experience_levels');
        const count = parseInt(result.rows[0].count);
        console.log(`✅ Found ${count} levels in database.`);

        if (count < 100) {
            console.error('❌ Expected at least 100 levels!');
        }

        // 2. Check specific levels
        const levels = [1, 10, 50, 100];
        for (const level of levels) {
            const req = await CharacterProgressionService.getLevelRequirement(level);
            if (req) {
                console.log(`✅ Level ${level}: ${req.total_xp_required} XP, Tier: ${req.tier_title}`);
            } else {
                console.error(`❌ Failed to get requirement for Level ${level}`);
            }
        }

        // 3. Verify Service Method
        console.log('\nTesting calculateTotalXPForLevel (Fallback/Helper)...');
        const xp50 = CharacterProgressionService.calculateTotalXPForLevel(50);
        console.log(`✅ Level 50 Total XP (Calculated): ${xp50}`);

        console.log('\n✨ Verification Complete!');
    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }
}

verifyXPLogic();
