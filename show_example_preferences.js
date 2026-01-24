"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./backend/src/database");
const preferencePopulationService_1 = require("./backend/src/services/preferencePopulationService");
const preferenceScoringService_1 = require("./backend/src/services/preferenceScoringService");
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
async function showExamplePreferences() {
    const client = await database_1.db.connect();
    try {
        console.log('📊 Generating Example Character Report...');
        // 1. Create a Test Mage
        const userId = generateId();
        const charId = generateId();
        await client.query(`INSERT INTO users (id, email, password_hash, username) VALUES ($1, 'mage@test.com', 'hash', 'TestMage') ON CONFLICT DO NOTHING`, [userId]);
        await client.query(`INSERT INTO characters (id, name, archetype, species, max_health, max_mana, max_energy, speed, attack, defense, special, description) 
       VALUES ($1, 'Gandalf the Test', 'mage', 'human', 100, 100, 100, 10, 10, 10, 10, 'A test mage') 
       ON CONFLICT (id) DO NOTHING`, [charId]);
        await client.query(`INSERT INTO user_characters (id, user_id, character_id, name, level) VALUES ($1, $2, $3, 'Gandalf the Test', 1) ON CONFLICT (id) DO NOTHING`, [charId, userId, charId]);
        // 2. Initialize Preferences (Mage)
        console.log('👉 Initializing Mage Preferences...');
        await preferencePopulationService_1.PreferencePopulationService.initializeRankings(charId, 'mage');
        // 3. Add Diverse Items
        const fireStaffId = 'staff_fire_' + generateId();
        const ironSwordId = 'sword_iron_' + generateId();
        const fireballId = 'spell_fireball_' + generateId();
        const healId = 'spell_heal_' + generateId();
        // Equipment
        await client.query(`INSERT INTO equipment (id, name, equipment_type, rarity, equipment_tier) VALUES ($1, 'Phoenix Staff', 'staff', 'rare', 2)`, [fireStaffId]);
        await client.query(`INSERT INTO equipment (id, name, equipment_type, rarity, equipment_tier) VALUES ($1, 'Rusty Iron Sword', 'sword', 'common', 1)`, [ironSwordId]);
        // Spells (Need definitions)
        await client.query(`INSERT INTO spell_definitions (id, name, category, description, effects) VALUES ($1, 'Fireball', 'offensive', 'Boom', '{"damage": {"type": "fire"}}')`, [fireballId]);
        await client.query(`INSERT INTO spell_definitions (id, name, category, description, effects) VALUES ($1, 'Minor Heal', 'heal', 'Soothe', '{"damage": {"type": "holy"}}')`, [healId]);
        // Give items
        await client.query(`INSERT INTO character_equipment (id, character_id, equipment_id) VALUES ($1, $2, $3)`, [generateId(), charId, fireStaffId]);
        await client.query(`INSERT INTO character_equipment (id, character_id, equipment_id) VALUES ($1, $2, $3)`, [generateId(), charId, ironSwordId]);
        await client.query(`INSERT INTO character_spells (id, character_id, spell_id, unlocked) VALUES ($1, $2, $3, true)`, [generateId(), charId, fireballId]);
        await client.query(`INSERT INTO character_spells (id, character_id, spell_id, unlocked) VALUES ($1, $2, $3, true)`, [generateId(), charId, healId]);
        // 4. Calculate Scores
        console.log('👉 Calculating Scores...');
        await preferenceScoringService_1.PreferenceScoringService.refreshCharacterScores(charId);
        // 5. Fetch and Display Results
        console.log('\n=== 📜 CHARACTER PREFERENCE REPORT: Gandalf the Test (Mage) ===\n');
        // A. Rankings
        console.log('--- 1. CATEGORY RANKINGS (The "DNA") ---');
        const rankings = await client.query(`SELECT category_type, category_value, rank, preference_score 
       FROM character_category_preferences 
       WHERE character_id = $1 
       ORDER BY category_type, rank DESC`, [charId]);
        let currentType = '';
        for (const row of rankings.rows) {
            if (row.category_type !== currentType) {
                console.log(`\n[${row.category_type.toUpperCase()}]`);
                currentType = row.category_type;
            }
            const stars = '⭐'.repeat(row.rank);
            console.log(`  ${row.category_value.padEnd(15)} | Rank: ${row.rank} ${stars.padEnd(5)} | Abstract Score: ${row.preference_score}`);
        }
        // B. Concrete Items
        console.log('\n\n--- 2. ITEM SCORES (Calculated from Rankings) ---');
        const equipment = await client.query(`SELECT e.name, e.equipment_type, ce.preference_score 
       FROM character_equipment ce JOIN equipment e ON ce.equipment_id = e.id 
       WHERE ce.character_id = $1`, [charId]);
        console.log('\n[EQUIPMENT]');
        for (const item of equipment.rows) {
            console.log(`  ${item.name.padEnd(20)} (${item.equipment_type}) -> Score: ${item.preference_score}`);
        }
        const spells = await client.query(`SELECT sd.name, sd.category, cs.preference_score 
       FROM character_spells cs JOIN spell_definitions sd ON cs.spell_id = sd.id 
       WHERE cs.character_id = $1`, [charId]);
        console.log('\n[SPELLS]');
        for (const spell of spells.rows) {
            console.log(`  ${spell.name.padEnd(20)} (${spell.category}) -> Score: ${spell.preference_score}`);
        }
    }
    catch (error) {
        console.error('❌ Report Generation Failed:', error);
    }
    finally {
        // Cleanup (Optional, but good for keeping DB clean)
        // await client.query('ROLLBACK'); 
        client.release();
        process.exit(0);
    }
}
showExamplePreferences();
