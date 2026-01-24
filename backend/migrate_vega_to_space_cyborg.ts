import { query } from './src/database';

async function migrateVegaToSpaceCyborg() {
  console.log('🔄 Starting Vega to Space Cyborg migration...');
  
  try {
    // First, check if there are any "vega" entries
    const vegaCheck = await query(`
      SELECT id, name FROM characters 
      WHERE id = 'vega' OR id = 'vega_x' OR id ILIKE '%vega%'
    `);
    
    console.log(`Found ${vegaCheck.rows.length} Vega-related characters:`, vegaCheck.rows);
    
    if (vegaCheck.rows.length > 0) {
      // Update character IDs from vega to space_cyborg
      console.log('📝 Updating character records...');
      
      // Update the characters table
      await query(`
        UPDATE characters 
        SET id = 'space_cyborg', 
            name = 'Space Cyborg',
            title = 'Space Cyborg'
        WHERE id = 'vega' OR id = 'vega_x'
      `);
      
      // Update user_characters table
      console.log('📝 Updating user character assignments...');
      await query(`
        UPDATE user_characters 
        SET character_id = 'space_cyborg' 
        WHERE character_id = 'vega' OR character_id = 'vega_x'
      `);
      
      // Update character_echoes table
      console.log('📝 Updating character echoes...');
      await query(`
        UPDATE character_echoes 
        SET character_id = 'space_cyborg' 
        WHERE character_id = 'vega' OR character_id = 'vega_x'
      `);
      
      // Update claimable_pack_contents table
      console.log('📝 Updating pack contents...');
      await query(`
        UPDATE claimable_pack_contents 
        SET character_id = 'space_cyborg' 
        WHERE character_id = 'vega' OR character_id = 'vega_x'
      `);
      
      // Update any other tables that might have character_id references
      console.log('📝 Updating battle records...');
      await query(`
        UPDATE battles 
        SET player1_character_id = 'space_cyborg' 
        WHERE player1_character_id = 'vega' OR player1_character_id = 'vega_x'
      `);
      
      await query(`
        UPDATE battles 
        SET player2_character_id = 'space_cyborg' 
        WHERE player2_character_id = 'vega' OR player2_character_id = 'vega_x'
      `);
      
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('✅ No Vega characters found - database is already updated!');
    }
    
    // Verify the migration
    console.log('\n🔍 Verifying migration results...');
    const spaceCyborgCheck = await query(`
      SELECT id, name FROM characters 
      WHERE id = 'space_cyborg'
    `);
    console.log('Space Cyborg character:', spaceCyborgCheck.rows);
    
    const userCharCheck = await query(`
      SELECT COUNT(*) as count FROM user_characters 
      WHERE character_id = 'space_cyborg'
    `);
    console.log(`User characters with space_cyborg: ${userCharCheck.rows[0].count}`);
    
    const echoCheck = await query(`
      SELECT COUNT(*) as count FROM character_echoes 
      WHERE character_id = 'space_cyborg'
    `);
    console.log(`Character echoes with space_cyborg: ${echoCheck.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit();
  }
}

// Run the migration
migrateVegaToSpaceCyborg();