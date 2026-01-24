
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
const connectionString = process.env.RAILWAY_DATABASE_URL;

if (!connectionString) {
    console.error('CRITICAL ERROR: RAILWAY_DATABASE_URL is not defined');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('--- RAILWAY DB CONNECTED ---');

        // 1. Definitively check current_mood column
        console.log('\n--- 1. Checking "current_mood" Column ---');
        const resCol = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'user_characters' 
            AND column_name = 'current_mood';
        `);
        if (resCol.rows.length === 0) {
            console.log('RESULT: "current_mood" column DOES NOT EXIST.');
        } else {
            console.log('RESULT: "current_mood" column EXISTS:', resCol.rows[0]);
        }

        // 2. Analyze get_full_character_data signatures
        console.log('\n--- 2. Analyzing "get_full_character_data" Overloads ---');
        const resFuncs = await client.query(`
            SELECT 
                p.oid,
                p.proname, 
                pg_get_function_identity_arguments(p.oid) as args,
                length(pg_get_functiondef(p.oid)) as src_len,
                pg_get_functiondef(p.oid) as source
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = 'get_full_character_data'
            AND n.nspname = 'public';
        `);

        if (resFuncs.rows.length === 0) {
            console.log('RESULT: Function NOT FOUND.');
        } else {
            resFuncs.rows.forEach(r => {
                const hasCsCategory = r.source.includes('cs.category');
                console.log(`\nSignature: ${r.proname}(${r.args})`);
                console.log(`- Source Length: ${r.src_len}`);
                console.log(`- Contains 'cs.category'?: ${hasCsCategory ? 'YES (Correct)' : 'NO (BROKEN)'}`);
            });
        }

        // 3. Check Migration Log for "240" collisions
        console.log('\n--- 3. Checking Migration Log "240" Entries ---');
        const res240 = await client.query(`SELECT * FROM migration_log WHERE version::text LIKE '240%'`);
        console.table(res240.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
