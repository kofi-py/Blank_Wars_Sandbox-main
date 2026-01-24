
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
        console.log('--- Checking Dependencies for get_full_character_data ---');

        // Check for views or other objects that depend on this function
        const query = `
            SELECT 
                dependent_ns.nspname as dependent_schema,
                dependent_view.relname as dependent_view, 
                source_ns.nspname as source_schema, 
                source_proc.proname as source_function
            FROM pg_depend 
            JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
            JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
            JOIN pg_class as source_class ON pg_depend.refobjid = source_class.oid 
            JOIN pg_attribute ON pg_depend.refobjid = pg_attribute.attrelid 
                AND pg_depend.refobjsubid = pg_attribute.attnum 
            JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid 
            JOIN pg_namespace source_ns ON source_class.relnamespace = source_ns.oid
            LEFT JOIN pg_proc source_proc ON source_class.oid = source_proc.oid
            WHERE source_proc.proname = 'get_full_character_data';
        `;

        // Simplified query for function dependencies
        const query2 = `
            SELECT distinct
                n.nspname AS schema_name,
                c.relname AS relation_name,
                c.relkind AS relation_type
            FROM pg_depend d
            JOIN pg_rewrite r ON d.objid = r.oid
            JOIN pg_class c ON r.ev_class = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            JOIN pg_proc p ON d.refobjid = p.oid
            WHERE p.proname = 'get_full_character_data';
        `;

        const res = await client.query(query2);
        if (res.rows.length > 0) {
            console.log('FOUND DEPENDENCIES:');
            console.table(res.rows);
            console.log('!!! DROP FUNCTION will fail without CASCADE !!!');
        } else {
            console.log('No direct view dependencies found for get_full_character_data.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
