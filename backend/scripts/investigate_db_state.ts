
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

// Use RAILWAY_DATABASE_URL specifically as requested by user
const connectionString = process.env.RAILWAY_DATABASE_URL;

if (!connectionString) {
    console.error('CRITICAL ERROR: RAILWAY_DATABASE_URL is not defined in .env');
    process.exit(1);
}

console.log('--- Connecting to RAILWAY PRODUCTION DATABASE ---');
// Hide password in logs
console.log('URL:', connectionString.replace(/:[^:/@]+@/, ':****@'));

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Required for Railway/Production
});

async function run() {
    try {
        await client.connect();
        console.log('--- DB Connection Successful ---');
        console.log('Database:', client.database);

        // 1. Check Migration Log (Top 20)
        console.log('\n--- Recent Migrations (Top 20) ---');
        const resMig = await client.query('SELECT version, name, executed_at FROM migration_log ORDER BY version DESC LIMIT 20');
        console.table(resMig.rows);

        // 2. Check user_characters schema
        console.log('\n--- User Characters Schema (ID Default & current_mood) ---');
        const resSchema = await client.query(`
            SELECT column_name, column_default, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user_characters' 
            AND column_name IN ('id', 'current_mood');
        `);
        console.table(resSchema.rows);

        // 3. Check specific function definition
        console.log('\n--- get_full_character_data Definition ---');
        const resFunc = await client.query(`
            SELECT pg_get_functiondef(oid) as source
            FROM pg_proc
            WHERE proname = 'get_full_character_data';
        `);

        if (resFunc.rows.length === 0) {
            console.log('Function get_full_character_data NOT FOUND.');
        } else {
            resFunc.rows.forEach((row, i) => {
                const src = row.source;
                const hasCsCategory = src.includes('cs.category');
                console.log(`Definition ${i + 1}: Length ${src.length} chars. Contains 'cs.category'? ${hasCsCategory}`);

                // Context check
                const match = src.match(/comedian_name.*?(cs\.category|cs_category).*?FROM/s);
                if (match) {
                    console.log('Found context:', match[0].substring(0, 100) + '...');
                } else {
                    console.log('Could not find cs.category in select list context.');
                }
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
