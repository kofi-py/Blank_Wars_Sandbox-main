
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inventoryBadData() {
    const client = await pool.connect();
    try {
        const uuidRegex = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

        console.log('--- INVENTORY OF DATA TO DELETE ---');

        // 1. Check character_memories
        const memRes = await client.query(`
      SELECT id, character_id, content 
      FROM character_memories 
      WHERE character_id !~ $1;
    `, [uuidRegex]);

        if (memRes.rows.length > 0) {
            console.log(`\nTABLE: character_memories (${memRes.rows.length} rows)`);
            memRes.rows.forEach(r => {
                console.log(`[DELETE] ID: ${r.id}\n  Key: ${r.character_id}\n  Info: Memory for ${r.content.substring(0, 30)}...`);
            });
        }

        // 2. Check battle_participants
        const batRes = await client.query(`
      SELECT battle_id, character_id 
      FROM battle_participants 
      WHERE character_id !~ $1;
    `, [uuidRegex]);

        if (batRes.rows.length > 0) {
            console.log(`\nTABLE: battle_participants (${batRes.rows.length} rows)`);
            batRes.rows.forEach(r => {
                console.log(`[DELETE] BattleID: ${r.battle_id}\n  Key: ${r.character_id}\n  Info: Participant record`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

inventoryBadData();
