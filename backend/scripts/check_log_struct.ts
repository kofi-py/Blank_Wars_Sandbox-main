
import { query } from '../src/database';

async function checkTimeline() {
    try {
        // 1. Get Columns of migration_log
        const cols = await query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'migration_log'",
            []
        );
        console.log('Columns:', cols.rows.map(r => r.column_name).join(', '));

        // 2. We guess the timestamp column is 'migration_time' or 'run_on' or similar based on columns
        // But let's look at the output first. 
        // Actually, I'll just select * and limit 1 to see structure if I can't guess.
        const sample = await query('SELECT * FROM migration_log LIMIT 1', []);
        console.log('Sample Row:', sample.rows[0]);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkTimeline();
