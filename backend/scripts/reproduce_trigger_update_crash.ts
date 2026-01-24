
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

        console.log('--- SETUP: creating conflicting trigger ---');
        // Create a dummy function that simulates the OLD logic (which might be crashing)
        await client.query(`
            CREATE OR REPLACE FUNCTION upsert_sleeping_mood_modifier() RETURNS TRIGGER AS $$
            BEGIN
                RAISE EXCEPTION 'CRASH: The OLD trigger fired!';
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create the trigger that calls it
        await client.query(`
            DROP TRIGGER IF EXISTS trg_sync_sleeping_mood_modifier ON user_characters;
            CREATE TRIGGER trg_sync_sleeping_mood_modifier
            AFTER UPDATE OF sleeping_arrangement ON user_characters
            FOR EACH ROW EXECUTE FUNCTION upsert_sleeping_mood_modifier();
        `);

        console.log('--- TEST: Running UPDATE with DROP logic (Simulating Migration 242) ---');

        // This resembles the START of Migration 242
        await client.query('BEGIN');

        try {
            // 0. The Fix: DROP triggers first
            console.log('Step 0: Dropping triggers...');
            await client.query('DROP TRIGGER IF EXISTS trg_sync_sleeping_mood_modifier ON user_characters');

            // 1. The Update
            console.log('Step 1: Running UPDATE...');
            await client.query(`
                UPDATE user_characters SET sleeping_arrangement = 'bunk_bed' WHERE sleeping_arrangement IS NULL
            `);

            console.log('PASS: Update succeeded without firing trigger.');
            await client.query('ROLLBACK'); // Clean up
        } catch (updateErr) {
            console.error('FAIL: Update CRASHED:', updateErr.message);
            await client.query('ROLLBACK');
        }

    } catch (err) {
        console.error('Setup failed:', err);
    } finally {
        await client.end();
    }
}

run();
