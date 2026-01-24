import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';
import fs from 'fs';

async function runCoachMigrations() {
    try {
        // Run 173
        console.log('Running migration 173 (Coach Experience Levels)...');
        const sql173 = fs.readFileSync(path.resolve(__dirname, '../migrations/173_create_coach_experience_levels.sql'), 'utf8');
        await query(sql173);
        console.log('✅ Migration 173 completed.');

        // Run 174
        console.log('Running migration 174 (Coach Infinite Leveling)...');
        const sql174 = fs.readFileSync(path.resolve(__dirname, '../migrations/174_coach_infinite_leveling_func.sql'), 'utf8');
        await query(sql174);
        console.log('✅ Migration 174 completed.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runCoachMigrations();
