
import { query } from '../src/database';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
    try {
        const migrationPath = path.join(__dirname, '../migrations/fix_auto_unlock_starters.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration...');
        await query(sql);
        console.log('Migration applied successfully.');
    } catch (error) {
        console.error('Error applying migration:', error);
    }
}

applyMigration();
