import { db } from '../src/database';
import { v4 as uuidv4 } from 'uuid';

async function seedAIOpponents() {
    console.log('🌱 Seeding AI Opponents...');

    try {
        // 1. Create System AI Coach
        const coachId = uuidv4();
        await db.query(`
      INSERT INTO ai_coaches (id, name, difficulty_tier, personality_profile)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, [coachId, 'The Gatekeeper', 'tutorial', JSON.stringify({ style: 'encouraging', catchphrase: 'Show me what you got!' })]);

        console.log('✅ Created AI Coach: The Gatekeeper');

        // 2. Create Starter Team
        const teamId = uuidv4();
        await db.query(`
      INSERT INTO ai_teams (id, coach_id, name, rating, wins, losses)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [teamId, coachId, 'Training Squad', 1000, 0, 0]);

        console.log('✅ Created AI Team: Training Squad');

        // 3. Fetch 3 Canonical Characters to populate the team
        // We'll grab 3 random ones for now, or specific ones if known
        const characters = await db.query(`SELECT id, name, max_health, attack, defense, speed, magic_attack, magic_defense, max_mana, max_energy FROM characters LIMIT 3`);

        if (characters.rows.length < 3) {
            throw new Error('Not enough canonical characters found to create a team!');
        }

        // 4. Create AI Characters (Instances)
        for (const char of characters.rows) {
            await db.query(`
        INSERT INTO ai_characters (
          team_id, character_id, level, 
          current_health, max_health, 
          current_mana, max_mana, 
          current_energy, max_energy,
          attack, defense, speed, magic_attack, magic_defense
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
                teamId, char.id, 1,
                char.max_health, char.max_health,
                char.max_mana || 100, char.max_mana || 100,
                char.max_energy || 100, char.max_energy || 100,
                char.attack, char.defense, char.speed, char.magic_attack || 0, char.magic_defense || 0
            ]);
            console.log(`   - Added ${char.name} to Training Squad`);
        }

        console.log('✨ AI Opponent Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedAIOpponents();
