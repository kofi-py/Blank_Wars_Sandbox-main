import { query } from './src/database';

async function productionVegaMigration() {
  console.log('🚀 PRODUCTION: Starting Vega to Space Cyborg migration...');
  console.log('⚠️  This will modify production data - proceed with caution!');
  
  try {
    // Start transaction for safety
    await query('BEGIN');
    
    console.log('\n📊 STEP 1: Analyzing current data...');
    
    // Check current state
    const vegaCharacters = await query(`
      SELECT id, name, title FROM characters 
      WHERE id IN ('vega', 'vega_x') OR id ILIKE '%vega%'
    `);
    console.log(`Found ${vegaCharacters.rows.length} vega characters:`, vegaCharacters.rows);
    
    const spaceCyborgExists = await query(`
      SELECT id, name FROM characters WHERE id = 'space_cyborg'
    `);
    console.log(`Space Cyborg exists: ${spaceCyborgExists.rows.length > 0}`);
    
    // Check user assignments
    const userCharCounts = await query(`
      SELECT character_id, COUNT(*) as count 
      FROM user_characters 
      WHERE character_id IN ('vega', 'vega_x', 'space_cyborg')
      GROUP BY character_id
    `);
    console.log('User character assignments:', userCharCounts.rows);
    
    // Check pack contents
    const packCounts = await query(`
      SELECT character_id, COUNT(*) as count 
      FROM claimable_pack_contents 
      WHERE character_id IN ('vega', 'vega_x', 'space_cyborg')
      GROUP BY character_id
    `);
    console.log('Pack contents:', packCounts.rows);
    
    // Check echoes
    const echoCounts = await query(`
      SELECT character_id, COUNT(*) as count 
      FROM character_echoes 
      WHERE character_id IN ('vega', 'vega_x', 'space_cyborg')
      GROUP BY character_id
    `);
    console.log('Character echoes:', echoCounts.rows);
    
    if (vegaCharacters.rows.length > 0) {
      console.log('\n🔄 STEP 2: Performing migration...');
      
      // If space_cyborg doesn't exist, create it first
      if (spaceCyborgExists.rows.length === 0) {
        console.log('📝 Creating space_cyborg character...');
        await query(`
          INSERT INTO characters (
            id, name, title, archetype, origin_era, rarity,
            base_health, base_attack, base_defense, base_speed, base_special,
            personality_traits, conversation_style, backstory,
            conversation_topics, avatar_emoji, abilities
          ) VALUES (
            'space_cyborg', 'Space Cyborg', 'Space Cyborg', 'tank', 'Cyberpunk Future (2087)', 'epic',
            1300, 145, 160, 70, 75,
            '["Logical","Protective","Evolving","Curious"]',
            'Analytical and learning',
            'An advanced combat cyborg from the future, part organic and part machine, seeking to understand humanity.',
            '["Logic","Protection","Technology","Human nature","The future"]',
            '🤖',
            '{"baseStats":{"strength":90,"agility":50,"intelligence":80,"vitality":95,"wisdom":60,"charisma":40}}'
          )
        `);
      }
      
      // Update user_characters
      console.log('📝 Updating user character assignments...');
      const userCharUpdate = await query(`
        UPDATE user_characters 
        SET character_id = 'space_cyborg' 
        WHERE character_id IN ('vega', 'vega_x')
      `);
      console.log(`Updated ${userCharUpdate.rowCount} user character records`);
      
      // Update character_echoes
      console.log('📝 Updating character echoes...');
      const echoUpdate = await query(`
        UPDATE character_echoes 
        SET character_id = 'space_cyborg' 
        WHERE character_id IN ('vega', 'vega_x')
      `);
      console.log(`Updated ${echoUpdate.rowCount} echo records`);
      
      // Update claimable_pack_contents
      console.log('📝 Updating pack contents...');
      const packUpdate = await query(`
        UPDATE claimable_pack_contents 
        SET character_id = 'space_cyborg' 
        WHERE character_id IN ('vega', 'vega_x')
      `);
      console.log(`Updated ${packUpdate.rowCount} pack content records`);
      
      // Update any battle records if they exist
      console.log('📝 Updating battle records...');
      try {
        const battleUpdate1 = await query(`
          UPDATE battles 
          SET player1_character_id = 'space_cyborg' 
          WHERE player1_character_id IN ('vega', 'vega_x')
        `);
        console.log(`Updated ${battleUpdate1.rowCount} battle player1 records`);
        
        const battleUpdate2 = await query(`
          UPDATE battles 
          SET player2_character_id = 'space_cyborg' 
          WHERE player2_character_id IN ('vega', 'vega_x')
        `);
        console.log(`Updated ${battleUpdate2.rowCount} battle player2 records`);
      } catch (error) {
        console.log('⚠️  Battle table updates failed (table may not exist):', error.message);
      }
      
      // Remove old vega characters
      console.log('📝 Removing old vega character records...');
      const deleteResult = await query(`
        DELETE FROM characters 
        WHERE id IN ('vega', 'vega_x')
      `);
      console.log(`Deleted ${deleteResult.rowCount} old vega character records`);
      
    } else {
      console.log('✅ No vega characters found - database is already updated!');
    }
    
    console.log('\n🔍 STEP 3: Verifying migration...');
    
    // Verify final state
    const finalSpaceCyborg = await query(`
      SELECT id, name, title FROM characters WHERE id = 'space_cyborg'
    `);
    console.log('Space Cyborg character:', finalSpaceCyborg.rows);
    
    const finalUserChars = await query(`
      SELECT COUNT(*) as count FROM user_characters WHERE character_id = 'space_cyborg'
    `);
    console.log(`Final user characters with space_cyborg: ${finalUserChars.rows[0].count}`);
    
    const finalEchoes = await query(`
      SELECT COUNT(*) as count FROM character_echoes WHERE character_id = 'space_cyborg'  
    `);
    console.log(`Final echoes with space_cyborg: ${finalEchoes.rows[0].count}`);
    
    const finalPacks = await query(`
      SELECT COUNT(*) as count FROM claimable_pack_contents WHERE character_id = 'space_cyborg'
    `);
    console.log(`Final pack contents with space_cyborg: ${finalPacks.rows[0].count}`);
    
    // Check for any remaining vega references
    const remainingVega = await query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE column_name LIKE '%character_id%'
    `);
    
    for (const row of remainingVega.rows) {
      try {
        const vegaCheck = await query(`
          SELECT COUNT(*) as count 
          FROM ${row.table_name} 
          WHERE ${row.column_name} IN ('vega', 'vega_x')
        `);
        if (vegaCheck.rows[0].count > 0) {
          console.log(`⚠️  Found ${vegaCheck.rows[0].count} remaining vega references in ${row.table_name}.${row.column_name}`);
        }
      } catch (error) {
        // Skip tables we can't query
      }
    }
    
    // Commit transaction
    await query('COMMIT');
    console.log('\n✅ PRODUCTION MIGRATION COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    console.error('❌ PRODUCTION MIGRATION FAILED - ROLLED BACK:', error);
    throw error;
  }
}

// Run the production migration
if (require.main === module) {
  productionVegaMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { productionVegaMigration };