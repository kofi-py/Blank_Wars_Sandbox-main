const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkLog() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });

    try {
        const client = await pool.connect();
        const res = await client.query("SELECT * FROM migration_log WHERE version = '200'");
        console.log('Migration 200 in log:', res.rows.length > 0);
        client.release();
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkLog();
