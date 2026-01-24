
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars from backend root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function main() {
    try {
        const result = await db.query('SELECT id FROM characters ORDER BY id');
        console.log('--- CHARACTER IDS ---');
        result.rows.forEach(row => {
            console.log(row.id);
        });
        console.log('---------------------');
    } catch (error) {
        console.error('Error fetching character IDs:', error);
        process.exit(1);
    } finally {
        await db.end();
    }
}

main();
