// Simple test to verify character seeding actually works
const { seedCharactersIfEmpty, query } = require('./dist/database/postgres.js');

async function testCharacterSeeding() {
  try {
    console.log('Testing character seeding...');
    
    // Check current character count
    const before = await query('SELECT COUNT(*) as count FROM characters');
    console.log('Characters before seeding:', before.rows[0].count);
    
    // Run seeding
    await seedCharactersIfEmpty();
    
    // Check after count
    const after = await query('SELECT COUNT(*) as count FROM characters');
    console.log('Characters after seeding:', after.rows[0].count);
    
    // Verify we have 17 characters
    if (after.rows[0].count >= 17) {
      console.log('✅ CHARACTER SEEDING TEST PASSED - Found', after.rows[0].count, 'characters');
    } else {
      console.log('❌ CHARACTER SEEDING TEST FAILED - Only found', after.rows[0].count, 'characters');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

testCharacterSeeding();