
import { query } from '../database';
import { config } from 'dotenv';
import { db_adapter } from '../services/databaseAdapter';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config();

async function verifyFix() {
    console.log('🔍 Verifying Registration Fix...');

    try {
        // 1. Get a valid character ID
        const charResult = await query('SELECT id FROM characters LIMIT 1');
        if (charResult.rows.length === 0) {
            throw new Error('No characters found');
        }
        const charId = charResult.rows[0].id;
        console.log(`✅ Found character ID: ${charId}`);

        // 2. Create a dummy user
        const userId = uuidv4();
        console.log(`👤 Creating dummy user: ${userId}`);
        await query(
            `INSERT INTO users (id, username, email, password_hash, subscription_tier, level, experience, total_battles, total_wins, rating, character_slot_capacity)
       VALUES ($1, $2, $3, $4, 'free', 1, 0, 0, 0, 1000, 12)`,
            [userId, `verify_user_${Date.now()}`, `verify_${Date.now()}@example.com`, 'hash']
        );

        // 3. Try to create a user character using the adapter
        console.log('🛠️ Attempting to create user character via db_adapter...');
        try {
            const result = await db_adapter.user_characters.create({
                user_id: userId,
                character_id: charId,
                nickname: 'Verify Char'
            });

            if (result) {
                console.log('✅ SUCCESS: User character created successfully!');
            } else {
                console.error('❌ FAILURE: User character creation returned NULL');
            }
        } catch (err) {
            console.error('❌ EXCEPTION calling create:', err);
        }

        // Cleanup
        console.log('🧹 Cleaning up...');
        await query('DELETE FROM user_characters WHERE user_id = $1', [userId]);
        await query('DELETE FROM users WHERE id = $1', [userId]);

    } catch (error) {
        console.error('❌ Error running verification script:', error);
    } finally {
        process.exit();
    }
}

verifyFix();
