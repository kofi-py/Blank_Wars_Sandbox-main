import { query } from '../database';
import { User } from '../types';
import { ai_chat_service } from './aiChatService';
import { db } from '../database';
import { applyHqTierEffectsToAllCharacters } from './psychologyService';

export interface HeadquartersState {
  id: string;
  user_id: string;
  tier_id: string;
  balance: number;
  gems: number;
  unlocked_themes: string[];
  rooms: Room[];
}

export interface Room {
  id: string;
  room_id: string;
  name: string;
  theme: string | null;
  elements: string[];
  assigned_characters: string[];
  max_characters: number;
  beds: Bed[];
  custom_image_url?: string;
}

export interface BedDbRow {
  id: string;
  bed_id: string;
  bed_type: string;
  position_x: number;
  position_y: number;
  capacity: number;
  comfort_bonus: number;
  character_id?: string;
  stat_modifier_type?: string;
  stat_modifier_value?: number;
}

export interface Bed {
  id: string;
  bed_id: string;
  bed_type: string;
  position_x: number;
  position_y: number;
  capacity: number;
  comfort_bonus: number;
  character_id?: string;
  stat_modifier_type?: string;
  stat_modifier_value?: number;
}

export class HeadquartersService {
  async upgradeCharacterSlotCapacity(user_id: string, cost: number): Promise<User> {
    // In a real application, you would deduct currency here
    // For now, we'll just update the capacity

    const user_result = await query(
      'SELECT character_slot_capacity FROM users WHERE id = $1',
      [user_id]
    );

    if (user_result.rows.length === 0) {
      throw new Error('User not found.');
    }

    const current_capacity = user_result.rows[0].character_slot_capacity;
    const new_capacity = current_capacity + 5; // Example: Increase by 5 slots per upgrade

    await query(
      'UPDATE users SET character_slot_capacity = $1 WHERE id = $2',
      [new_capacity, user_id]
    );

    const updated_user_result = await query(
      'SELECT id, username, email, subscription_tier, level, experience, total_battles, total_wins, rating, created_at, updated_at, character_slot_capacity, coach_name FROM users WHERE id = $1',
      [user_id]
    );

    return updated_user_result.rows[0];
  }

  async getHeadquarters(user_id: string): Promise<HeadquartersState | null> {
    const hq_result = await query(
      'SELECT * FROM user_headquarters WHERE user_id = $1',
      [user_id]
    );

    if (hq_result.rows.length === 0) {
      return null;
    }

    const hq = hq_result.rows[0];

    // Get rooms
    const rooms_result = await query(
      'SELECT * FROM headquarters_rooms WHERE headquarters_id = $1 ORDER BY room_id',
      [hq.id]
    );

    const rooms: Room[] = [];
    for (const room_row of rooms_result.rows) {
      // Get beds for this room
      const beds_result = await query(
        'SELECT * FROM room_beds WHERE room_id = $1 ORDER BY bed_id',
        [room_row.id]
      );

      const beds: Bed[] = beds_result.rows.map((bed: BedDbRow) => ({
        id: bed.id,
        bed_id: bed.bed_id,
        bed_type: bed.bed_type,
        position_x: bed.position_x,
        position_y: bed.position_y,
        capacity: bed.capacity,
        comfort_bonus: bed.comfort_bonus,
        character_id: bed.character_id,
        stat_modifier_type: bed.stat_modifier_type,
        stat_modifier_value: bed.stat_modifier_value
      }));

      rooms.push({
        id: room_row.id,
        room_id: room_row.room_id,
        name: room_row.name || room_row.room_id,
        theme: room_row.theme,
        elements: room_row.elements ? (typeof room_row.elements === 'string' ? JSON.parse(room_row.elements) : room_row.elements) : [],
        assigned_characters: room_row.assigned_characters ? (typeof room_row.assigned_characters === 'string' ? JSON.parse(room_row.assigned_characters) : room_row.assigned_characters) : [],
        max_characters: room_row.capacity, // Using capacity column from schema
        beds,
        custom_image_url: room_row.custom_image_url
      });
    }

    return {
      id: hq.id,
      user_id: hq.user_id,
      tier_id: hq.tier_id,
      balance: hq.balance,
      gems: hq.gems,
      unlocked_themes: hq.unlocked_themes ? (typeof hq.unlocked_themes === 'string' ? JSON.parse(hq.unlocked_themes) : hq.unlocked_themes) : [],
      rooms
    };
  }

  async saveHeadquarters(user_id: string, headquarters: HeadquartersState): Promise<void> {
    // Start transaction
    await query('BEGIN');

    // Track if tier changed so we can apply psychological effects after commit
    let tier_changed = false;
    let old_tier_id: string | null = null;

    try {
      // Use existing ID if provided, otherwise generate new one
      let hq_id = headquarters.id;
      if (!hq_id) {
        const hq_id_result = await query('SELECT gen_random_uuid() as id');
        hq_id = hq_id_result.rows[0].id;
      }

      // Check current tier before update to detect tier changes
      const current_hq = await query(
        'SELECT tier_id FROM user_headquarters WHERE id = $1',
        [hq_id]
      );
      if (current_hq.rows.length > 0) {
        old_tier_id = current_hq.rows[0].tier_id;
        if (old_tier_id !== headquarters.tier_id) {
          tier_changed = true;
          console.log(`🏠 HQ tier changing from ${old_tier_id} to ${headquarters.tier_id}`);
        }
      }

      // Validate required fields (Fail Loudly)
      if (headquarters.balance === undefined) throw new Error('Headquarters balance is required');
      if (headquarters.gems === undefined) throw new Error('Headquarters gems is required');
      if (!headquarters.tier_id) throw new Error('Headquarters tier_id is required');

      await query(
        `INSERT INTO user_headquarters
         (id, user_id, tier_id, balance, gems, unlocked_themes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           tier_id = EXCLUDED.tier_id,
           balance = EXCLUDED.balance,
           gems = EXCLUDED.gems,
           unlocked_themes = EXCLUDED.unlocked_themes,
           updated_at = CURRENT_TIMESTAMP`,
        [
          hq_id,
          user_id,
          headquarters.tier_id,
          headquarters.balance,
          headquarters.gems,
          JSON.stringify(headquarters.unlocked_themes || [])
        ]
      );

      // Clear existing rooms and beds
      await query('DELETE FROM room_beds WHERE room_id IN (SELECT id FROM headquarters_rooms WHERE headquarters_id = $1)', [hq_id]);
      await query('DELETE FROM headquarters_rooms WHERE headquarters_id = $1', [hq_id]);

      // Insert rooms
      for (const room of headquarters.rooms || []) {
        // Generate room DB ID if not present
        const room_db_id = room.id || (await query('SELECT gen_random_uuid() as id')).rows[0].id;

        await query(
          `INSERT INTO headquarters_rooms 
           (id, headquarters_id, room_id, room_type, capacity, theme, furniture, assigned_characters) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            room_db_id,
            hq_id,
            room.room_id,
            'bedroom', // Default room type
            room.max_characters || 2,
            room.theme || 'blank',
            JSON.stringify(room.elements || []),
            JSON.stringify(room.assigned_characters || [])
          ]
        );

        // Insert beds
        for (const bed of room.beds || []) {
          const bed_db_id = (await query('SELECT gen_random_uuid() as id')).rows[0].id;

          await query(
            `INSERT INTO room_beds 
             (id, room_id, bed_id, bed_type, position_x, position_y, capacity, comfort_bonus, character_id, stat_modifier_type, stat_modifier_value) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              bed_db_id,
              room_db_id,
              bed.bed_id,
              bed.bed_type,
              bed.position_x || 0,
              bed.position_y || 0,
              bed.capacity || 1,
              bed.comfort_bonus || 0,
              bed.character_id,
              bed.stat_modifier_type || 'morale',
              bed.stat_modifier_value || 0
            ]
          );
        }
      }

      await query('COMMIT');

      // If tier changed, apply new psychological effects to all characters in this HQ
      if (tier_changed) {
        await applyHqTierEffectsToAllCharacters(hq_id, headquarters.tier_id);
        console.log(`🏠 Applied new tier psychological effects for ${headquarters.tier_id}`);
      }
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  async purchaseBed(user_id: string, room_id: string, bed_data: any): Promise<void> {
    const hq = await this.getHeadquarters(user_id);
    if (!hq) {
      throw new Error('Headquarters not found');
    }

    // Check if user has enough currency
    if (hq.balance < bed_data.cost.coins || hq.gems < bed_data.cost.gems) {
      throw new Error('Insufficient currency');
    }

    // Deduct currency
    await query(
      'UPDATE user_headquarters SET balance = balance - $1, gems = gems - $2 WHERE user_id = $3',
      [bed_data.cost.coins, bed_data.cost.gems, user_id]
    );

    // Add bed to room
    const room_result = await query(
      'SELECT id FROM headquarters_rooms WHERE headquarters_id = $1 AND room_id = $2',
      [hq.id, room_id]
    );

    if (room_result.rows.length === 0) {
      throw new Error('Room not found');
    }

    const room_db_id = room_result.rows[0].id;
    const bed_db_id = (await query('SELECT gen_random_uuid() as id')).rows[0].id;

    await query(
      `INSERT INTO room_beds 
       (id, room_id, bed_id, bed_type, position_x, position_y, capacity, comfort_bonus, character_id, stat_modifier_type, stat_modifier_value) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        bed_db_id,
        room_db_id,
        bed_data.id,
        bed_data.bed_type,
        bed_data.position_x || 0,
        bed_data.position_y || 0,
        bed_data.capacity,
        bed_data.comfort_bonus,
        null, // No character assigned on purchase
        'morale',
        0
      ]
    );
  }

  async autoAssignCharacters(user_id: string): Promise<void> {
    const hq = await this.getHeadquarters(user_id);
    if (!hq) {
      throw new Error('Headquarters not found');
    }

    // Get all characters for this user
    const characters_result = await query(
      'SELECT id, base_name FROM user_characters WHERE user_id = $1 ORDER BY id',
      [user_id]
    );

    if (characters_result.rows.length === 0) {
      return; // No characters to assign
    }

    const characters = characters_result.rows;

    // Query sleeping_spot_types from DB for bed hierarchy (replaces hardcoded BED_HIERARCHY)
    const spot_types_result = await query(
      'SELECT id, comfort_tier, mood_modifier FROM sleeping_spot_types ORDER BY comfort_tier ASC'
    );
    const spot_types_map = new Map<string, { priority: number; bonus: number }>();
    for (const row of spot_types_result.rows) {
      spot_types_map.set(row.id, { priority: row.comfort_tier, bonus: row.mood_modifier });
    }

    // Collect all beds across all rooms and sort by priority
    interface BedWithRoom {
      bed_id: string;
      db_id: string;
      room_db_id: string;
      bed_type: string;
      capacity: number;
      priority: number;
      bonus: number;
    }

    const all_beds: BedWithRoom[] = [];

    for (const room of hq.rooms) {
      for (const bed of room.beds) {
        const spot_type = spot_types_map.get(bed.bed_type);
        if (spot_type) {
          all_beds.push({
            bed_id: bed.bed_id,
            db_id: bed.id,
            room_db_id: room.id,
            bed_type: bed.bed_type,
            capacity: bed.capacity,
            priority: spot_type.priority,
            bonus: spot_type.bonus
          });
        }
      }
    }

    // Sort beds by priority (lower number = better)
    all_beds.sort((a, b) => a.priority - b.priority);

    // Start transaction
    await query('BEGIN');

    try {
      // Clear all existing assignments
      for (const room of hq.rooms) {
        await query(
          'UPDATE headquarters_rooms SET assigned_characters = $1 WHERE id = $2',
          [JSON.stringify([]), room.id]
        );

        for (const bed of room.beds) {
          await query(
            'UPDATE room_beds SET character_id = NULL WHERE id = $1',
            [bed.id]
          );
        }
      }

      let char_index = 0;

      // Assign characters to beds
      for (const bed of all_beds) {
        for (let slot = 0; slot < bed.capacity && char_index < characters.length; slot++) {
          const character = characters[char_index];

          // Update room_beds with character assignment
          await query(
            `UPDATE room_beds 
             SET character_id = $1, stat_modifier_type = 'morale', stat_modifier_value = $2 
             WHERE id = $3`,
            [character.id, bed.bonus, bed.db_id]
          );

          // Also update room's assigned_characters array (legacy compatibility)
          const room_chars_result = await query(
            'SELECT assigned_characters FROM headquarters_rooms WHERE id = $1',
            [bed.room_db_id]
          );

          const current_assigned = room_chars_result.rows[0]?.assigned_characters
            ? JSON.parse(room_chars_result.rows[0].assigned_characters)
            : [];
          current_assigned.push(character.base_name);

          await query(
            'UPDATE headquarters_rooms SET assigned_characters = $1 WHERE id = $2',
            [JSON.stringify(current_assigned), bed.room_db_id]
          );

          char_index++;
        }
      }


      // Floor sleeping for remaining characters
      if (char_index < characters.length) {
        const remaining_characters = characters.slice(char_index);


        // Categorize rooms by type for floor assignment
        const bedroom_rooms = hq.rooms.filter(r =>
          r.name.toLowerCase().includes('bedroom')
        );
        const living_rooms = hq.rooms.filter(r =>
          r.name.toLowerCase().includes('living') || r.name.toLowerCase().includes('common')
        );

        let floor_char_index = 0;

        // Assign to bedroom floors first (2 spots per bedroom, -5 penalty)
        for (const room of bedroom_rooms) {
          const floor_capacity = 2;
          for (let i = 0; i < floor_capacity && floor_char_index < remaining_characters.length; i++) {
            const character = remaining_characters[floor_char_index];
            const floor_bed_id = `floor_${room.id}_${i}`;

            // Insert virtual floor bed
            await query(
              `INSERT INTO room_beds 
               (id, room_id, bed_id, bed_type, position_x, position_y, capacity, comfort_bonus, character_id, stat_modifier_type, stat_modifier_value) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               ON CONFLICT (id) DO UPDATE SET
                 character_id = EXCLUDED.character_id,
                 stat_modifier_value = EXCLUDED.stat_modifier_value`,
              [
                floor_bed_id,
                room.id,
                floor_bed_id,
                'floor',
                0, 0, // position
                1, // capacity
                0, // comfort_bonus
                character.id,
                'morale',
                -5 // penalty for bedroom floor
              ]
            );

            // Update room's assigned_characters
            const room_chars_result = await query(
              'SELECT assigned_characters FROM headquarters_rooms WHERE id = $1',
              [room.id]
            );
            const current_assigned = room_chars_result.rows[0]?.assigned_characters
              ? JSON.parse(room_chars_result.rows[0].assigned_characters)
              : [];
            current_assigned.push(character.base_name);
            await query(
              'UPDATE headquarters_rooms SET assigned_characters = $1 WHERE id = $2',
              [JSON.stringify(current_assigned), room.id]
            );

            floor_char_index++;
          }
        }

        // Assign remaining to living room floors (3 spots per living room, -10 penalty)
        for (const room of living_rooms) {
          const floor_capacity = 3;
          for (let i = 0; i < floor_capacity && floor_char_index < remaining_characters.length; i++) {
            const character = remaining_characters[floor_char_index];
            const floor_bed_id = `floor_${room.id}_${i}`;

            // Insert virtual floor bed
            await query(
              `INSERT INTO room_beds 
               (id, room_id, bed_id, bed_type, position_x, position_y, capacity, comfort_bonus, character_id, stat_modifier_type, stat_modifier_value) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               ON CONFLICT (id) DO UPDATE SET
                 character_id = EXCLUDED.character_id,
                 stat_modifier_value = EXCLUDED.stat_modifier_value`,
              [
                floor_bed_id,
                room.id,
                floor_bed_id,
                'floor',
                0, 0, // position
                1, // capacity
                0, // comfort_bonus
                character.id,
                'morale',
                -10 // penalty for living room floor
              ]
            );

            // Update room's assigned_characters
            const room_chars_result = await query(
              'SELECT assigned_characters FROM headquarters_rooms WHERE id = $1',
              [room.id]
            );
            const current_assigned = room_chars_result.rows[0]?.assigned_characters
              ? JSON.parse(room_chars_result.rows[0].assigned_characters)
              : [];
            current_assigned.push(character.base_name);
            await query(
              'UPDATE headquarters_rooms SET assigned_characters = $1 WHERE id = $2',
              [JSON.stringify(current_assigned), room.id]
            );

            floor_char_index++;
          }
        }

        if (floor_char_index < remaining_characters.length) {
          console.warn(`${remaining_characters.length - floor_char_index} characters still have no assignment after floor allocation`);
        }
      }


      await query('COMMIT');
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  async handle_real_estate_chat(user_id: string, chat_context: any): Promise<any> {
    try {
      console.log('🏢 [RealEstate] Starting chat for user_id:', user_id);

      const { selected_agent, competing_agents, user_message, current_team_stats, conversation_history } = chat_context;

      if (!selected_agent || !selected_agent.id || !selected_agent.name) {
        throw new Error('Invalid selected_agent data');
      }

      // Use the agent's actual personality from the frontend data
      const real_estate_agent_personality = selected_agent.personality || {
        traits: ['Professional', 'Persuasive', 'Detail-oriented', 'Competitive'],
        speech_style: 'Professional yet personable',
        motivations: ['Making sales', 'Client satisfaction', 'Property expertise'],
        fears: ['Losing deals', 'Client dissatisfaction', 'Market downturns']
      };

      // Convert conversation history to Open_ai format
      const formatted_messages = (conversation_history || []).map((msg: any) => {
        // Determine role based on whether it's from the selected agent or user
        const role = msg.agent_id === selected_agent.id ? 'assistant' : 'user';
        return {
          role: role,
          content: msg.message
        };
      });

      console.log('🏢 [RealEstate] Calling AI service...');
      const agent_response = await ai_chat_service.generate_character_response(
        {
          character_id: selected_agent.id,
          character_name: selected_agent.name,
          personality: real_estate_agent_personality,
          historical_period: 'Modern real estate market',
          mythology: 'Professional services',
          current_bond_level: 3,
          previous_messages: formatted_messages,
          conversation_context: selected_agent.conversation_context
        },
        user_message || "Hello, I'm interested in discussing facilities for my team.",
        user_id,
        db,
        { is_in_battle: false }
      );
      console.log('🏢 [RealEstate] AI service response:', agent_response);

      const responses = [{
        agent_id: selected_agent.id,
        agent_name: selected_agent.name,
        message: agent_response.message,
        timestamp: new Date(),
        is_competitor_interruption: false
      }];

      // Simulate competitor interruption (30% chance)
      if (competing_agents && competing_agents.length > 0 && Math.random() < 0.3) {
        const competitor_agent = competing_agents[Math.floor(Math.random() * competing_agents.length)];
        const interruption_message = `Actually, I think I can offer you a better deal on that property...`;
        responses.push({
          agent_id: competitor_agent.id,
          agent_name: competitor_agent.name,
          message: interruption_message,
          timestamp: new Date(),
          is_competitor_interruption: true
        });
      }

      console.log('🏢 [RealEstate] Returning responses:', responses);
      return responses;
    } catch (error) {
      console.error('🏢 [RealEstate] Error in handle_real_estate_chat:', error);
      throw error;
    }
  }

  /**
   * Assign a character to the best available sleeping spot in their HQ.
   * Called on character creation/unlock.
   * Returns the assigned bed_type (or 'floor' if no spots available).
   */
  async assignSleepingSpot(user_char_id: string, user_id: string): Promise<string> {
    // Get the user's HQ
    const hq_result = await query(
      'SELECT id FROM user_headquarters WHERE user_id = $1',
      [user_id]
    );

    if (hq_result.rows.length === 0) {
      // No HQ yet - just set to floor and return
      await query(
        'UPDATE user_characters SET sleeping_arrangement = $1 WHERE id = $2',
        ['floor', user_char_id]
      );
      return 'floor';
    }

    const hq_id = hq_result.rows[0].id;

    // Find the best available spot (lowest comfort_tier = best)
    const spot_result = await query(`
      SELECT rb.id, rb.bed_type
      FROM room_beds rb
      JOIN headquarters_rooms hr ON rb.room_id = hr.id
      JOIN sleeping_spot_types sst ON rb.bed_type = sst.id
      WHERE hr.headquarters_id = $1
        AND rb.character_id IS NULL
      ORDER BY sst.comfort_tier ASC
      LIMIT 1
    `, [hq_id]);

    if (spot_result.rows.length > 0) {
      // Assign to best available spot - trigger will update user_characters.sleeping_arrangement
      await query(
        'UPDATE room_beds SET character_id = $1 WHERE id = $2',
        [user_char_id, spot_result.rows[0].id]
      );
      console.log(`🛏️ Assigned ${user_char_id} to ${spot_result.rows[0].bed_type}`);
      return spot_result.rows[0].bed_type;
    } else {
      // No spots available - set to floor directly
      await query(
        'UPDATE user_characters SET sleeping_arrangement = $1 WHERE id = $2',
        ['floor', user_char_id]
      );
      console.log(`🛏️ No spots available, assigned ${user_char_id} to floor`);
      return 'floor';
    }
  }

  /**
   * Create initial headquarters for new user during registration.
   * Creates HQ with starter layout based on tier capacity from headquarters_tiers table.
   * Returns HQ ID and tier for character assignment and context initialization.
   */
  async createInitialHeadquarters(user_id: string): Promise<{ id: string; tier_id: string }> {
    await query('BEGIN');

    try {
      // Random starter hovel (3 terrible options)
      const starter_hovels = ['your_parents_basement', 'radioactive_roach_motel', 'hobo_camp'];
      const random_tier = starter_hovels[Math.floor(Math.random() * starter_hovels.length)];

      // Get tier capacity from headquarters_tiers table
      const tier_data = await query(
        'SELECT max_rooms, max_beds FROM headquarters_tiers WHERE tier_id = $1',
        [random_tier]
      );

      if (tier_data.rows.length === 0) {
        throw new Error(`Tier ${random_tier} not found in headquarters_tiers table`);
      }

      // Generate HQ UUID
      const hq_id_result = await query('SELECT gen_random_uuid() as id');
      const hq_id = hq_id_result.rows[0].id;

      // Create headquarters
      await query(
        `INSERT INTO user_headquarters (id, user_id, tier_id, balance, gems, unlocked_themes, is_primary, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [hq_id, user_id, random_tier, 50000, 100, JSON.stringify([]), true]
      );

      // Define furnishings for each tier as specified
      const furnishings: Record<string, { type: string; count: number }[]> = {
        'hobo_camp': [],
        'your_parents_basement': [{ type: 'bed', count: 1 }],
        'radioactive_roach_motel': [{ type: 'bunk_bed', count: 1 }],
        'spartan_apartment': [
          { type: 'master_bed', count: 1 },
          { type: 'bunk_bed', count: 1 }
        ],
        'basic_house': [
          { type: 'master_bed', count: 1 },
          { type: 'bed', count: 2 },
          { type: 'couch', count: 1 }
        ],
        'condo': [
          { type: 'master_bed', count: 1 },
          { type: 'bed', count: 1 },
          { type: 'bunk_bed', count: 1 },
          { type: 'couch', count: 1 }
        ],
        'mansion': [
          { type: 'master_bed', count: 2 },
          { type: 'bed', count: 2 },
          { type: 'bunk_bed', count: 1 },
          { type: 'couch', count: 2 }
        ],
        'compound': [
          { type: 'master_bed', count: 4 },
          { type: 'bed', count: 4 },
          { type: 'bunk_bed', count: 2 },
          { type: 'couch', count: 3 }
        ],
        'super_yacht': [
          { type: 'master_bed', count: 6 },
          { type: 'bed', count: 7 },
          { type: 'bunk_bed', count: 4 },
          { type: 'couch', count: 4 }
        ],
        'moon_base': [
          { type: 'master_bed', count: 20 },
          { type: 'bed', count: 15 },
          { type: 'bunk_bed', count: 10 },
          { type: 'couch', count: 15 }
        ]
      };

      const tier_furnishings = furnishings[random_tier] || [];
      const { max_rooms } = tier_data.rows[0];

      if (max_rooms > 0) {
        // Create rooms and distribute furnishings
        const rooms: string[] = [];
        for (let i = 0; i < max_rooms; i++) {
          const room_id_result = await query('SELECT gen_random_uuid() as id');
          const room_id = room_id_result.rows[0].id;
          rooms.push(room_id);

          await query(
            `INSERT INTO headquarters_rooms (id, headquarters_id, room_id, room_type, capacity, occupied_slots, theme, furniture, assigned_characters, position_x, position_y, width, height, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)`,
            [room_id, hq_id, `room_${i + 1}`, 'bedroom', 0, 0, 'blank', '[]', '[]', i, 0, 1, 1]
          );
        }

        // Distribute beds across rooms
        let current_room_index = 0;
        for (const item of tier_furnishings) {
          for (let k = 0; k < item.count; k++) {
            const room_id = rooms[current_room_index];
            const capacity = item.type === 'bunk_bed' ? 2 : 1;
            const stat_modifier_type = item.type === 'master_bed' ? 'morale' : (item.type === 'couch' ? 'morale' : 'health');
            const stat_modifier_value = item.type === 'master_bed' ? 10 : (item.type === 'couch' ? -2 : 5);

            await query(
              `INSERT INTO room_beds (id, room_id, bed_id, bed_type, position_x, position_y, capacity, comfort_bonus, character_id, stat_modifier_type, stat_modifier_value, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3, 0, 0, $4, 0, NULL, $5, $6, CURRENT_TIMESTAMP)`,
              [room_id, `${item.type}_${k + 1}`, item.type, capacity, stat_modifier_type, stat_modifier_value]
            );

            // Update room capacity
            await query(
              'UPDATE headquarters_rooms SET capacity = capacity + $1 WHERE id = $2',
              [capacity, room_id]
            );

            current_room_index = (current_room_index + 1) % rooms.length;
          }
        }
      }

      await query('COMMIT');
      console.log(`🏠 Created initial headquarters for user ${user_id}: ${hq_id} (${random_tier})`);
      return { id: hq_id, tier_id: random_tier };
    } catch (error) {
      await query('ROLLBACK');
      console.error(`❌ Failed to create initial headquarters for user ${user_id}:`, error);
      throw error;
    }
  }
}

// Export singleton for use in character creation
export const headquarters_service = new HeadquartersService();
