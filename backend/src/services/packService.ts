import { v4 as uuidv4 } from 'uuid';
import { query } from '../database';

type CharacterRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
import { db_adapter } from './databaseAdapter';
import { CharacterEchoService } from './characterEchoService';

interface PackContent {
  character_id: string;
  is_granted: boolean;
}

interface PackGenerationRules {
  guaranteed_rarity?: CharacterRarity;
  rarity_weights: { [key in CharacterRarity]?: number };
  count: number;
}

export class PackService {
  private pack_rules: { [key: string]: PackGenerationRules } = {
    demo: {
      count: 3,
      rarity_weights: {}, // Empty weights = random selection from all characters
    },
    standard_starter: {
      count: 3,
      rarity_weights: {}, // Empty weights = random selection from all characters
    },
    premium_starter: {
      count: 5,
      guaranteed_rarity: 'rare',
      rarity_weights: {
        common: 0.4,
        uncommon: 0.3,
        rare: 0.2,
        epic: 0.08,
        legendary: 0.02,
      },
    },
    // Add more pack types as needed
  };

  private character_echo_service: CharacterEchoService;

  constructor() {
    this.character_echo_service = new CharacterEchoService();
  }

  // Load characters from database by rarity
  private async get_characters_by_rarity(rarity: CharacterRarity): Promise<any[]> {
    const result = await query(
      'SELECT id, name, rarity FROM characters WHERE rarity = $1',
      [rarity]
    );
    return result.rows;
  }

  // Load all characters from database (exclude systems characters)
  private async get_all_characters(): Promise<any[]> {
    const result = await query('SELECT id, name, rarity FROM characters WHERE rarity IS NOT NULL AND archetype != \'system\'');
    return result.rows;
  }

  // Generates a new pack based on predefined rules
  async generate_pack(pack_type: string, user_id?: string): Promise<string> {
    const rules = this.pack_rules[pack_type];
    if (!rules) {
      throw new Error(`Pack type ${pack_type} not found.`);
    }

    // 🛡️ STARTER PACK GUARD: Detect zombie trio
    const ZOMBIE_TRIO = ['frankenstein_monster', 'robin_hood', 'holmes'].sort();
    const is_starter_pack = pack_type === 'standard_starter';

    // Get the pack template for this pack type
    const pack_template_result = await query(
      'SELECT id FROM card_packs WHERE pack_type = $1 LIMIT 1',
      [pack_type]
    );

    if (pack_template_result.rows.length === 0) {
      throw new Error(`No active pack template found for pack type: ${pack_type}`);
    }

    const pack_template_id = pack_template_result.rows[0].id;
    const pack_id = uuidv4();
    const characters_to_grant: string[] = [];

    // Handle guaranteed rarity first
    if (rules.guaranteed_rarity) {
      const guaranteed_char = await this.get_random_character_by_rarity(rules.guaranteed_rarity);
      if (guaranteed_char) {
        characters_to_grant.push(guaranteed_char);
      }
    }

    // Fill the rest based on rarity weights, avoiding duplicates
    let attempts = 0;
    const max_attempts = rules.count * 10; // Prevent infinite loops

    while (characters_to_grant.length < rules.count && attempts < max_attempts) {
      const random_char = await this.get_random_character_by_weights(rules.rarity_weights);
      if (random_char && !characters_to_grant.includes(random_char)) {
        characters_to_grant.push(random_char);
      }
      attempts++;
    }

    // Fallback: if we still don't have enough characters, pick random ones from all available
    if (characters_to_grant.length < rules.count) {
      console.warn(`⚠️ Pack generation fallback activated for ${pack_type}. Using random character selection.`);
      const all_characters = await this.get_all_characters();
      const available_characters = all_characters.filter(char => !characters_to_grant.includes(char.id));

      while (characters_to_grant.length < rules.count && available_characters.length > 0) {
        const random_index = Math.floor(Math.random() * available_characters.length);
        const selected_char = available_characters.splice(random_index, 1)[0];
        characters_to_grant.push(selected_char.id);
      }
    }

    // 🛡️ STARTER PACK PROTECTION: Reject zombie trio
    if (is_starter_pack) {
      const sorted_chars = [...characters_to_grant].sort();
      if (JSON.stringify(sorted_chars) === JSON.stringify(ZOMBIE_TRIO)) {
        throw new Error('🧟‍♂️ ZOMBIE TRIO DETECTED! Starter pack generation failed - got hardcoded characters');
      }

      // Ensure no duplicates for starter packs
      const unique_chars = new Set(characters_to_grant);
      if (unique_chars.size !== characters_to_grant.length) {
        throw new Error('🚫 Starter pack must not contain duplicates!');
      }

      console.log('✅ Starter pack generated with unique characters:', characters_to_grant);
    }

    // Create pack record with all required fields
    await query(
      `INSERT INTO claimable_packs (id, pack_type, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [pack_id, pack_type]
    );

    // Insert pack contents
    for (const char_id of characters_to_grant) {
      await query(
        `INSERT INTO claimable_pack_contents (claimable_pack_id, character_id) VALUES ($1, $2)`,
        [pack_id, char_id]
      );
    }

    return pack_id; // Return the claim token
  }

  // Fix existing pack contents with correct character IDs
  async fix_pack_contents(): Promise<void> {
    console.log('🔧 Fixing pack contents with correct character IDs...');

    // Get all existing pack contents
    const pack_contents = await query('SELECT claimable_pack_id, character_id FROM claimable_pack_contents');

    // Get valid character IDs from database
    const valid_characters = await query('SELECT id FROM characters');
    const valid_ids = new Set(valid_characters.rows.map((row: any) => row.id));

    let fixed_count = 0;
    for (const content of pack_contents.rows) {
      if (!valid_ids.has(content.character_id)) {
        // Replace with a random valid character ID
        const random_character = valid_characters.rows[Math.floor(Math.random() * valid_characters.rows.length)];
        await query(
          'UPDATE claimable_pack_contents SET character_id = $1 WHERE claimable_pack_id = $2 AND character_id = $3',
          [random_character.id, content.claimable_pack_id, content.character_id]
        );
        console.log(`Fixed invalid character ID ${content.character_id} -> ${random_character.id}`);
        fixed_count++;
      }
    }

    console.log(`✅ Fixed ${fixed_count} invalid pack contents`);

    // Also fix broken user_characters records by updating their character_id
    const broken_user_chars = await query(`
      SELECT uc.id, uc.character_id, uc.user_id
      FROM user_characters uc
      LEFT JOIN characters c ON uc.character_id = c.id
      WHERE c.id IS NULL
    `);

    let updated_count = 0;
    for (const broken of broken_user_chars.rows) {
      // Replace with a random valid character ID
      const random_character = valid_characters.rows[Math.floor(Math.random() * valid_characters.rows.length)];
      await query('UPDATE user_characters SET character_id = $1 WHERE id = $2', [random_character.id, broken.id]);
      console.log(`Fixed user_character ${broken.character_id} -> ${random_character.id} for user ${broken.user_id}`);
      updated_count++;
    }

    console.log(`✅ Updated ${updated_count} broken user_characters`);
  }

  // Creates a gift pack with specific characters
  async create_gift_pack(character_ids: string[]): Promise<string> {
    const pack_id = uuidv4();
    await query(
      `INSERT INTO claimable_packs (id, pack_type) VALUES ($1, $2)`,
      [pack_id, 'gift_pack']
    );

    for (const char_id of character_ids) {
      await query(
        `INSERT INTO claimable_pack_contents (claimable_pack_id, character_id) VALUES ($1, $2)`,
        [pack_id, char_id]
      );
    }
    return pack_id;
  }

  // Claims a pack for a user, handling duplicates as echoes
  async claim_pack(user_id: string, claim_token: string): Promise<{ granted_characters: string[]; echoes_gained: { character_id: string; count: number }[] }> {
    const pack_result = await query(
      'SELECT id, pack_type FROM claimable_packs WHERE id = $1 AND is_claimed = FALSE',
      [claim_token]
    );

    if (pack_result.rows.length === 0) {
      throw new Error('Invalid or already claimed pack.');
    }

    const pack = pack_result.rows[0];

    const contents_result = await query(
      'SELECT character_id FROM claimable_pack_contents WHERE claimable_pack_id = $1',
      [pack.id]
    );

    const characters_in_pack = contents_result.rows.map((row: any) => row.character_id);
    const granted_characters: string[] = [];
    const echoes_gained: { character_id: string; count: number }[] = [];

    // Performance optimization: Batch query for all characters in pack instead of N individual queries
    const existing_characters_result = await query(
      'SELECT character_id FROM user_characters WHERE user_id = $1 AND character_id = ANY($2)',
      [user_id, characters_in_pack]
    );

    const owned_character_ids = new Set(existing_characters_result.rows.map((row: any) => row.character_id));

    // Process each character in the pack
    for (const char_id of characters_in_pack) {
      if (owned_character_ids.has(char_id)) {
        // Character already owned, convert to echo
        await this.character_echo_service.addEcho(user_id, char_id, 1);
        const existing_echo = echoes_gained.find(e => e.character_id === char_id);
        if (existing_echo) {
          existing_echo.count++;
        } else {
          echoes_gained.push({ character_id: char_id, count: 1 });
        }
      } else {
        // Grant new character
        const new_character = await db_adapter.user_characters.create({
          user_id: user_id,
          character_id: char_id,
          nickname: 'New Character',
        });

        if (new_character) {
          granted_characters.push(new_character.character_id);

          // Initialize preferences for the new character
          try {
            // Fetch archetype first
            const char_details = await query('SELECT archetype FROM characters WHERE id = $1', [char_id]);
            if (char_details.rows[0]?.archetype) {
              const { PreferencePopulationService } = await import('./preferencePopulationService');
              await PreferencePopulationService.initializeRankings(new_character.id, char_details.rows[0].archetype);
              console.log(`✅ Initialized preferences for new character ${new_character.id} (${char_details.rows[0].archetype})`);
            }
          } catch (prefError) {
            console.error('Failed to initialize preferences:', prefError);
            // Non-fatal error, don't fail the pack claim
          }
        } else {
          console.error('Failed to create character:', { user_id, char_id });
        }
      }
    }

    // Mark pack as claimed
    await query(
      'UPDATE claimable_packs SET is_claimed = TRUE, claimed_by_user_id = $1, claimed_at = CURRENT_TIMESTAMP WHERE id = $2',
      [user_id, pack.id]
    );

    return { granted_characters, echoes_gained };
  }

  private async get_random_character_by_rarity(rarity: CharacterRarity): Promise<string | undefined> {
    const available_characters = await this.get_characters_by_rarity(rarity);
    if (available_characters.length === 0) {
      return undefined;
    }
    const random_index = Math.floor(Math.random() * available_characters.length);
    return available_characters[random_index].id;
  }

  private async get_random_character_by_weights(weights: { [key in CharacterRarity]?: number }): Promise<string | undefined> {
    const all_characters = await this.get_all_characters();

    // If weights is empty {} or no characters exist, use random selection
    if (Object.keys(weights).length === 0 || all_characters.length === 0) {
      if (all_characters.length === 0) return undefined;
      const random_index = Math.floor(Math.random() * all_characters.length);
      return all_characters[random_index].id;
    }

    // Check total character count - if less than 30, skip rarity system entirely
    if (all_characters.length < 30) {
      // Not enough characters for proper rarity distribution, use random selection
      const random_index = Math.floor(Math.random() * all_characters.length);
      return all_characters[random_index].id;
    }

    let total_weight = 0;
    const rarity_pool: { rarity: CharacterRarity; weight: number }[] = [];

    // Build available rarity pool (only include rarities that have 3+ characters to avoid duplicates)
    for (const rarity in weights) {
      const weight = weights[rarity as CharacterRarity];
      if (weight) {
        const characters_in_rarity = await this.get_characters_by_rarity(rarity as CharacterRarity);
        if (characters_in_rarity.length >= 3) {
          total_weight += weight;
          rarity_pool.push({ rarity: rarity as CharacterRarity, weight });
        }
      }
    }

    // If no valid rarity pools, fall back to random selection
    if (rarity_pool.length === 0) {
      const random_index = Math.floor(Math.random() * all_characters.length);
      return all_characters[random_index].id;
    }

    let random = Math.random() * total_weight;
    for (const entry of rarity_pool) {
      if (random < entry.weight) {
        const characters_in_rarity = await this.get_characters_by_rarity(entry.rarity);
        const random_index = Math.floor(Math.random() * characters_in_rarity.length);
        return characters_in_rarity[random_index].id;
      }
      random -= entry.weight;
    }

    // Final fallback
    const random_index = Math.floor(Math.random() * all_characters.length);
    return all_characters[random_index].id;
  }

  // Methods needed by PaymentService
  public async get_pack_details(pack_type: string): Promise<any | undefined> {
    try {
      console.log(`🔍 get_pack_details called for pack_type: ${pack_type}`);
      const result = await query('SELECT * FROM card_packs WHERE pack_type = $1', [pack_type]);
      console.log(`🔍 get_pack_details result:`, result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error(`❌ Error fetching pack details for ${pack_type}:`, error);
      return undefined;
    }
  }

  public async mint_digital_cards(user_id: string, pack_type: string): Promise<any[]> {
    console.log(`🎯 mint_digital_cards called for user_id: ${user_id}, pack_type: ${pack_type}`);
    const pack_details = await this.get_pack_details(pack_type);
    console.log(`🎯 pack_details result:`, pack_details);
    if (!pack_details) {
      console.log(`❌ Pack details not found, throwing error for ${pack_type}`);
      throw new Error(`Pack type ${pack_type} not found.`);
    }

    const minted_cards: any[] = [];

    // Generate pack and claim it - reuses existing logic
    const claim_token = await this.generate_pack(pack_type);
    const result = await this.claim_pack(user_id, claim_token);

    // Get character details for each granted character
    for (const char_id of result.granted_characters) {
      const char_result = await query('SELECT id, name, rarity FROM characters WHERE id = $1', [char_id]);
      if (char_result.rows[0]) {
        const character = char_result.rows[0];
        const serial_number = uuidv4().replace(/-/g, '').substring(0, 20);

        minted_cards.push({
          serial_number: serial_number,
          character_id: character.id,
          character_name: character.name,
          character_rarity: character.rarity,
        });
      }
    }

    console.log(`🎯 Minted ${minted_cards.length} cards`);
    return minted_cards;
  }
}
