
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function scanForNonUUIDs() {
    const client = await pool.connect();
    try {
        const tables = ['character_decisions', 'character_memories', 'battle_participants'];
        console.log('--- Scanning for Non-UUID character_ids ---');

        // Regex for UUID v4
        const uuidRegex = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

        for (const table of tables) {
            const res = await client.query(`
        SELECT character_id 
        FROM ${table} 
        WHERE character_id !~ $1
        LIMIT 5;
      `, [uuidRegex]);

            if (res.rows.length > 0) {
                console.log(`[WARNING] ${table} contains non-UUIDs! Examples:`);
                res.rows.forEach(r => console.log(` - ${r.character_id}`));
            } else {
                console.log(`[OK] ${table} contains ONLY valid UUIDs.`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

scanForNonUUIDs();
