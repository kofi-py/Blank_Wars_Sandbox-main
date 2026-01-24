const { Pool } = require('pg');
require('dotenv').config();

// Simulate what databaseAdapter does
function safeJsonParse(jsonString, defaultValue) {
  if (!jsonString || jsonString === '' || jsonString === null || jsonString === undefined) {
    return defaultValue;
  }
  if (typeof jsonString === 'object') {
    return jsonString;
  }
  const str = String(jsonString);
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('safeJsonParse failed:', e.message, 'for value:', str.substring(0, 100));
    return defaultValue;
  }
}

async function simulateAPIFlow() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get test user
    const userResult = await pool.query("SELECT id FROM users WHERE email = 'test@example.com'");
    const userId = userResult.rows[0].id;
    
    console.log('=== STEP 1: Get User Characters ===');
    
    // Character query from databaseAdapter.userCharacters.findByUserId
    const charResult = await pool.query(`
      SELECT uc.*, c.name, c.title, c.archetype, c.origin_era, c.rarity,
             c.base_health, c.base_attack, c.base_defense, c.base_speed, c.base_special,
             c.personality_traits, c.conversation_style, c.backstory, c.conversation_topics,
             c.avatar_emoji, c.artwork_url, c.abilities,
             uc.wallet, uc.debt, uc.financial_stress, uc.financial_personality, uc.monthly_earnings, uc.recent_decisions
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      WHERE uc.user_id = $1
      ORDER BY uc.acquired_at DESC
    `, [userId]);
    
    console.log('Found', charResult.rows.length, 'characters');
    
    // Map characters like databaseAdapter does
    const mappedCharacters = charResult.rows.map((row) => {
      return {
        ...row,
        equipment: safeJsonParse(row.equipment, []),
        enhancements: safeJsonParse(row.enhancements, []),
        conversation_memory: safeJsonParse(row.conversation_memory, []),
        significant_memories: safeJsonParse(row.significant_memories, []),
        personality_drift: safeJsonParse(row.personality_drift, {}),
        personality_traits: safeJsonParse(row.personality_traits, []),
        conversation_topics: safeJsonParse(row.conversation_topics, []),
        abilities: safeJsonParse(row.abilities, []),
        financialPersonality: row.financial_personality,
        monthlyEarnings: row.monthly_earnings
      };
    });
    
    console.log('Mapped', mappedCharacters.length, 'characters');
    
    console.log('\n=== STEP 2: Get User Items ===');
    
    // Items query from databaseAdapter.userItems.findByUserId
    try {
      const itemsResult = await pool.query(`
        SELECT ui.*, i.name, i.description, i.rarity, i.item_type, i.sub_type, i.effects, i.shop_price
        FROM user_items ui
        JOIN items i ON ui.item_id = i.id
        WHERE ui.user_id = $1
        ORDER BY i.rarity DESC, i.name ASC
      `, [userId]);
      
      console.log('Found', itemsResult.rows.length, 'items');
      
      const mappedItems = itemsResult.rows.map((row) => ({
        id: row.id,
        itemId: row.item_id,
        name: row.name,
        description: row.description,
        rarity: row.rarity,
        itemType: row.item_type,
        subType: row.sub_type,
        effects: typeof row.effects === 'string' ? JSON.parse(row.effects) : row.effects,
        shopPrice: row.shop_price,
        quantity: row.quantity,
        acquiredAt: row.acquired_at,
        acquiredFrom: row.acquired_from
      }));
      
      console.log('Mapped', mappedItems.length, 'items');
      
      console.log('\n=== STEP 3: Combine Characters with Inventory ===');
      
      const charactersWithStarterGear = mappedCharacters.map(character => ({
        ...character,
        inventory: mappedItems
      }));
      
      console.log('SUCCESS: Final result has', charactersWithStarterGear.length, 'characters');
      console.log('First character:', charactersWithStarterGear[0]?.name, 'with', charactersWithStarterGear[0]?.inventory?.length, 'items');
      
    } catch (itemError) {
      console.error('\n!!! ITEMS QUERY FAILED !!!');
      console.error('Error:', itemError.message);
      console.error('Detail:', itemError.detail);
      console.error('Hint:', itemError.hint);
      
      // This is what's probably happening - items query fails, API returns []
      console.log('\nFalling back to empty items array...');
      const charactersWithEmptyInventory = mappedCharacters.map(character => ({
        ...character,
        inventory: []
      }));
      
      console.log('Result with empty inventory:', charactersWithEmptyInventory.length, 'characters');
    }
    
  } catch (error) {
    console.error('\n!!! COMPLETE FAILURE !!!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

simulateAPIFlow();