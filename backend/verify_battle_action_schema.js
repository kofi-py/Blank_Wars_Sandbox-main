
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
    connectionString: "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway",
    ssl: false
});

async function verifySchema() {
    console.log('🔍 Verifying battle_actions schema...');
    const client = await pool.connect();

    try {
        // 0. Get valid user ID
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) throw new Error('No users found in DB');
        const userId = userRes.rows[0].id;

        // 1. Create dummy battle
        const battleId = uuidv4();
        await client.query(`
            INSERT INTO battles (id, status, started_at, user_id, opponent_user_id)
            VALUES ($1, 'active', NOW(), $2, $2)
        `, [battleId, userId]);
        console.log('✅ Created dummy battle:', battleId);

        // 2. Insert action with attack_type_id
        const actionId = uuidv4();
        const attackTypeId = 'heavy';

        await client.query(`
            INSERT INTO battle_actions (
                id, battle_id, character_id, action_type, 
                attack_type_id, 
                request, result, round_num, turn_num, sequence_num
            ) VALUES ($1, $2, 'test_char', 'attack', $3, '{}', '{}', 1, 1, 1)
        `, [actionId, battleId, attackTypeId]);
        console.log('✅ Inserted action with attack_type_id:', attackTypeId);

        // 3. Verify retrieval
        const res = await client.query(`
            SELECT id, action_type, attack_type_id 
            FROM battle_actions 
            WHERE id = $1
        `, [actionId]);

        const row = res.rows[0];
        console.table(row);

        if (row.attack_type_id === 'heavy') {
            console.log('🎉 SUCCESS: attack_type_id was stored and retrieved correctly!');
        } else {
            console.error('❌ FAILURE: attack_type_id mismatch:', row.attack_type_id);
        }

        // Cleanup
        await client.query('DELETE FROM battle_actions WHERE battle_id = $1', [battleId]);
        await client.query('DELETE FROM battles WHERE id = $1', [battleId]);
        console.log('🧹 Cleanup complete');

    } catch (err) {
        console.error('❌ Verification failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

verifySchema();
