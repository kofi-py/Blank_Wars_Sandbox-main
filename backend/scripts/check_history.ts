
import { query } from '../src/database';

async function checkHistory() {
    try {
        console.log('🔍 Querying migrations > 200...');
        // We cast to text to ensure we see everything, as version might be varying types
        const res = await query(
            "SELECT version::text FROM migration_log WHERE version::text > '200' ORDER BY version::text",
            []
        );

        console.log('Found ' + res.rows.length + ' migrations:');
        res.rows.forEach(r => console.log(`- ${r.version}`));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkHistory();
