
import { query } from '../src/database';

async function dropParticipantUserFK() {
    try {
        console.log('Dropping FK constraint battle_participants_user_id_fkey...');
        await query('ALTER TABLE battle_participants DROP CONSTRAINT IF EXISTS battle_participants_user_id_fkey;');
        console.log('Constraint dropped.');
    } catch (error) {
        console.error('Error dropping constraint:', error);
    }
}

dropParticipantUserFK();
