
import { db, query } from '../src/database';
import dotenv from 'dotenv';

dotenv.config();


async function fixTeamContext() {
    const teamId = 'e84199aa-7073-4d1b-8826-bbb8b763d057';
    const userId = 'cd8f8fca-0ab1-452e-8c75-c38c5360be35'; // testuser123

    try {
        console.log(`Checking team ${teamId}...`);

        // Check if team exists
        const teamResult = await query('SELECT * FROM teams WHERE id = $1', [teamId]);
        if (teamResult.rows.length === 0) {
            console.log(`Team ${teamId} does not exist. Creating it...`);
            await query(`
        INSERT INTO teams (id, user_id, team_name, is_active)
        VALUES ($1, $2, 'Restored Team', true)
      `, [teamId, userId]);
            console.log('Team created.');
        } else {
            console.log('Team exists:', teamResult.rows[0].team_name);
        }

        // Check if team_context exists
        const contextResult = await query('SELECT * FROM team_context WHERE team_id = $1', [teamId]);
        if (contextResult.rows.length > 0) {
            console.log('Team context already exists:', contextResult.rows[0]);
            return;
        }

        console.log('Team context missing. Creating default context...');


        // Insert default team_context
        await query(`
      INSERT INTO team_context (
        team_id, 
        hq_tier, 
        current_scene_type, 
        current_time_of_day
      ) VALUES (
        $1, 
        'basic_house', 
        'mundane', 
        'evening'
      )
    `, [teamId]);

        console.log('Successfully created team_context.');

    } catch (error) {
        console.error('Error fixing team context:', error);
    } finally {
        await db.end();
    }
}

fixTeamContext();
