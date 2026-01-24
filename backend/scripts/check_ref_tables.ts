
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
        console.log('--- Checking Dependencies ---');

        // 1. Triggers on user_characters
        console.log('\n[Triggers on user_characters]');
        const triggers = await client.query(`
            SELECT trigger_name, action_timing, event_manipulation, Action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'user_characters'
        `);
        console.table(triggers.rows);

        // 2. Sleeping Spot Types
        console.log('\n[sleeping_spot_types SCHEMA]');
        const spotCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sleeping_spot_types'
        `);
        console.table(spotCols.rows);

        console.log('\n[sleeping_spot_types DATA]');
        const spots = await client.query('SELECT * FROM sleeping_spot_types');
        console.table(spots.rows);

        // 3. Comedian Styles
        console.log('\n[comedian_styles]');
        const styles = await client.query('SELECT * FROM comedian_styles LIMIT 5');
        console.table(styles.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
