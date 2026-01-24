
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

        const terms = ['bunk_bed', 'floor', 'bed'];
        console.log(`--- Searching Database for values: '${terms.join("', '")}' ---`);

        // 1. Get all text-like columns
        const cols = await client.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND data_type IN ('text', 'character varying')
        `);

        console.log(`Scanning ${cols.rows.length} columns...`);

        for (const col of cols.rows) {
            const table = col.table_name;
            const column = col.column_name;

            // Query each column for occurrences of the terms
            const query = `
                SELECT '${table}' as table, '${column}' as column, "${column}" as value, count(*) as count
                FROM "${table}"
                WHERE "${column}" IN ($1, $2, $3)
                GROUP BY "${column}"
            `;

            try {
                const res = await client.query(query, terms);
                if (res.rows.length > 0) {
                    console.table(res.rows);
                }
            } catch (ignore) {
                // Ignore errors (e.g. if table is a view without read permissions, etc)
            }
        }

        console.log('--- Search Complete ---');

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
