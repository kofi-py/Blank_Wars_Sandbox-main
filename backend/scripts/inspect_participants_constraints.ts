
import { query } from '../src/database';

async function inspectParticipantsConstraints() {
    try {
        console.log('--- Constraints on battle_participants table ---');
        const result = await query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'battle_participants'::regclass;
    `);
        console.log(result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectParticipantsConstraints();
