import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';
import { CoachProgressionService } from '../src/services/coachProgressionService';

async function verifyCoachProgression() {
    console.log('🔍 Verifying Coach Progression System...');

    try {
        // 1. Check Level 100 (Seeded)
        console.log('\n📊 Checking Level 100 (Seeded)...');
        const req100 = await CoachProgressionService.getLevelRequirement(100);
        if (req100) {
            console.log(`✅ Level 100: ${req100.total_xp_required} XP, Title: ${req100.title}, Tier: ${req100.tier}`);
        } else {
            console.error('❌ Failed to get Level 100');
        }

        // 2. Check Level 101 (Infinite Generation)
        console.log('\n🚀 Checking Level 101 (Dynamic Generation)...');
        const req101 = await CoachProgressionService.getLevelRequirement(101);
        if (req101) {
            console.log(`✅ Level 101: ${req101.total_xp_required} XP, Title: ${req101.title}, Tier: ${req101.tier}`);

            // Verify persistence
            const dbCheck = await query('SELECT * FROM coach_experience_levels WHERE level = 101');
            if (dbCheck.rows.length > 0) {
                console.log('✅ Level 101 persisted in database.');
            } else {
                console.error('❌ Level 101 NOT persisted in database!');
            }
        } else {
            console.error('❌ Failed to get Level 101');
        }

        // 3. Verify XP Curve Balance
        console.log('\n⚖️  Verifying XP Curve Balance...');
        const req1 = await CoachProgressionService.getLevelRequirement(1);
        const req10 = await CoachProgressionService.getLevelRequirement(10);
        const req50 = await CoachProgressionService.getLevelRequirement(50);

        if (req1 && req10 && req50) {
            console.log(`Level 1: ${req1.total_xp_required} XP`);
            console.log(`Level 10: ${req10.total_xp_required} XP`);
            console.log(`Level 50: ${req50.total_xp_required} XP`);

            if (req50.total_xp_required < 1000000) {
                console.log('✅ XP Curve is reasonable (Level 50 < 1M XP)');
            } else {
                console.warn('⚠️  XP Curve might be too steep!');
            }
        }

        console.log('\n✨ Verification Complete!');
    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }
}

verifyCoachProgression();
