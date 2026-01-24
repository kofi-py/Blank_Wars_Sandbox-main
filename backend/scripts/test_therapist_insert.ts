
import { query } from '../src/database';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';

config();

async function testInsert() {
    try {
        const user_id = uuidv4();
        console.log('🧪 Testing Therapist Insert for fake user:', user_id);

        // 1. Create fake user
        await query(`INSERT INTO users (id, username, email, password_hash) VALUES ($1, 'test_therapist', 'test@example.com', 'hash')`, [user_id]);

        // 2. Try the INSERT query from AuthService
        console.log('📝 Executing INSERT query...');
        const result = await query(
            `INSERT INTO user_characters (
          id, user_id, character_id, nickname, level, experience, bond_level,
          current_health, current_max_health, equipment, is_injured,
          total_battles, total_wins, current_stress, current_mental_health,
          current_training, current_team_player, current_ego, current_communication, acquired_at
        )
        SELECT 
          gen_random_uuid() AS id,
          $1 AS user_id,
          c.id AS character_id,
          c.name AS nickname,
          1, 0, 0,
          LEAST(GREATEST(COALESCE(c.max_health, 100), 1), 999),
          LEAST(GREATEST(COALESCE(c.max_health, 100), 1), 999),
          '[]', false, 0, 0, 0,
          LEAST(GREATEST(COALESCE(c.mental_health, 80), 0), 100),
          LEAST(GREATEST(COALESCE(c.training, 75), 0), 100),
          LEAST(GREATEST(COALESCE(c.team_player, 70), 0), 100),
          LEAST(GREATEST(COALESCE(c.ego, 60), 0), 100),
          LEAST(GREATEST(COALESCE(c.communication, 80), 0), 100),
          NOW()
        FROM characters c
        WHERE c.role IN ('judge', 'therapist', 'host', 'system')
        AND NOT EXISTS (
          SELECT 1 FROM user_characters uc 
          WHERE uc.user_id = $1 AND uc.character_id = c.id
        )
        RETURNING id`,
            [user_id]
        );

        console.log(`✅ Success! Inserted ${result.rowCount} rows.`);

        // Clean up
        await query('DELETE FROM user_characters WHERE user_id = $1', [user_id]);
        await query('DELETE FROM users WHERE id = $1', [user_id]);

        process.exit(0);

    } catch (error) {
        console.error('❌ Insert failed:', error);
        process.exit(1);
    }
}

testInsert();
