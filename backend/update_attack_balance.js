
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function updateBalance() {
    console.log('🔌 Connecting to:', process.env.DATABASE_URL);

    const pool = new Pool({
        connectionString: "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway",
        ssl: false
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected successfully!');

        // Update Heavy Attack
        console.log('🛠 Updating Heavy Attack...');
        await client.query(`
            UPDATE attack_types 
            SET damage_multiplier = 2.5, 
                accuracy_modifier = 10 
            WHERE id = 'heavy'
        `);

        // Update Quick Attack (currently 'jab')
        console.log('🛠 Updating Quick Attack (jab)...');
        await client.query(`
            UPDATE attack_types 
            SET accuracy_modifier = -10,
                damage_multiplier = 0.75,
                name = 'Quick Attack'
            WHERE id = 'jab'
        `);

        // Verify changes
        console.log('🔍 Verifying changes...');
        const res = await client.query('SELECT id, name, ap_cost, damage_multiplier, accuracy_modifier FROM attack_types ORDER BY sort_order');
        console.table(res.rows);

        client.release();
    } catch (err) {
        console.error('❌ Update failed:', err);
    } finally {
        await pool.end();
    }
}

updateBalance();
