
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

        // Check if triggers AND old functions exist
        console.log('Checking for existing triggers/functions that might conflict with UPDATE...');

        const triggerRes = await client.query(`
            SELECT trigger_name 
            FROM information_schema.triggers 
            WHERE trigger_name = 'trg_sync_sleeping_mood_modifier'
        `);

        const funcRes = await client.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_name = 'upsert_sleeping_mood_modifier'
        `);

        console.log(`Trigger exists? ${triggerRes.rows.length > 0}`);
        console.log(`Function exists? ${funcRes.rows.length > 0}`);

        if (triggerRes.rows.length > 0) {
            console.log('CRITICAL WARNING: Trigger TRG_SYNC_SLEEPING_MOOD_MODIFIER exists!');
            console.log('If we run UPDATE user_characters SET sleeping_arrangement = ..., this trigger will fire.');
            console.log('It will call upsert_sleeping_mood_modifier, which might be the OLD broken version.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
