
import { query } from './src/database/postgres';

async function verifyState() {
    try {
        console.log('--- Verifying user_characters IDs ---');
        // Check for ANY trailing spaces
        const result = await query(`
      SELECT id FROM user_characters WHERE id LIKE '% '
    `);
        console.log(`IDs with trailing spaces: ${result.rows.length}`);
        if (result.rows.length > 0) {
            console.log(result.rows);
        }

        // Check for the specific ID reported by the user
        const specificId = 'userchar_1763938093321_8ps5tajb1';
        const specificCheck = await query(`
        SELECT id FROM user_characters WHERE id LIKE $1
    `, [`${specificId}%`]);
        console.log(`\nChecking for ${specificId}:`);
        console.log(specificCheck.rows);

        // Check character_powers count
        const powersCount = await query('SELECT count(*) FROM character_powers');
        console.log(`\nTotal rows in character_powers: ${powersCount.rows[0].count}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verifyState();
