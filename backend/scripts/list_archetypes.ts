
import { query } from '../src/database';

async function listArchetypes() {
    try {
        const result = await query('SELECT id FROM archetypes');
        console.log(result.rows.map(r => r.id));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listArchetypes();
