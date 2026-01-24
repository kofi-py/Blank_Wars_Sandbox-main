const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function create3DTestAccount() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🎭 Creating 3D Theater Test Account...\n');

    // Test account credentials
    const username = 'theater3d';
    const email = 'theater3d@test.com';
    const password = 'Theater3D2025!';

    console.log('📝 Account Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('');

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, email FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    let userId;

    if (existingUser.rows.length > 0) {
      console.log('ℹ️  Account already exists, using existing account');
      userId = existingUser.rows[0].id;

      // Clear existing characters
      const deleteResult = await pool.query(
        'DELETE FROM user_characters WHERE user_id = $1',
        [userId]
      );
      console.log(`🗑️  Cleared ${deleteResult.rowCount} existing characters\n`);
    } else {
      // Create new user
      userId = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 12);

      await pool.query(`
        INSERT INTO users (
          id, username, email, password_hash,
          subscription_tier, character_slot_capacity, created_at
        ) VALUES ($1, $2, $3, $4, 'premium', 50, NOW())
      `, [userId, username, email, hashedPassword]);

      console.log('✅ Created new account\n');
    }

    // Get the 3D character templates (Achilles, Merlin, Agent X)
    const templates = await pool.query(`
      SELECT id, name, archetype, origin_era, health, attack, defense
      FROM characters
      WHERE name IN ('Achilles', 'Merlin', 'Agent X')
      ORDER BY name
    `);

    if (templates.rows.length === 0) {
      console.log('❌ No 3D characters found in database!');
      return;
    }

    console.log(`🎭 Adding ${templates.rows.length} 3D characters:\n`);

    // Create user characters
    for (const template of templates.rows) {
      const newCharId = `userchar_${Date.now()}_${uuidv4().substring(0, 8)}`;

      await pool.query(`
        INSERT INTO user_characters (
          id, user_id, character_id,
          level, experience, bond_level,
          current_health, max_health,
          wallet, debt, financial_stress, coach_trust_level,
          current_mental_health, current_training, current_team_player,
          current_ego, current_communication, stress_level,
          fatigue_level, morale, gameplan_adherence
        ) VALUES (
          $1, $2, $3,
          5, 500, 3,
          $4, $5,
          2000, 0, 0, 75,
          90, 85, 80,
          65, 85, 0,
          0, 90, 75
        )
      `, [newCharId, userId, template.id, template.health, template.health]);

      console.log(`   ✅ ${template.name} (${template.archetype})`);
    }

    // Verify the characters were created
    const verification = await pool.query(`
      SELECT uc.id, c.name, c.archetype
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      WHERE uc.user_id = $1
      ORDER BY c.name
    `, [userId]);

    console.log(`\n🎉 SUCCESS! Created account with ${verification.rows.length} 3D characters\n`);
    console.log('═══════════════════════════════════════════════');
    console.log('🔑 LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('═══════════════════════════════════════════════\n');
    console.log('💡 Characters available:');
    verification.rows.forEach(char => {
      console.log(`   • ${char.name} (${char.archetype})`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

create3DTestAccount();
