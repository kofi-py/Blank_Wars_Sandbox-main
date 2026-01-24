
import { query } from '../src/database';

async function inspectBattlesConstraints() {
    try {
        console.log('--- Constraints on battles table ---');
        const result = await query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'battles'::regclass;
    `);
        console.log(result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectBattlesConstraints();
