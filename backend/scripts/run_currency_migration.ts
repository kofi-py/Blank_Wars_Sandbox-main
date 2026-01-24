import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';

async function runMigration() {
    try {
        const migrationPath = path.resolve(__dirname, '../migrations/175_standardize_currency_names.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration: 175_standardize_currency_names.sql');
        await query(sql);
        console.log('✅ Migration applied successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

runMigration();
