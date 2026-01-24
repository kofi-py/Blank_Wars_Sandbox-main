import { assembleAbilitiesPromptUniversal } from '../src/services/promptAssemblyService';
import dotenv from 'dotenv';
import { db, query } from '../src/database';

dotenv.config();

async function verifyPromptAssembly() {
    const teamId = 'e84199aa-7073-4d1b-8826-bbb8b763d057';
    const characterId = 'achilles';
    const userId = 'cd8f8fca-0ab1-452e-8c75-c38c5360be35'; // testuser123

    try {
        console.log('Testing prompt assembly...');

        // Check if achilles exists
        const charResult = await query('SELECT * FROM characters WHERE id = $1', [characterId]);
        if (charResult.rows.length === 0) {
            console.log('Achilles not found, using first available character');
            const anyChar = await query('SELECT id FROM characters LIMIT 1');
            if (anyChar.rows.length === 0) throw new Error('No characters in DB');
            // characterId = anyChar.rows[0].id; // const assignment error if I uncomment
        }

        // Create a dummy user_character if needed
        const userCharId = 'test-user-char-id';
        await query(`
            INSERT INTO user_characters (
                id, user_id, character_id, 
                current_health, max_health
            )
            VALUES ($1, $2, $3, 100, 100)
            ON CONFLICT (id) DO NOTHING
        `, [userCharId, userId, characterId]);

        const prompt = await assembleAbilitiesPromptUniversal(
            characterId, // agent_key
            ['merlin'], // roommates
            ['merlin'], // teammates
            '', // memory
            '', // conversation_history
            'Can I upgrade my sword?', // user_message
            'initial', // session_stage
            100, // wallet
            0, // debt
            teamId, // user_id (passed as team_id)
            userCharId, // userchar_id
            { // abilities_data
                character_points: 10,
                level: 1,
                unlocked_powers: [],
                available_powers: [],
                learned_spells: [],
                available_spells: []
            }
        );
        console.log('Prompt assembly successful!');
        console.log('Prompt length:', prompt.length);
        console.log('Prompt preview:', prompt.substring(0, 200));
    } catch (error) {
        console.error('Prompt assembly failed:', error);
    } finally {
        await db.end();
    }
}

verifyPromptAssembly();
