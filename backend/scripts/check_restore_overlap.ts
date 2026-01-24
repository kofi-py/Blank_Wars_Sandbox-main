
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
const connectionString = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        console.log('--- Checking Overlap between user_characters and user_characters_old ---');

        // Check finding match by ID
        const res = await client.query(`
            SELECT 
                COUNT(*) as total_current_rows,
                COUNT(old.id) as match_count,
                COUNT(CASE WHEN old.sleeping_arrangement IS NOT NULL THEN 1 END) as restorable_count
            FROM user_characters uc
            LEFT JOIN user_characters_old old ON uc.id = old.id
        `);

        console.table(res.rows);

        // Sample what the restore would look like
        const sample = await client.query(`
            SELECT 
                uc.id, 
                uc.character_id,
                uc.sleeping_arrangement as current_val,
                old.sleeping_arrangement as backup_val
            FROM user_characters uc
            JOIN user_characters_old old ON uc.id = old.id
            WHERE uc.sleeping_arrangement IS NULL 
            AND old.sleeping_arrangement IS NOT NULL
            LIMIT 5
        `);

        if (sample.rows.length > 0) {
            console.log('\n--- Sample Restoration Candidates ---');
            console.table(sample.rows);
        } else {
            console.log('\nNo direct ID matches found with restorable data.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
