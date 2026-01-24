
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTypes() {
    const client = await pool.connect();
    try {
        const tables = ['character_decisions', 'character_memories', 'battle_participants'];
        console.log('--- Checking Column Types ---');

        for (const table of tables) {
            const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'character_id';
      `, [table]);

            if (res.rows.length > 0) {
                console.log(`${table}.character_id: ${res.rows[0].data_type}`);
            } else {
                console.log(`${table}.character_id: NOT FOUND`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTypes();
