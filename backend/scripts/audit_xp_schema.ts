
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { query } from '../src/database/postgres';

async function auditXPSchema() {
    try {
        console.log('--- 🔍 Searching All Tables & Columns for "XP" or "Experience" ---');

        // Search Columns
        const columns = await query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND (
        LOWER(column_name) LIKE '%xp%' 
        OR LOWER(column_name) LIKE '%experience%'
      )
      ORDER BY table_name, column_name;
    `);

        console.log('\nFound Columns:');
        if (columns.rows.length > 0) {
            console.table(columns.rows);
        } else {
            console.log('No columns found matching "xp" or "experience".');
        }

        // Search Tables
        const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (
        LOWER(table_name) LIKE '%xp%' 
        OR LOWER(table_name) LIKE '%experience%'
      )
      ORDER BY table_name;
    `);

        console.log('\nFound Tables:');
        if (tables.rows.length > 0) {
            console.table(tables.rows);
        } else {
            console.log('No tables found matching "xp" or "experience".');
        }

    } catch (error) {
        console.error('Error auditing schema:', error);
    } finally {
        process.exit();
    }
}

auditXPSchema();
