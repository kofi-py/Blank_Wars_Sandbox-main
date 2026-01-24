
import { query } from '../src/database';

async function checkPhysicalTables() {
    try {
        // 1. Check if 'therapist_bonuses' table exists (Migration 225)
        console.log('--- Checking for therapist_bonuses table ---');
        const tableRes = await query(
            "SELECT table_name FROM information_schema.tables WHERE table_name = 'therapist_bonuses'",
            []
        );
        if (tableRes.rows.length > 0) {
            console.log('✅ Found therapist_bonuses table.');
        } else {
            console.log('❌ therapist_bonuses table NOT FOUND.');
        }

        // 2. Check teams.user_id type again (Migration 233/20251219)
        console.log('--- Checking teams.user_id type ---');
        const colRes = await query(
            "SELECT data_type FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'user_id'",
            []
        );
        if (colRes.rows.length > 0) {
            console.log(`ℹ️ teams.user_id is type: ${colRes.rows[0].data_type}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkPhysicalTables();
