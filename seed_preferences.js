"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./backend/src/database");
const preferencePopulationService_1 = require("./backend/src/services/preferencePopulationService");
async function seedPreferences() {
    const client = await database_1.db.connect();
    try {
        console.log('🌱 Starting Preference Seeding...');
        // 1. Fetch all user characters with their archetypes
        const result = await client.query(`
      SELECT uc.id, c.name, c.archetype 
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
    `);
        console.log(`Found ${result.rows.length} characters to process.`);
        let count = 0;
        for (const char of result.rows) {
            if (!char.archetype) {
                console.warn(`⚠️ Skipping ${char.name} (ID: ${char.id}): No archetype found.`);
                continue;
            }
            console.log(`Processing ${char.name} (${char.archetype})...`);
            try {
                await preferencePopulationService_1.PreferencePopulationService.initializeRankings(char.id, char.archetype);
                console.log(`  -> Success: ${char.name}`);
            }
            catch (err) {
                console.error(`  -> Failed: ${char.name}`, err);
            }
            count++;
        }
        console.log(`✅ Successfully seeded preferences for ${count} characters.`);
    }
    catch (error) {
        console.error('❌ Seeding Failed:', error);
    }
    finally {
        client.release();
        process.exit(0);
    }
}
seedPreferences();
