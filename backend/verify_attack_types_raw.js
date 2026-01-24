const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function verify() {
    console.log('🔌 Connecting to:', process.env.DATABASE_URL);

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected successfully!');

        const res = await client.query('SELECT id, name, ap_cost, damage_multiplier FROM attack_types ORDER BY sort_order');
        console.table(res.rows);

        client.release();
    } catch (err) {
        console.error('❌ Connection failed:', err);
    } finally {
        await pool.end();
    }
}

verify();
