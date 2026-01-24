
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function deleteBadData() {
    const client = await pool.connect();
    try {
        const uuidRegex = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

        console.log('--- EXECUTING DELETION OF LEGACY DATA ---');

        // 1. Clean character_memories
        const memRes = await client.query(`
      DELETE FROM character_memories 
      WHERE character_id !~ $1
      RETURNING id, character_id;
    `, [uuidRegex]);
        console.log(`[DELETED] character_memories: ${memRes.rowCount} rows removed.`);

        // 2. Clean battle_participants
        const batRes = await client.query(`
      DELETE FROM battle_participants 
      WHERE character_id !~ $1
      RETURNING battle_id, character_id;
    `, [uuidRegex]);
        console.log(`[DELETED] battle_participants: ${batRes.rowCount} rows removed.`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

deleteBadData();
