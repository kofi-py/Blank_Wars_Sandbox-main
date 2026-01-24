
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
// Use RAILWAY_DATABASE_URL if available (for precise reproduction), else DATABASE_URL
const connectionString = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('CRITICAL ERROR: No DB URL found');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

const REQUIRED_COLS = [
    'current_mental_health', 'current_morale', 'current_stress',
    'current_fatigue', 'current_confidence', 'financial_stress',
    'coach_trust_level', 'bond_level', 'current_team_player',
    'current_health', 'current_max_health', 'win_percentage',
    'gameplan_adherence', 'current_win_streak', 'current_energy',
    'current_max_energy', 'current_mana', 'current_max_mana',
    'wallet', 'debt_principal', 'gameplay_mood_modifiers',
    'sleeping_arrangement'
];

async function run() {
    try {
        await client.connect();
        console.log('--- Connected to DB for Debugging ---');

        // 1. Check comedian_styles.category
        console.log('\n--- 1. Checking comedian_styles.category ---');
        const resCs = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'comedian_styles' AND column_name = 'category'
        `);
        if (resCs.rows.length === 0) {
            console.error('FAIL: comedian_styles.category column MISSING');
        } else {
            console.log('PASS: comedian_styles.category exists');
        }

        // 2. Check user_characters defaults/nulls for critical columns
        console.log('\n--- 2. Checking user_characters Schema ---');
        const resSchema = await client.query(`
            SELECT column_name, column_default, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'user_characters'
            AND column_name = ANY($1)
        `, [REQUIRED_COLS]);
        console.table(resSchema.rows);

        // 3. Simulate Strict Mode Checks (Exact logic from Migration 242)
        console.log('\n--- 3. Simulating Strict Mode Checks ---');

        const rows = await client.query(`
            SELECT uc.*, c.mood_modifier 
            FROM user_characters uc
            JOIN characters c ON uc.character_id = c.id
        `);

        let failCount = 0;
        for (const row of rows.rows) {
            const failures = [];
            const check = (val: any, name: string) => {
                if (val === null || val === undefined) failures.push(name);
            };

            check(row.current_mental_health, 'current_mental_health');
            check(row.current_morale, 'current_morale');
            check(row.current_stress, 'current_stress');
            check(row.current_fatigue, 'current_fatigue');
            check(row.current_confidence, 'current_confidence');
            check(row.financial_stress, 'financial_stress');
            check(row.coach_trust_level, 'coach_trust_level');
            check(row.bond_level, 'bond_level');
            check(row.current_team_player, 'current_team_player');
            check(row.current_health, 'current_health');
            check(row.current_max_health, 'current_max_health');
            check(row.win_percentage, 'win_percentage');
            check(row.gameplan_adherence, 'gameplan_adherence');
            check(row.current_win_streak, 'current_win_streak');
            check(row.current_energy, 'current_energy');
            check(row.current_max_energy, 'current_max_energy');
            check(row.current_mana, 'current_mana');
            check(row.current_max_mana, 'current_max_mana');
            check(row.wallet, 'wallet');
            check(row.debt_principal, 'debt_principal');

            // Special checks
            if (row.current_max_health === 0) failures.push('current_max_health_zero');
            if (row.current_max_energy === 0) failures.push('current_max_energy_zero');
            if (row.current_max_mana === 0) failures.push('current_max_mana_zero');
            if (row.current_max_mana === 0) failures.push('current_max_mana_zero');
            if (!row.gameplay_mood_modifiers || !Array.isArray(row.gameplay_mood_modifiers.modifiers)) failures.push('gameplay_mood_modifiers_format');

            // FK Check locally
            const VALID_SPOTS = ['floor', 'bunk_bed', 'private_room', 'luxury_suite', 'penthouse'];
            if (row.sleeping_arrangement && !VALID_SPOTS.includes(row.sleeping_arrangement)) {
                failures.push(`sleeping_arrangement_invalid(${row.sleeping_arrangement})`);
            }

            if (failures.length > 0) {
                failCount++;
                if (failCount <= 5) {
                    console.log(`Row ID ${row.id} FAILED: ${failures.join(', ')}`);
                }
            }
        }

        if (failCount === 0) {
            console.log('PASS: All rows satisfy strict mode.');
        } else {
            console.log(`FAIL: ${failCount} rows failed strict checks.`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
