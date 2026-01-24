
import { db, query } from '../src/database';
import { PackService } from '../src/services/packService';
import dotenv from 'dotenv';

dotenv.config();

async function fixTeamProperly() {
    const userId = 'cd8f8fca-0ab1-452e-8c75-c38c5360be35'; // testuser123
    const teamId = 'e84199aa-7073-4d1b-8826-bbb8b763d057';

    try {
        console.log(`Fixing team for user ${userId} using PackService...`);

        // 1. Initialize PackService
        const packService = new PackService();

        // 2. Generate Standard Starter Pack
        console.log('Generating standard starter pack...');
        const claimToken = await packService.generate_pack('standard_starter', userId);
        console.log(`Pack generated with token: ${claimToken}`);

        // 3. Claim the Pack
        console.log('Claiming pack...');
        const claimResult = await packService.claim_pack(userId, claimToken);
        console.log(`Pack claimed! Granted characters:`, claimResult.granted_characters);

        if (claimResult.granted_characters.length === 0) {
            console.log('No new characters granted (maybe user already had them?). Checking existing characters...');
        }

        // 4. Get User's Characters (ensure we have 3 for the team)
        const userCharsResult = await query(
            'SELECT id FROM user_characters WHERE user_id = $1 LIMIT 3',
            [userId]
        );
        const charIds = userCharsResult.rows.map(r => r.id);

        if (charIds.length < 3) {
            throw new Error(`Insufficient characters found (${charIds.length}/3) even after pack claim.`);
        }

        console.log(`Assigning characters to team:`, charIds);

        // 5. Update Team Slots
        await query(`
      UPDATE teams
      SET character_slot_1 = $1,
          character_slot_2 = $2,
          character_slot_3 = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [charIds[0], charIds[1], charIds[2], teamId]);

        console.log('Team slots updated successfully.');

    } catch (error) {
        console.error('Error fixing team:', error);
    } finally {
        await db.end();
    }
}

fixTeamProperly();
