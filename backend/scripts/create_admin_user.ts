
import { query } from '../src/database';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function createAdminUser() {
    const username = 'final_admin';
    const email = 'final_admin@example.com';
    const password = 'password123';

    console.log(`Creating user ${username}...`);

    // 1. Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 2. Check if exists and delete if so
    await query('DELETE FROM users WHERE username = $1', [username]);

    // 3. Insert user
    const user_id = uuidv4();
    await query(
        `INSERT INTO users (id, username, email, password_hash, subscription_tier, level, experience, total_battles, total_wins, rating, character_slot_capacity)
     VALUES ($1, $2, $3, $4, 'legendary', 100, 999999, 0, 0, 2500, 50)
     RETURNING id`,
        [user_id, username, email, password_hash]
    );

    console.log(`User created with ID: ${user_id}`);

    // 4. Assign characters
    console.log('Assigning characters...');
    const characters = await query('SELECT id, name FROM characters');

    for (const char of characters.rows) {
        const user_char_id = uuidv4();
        await query(`
      INSERT INTO user_characters (
        id, user_id, character_id, nickname, level, current_health, max_health
      ) VALUES ($1, $2, $3, $4, 1, 100, 100)
    `, [user_char_id, user_id, char.id, char.name]);
    }

    console.log(`Assigned ${characters.rows.length} characters.`);
    process.exit(0);
}

createAdminUser().catch(console.error);
