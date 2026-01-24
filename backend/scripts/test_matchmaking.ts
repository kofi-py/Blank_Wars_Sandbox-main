
import { db, query } from '../src/database';
import { loadBattleCharacter } from '../src/services/battleCharacterLoader';
import dotenv from 'dotenv';

dotenv.config();

async function testMatchmaking() {
    const userId = 'cd8f8fca-0ab1-452e-8c75-c38c5360be35'; // testuser123

    try {
        console.log(`Testing matchmaking for user ${userId}...`);

        // 1. Load User's Team
        const teamResult = await query(`
      SELECT t.id as team_id, t.character_slot_1, t.character_slot_2, t.character_slot_3
      FROM teams t
      WHERE t.user_id = $1 AND t.is_active = true
      LIMIT 1
    `, [userId]);

        if (teamResult.rows.length === 0) {
            throw new Error('No active team found.');
        }

        const team = teamResult.rows[0];
        console.log('Team found:', team);

        const characterSlots = [team.character_slot_1, team.character_slot_2, team.character_slot_3].filter(Boolean);

        if (characterSlots.length !== 3) {
            throw new Error(`Team incomplete. Found ${characterSlots.length}/3 characters.`);
        }

        console.log(`Loading ${characterSlots.length} characters...`);

        // 2. Load Battle Characters
        const team_characters = [];
        for (const charId of characterSlots) {
            console.log(`Loading character ${charId}...`);
            const battle_character = await loadBattleCharacter(charId);

            if (!battle_character) {
                throw new Error(`Failed to load character ${charId}`);
            }

            console.log(`Loaded ${battle_character.name} (HP: ${battle_character.current_health}/${battle_character.max_health})`);
            team_characters.push(battle_character);
        }

        console.log('All characters loaded successfully.');
        console.log('Matchmaking simulation passed!');

    } catch (error) {
        console.error('Matchmaking test failed:', error);
    } finally {
        await db.end();
    }
}

testMatchmaking();
