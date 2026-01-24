
import { query } from './src/database/postgres';
import { v4 as uuidv4 } from 'uuid';

async function backfillPowers() {
    try {
        console.log('🚀 Starting power backfill...');

        // 1. Get all user characters with their metadata
        const userChars = await query(`
      SELECT uc.id as user_char_id, c.id as base_char_id, c.archetype, c.species
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
    `);

        console.log(`Found ${userChars.rows.length} user characters.`);

        for (const char of userChars.rows) {
            console.log(`Processing ${char.user_char_id} (${char.base_char_id})...`);

            // 2. Find applicable powers
            // - Signature powers (match character_id)
            // - Archetype powers (match archetype)
            // - Species powers (match species)
            // - Skills (tier = 'skill')
            const powers = await query(`
        SELECT id, tier FROM power_definitions
        WHERE character_id = $1
           OR archetype = $2
           OR species = $3
           OR tier = 'skill'
      `, [char.base_char_id, char.archetype, char.species]);

            console.log(`   Found ${powers.rows.length} applicable powers.`);

            // 3. Insert into character_powers
            let insertedCount = 0;
            for (const power of powers.rows) {
                // Check if already exists
                const exists = await query(`
          SELECT 1 FROM character_powers 
          WHERE character_id = $1 AND power_id = $2
        `, [char.user_char_id, power.id]);

                if (exists.rows.length === 0) {
                    const id = uuidv4();
                    // Determine if unlocked by default (e.g. basic skills)
                    // For now, let's unlock rank 1 skills, lock others
                    const isUnlocked = power.tier === 'skill';

                    await query(`
            INSERT INTO character_powers (
              id, character_id, power_id, current_rank, experience, 
              unlocked, times_used, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          `, [
                        id,
                        char.user_char_id,
                        power.id,
                        isUnlocked ? 1 : 0, // Rank 1 if unlocked, 0 if locked
                        0,
                        isUnlocked,
                        0
                    ]);
                    insertedCount++;
                }
            }
            if (insertedCount > 0) {
                console.log(`   ✅ Inserted ${insertedCount} new powers.`);
            } else {
                console.log(`   ✨ All powers already exist.`);
            }
        }

        console.log('🎉 Backfill complete!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Error during backfill:', err);
        process.exit(1);
    }
}

backfillPowers();
