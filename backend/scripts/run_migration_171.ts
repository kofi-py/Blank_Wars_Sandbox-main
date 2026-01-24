import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';
import fs from 'fs';

async function runMigration() {
    try {
        const sqlPath = path.resolve(__dirname, '../migrations/171_create_experience_levels.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration 171...');
        await query(sql);
        console.log('✅ Migration 171 completed successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
