
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { query } = require('../src/database/index');
const { CharacterProgressionService } = require('../src/services/characterProgressionService');

async function verifyMasteryGain() {
    try {
        console.log('🧪 Starting Mastery Gain Verification...');

        // 1. Get a test character with a spell
        const charResult = await query(`
      SELECT uc.id, uc.character_id 
      FROM user_characters uc
      JOIN character_spells cs ON uc.id = cs.character_id
      LIMIT 1
    `);

        if (charResult.rows.length === 0) {
            console.log('⚠️ No characters with spells found. Checking for ANY character...');

            const anyCharResult = await query('SELECT id, character_id FROM user_characters LIMIT 1');
            if (anyCharResult.rows.length === 0) {
                console.log('⚠️ No characters found at all. Creating a dummy character...');
                // Insert dummy user and character (simplified)
                // This is getting complicated. Let's just abort and report.
                console.log('❌ No characters available to test. Please seed the database.');
                return;
            }

            const char = anyCharResult.rows[0];
            console.log(`👤 Found character without spells: ${char.id}. Assigning 'Minor Heal'...`);

            // Get Minor Heal ID
            const spellDef = await query("SELECT id FROM spell_definitions WHERE name = 'Minor Heal'");
            if (spellDef.rows.length === 0) {
                console.error('❌ Minor Heal definition not found!');
                return;
            }

            // Assign spell
            await query(`
        INSERT INTO character_spells (character_id, spell_id, unlocked, mastery_level, mastery_points)
        VALUES ($1, $2, true, 1, 0)
      `, [char.id, spellDef.rows[0].id]);

            // Retry query
            const retryResult = await query(`
        SELECT uc.id, uc.character_id 
        FROM user_characters uc
        JOIN character_spells cs ON uc.id = cs.character_id
        WHERE uc.id = $1
        LIMIT 1
      `, [char.id]);

            if (retryResult.rows.length > 0) {
                charResult.rows = retryResult.rows; // Hack to proceed
            } else {
                console.error('❌ Failed to assign spell.');
                return;
            }
        }
        const characterId = charResult.rows[0].id;
        console.log(`👤 Using character: ${characterId}`);

        // 2. Get a spell for this character
        const spellResult = await query(`
      SELECT spell_id, mastery_points, mastery_level 
      FROM character_spells 
      WHERE character_id = $1 
      LIMIT 1
    `, [characterId]);

        const spell = spellResult.rows[0];
        console.log(`✨ Using spell: ${spell.spell_id} (Level: ${spell.mastery_level}, Points: ${spell.mastery_points})`);

        // 3. Award mastery points
        const pointsToAward = 10;
        console.log(`➕ Awarding ${pointsToAward} mastery points...`);

        const result = await CharacterProgressionService.awardMasteryPoints(
            characterId,
            spell.spell_id,
            'spell',
            pointsToAward
        );

        console.log(`✅ Result:`, result);

        // 4. Verify database state
        const newSpellResult = await query(`
      SELECT mastery_points, mastery_level 
      FROM character_spells 
      WHERE character_id = $1 AND spell_id = $2
    `, [characterId, spell.spell_id]);

        const newSpell = newSpellResult.rows[0];
        console.log(`📊 New State: Level: ${newSpell.mastery_level}, Points: ${newSpell.mastery_points}`);

        if (newSpell.mastery_points === spell.mastery_points + pointsToAward) {
            console.log('✅ Mastery points updated correctly!');
        } else {
            console.error('❌ Mastery points mismatch!');
        }

        // 5. Test Level Up (if possible)
        console.log('🚀 Attempting to force a level up...');
        const hugePoints = 1000;
        await CharacterProgressionService.awardMasteryPoints(
            characterId,
            spell.spell_id,
            'spell',
            hugePoints
        );

        const finalSpellResult = await query(`
      SELECT mastery_points, mastery_level 
      FROM character_spells 
      WHERE character_id = $1 AND spell_id = $2
    `, [characterId, spell.spell_id]);

        const finalSpell = finalSpellResult.rows[0];
        console.log(`🎉 Final State: Level: ${finalSpell.mastery_level}, Points: ${finalSpell.mastery_points}`);

        if (finalSpell.mastery_level > newSpell.mastery_level) {
            console.log('✅ Level up trigger worked!');
        } else {
            console.log('⚠️ Level did not increase. Check mastery_config or points required.');
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        process.exit();
    }
}

verifyMasteryGain();
