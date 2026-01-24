
import { query } from '../src/database';

async function checkTimeline() {
    try {
        const res = await query(
            "SELECT version, name, executed_at FROM migration_log ORDER BY executed_at DESC LIMIT 20",
            []
        );

        console.log('🕒 Last 20 Migrations Executed:');
        res.rows.forEach(r => {
            console.log(`[${r.executed_at.toISOString()}] Version: ${r.version} - ${r.name}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkTimeline();
