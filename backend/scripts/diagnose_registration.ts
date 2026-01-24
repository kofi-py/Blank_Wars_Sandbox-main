
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const RAILWAY_DB_URL = process.env.RAILWAY_DATABASE_URL;

if (!RAILWAY_DB_URL) {
    console.error('❌ RAILWAY_DATABASE_URL not found in environment');
    process.exit(1);
}

const client = new Client({
    connectionString: RAILWAY_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function diagnose() {
    console.log('🔍 connecting to database...');
    await client.connect();

    try {
        console.log('🔄 Starting transaction (WILL ROLLBACK)...');
        await client.query('BEGIN');

        // Simulate creating a user (needed for FK)
        const userId = '00000000-0000-0000-0000-000000000001'; // Fake UUID
        // We might need to insert a fake user first if FK constraint exists
        // Check if fake user exists, if not insert
        await client.query(`
            INSERT INTO users (id, username, email, password_hash, coach_name)
            VALUES ($1, 'diagnosis_user', 'diagnosis@example.com', 'hash', 'Diagnosis Coach')
            ON CONFLICT (id) DO NOTHING
        `, [userId]);

        // Get a starter character ID (e.g., jack_the_ripper) from characters table
        const charResult = await client.query(`
            SELECT id FROM characters WHERE rarity = 'common' OR id = 'jack_the_ripper' LIMIT 1
        `);

        if (charResult.rows.length === 0) {
            throw new Error('No starter characters found to test with');
        }

        const charId = charResult.rows[0].id; // Should be TEXT (slug)
        console.log(`🧪 Testing registration for character: ${charId}`);

        // THE OPERATIONS THAT MIGHT FAIL
        // 1. Insert into user_characters (triggers auto_unlock_starters)
        console.log('📝 Attempting INSERT INTO user_characters...');

        // Note: Using gen_random_uuid() for id
        await client.query(`
            INSERT INTO user_characters (
                user_id, character_id, nickname, level, experience, bond_level,
                current_health, current_max_health, equipment, is_injured,
                total_battles, total_wins, current_stress, current_mental_health,
                current_training, current_team_player, current_ego, current_communication, acquired_at
            ) VALUES (
                $1, $2, $3, 1, 0, 0,
                100, 100, '[]', false,
                0, 0, 0, 75,
                75, 75, 50, 50, NOW()
            )
        `, [userId, charId, 'Test Nickname']);

        console.log('✅ INSERT succeeded (Trigger apparently worked?)');

        // If we got here, maybe the error is in the THERAPIST creation logic?
        // Let's test that too.
        console.log('📝 Attempting Therapist Creation Logic...');

        // This query matches what is in AuthService.register
        const therapistResult = await client.query(`
         INSERT INTO user_characters (
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
        RETURNING id
        `, [userId]);

        console.log(`✅ Therapist INSERT succeeded. Rows: ${therapistResult.rowCount}`);

    } catch (err: any) {
        console.error('\n❌ ERROR CAUGHT:');
        console.error('Message:', err.message);
        console.error('Detail:', err.detail);
        console.error('Code:', err.code);
        console.error('Where:', err.where);
        // console.error('Full Error:', err);
    } finally {
        console.log('🔄 Rolling back transaction...');
        await client.query('ROLLBACK');
        await client.end();
    }
}

diagnose();
