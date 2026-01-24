// Cache buster: 2025-12-20T00:59 - Force Railway rebuild
import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { db_adapter } from './databaseAdapter';
import { analytics_service } from './analytics';
import { cache } from '../database/index';
import { hostmaster_service, HostmasterContext } from './hostmasterService';
import { applyHeadquartersEffectsToCharacter, getHeadquartersData } from './headquartersEffectsService';
import { CoachProgressionService } from './coachProgressionService';
import { CharacterProgressionService } from './characterProgressionService';
import { ResurrectionService } from './resurrectionService';
import { ticket_service } from './ticketService';
import { InternalMailService } from './internalMailService';
import { applyBattleOutcomeEffects } from './psychologyService';
import * as BattleMechanics from './battleMechanicsService';
import {
  loadBattleCharacter,
  initializePowerCooldowns,
  initializeSpellCooldowns,
  PowerDefinition,
  SpellDefinition
} from './battleCharacterLoader';
// Legacy imports removed - all actions now go through battleActionExecutor.executeAction()
import {
  executeAction,
  BattleActionRequest,
  BattleActionResult,
  BattleContext,
  MoveActionRequest,
  AttackActionRequest,
  PowerActionRequest,
  SpellActionRequest,
  DefendActionRequest
} from './battleActionExecutor';
import {
  reconstructBattleState,
  persistBattleAction,
  ReconstructedState
} from './battleStateReconstructor';
import {
  executeTurn,
  CoachOrder,
  TurnExecutionResult,
} from './battleTurnService';
import { getAttackType } from './attackTypesService';
import { lockCharactersForBattle, unlockCharactersFromBattle } from './battleLockService';

// Validate required environment variables
const SERVER_ID = process.env.SERVER_ID;
if (!SERVER_ID) {
  throw new Error('SERVER_ID environment variable is required');
}

// Types
interface BattleCharacter {
  id: string;
  user_id: string;
  character_id: string;
  name: string;
  title?: string;
  archetype: string;
  level: number;
  experience: number;
  current_health: number;
  max_health: number;
  attack: number;
  defense: number;
  speed: number;
  magic_attack: number;
  magic_defense: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  spirit: number;
  initiative: number;
  abilities: Ability[];
  personality_traits: string[];
  equipment: any[];
  is_injured: boolean;
  recovery_time?: Date;
  total_battles: number;
  total_wins: number;
  base_action_points: number;
  // Powers & Spells Integration
  unlocked_powers: PowerDefinition[];
  unlocked_spells: SpellDefinition[];
  equipped_powers: PowerDefinition[];
  equipped_spells: SpellDefinition[];
  gameplan_adherence: number; // 0-100
}

interface Ability {
  name: string;
  power: number;
  cooldown: number;
  type: string;
  effect?: string;
}

interface BattleUser {
  user_id: string;
  character_id: string;
  character: BattleCharacter;
  connected: boolean;
  health: number;
  max_health: number;
  effects: StatusEffect[];
  cooldowns: Record<string, number>;
  rating: number;
  // Powers & Spells Cooldowns
  power_cooldowns?: Map<string, number>;
  spell_cooldowns?: Map<string, number>;
  team_characters?: BattleCharacter[]; // ✅ 3v3: Full team (optional for backwards compatibility)
}

interface StatusEffect {
  type: string;
  duration: number;
  value?: number;
  damage_per_turn?: number;
  heal_per_turn?: number;
  charges?: number;
  damage_multiplier?: number;
  attack_multiplier?: number;
  defense_reduction?: number;
}

interface BattleState {
  id: string;
  phase: string;
  round: number;
  turn: number;
  max_rounds: number;
  user: BattleUser;
  opponent: BattleUser;
  combat_log: CombatEvent[];
  chat_enabled: boolean;
  timer: NodeJS.Timeout | null;
  created_at: number;
  // Hex Grid Battle Mode
  hex_battle_mode?: boolean;
  hex_grid_state?: HexGridState;
  round_adherence?: Record<string, boolean>; // Character ID -> Adherence Status (true=following, false=rogue)
  // Timer tracking for cleanup (prevents memory leaks and stale callbacks)
  connection_timeout_timer?: NodeJS.Timeout | null;
  disconnect_timers?: Map<string, NodeJS.Timeout>; // user_side -> timer
}

interface HexGridState {
  grid_size: { q: number; r: number };
  character_positions: Map<string, HexPosition>;
  action_states: Map<string, CharacterHexActionState>;
  terrain_features: TerrainFeature[];
  turn_order: string[];
  current_turn_index: number;
}

interface HexPosition {
  q: number;
  r: number;
  s: number;
}

interface CharacterHexActionState {
  character_id: string;
  position: HexPosition;
  action_points: number;
  max_action_points: number;
  has_acted: boolean;
  planned_action?: PlannedHexAction;      // Legacy single action
  planned_actions?: PlannedHexAction[];   // New: queue of actions for full turn
}

interface PlannedHexAction {
  type: 'move' | 'attack' | 'move_and_attack' | 'defend' | 'power' | 'spell' | 'item';
  move_to_hex?: HexPosition;
  attack_target_id?: string;
  attack_target_hex?: HexPosition;
  attack_type_id?: string;   // For attack actions: 'jab', 'strike', 'heavy', 'all_out'
  ability_id?: string;       // For power/spell actions
  ability_name?: string;     // For display
  item_id?: string;          // For item actions
}

// Dramatic event types for frontend animation hooks
type DramaticEventType =
  | 'action_executed'      // Normal action - quick animation
  | 'rebellion_occurred'   // Adherence fail - judge cutscene
  | 'character_killed'     // HP → 0 - death animation
  | 'critical_hit'         // High damage - impact effect
  | 'power_unleashed'      // Power/spell used - ability VFX
  | 'turn_complete'        // All AP spent - brief pause
  | 'round_complete'       // All 6 acted - round transition
  | 'battle_end';          // Victory/defeat - end cinematic

interface ActionQueueResult {
  action_index: number;
  action: PlannedHexAction;
  result: any;  // BattleActionResult
  dramatic_event: DramaticEventType;
  declaration?: string;
  is_rebellion: boolean;
  rebellion_details?: {
    coach_ordered: string;
    character_did: string;
    judge_ruling?: any;
  };
  character_killed?: {
    character_id: string;
    character_name: string;
  };
}

interface TurnQueueExecutionResult {
  character_id: string;
  character_name: string;
  actions_executed: ActionQueueResult[];
  ap_spent: number;
  ap_remaining: number;
  turn_interrupted: boolean;  // True if rebellion/death stopped execution
  interruption_reason?: string;
}

interface TerrainFeature {
  position: HexPosition;
  type: 'broadcast_tower' | 'shark_perimeter' | 'cover' | 'hazard';
  blocks_movement?: boolean;
  blocks_line_of_sight?: boolean;
}

interface CombatEvent {
  type: string;
  round?: number;
  timestamp: number;
  attacker?: string;
  defender?: string;
  ability?: string;
  damage?: number;
  critical?: boolean;
  remaining_health?: Record<string, number>;
  order?: string[];
  character?: string;
  target?: string;
  effect?: string;
  amount?: number;
  reason?: string;
  // Hex Grid Battle Events
  hex_position?: HexPosition;
  hex_move_path?: HexPosition[];
  flanking?: boolean;
  line_of_sight?: boolean;
  range_modifier?: number;
}

interface QueueEntry {
  user_id: string;
  team_characters: BattleCharacter[]; // 3v3: Array of 3 characters
  mode: 'pvp' | 'pve';
  rating: number;
  timestamp: number;
  ai_team_id?: string; // For PVE mode
  user_team_id?: string; // For PVP mode (future)
  team_name?: string;
  coach_name?: string;
}

interface StrategyModifiers {
  atk_mod: number;
  def_mod: number;
  spd_mod: number;
}

interface BattleRewards {
  xp: number;
  currency: number;
  bond: number;
  winner: boolean;
}

interface CombatResult {
  user: {
    health: number;
    effects: StatusEffect[];
    cooldowns: Record<string, number>;
  };
  opponent: {
    health: number;
    effects: StatusEffect[];
    cooldowns: Record<string, number>;
  };
  events: CombatEvent[];
}

// Battle phases
const BATTLE_PHASES = {
  MATCHMAKING: 'matchmaking',
  ROUND_COMBAT: 'round_combat',
  CHAT_BREAK: 'chat_break',
  BATTLE_END: 'battle_end'
} as const;

// Battle configuration
const BATTLE_CONFIG = {
  MAX_ROUNDS: 3,
  ROUND_DURATION: 30, // seconds
  CHAT_DURATION: 45, // seconds
  TURN_SPEED_BONUS: 0.1, // 10% speed bonus for going first
  CRIT_MULTIPLIER: 2.0, // Default critical hit damage multiplier
} as const;

/**
 * Main Battle Manager
 * Handles matchmaking, battle lifecycle, and real-time communication
 */
export class BattleManager extends EventEmitter {
  private io: SocketIOServer;
  private active_battles: Map<string, BattleState>;
  private battle_queue: Map<string, QueueEntry>;
  private user_socket_map: Map<string, string>; // Map user_id to socket.id

  constructor(io: SocketIOServer) {
    super();
    this.io = io;
    this.active_battles = new Map();
    this.battle_queue = new Map();
    this.user_socket_map = new Map();

    // Initialize Hostmaster v8.72 with the same io instance
    if (typeof global !== 'undefined') {
      (global as any).io = io;
    }

    // Subscribe to battle events for multi-server coordination
    this.initialize_multi_server_coordination().catch(error => {
      console.warn('⚠️ Failed to initialize multi-server coordination:', error instanceof Error ? error.message : String(error));
    });

    // CRITICAL: Clean up any orphaned battles from previous server runs
    // This prevents characters from being permanently stuck
    this.cleanup_orphaned_battles().catch(error => {
      console.error('❌ Failed to cleanup orphaned battles:', error);
    });
  }

  // Clean up battles that were in progress when server crashed/restarted
  private async cleanup_orphaned_battles(): Promise<void> {
    try {
      console.log('🧹 Checking for orphaned battles from previous server runs...');

      // Find all characters that are locked in battles
      const stuck_result = await db_adapter.query(`
        SELECT uc.id, uc.current_battle_id, b.status as battle_status
        FROM user_characters uc
        LEFT JOIN battles b ON uc.current_battle_id = b.id
        WHERE uc.current_battle_id IS NOT NULL
      `);

      if (stuck_result.rows.length === 0) {
        console.log('✅ No orphaned battles found');
        return;
      }

      console.log(`⚠️ Found ${stuck_result.rows.length} characters in battles, cleaning up...`);

      // Get unique battle IDs
      const battle_ids = [...new Set(stuck_result.rows.map((r: { id: string; current_battle_id: string; battle_status: string | null }) => r.current_battle_id))];

      for (const battle_id of battle_ids) {
        // Mark battle as abandoned if still in_progress
        await db_adapter.query(`
          UPDATE battles
          SET status = 'abandoned', ended_at = NOW()
          WHERE id = $1 AND status = 'in_progress'
        `, [battle_id]);

        // Unlock all characters from this battle
        await unlockCharactersFromBattle(battle_id as string);
        console.log(`🔓 Cleaned up orphaned battle: ${battle_id}`);
      }

      console.log(`✅ Orphaned battle cleanup complete: ${battle_ids.length} battles cleaned`);
    } catch (error) {
      console.error('❌ Error cleaning up orphaned battles:', error);
    }
  }

  // Initialize multi-server coordination with Redis
  private async initialize_multi_server_coordination(): Promise<void> {
    try {
      // Subscribe to global battle events
      if (cache.isUsingRedis()) {
        await cache.subscribeToBattleEvents('global', (event: any) => {
          this.handle_global_battle_event(event);
        });
        console.log('✅ Multi-server battle coordination initialized');
      } else {
        console.warn('⚠️ Multi-server coordination unavailable (Redis not in use), using single-server mode.');
      }
    } catch (error) {
      console.warn('⚠️ Multi-server coordination unavailable, using single-server mode:', error instanceof Error ? error.message : String(error));
    }
  }

  // Handle global battle events from other servers
  private handle_global_battle_event(event: any): void {
    try {
      switch (event.type) {
        case 'battle_created':
          // Another server created a battle, track it for coordination
          console.log(`📊 Battle ${event.battle_id} created on server ${event.server_id}`);
          // Remove users from local queue if they exist
          if (event.user_id) {
            this.battle_queue.delete(event.user_id);
          }
          if (event.opponent_id) {
            this.battle_queue.delete(event.opponent_id);
          }
          break;
        case 'battle_ended':
          // Another server ended a battle, clean up any local references
          console.log(`📊 Battle ${event.battle_id} ended on server ${event.server_id}`);
          if (event.battle_id && this.active_battles.has(event.battle_id)) {
            // Remove from local state if somehow we have a reference
            this.active_battles.delete(event.battle_id);
          }
          break;
        case 'user_disconnected':
          // Handle user disconnection across servers
          console.log(`📊 User ${event.user_id} disconnected from server ${event.server_id}`);
          // Remove from local queue if they exist
          if (event.user_id) {
            this.battle_queue.delete(event.user_id);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling global battle event:', error);
    }
  }

  // Redis-enhanced matchmaking
  private async add_to_distributed_queue(queue_entry: QueueEntry): Promise<void> {
    console.log(`[BattleManager] add_to_distributed_queue called for ${queue_entry.user_id}`);
    console.log('[BattleManager] Cache object keys:', Object.keys(cache));
    console.log('[BattleManager] Cache prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(cache)));
    try {
      await cache.addUserToMatchmaking(queue_entry.user_id, {
        team_characters: queue_entry.team_characters, // ✅ 3v3: Store full team
        rating: queue_entry.rating,
        timestamp: queue_entry.timestamp,
        mode: queue_entry.mode,
        server_id: SERVER_ID,
        ai_team_id: queue_entry.ai_team_id,
        user_team_id: queue_entry.user_team_id
      }, queue_entry.mode);
    } catch (error) {
      console.error('[BattleManager] Failed to add to distributed queue, using local fallback:', error);
      // Fallback to local queue
      this.battle_queue.set(queue_entry.user_id, queue_entry);
    }
  }

  private async remove_from_distributed_queue(user_id: string, mode: string): Promise<void> {
    try {
      await cache.removeUserFromMatchmaking(user_id, mode);
    } catch (error) {
      console.error('Failed to remove user from distributed queue:', error);
    }
    // Always clean local queue
    this.battle_queue.delete(user_id);
  }

  private async find_distributed_opponent(queue_entry: QueueEntry): Promise<QueueEntry | null> {
    try {
      const queue_users = await cache.getMatchmakingQueue(queue_entry.mode);

      for (const user of queue_users) {
        // Skip self
        if (user.id === queue_entry.user_id) continue;

        const user_data = user.data;
        const rating_diff = Math.abs(queue_entry.rating - user_data.rating);
        const wait_time = Date.now() - queue_entry.timestamp;

        // Expand rating range based on wait time
        const max_rating_diff = Math.min(200 + wait_time / 1000, 500);

        if (rating_diff <= max_rating_diff) {
          // Use distributed lock to prevent race conditions between servers
          const lock_key = `match_lock:${[queue_entry.user_id, user.id].sort().join(':')}`;

          try {
            // Try to acquire lock with Redis SETNX
            const lock_value = `${SERVER_ID}:${Date.now()}`;
            await cache.set(lock_key, lock_value, 5); // 5 second expiry
            const lock_acquired = 'OK'; // Simplified for in-memory cache

            if (lock_acquired === 'OK') {
              // Double-check both users are still in queue before proceeding
              const queue_users_check = await cache.getMatchmakingQueue(queue_entry.mode);
              const user_still_in_queue = queue_users_check.some(p => p.id === queue_entry.user_id);
              const opponent_still_in_queue = queue_users_check.some(p => p.id === user.id);

              if (user_still_in_queue && opponent_still_in_queue) {
                // Found a match! Convert back to QueueEntry format
                const opponent: QueueEntry = {
                  user_id: user.id,
                  team_characters: user_data.team_characters, // ✅ 3v3: Deserialize full team
                  rating: user_data.rating,
                  timestamp: user_data.timestamp || Date.now(),
                  mode: user_data.mode as 'pvp' | 'pve',
                  user_team_id: user_data.user_team_id
                };

                // Remove both users from queue atomically
                await this.remove_from_distributed_queue(queue_entry.user_id, queue_entry.mode);
                await this.remove_from_distributed_queue(opponent.user_id, opponent.mode);

                // Release lock before returning
                await cache.del(lock_key);

                return opponent;
              } else {
                // One of the players was already matched, release lock and continue searching
                await cache.del(lock_key);
              }
            }
            // If lock not acquired, another server is processing this match, skip this player
          } catch (lock_error) {
            console.error('Error with distributed lock:', lock_error);
            // Continue without lock as fallback
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to find distributed opponent:', error);
      // Fallback to local matchmaking
      return this.find_opponent(queue_entry);
    }
  }

  // Find match for player
  async find_match(user_id: string, character_id: string, mode: 'pvp' | 'pve' = 'pvp'): Promise<any> { // Typed mode
    try {
      const user = await db_adapter.users.find_by_id(user_id);
      if (!user) {
        throw new Error(`User ${user_id} not found`);
      }

      // ✅ Load USER'S FULL TEAM (3 characters from teams table)
      const teamResult = await db_adapter.query(`
        SELECT t.id as team_id, t.character_slot_1, t.character_slot_2, t.character_slot_3
        FROM teams t
        WHERE t.user_id = $1 AND t.is_active = true
        LIMIT 1
      `, [user_id]);

      if (teamResult.rows.length === 0) {
        throw new Error('No active team found. Please create a team first.');
      }

      const team = teamResult.rows[0];
      const characterSlots = [team.character_slot_1, team.character_slot_2, team.character_slot_3].filter(Boolean);

      if (characterSlots.length !== 3) {
        throw new Error(`Team incomplete. You have ${characterSlots.length}/3 characters. Please assign 3 characters to your team.`);
      }

      console.log(`✅ Loading team for user ${user_id}: ${characterSlots.length} characters`);

      // Load all 3 characters with powers/spells
      const team_characters: BattleCharacter[] = [];
      for (const charId of characterSlots) {
        const battle_character = await loadBattleCharacter(charId);

        if (!battle_character || battle_character.user_id !== user_id) {
          throw new Error(`Invalid character ${charId} in team`);
        }

        // Check if character is injured
        if (battle_character.is_injured && battle_character.recovery_time && battle_character.recovery_time > new Date()) {
          throw new Error(`Character ${battle_character.name} is still recovering until ${battle_character.recovery_time}`);
        }

        // Apply headquarters effects to character stats
        const headquarters = await getHeadquartersData(user_id);
        const enhanced_character = headquarters
          ? applyHeadquartersEffectsToCharacter(battle_character as any, headquarters)
          : battle_character;

        team_characters.push(enhanced_character as any as BattleCharacter);
      }

      // Check daily battle limits
      const { usage_tracking_service } = require('./usageTrackingService');
      const { db } = require('../database/postgres');

      const can_battle = await usage_tracking_service.trackBattleUsage(user_id, db);
      if (!can_battle) {
        throw new Error('Daily battle limit reached. Upgrade to premium for more battles!');
      }

      // Create queue entry with full team
      const queue_entry: QueueEntry = {
        user_id,
        team_characters, // ✅ Full 3-character team
        rating: user.rating,
        timestamp: Date.now(),
        mode,
        user_team_id: team.team_id
      };

      console.log(`[BattleManager] Calling add_to_distributed_queue for ${user_id}`);
      // Add to distributed queue (Redis) for multi-server support
      await this.add_to_distributed_queue(queue_entry);
      analytics_service.trackUserAction(user_id, 'matchmaking_start', { character_id, mode });

      // PVE Matchmaking
      if (mode === 'pve') {
        console.log(`🤖 PVE Matchmaking started for user ${user_id}`);
        const opponent = await this.find_pve_opponent(queue_entry);
        if (opponent) {
          console.log(`✅ PVE Opponent found: ${opponent.team_characters[0].name}`);
          // Create battle
          const battle = await this.create_battle(queue_entry, opponent);

          // CRITICAL: If battle creation failed, return error instead of 'found' with undefined id
          if (!battle || !battle.id) {
            console.error('❌ Battle creation failed - returning error to client');
            return {
              status: 'failed' as const,
              error: 'Failed to create battle. Please try again.'
            };
          }

          // Publish battle creation event
          await cache.publishBattleEvent('global', {
            type: 'battle_created',
            battle_id: battle.id,
            user_id: user_id,
            opponent_id: opponent.user_id,
            server_id: SERVER_ID
          });

          // Return full opponent team data
          return {
            status: 'found',
            battle_id: battle.id,
            websocket_url: `/battle/${battle.id}`,
            opponent: {
              id: opponent.user_id,
              username: 'AI Opponent',
              rating: opponent.rating
            },
            opponent_team: {
              id: opponent.ai_team_id,
              name: opponent.team_name,
              coach_name: opponent.coach_name,
              characters: opponent.team_characters.map((c: any) => ({
                id: c.id,
                character_id: c.character_id,
                name: c.name,
                title: c.title,
                nickname: c.nickname,
                level: c.level,
                current_health: c.current_health,
                max_health: c.max_health,
                current_max_health: c.current_max_health || c.max_health,
                attack: c.attack || c.current_attack,
                defense: c.defense || c.current_defense,
                speed: c.speed || c.current_speed,
                abilities: c.abilities || [],
                avatar_emoji: c.avatar_emoji,
                archetype: c.archetype
              }))
            },
            // Legacy: first character for backwards compatibility
            character: {
              id: opponent.team_characters[0].character_id || opponent.team_characters[0].id,
              name: opponent.team_characters[0].name,
              title: opponent.team_characters[0].title,
              level: opponent.team_characters[0].level,
              current_health: opponent.team_characters[0].current_health,
              max_health: opponent.team_characters[0].max_health,
              abilities: opponent.team_characters[0].abilities
            }
          };
        }
      }

      // PVP Matchmaking
      // Try to find opponent across all servers
      const opponent = await this.find_distributed_opponent(queue_entry);

      if (opponent) {
        // Match found! (players already removed from distributed queue)

        // Create battle
        const battle = await this.create_battle(queue_entry, opponent);

        // CRITICAL: If battle creation failed, return error instead of 'found' with undefined id
        if (!battle || !battle.id) {
          console.error('❌ PVP Battle creation failed - returning error to client');
          return {
            status: 'failed' as const,
            error: 'Failed to create battle. Please try again.'
          };
        }

        // Publish battle creation event for multi-server coordination
        await cache.publishBattleEvent('global', {
          type: 'battle_created',
          battle_id: battle.id,
          user_id: user_id,
          opponent_id: opponent.user_id,
          server_id: SERVER_ID
        });

        analytics_service.trackMatchmaking(user_id, Date.now() - queue_entry.timestamp, await cache.getMatchmakingQueueSize(queue_entry.mode));
        analytics_service.trackMatchmaking(opponent.user_id, Date.now() - opponent.timestamp, await cache.getMatchmakingQueueSize(opponent.mode));

        // Get opponent user data for frontend
        const opponent_user = await db_adapter.users.find_by_id(opponent.user_id);
        if (!opponent_user) {
          throw new Error(`Opponent user ${opponent.user_id} not found`);
        }

        if (!opponent.team_characters || opponent.team_characters.length === 0) {
          throw new Error('Opponent team data missing');
        }

        // Return first character (leader) for backwards compatibility with client
        const opponentLeader = opponent.team_characters[0];
        return {
          status: 'found',
          battle_id: battle.id,
          websocket_url: `/battle/${battle.id}`,
          opponent: {
            id: opponent.user_id,
            username: opponent_user.username,
            rating: opponent.rating
          },
          character: {
            id: opponentLeader.character_id,
            name: opponentLeader.name,
            title: opponentLeader.title,
            level: opponentLeader.level,
            current_health: opponentLeader.current_health,
            max_health: opponentLeader.max_health,
            abilities: opponentLeader.abilities
          }
        };
      } else {
        // Still searching
        const queue_size = await cache.getMatchmakingQueueSize(queue_entry.mode);
        return {
          status: 'waiting',
          queue_position: queue_size,
          estimated_wait: this.estimate_wait_time(queue_entry.rating)
        };
      }
    } catch (error) {
      console.error('Matchmaking error:', error);
      throw error;
    }
  }

  // Find PVE Opponent
  private async find_pve_opponent(user: QueueEntry): Promise<QueueEntry | null> {
    try {
      console.log('🤖 Looking for AI Opponent Team...');

      // 1. Find a suitable AI Team
      // For now, just grab a random active team. Later, match by rating.
      const teamResult = await db_adapter.query(`
        SELECT * FROM ai_teams 
        WHERE is_active = true 
        ORDER BY RANDOM() 
        LIMIT 1
      `);

      if (teamResult.rows.length === 0) {
        console.log('⚠️ No AI teams found in database.');
        return null;
      }

      const aiTeam = teamResult.rows[0];
      console.log(`✅ Found AI Team: ${aiTeam.name} (Coach: ${aiTeam.coach_id})`);

      // 2. Load AI Characters (all 3 for 3v3)
      const charsResult = await db_adapter.query(`
        SELECT ac.*, c.name, c.title, c.archetype, c.base_action_points
        FROM ai_characters ac
        JOIN characters c ON ac.character_id = c.id
        WHERE ac.team_id = $1
        ORDER BY ac.id
      `, [aiTeam.id]);

      if (charsResult.rows.length !== 3) {
        console.error(`❌ AI Team ${aiTeam.id} has ${charsResult.rows.length} characters, expected 3`);
        return null;
      }

      console.log(`✅ Loaded ${charsResult.rows.length} AI characters for team ${aiTeam.id}`);

      // 3. Calculate player's average level for scaling AI opponents
      const playerAvgLevel = user.team_characters.reduce((sum, c) => sum + (c.level || 1), 0) / user.team_characters.length;
      const AI_BASE_LEVEL = 10; // AI characters are stored at level 10

      // Scale factor with slight variance for challenge (0.9 to 1.1 of player level)
      const baseScale = playerAvgLevel / AI_BASE_LEVEL;
      const variance = 0.9 + (Math.random() * 0.2); // Random between 0.9 and 1.1
      const scaleFactor = Math.max(0.1, baseScale * variance); // Minimum 10% to avoid zero stats

      console.log(`📊 AI Scaling: Player avg level ${playerAvgLevel.toFixed(1)}, scale factor ${scaleFactor.toFixed(2)}`);

      // Map all 3 characters to BattleCharacter array
      interface AICharacterRow {
        id: string; character_id: string; name: string; title: string; archetype: string;
        level: number; experience: number; current_health: number; max_health: number;
        attack: number; defense: number; speed: number; magic_attack: number; magic_defense: number;
        base_action_points: number; abilities: string; spells: string; personality_traits: string; equipment: string;
      }
      // Safe JSON parsing with fallbacks to prevent crashes from malformed data
      const safeJsonParse = (data: string | null | undefined, fallback: any = []) => {
        if (!data) return fallback;
        try {
          return typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
          console.warn(`⚠️ Failed to parse JSON in AI character mapping:`, e);
          return fallback;
        }
      };

      const team_characters: BattleCharacter[] = charsResult.rows.map((char: AICharacterRow) => {
        // Scale stats to match player's level
        const scaledLevel = Math.max(1, Math.round(playerAvgLevel));
        const scaledHealth = Math.max(50, Math.round(char.max_health * scaleFactor));
        const scaledAttack = Math.max(10, Math.round(char.attack * scaleFactor));
        const scaledDefense = Math.max(10, Math.round(char.defense * scaleFactor));
        const scaledSpeed = Math.max(10, Math.round(char.speed * scaleFactor));
        const scaledMagicAttack = Math.max(5, Math.round(char.magic_attack * scaleFactor));
        const scaledMagicDefense = Math.max(5, Math.round(char.magic_defense * scaleFactor));

        console.log(`🔍 Mapping AI Character:`, {
          id: char.id,
          name: char.name,
          originalLevel: char.level,
          scaledLevel,
          originalAttack: char.attack,
          scaledAttack
        });

        const powers = safeJsonParse(char.abilities, {});
        const spells = safeJsonParse(char.spells, []);

        return {
          id: char.id,
          user_id: aiTeam.coach_id,
          character_id: char.character_id,
          name: char.name,
          title: char.title,
          archetype: char.archetype,
          level: scaledLevel,
          experience: char.experience,
          current_health: scaledHealth,
          max_health: scaledHealth,
          attack: scaledAttack,
          defense: scaledDefense,
          speed: scaledSpeed,
          magic_attack: scaledMagicAttack,
          magic_defense: scaledMagicDefense,
          base_action_points: char.base_action_points,
          abilities: powers,
          personality_traits: safeJsonParse(char.personality_traits, []),
          equipment: safeJsonParse(char.equipment, []),
          is_injured: false,
          total_battles: 0,
          total_wins: 0,
          unlocked_powers: powers,
          unlocked_spells: spells,
          equipped_powers: powers,
          equipped_spells: spells
        };
      });

      // 4. Create QueueEntry with full team
      const queueEntry: QueueEntry = {
        user_id: aiTeam.coach_id,
        team_characters, // ✅ Full 3-character team
        mode: 'pve',
        rating: aiTeam.rating,
        timestamp: Date.now(),
        ai_team_id: aiTeam.id,
        team_name: aiTeam.name,
        coach_name: 'testcoach'
      };

      console.log(`📦 Generated PVE QueueEntry with ${team_characters.length} characters`);
      return queueEntry;

    } catch (error) {
      console.error('Matchmaking error:', error);
      throw error;
    }
  }

  // Find suitable opponent
  private find_opponent(player: QueueEntry): QueueEntry | null {
    const RATING_RANGE = 200;
    const WAIT_TIME_EXPANSION = 50; // Expand range by 50 per 10 seconds
    const wait_time = Date.now() - player.timestamp;
    const expanded_range = RATING_RANGE + Math.floor(wait_time / 10000) * WAIT_TIME_EXPANSION;

    for (const [opponent_id, opponent] of this.battle_queue) {
      if (opponent_id === player.user_id) continue;
      if (opponent.mode !== player.mode) continue;

      const rating_diff = Math.abs(player.rating - opponent.rating);
      if (rating_diff <= expanded_range) {
        return opponent;
      }
    }

    return null;
  }

  // Create new battle
  private async create_battle(user: QueueEntry, opponent: QueueEntry): Promise<BattleState | null> {
    let created_battle_id: string | null = null; // Track for cleanup on error

    try {
      const is_pve = opponent.mode === 'pve';

      console.log('⚔️ Creating 3v3 Battle:', {
        user_id: user.user_id,
        user_team_size: user.team_characters.length,
        opponent_id: opponent.user_id,
        opponent_team_size: opponent.team_characters.length,
        is_pve
      });

      // Assign a random judge for this battle
      const judges = ['anubis', 'eleanor_roosevelt', 'king_solomon'];
      const judge_id = judges[Math.floor(Math.random() * judges.length)];

      const battle_data = {
        user_id: user.user_id,
        is_pve,
        opponent_user_id: is_pve ? null : opponent.user_id,
        opponent_ai_coach_id: is_pve ? opponent.user_id : null,
        opponent_ai_team_id: is_pve ? opponent.ai_team_id : null,

        // ✅ 3v3: Individual character IDs are null (teams stored in team_data)
        user_character_id: null,
        opponent_character_id: null,
        opponent_ai_character_id: null,

        battle_type: 'ranked',
        status: 'active',
        phase: 'round_combat',
        current_round: 1,
        max_rounds: 3,

        // ✅ Store full teams (3 characters each)
        user_team_data: { characters: user.team_characters },
        opponent_team_data: { characters: opponent.team_characters },

        // Assign judge for rebellion rulings
        judge_id,

        combat_log: [],
        round_results: [],
        coaching_data: {},
        ai_judge_context: {},
        global_morale: { user: 50, opponent: 50 }
      };


      console.log('DEBUG: battle_data', JSON.stringify(battle_data, null, 2));
      const battle = await db_adapter.battles.create(battle_data);
      if (!battle) {
        throw new Error('Failed to create battle in database');
      }
      created_battle_id = battle.id; // Track for cleanup if something fails later

      // Lock all participating characters to prevent modifications during battle
      const all_character_ids = [
        ...user.team_characters.map(c => c.id),
        ...opponent.team_characters.filter(c => !opponent.ai_team_id).map(c => c.id) // Don't lock AI characters
      ];
      await lockCharactersForBattle(battle.id, all_character_ids);

      // Populate battle_participants table
      // User characters are 'user_character', AI opponents are 'ai_character'
      const user_participants = user.team_characters.map(c => ({
        ...c,
        team_id: user.user_team_id,
        user_id: user.user_id,
        participant_type: 'user_character'
      }));
      const opponent_participants = opponent.team_characters.map(c => ({
        ...c,
        team_id: opponent.user_team_id || opponent.ai_team_id,
        // For AI opponents, user_id must be NULL (foreign key constraint - AI coach IDs don't exist in users table)
        user_id: opponent.ai_team_id ? null : opponent.user_id,
        participant_type: opponent.ai_team_id ? 'ai_character' : 'user_character'
      }));
      const all_participants = [...user_participants, ...opponent_participants];

      for (const char of all_participants) {
        await db_adapter.query(`
          INSERT INTO battle_participants (
            battle_id, character_id, user_id, team_id,
            current_health, current_ap, current_position, is_active, participant_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          battle.id,
          char.id, // Character ID (TEXT)
          char.user_id, // User ID (TEXT)
          char.team_id || null, // Team ID (UUID)
          char.current_health,
          char.base_action_points, // Initial AP
          null, // Initial position (set later in initialize_hex_grid_battle)
          true,
          char.participant_type
        ]);
      }

      // Initialize battle state
      // NOTE: BattleState currently uses single character structure for backwards compatibility
      // Full 3v3 data is in battle.user_team_data/opponent_team_data and hex_grid_state
      const userLeader = user.team_characters[0];
      const opponentLeader = opponent.team_characters[0];

      const battle_state: BattleState = {
        id: battle.id,
        phase: BATTLE_PHASES.ROUND_COMBAT,
        round: 1,
        turn: 0,
        max_rounds: 10,  // Default max rounds for battle

        user: {
          user_id: user.user_id,
          character_id: userLeader.id, // ✅ 3v3: Use leader for legacy compatibility
          character: userLeader,
          connected: false,
          health: userLeader.current_health,
          max_health: userLeader.max_health,
          effects: [],
          cooldowns: {},
          rating: user.rating,
          // Initialize power/spell cooldowns
          power_cooldowns: initializePowerCooldowns(userLeader.equipped_powers),
          spell_cooldowns: initializeSpellCooldowns(userLeader.equipped_spells),
          team_characters: user.team_characters // ✅ 3v3: Full team available
        },

        opponent: {
          user_id: opponent.user_id,
          character_id: opponentLeader.id, // ✅ 3v3: Use leader for legacy compatibility
          character: opponentLeader,
          connected: false,
          health: opponentLeader.current_health,
          max_health: opponentLeader.max_health,
          effects: [],
          cooldowns: {},
          rating: opponent.rating,
          // Initialize power/spell cooldowns
          power_cooldowns: initializePowerCooldowns(opponentLeader.equipped_powers),
          spell_cooldowns: initializeSpellCooldowns(opponentLeader.equipped_spells),
          team_characters: opponent.team_characters // ✅ 3v3: Full team available
        },

        combat_log: [],
        chat_enabled: false,
        timer: null,
        created_at: Date.now(),
        round_adherence: {}, // Initialize empty adherence map
        // Timer tracking for cleanup
        connection_timeout_timer: null,
        disconnect_timers: new Map()
      };

      // Initialize hex grid state
      this.initialize_hex_grid_battle(battle_state, user, opponent);

      this.active_battles.set(battle.id, battle_state);

      // Notify users
      this.notify_user(user.user_id, 'match_found', { battle_id: battle.id });
      this.notify_user(opponent.user_id, 'match_found', { battle_id: battle.id });

      // Generate Hostmaster v8.72 battle introduction
      setTimeout(async () => {
        await this.generate_hostmaster_introduction(battle_state);
      }, 2000);

      // CRITICAL: Connection timeout - if no player connects within 60 seconds, abandon battle
      // This prevents characters from being stuck if client never connects after match found
      // Store timer reference so it can be cleared if battle ends before timeout
      battle_state.connection_timeout_timer = setTimeout(async () => {
        const current_battle = this.active_battles.get(battle.id);
        if (current_battle && !current_battle.user.connected && !current_battle.opponent.connected) {
          console.log(`⏰ Battle ${battle.id} timed out - no players connected within 60 seconds`);
          await this.abandon_battle(battle.id, 'connection_timeout');
        }
      }, 60000);

      // Track analytics
      analytics_service.trackUserAction(user.user_id, 'battle_start', { battle_id: battle.id });
      analytics_service.trackUserAction(opponent.user_id, 'battle_start', { battle_id: battle.id });

      // Battle starts directly in combat phase - coach gives orders per turn
      // No strategy selection phase (legacy removed)

      return battle_state;
    } catch (error: any) {
      // Enhanced error logging to diagnose battle creation failures
      console.error('❌ Error creating battle:', {
        error_message: error?.message || String(error),
        error_name: error?.name,
        error_code: error?.code,
        user_id: user.user_id,
        opponent_id: opponent.user_id,
        user_characters: user.team_characters.map(c => c.id),
        opponent_characters: opponent.team_characters.map(c => c.id),
        created_battle_id
      });

      // CRITICAL: If we created a battle record, unlock any characters that got locked
      // This prevents characters from getting stuck when battle creation fails partway through
      if (created_battle_id) {
        console.log('🔓 Cleaning up failed battle - unlocking characters for battle:', created_battle_id);
        await unlockCharactersFromBattle(created_battle_id).catch(e =>
          console.error('Failed to unlock characters during cleanup:', e)
        );
      }

      return null;
    }
  }

  // Initialize hex grid battle state
  private initialize_hex_grid_battle(battle_state: BattleState, user: QueueEntry, opponent: QueueEntry): void {
    // Create 12x12 hex grid for 3v3 combat
    const grid_size = { q: 12, r: 12 };

    const character_positions = new Map<string, HexPosition>();
    const action_states = new Map<string, CharacterHexActionState>();

    // ✅ 3v3: Position USER'S TEAM (3 characters, left side)
    const user_positions: HexPosition[] = [
      { q: 2, r: 4, s: -6 },  // Front
      { q: 2, r: 5, s: -7 },  // Mid
      { q: 2, r: 6, s: -8 }   // Back
    ];

    user.team_characters.forEach((char, index) => {
      const pos = user_positions[index];
      const ap = char.base_action_points;

      character_positions.set(char.id, pos);
      action_states.set(char.id, {
        character_id: char.id,
        position: pos,
        action_points: ap,
        max_action_points: ap,
        has_acted: false
      });
    });

    // ✅ 3v3: Position OPPONENT'S TEAM (3 characters, right side)
    const opponent_positions: HexPosition[] = [
      { q: 9, r: 4, s: -13 }, // Front
      { q: 9, r: 5, s: -14 }, // Mid
      { q: 9, r: 6, s: -15 }  // Back
    ];

    opponent.team_characters.forEach((char, index) => {
      const pos = opponent_positions[index];
      const ap = char.base_action_points;

      character_positions.set(char.id, pos);
      action_states.set(char.id, {
        character_id: char.id,
        position: pos,
        action_points: ap,
        max_action_points: ap,
        has_acted: false
      });
    });

    // Add terrain features (broadcast tower at center, shark perimeter)
    const terrain_features: TerrainFeature[] = [
      // Broadcast tower at center
      {
        position: { q: 5, r: 5, s: -10 },
        type: 'broadcast_tower',
        blocks_movement: true,
        blocks_line_of_sight: true
      }
    ];

    // Add shark perimeter (edges of grid)
    for (let q = 0; q < grid_size.q; q++) {
      terrain_features.push({
        position: { q, r: 0, s: -q },
        type: 'shark_perimeter',
        blocks_movement: true,
        blocks_line_of_sight: false
      });
      terrain_features.push({
        position: { q, r: grid_size.r - 1, s: -(q + grid_size.r - 1) },
        type: 'shark_perimeter',
        blocks_movement: true,
        blocks_line_of_sight: false
      });
    }

    // ✅ Calculate turn order for ALL 6 characters (sorted by initiative)
    const all_characters = [
      ...user.team_characters.map(c => ({ ...c, team: 'user' })),
      ...opponent.team_characters.map(c => ({ ...c, team: 'opponent' }))
    ];

    const turn_order = all_characters
      .sort((a, b) => {
        // Initiative from DB generated column - no fallback, DB is source of truth
        return b.initiative - a.initiative; // Descending (highest initiative first)
      })
      .map(c => c.id);

    console.log(`✅ Initialized 3v3 hex grid: ${user.team_characters.length} user chars + ${opponent.team_characters.length} opponent chars`);
    console.log(`📊 Turn order (by initiative):`, turn_order);


    // Set hex grid state
    battle_state.hex_battle_mode = true;
    battle_state.hex_grid_state = {
      grid_size,
      character_positions,
      action_states,
      terrain_features,
      turn_order,
      current_turn_index: 0
    };

    // Log initialization
    battle_state.combat_log.push({
      type: 'hex_grid_initialized',
      timestamp: Date.now(),
      hex_position: { q: grid_size.q, r: grid_size.r, s: 0 }
    });
  }

  // Serialize hex grid state for database storage
  private serialize_hex_grid_state(hex_state: HexGridState | undefined): any {
    if (!hex_state) return null;

    return {
      grid_size: hex_state.grid_size,
      character_positions: Array.from(hex_state.character_positions.entries()).map(([id, pos]) => ({ character_id: id, position: pos })),
      action_states: Array.from(hex_state.action_states.entries()).map(([_, state]) => state),
      terrain_features: hex_state.terrain_features,
      turn_order: hex_state.turn_order,
      current_turn_index: hex_state.current_turn_index
    };
  }

  // Handle player connection to battle
  async connect_to_battle(socket: Socket, battle_id: string, user_id: string): Promise<void> {
    const battle_state = this.active_battles.get(battle_id);
    if (!battle_state) {
      throw new Error('Battle not found');
    }

    // Verify user belongs to battle
    const user_side = battle_state.user.user_id === user_id ? 'user' :
      battle_state.opponent.user_id === user_id ? 'opponent' : null;

    if (!user_side) {
      throw new Error('Not authorized for this battle');
    }

    // Update connection status
    battle_state[user_side].connected = true;
    socket.join(`battle:${battle_id}`);
    (socket as any).battle_id = battle_id;
    (socket as any).user_side = user_side;
    (socket as any).user_id = user_id;

    // Clear any pending disconnect timer for this user (reconnection scenario)
    if (battle_state.disconnect_timers?.has(user_side)) {
      clearTimeout(battle_state.disconnect_timers.get(user_side)!);
      battle_state.disconnect_timers.delete(user_side);
      console.log(`🔄 Cleared disconnect timer for ${user_side} - player reconnected`);
    }

    // Clear connection timeout if this is the first connection
    if (battle_state.connection_timeout_timer) {
      clearTimeout(battle_state.connection_timeout_timer);
      battle_state.connection_timeout_timer = null;
      console.log(`✅ Cleared connection timeout - player connected to battle ${battle_id}`);
    }

    // Send current state
    socket.emit('battle_state', this.get_user_view(battle_state, user_side));

    // Notify opponent
    const opponent_side = user_side === 'user' ? 'opponent' : 'user';
    this.io.to(`battle:${battle_id}`).emit('opponent_connected', {
      side: opponent_side,
      connected: true
    });

    // Set up event handlers
    this.setup_socket_handlers(socket, battle_state);
  }

  // Get user-specific view of battle state
  private get_user_view(battle_state: BattleState, user_side: string): any {
    const current_user = battle_state[user_side as keyof Pick<BattleState, 'user' | 'opponent'>];
    const opponent_user = user_side === 'user' ? battle_state.opponent : battle_state.user;

    // Convert cooldown maps to objects for serialization
    const serialize_power_cooldowns = (cooldowns?: Map<string, number>) => {
      if (!cooldowns) return {};
      return Object.fromEntries(cooldowns);
    };

    const serialize_spell_cooldowns = (cooldowns?: Map<string, number>) => {
      if (!cooldowns) return {};
      return Object.fromEntries(cooldowns);
    };

    const base_view = {
      battle_id: battle_state.id,
      phase: battle_state.phase,
      round: battle_state.round,
      your_character: {
        id: current_user.character.id,
        name: current_user.character.name,
        archetype: current_user.character.archetype,
        level: current_user.character.level,
        health: current_user.health,
        max_health: current_user.max_health,
        attack: current_user.character.attack,
        defense: current_user.character.defense,
        speed: current_user.character.speed,
        magic_attack: current_user.character.magic_attack,
        magic_defense: current_user.character.magic_defense,
        abilities: current_user.character.abilities,
        equipment: current_user.character.equipment,
        effects: current_user.effects,
        is_injured: current_user.character.is_injured,
        total_battles: current_user.character.total_battles,
        total_wins: current_user.character.total_wins,
        personality_traits: current_user.character.personality_traits,
        // Powers & Spells
        equipped_powers: current_user.character.equipped_powers,
        equipped_spells: current_user.character.equipped_spells,
        power_cooldowns: serialize_power_cooldowns(current_user.power_cooldowns),
        spell_cooldowns: serialize_spell_cooldowns(current_user.spell_cooldowns)
      },
      opponent_character: {
        id: opponent_user.character.id,
        name: opponent_user.character.name,
        archetype: opponent_user.character.archetype,
        level: opponent_user.character.level,
        health: opponent_user.health,
        max_health: opponent_user.max_health,
        attack: opponent_user.character.attack,
        defense: opponent_user.character.defense,
        speed: opponent_user.character.speed,
        magic_attack: opponent_user.character.magic_attack,
        magic_defense: opponent_user.character.magic_defense,
        effects: opponent_user.effects,
        // Show equipped powers/spells count but not details (fog of war)
        equipped_powers_count: opponent_user.character.equipped_powers.length,
        equipped_spells_count: opponent_user.character.equipped_spells.length
      },
      combat_log: battle_state.combat_log.slice(-10), // Last 10 events
      chat_enabled: battle_state.chat_enabled,
      connected: {
        you: current_user.connected,
        opponent: opponent_user.connected
      }
    };

    // Add hex grid state if in hex battle mode
    if (battle_state.hex_battle_mode && battle_state.hex_grid_state) {
      return {
        ...base_view,
        hex_battle_mode: true,
        hex_grid_state: this.serialize_hex_grid_state(battle_state.hex_grid_state)
      };
    }

    return base_view;
  }

  // Socket event handlers
  private setup_socket_handlers(socket: Socket, battle_state: BattleState): void {
    // Chat message (placeholder - would integrate with existing chat service)
    socket.on('send_chat', async (message: string) => {
      if (battle_state.phase !== BATTLE_PHASES.CHAT_BREAK) return;
      if (!battle_state.chat_enabled) return;

      const user_side = (socket as any).user_side;
      const character = battle_state[user_side as keyof Pick<BattleState, 'user' | 'opponent'>].character;
      if (!character) {
        throw new Error(`Character not found for ${user_side} in battle state`);
      }

      try {
        // Use real AI chat service for battle combat responses
        const { aiChatService } = require('./aiChatService');
        const { db } = require('../database/postgres');

        // Build character context for battle
        const chat_context = {
          character_id: character.character_id,
          character_name: character.name,
          personality: {
            traits: ['Battle-focused', 'Strategic', 'Determined'],
            speech_style: 'Direct and tactical during combat',
            motivations: ['Victory', 'Honor in battle', 'Team coordination'],
            fears: ['Defeat', 'Letting allies down']
          },
          historical_period: (character as any).origin_era,
          current_bond_level: (character as any).bond_level,
          previous_messages: []
        };

        // Generate real AI response for battle context
        const ai_response = await aiChatService.generate_character_response(
          chat_context,
          message,
          (socket as any).user_id,
          db,
          {
            is_in_battle: true,
            is_combat_chat: true, // This bypasses usage limits
            battle_phase: 'chat_break',
            current_health: character.current_health,
            max_health: character.max_health,
            opponent_name: 'opponent'
          }
        );

        // Broadcast to battle room
        this.io.to(`battle:${battle_state.id}`).emit('chat_message', {
          side: user_side,
          user_message: message,
          character_response: ai_response.message,
          bond_increased: ai_response.bond_increase
        });

        analytics_service.trackCharacterInteraction(
          (socket as any).user_id,
          character.character_id,
          'battle_chat',
          { message: message.substring(0, 50) }
        );
      } catch (error) {
        console.error('Chat error:', error);
        socket.emit('chat_error', { error: 'Failed to generate response' });
      }
    });

    // Hex Grid: Submit planned action
    socket.on('hex_submit_action', (planned_action: PlannedHexAction) => {
      if (!battle_state.hex_battle_mode || !battle_state.hex_grid_state) return;

      const user_side = (socket as any).user_side;
      const current_user = battle_state[user_side as keyof Pick<BattleState, 'user' | 'opponent'>];
      const character_id = current_user.character_id;

      const action_state = battle_state.hex_grid_state.action_states.get(character_id);
      if (action_state) {
        action_state.planned_action = planned_action;

        // Notify both users
        this.io.to(`battle:${battle_state.id}`).emit('hex_action_planned', {
          character_id,
          user_side,
          has_planned: true
        });
      }
    });

    // Hex Grid: Execute turn (coach confirms action)
    // This is the core of the coach-order-per-turn model with adherence checks
    socket.on('hex_execute_turn', async () => {
      try {
        if (!battle_state.hex_battle_mode || !battle_state.hex_grid_state) {
          socket.emit('action_failed', { error: 'Not in hex battle mode' });
          return;
        }

        const user_side = (socket as any).user_side;
        const current_user = battle_state[user_side as keyof Pick<BattleState, 'user' | 'opponent'>];
        const character_id = current_user.character_id;

        const action_state = battle_state.hex_grid_state.action_states.get(character_id);
        if (!action_state || !action_state.planned_action) {
          socket.emit('action_failed', { error: 'No planned action found' });
          return;
        }

        const planned_action = action_state.planned_action;

        // Reconstruct authoritative state from event log
        const state: ReconstructedState = await reconstructBattleState(battle_state.id);

        // Convert planned_action to CoachOrder
        const coach_order: CoachOrder = this.buildCoachOrder(planned_action, state);

        // Execute turn through the new turn service (with adherence check + declarations)
        const turn_result: TurnExecutionResult = await executeTurn(
          state,
          character_id,
          coach_order
        );

        if (!turn_result.success) {
          socket.emit('action_failed', { error: turn_result.error });
          return;
        }

        // Broadcast based on whether it was a rebellion or not
        if (turn_result.is_rebellion) {
          // Rebellion occurred - emit rebellion event
          this.io.to(`battle:${battle_state.id}`).emit('rebellion_occurred', {
            character_id,
            coach_ordered: coach_order.label,
            character_did: turn_result.rebellion_details?.chosen_action.label,
            declaration: turn_result.declaration,
            action_type: turn_result.action_type,
            result: turn_result.action_result,
            narrative: turn_result.action_result.narrative,
            adherence: turn_result.adherence,
            judge_ruling: turn_result.rebellion_details?.judge_ruling
          });
        } else {
          // Character followed orders - emit normal turn event
          this.io.to(`battle:${battle_state.id}`).emit('turn_executed', {
            character_id,
            action_type: turn_result.action_type,
            declaration: turn_result.declaration,
            result: turn_result.action_result,
            narrative: turn_result.action_result.narrative,
            adherence: turn_result.adherence
          });
        }

        // Update battle_participants table
        await this.update_battle_participants_persistence(battle_state);

      } catch (error: any) {
        console.error('Error executing hex turn:', error);
        socket.emit('action_failed', { error: error.message });
      }
    });

    // Hex Grid: Submit full turn action queue (Plan-All-At-Once model)
    socket.on('hex_submit_turn', async (planned_actions: PlannedHexAction[]) => {
      if (!battle_state.hex_battle_mode || !battle_state.hex_grid_state) return;

      const user_side = (socket as any).user_side;
      const current_user = battle_state[user_side as keyof Pick<BattleState, 'user' | 'opponent'>];
      const character_id = current_user.character_id;

      const action_state = battle_state.hex_grid_state.action_states.get(character_id);
      if (!action_state) {
        socket.emit('turn_submit_failed', { error: `No action state for character ${character_id}` });
        return;
      }

      // Calculate total AP cost - must look up from DB for attacks
      let total_ap_cost = 0;
      for (const action of planned_actions) {
        if (action.type === 'attack') {
          if (!action.attack_type_id) {
            socket.emit('turn_submit_failed', { error: 'Attack action requires attack_type_id' });
            return;
          }
          const attack_type = await getAttackType(action.attack_type_id);
          total_ap_cost += attack_type.ap_cost;
        } else if (action.type === 'move') {
          // Move cost = 1 AP per hex (calculated from distance)
          // For now, assume 1 AP per move action - actual cost calculated at execution
          total_ap_cost += 1;
        } else if (action.type === 'move_and_attack') {
          if (!action.attack_type_id) {
            socket.emit('turn_submit_failed', { error: 'Move+Attack action requires attack_type_id' });
            return;
          }
          const attack_type = await getAttackType(action.attack_type_id);
          total_ap_cost += 1 + attack_type.ap_cost; // 1 for move + attack cost
        } else if (action.type === 'defend') {
          total_ap_cost += 1;
        } else if (action.type === 'power' || action.type === 'spell' || action.type === 'item') {
          // TODO: Look up power/spell AP cost from DB when implemented
          total_ap_cost += 1;
        } else {
          throw new Error(`Unknown action type: ${action.type}`);
        }
      }

      // Validate AP
      if (total_ap_cost > action_state.action_points) {
        socket.emit('turn_submit_failed', {
          error: `Not enough AP. Have ${action_state.action_points}, need ${total_ap_cost}`,
          ap_available: action_state.action_points,
          ap_required: total_ap_cost
        });
        return;
      }

      action_state.planned_actions = planned_actions;

      // Notify both users
      this.io.to(`battle:${battle_state.id}`).emit('hex_turn_planned', {
        character_id,
        user_side,
        action_count: planned_actions.length,
        total_ap_cost
      });
    });

    // Hex Grid: Execute full turn (all queued actions with dramatic pauses)
    socket.on('hex_execute_full_turn', async () => {
      try {
        if (!battle_state.hex_battle_mode || !battle_state.hex_grid_state) {
          socket.emit('action_failed', { error: 'Not in hex battle mode' });
          return;
        }

        const user_side = (socket as any).user_side;
        const current_user = battle_state[user_side as keyof Pick<BattleState, 'user' | 'opponent'>];
        const character_id = current_user.character_id;

        const action_state = battle_state.hex_grid_state.action_states.get(character_id);
        if (!action_state || !action_state.planned_actions || action_state.planned_actions.length === 0) {
          socket.emit('action_failed', { error: 'No planned actions found' });
          return;
        }

        const planned_actions = action_state.planned_actions;
        const character = current_user.team_characters?.find(c => c.id === character_id);
        if (!character) {
          throw new Error(`Character ${character_id} not found in team_characters`);
        }
        const character_name = character.name;

        // Execute turn queue
        const queue_result = await this.executeActionQueue(
          battle_state,
          character_id,
          character_name,
          planned_actions
        );

        // Emit each action result as a separate event for frontend animation
        for (const action_result of queue_result.actions_executed) {
          // Emit the dramatic event
          this.io.to(`battle:${battle_state.id}`).emit(action_result.dramatic_event, {
            character_id,
            character_name,
            action_index: action_result.action_index,
            action: action_result.action,
            result: action_result.result,
            declaration: action_result.declaration,
            is_rebellion: action_result.is_rebellion,
            rebellion_details: action_result.rebellion_details,
            character_killed: action_result.character_killed
          });
        }

        // Emit turn complete
        this.io.to(`battle:${battle_state.id}`).emit('turn_complete', {
          character_id,
          character_name,
          ap_spent: queue_result.ap_spent,
          ap_remaining: queue_result.ap_remaining,
          actions_count: queue_result.actions_executed.length,
          turn_interrupted: queue_result.turn_interrupted,
          interruption_reason: queue_result.interruption_reason
        });

        // Clear planned actions
        action_state.planned_actions = [];
        action_state.has_acted = true;

        // Advance turn
        await this.advanceTurn(battle_state);

        // Update battle_participants table
        await this.update_battle_participants_persistence(battle_state);

      } catch (error: any) {
        console.error('Error executing full turn:', error);
        socket.emit('action_failed', { error: error.message });
      }
    });

    // Power/Spell: Use Power (Server-Authoritative via battleActionExecutor)
    socket.on('use_power', async (data: { power_id: string; target_character_id: string }) => {
      try {
        const user_side = (socket as any).user_side;
        const current_user = battle_state[user_side as keyof Pick<BattleState, 'user' | 'opponent'>];
        const character_id = current_user.character_id;

        // Reconstruct authoritative state from event log
        const state: ReconstructedState = await reconstructBattleState(battle_state.id);

        // Build action request
        const action_request: PowerActionRequest = {
          battle_id: battle_state.id,
          character_id: character_id,
          action_type: 'power',
          power_id: data.power_id,
          target_id: data.target_character_id,
        };

        // Execute action through authoritative system
        const result = await executeAction(action_request, state.context);

        if (!result.success) {
          socket.emit('action_failed', { error: 'errors' in result ? result.errors.join(', ') : 'Power failed' });
          return;
        }

        // Persist to event log
        await persistBattleAction(
          battle_state.id,
          character_id,
          action_request,
          result,
          state.current_round,
          state.current_turn + 1
        );

        // Broadcast to all players in battle
        this.io.to(`battle:${battle_state.id}`).emit('action_executed', {
          character_id: character_id,
          action_type: 'power',
          result: result,
          narrative: result.narrative
        });

        // Update battle_participants table
        await this.update_battle_participants_persistence(battle_state);

        // Award mastery points (fire and forget)
        CharacterProgressionService.awardMasteryPoints(
          character_id,
          data.power_id,
          'power',
          1
        ).catch(err => console.error('Error awarding power mastery:', err));

      } catch (error: any) {
        console.error('Error executing power:', error);
        socket.emit('action_failed', { error: error.message });
      }
    });

    // Power/Spell: Cast Spell (Server-Authoritative via battleActionExecutor)
    socket.on('cast_spell', async (data: { spell_id: string; target_character_id: string }) => {
      try {
        const user_side = (socket as any).user_side;
        const current_user = battle_state[user_side as keyof Pick<BattleState, 'user' | 'opponent'>];
        const character_id = current_user.character_id;

        // Reconstruct authoritative state from event log
        const state: ReconstructedState = await reconstructBattleState(battle_state.id);

        // Build action request
        const action_request: SpellActionRequest = {
          battle_id: battle_state.id,
          character_id: character_id,
          action_type: 'spell',
          spell_id: data.spell_id,
          target_id: data.target_character_id,
        };

        // Execute action through authoritative system
        const result = await executeAction(action_request, state.context);

        if (!result.success) {
          socket.emit('action_failed', { error: 'errors' in result ? result.errors.join(', ') : 'Spell failed' });
          return;
        }

        // Persist to event log
        await persistBattleAction(
          battle_state.id,
          character_id,
          action_request,
          result,
          state.current_round,
          state.current_turn + 1
        );

        // Broadcast to all players in battle
        this.io.to(`battle:${battle_state.id}`).emit('action_executed', {
          character_id: character_id,
          action_type: 'spell',
          result: result,
          narrative: result.narrative
        });

        // Update battle_participants table
        await this.update_battle_participants_persistence(battle_state);

        // Award mastery points (fire and forget)
        CharacterProgressionService.awardMasteryPoints(
          character_id,
          data.spell_id,
          'spell',
          1
        ).catch(err => console.error('Error awarding spell mastery:', err));

      } catch (error: any) {
        console.error('Error executing spell:', error);
        socket.emit('action_failed', { error: error.message });
      }
    });

    // Item: Use Item
    socket.on('use_item', async (data: { item_id: string; target_character_id?: string }) => {
      const user_side = (socket as any).user_side;
      const current_user = battle_state[user_side as keyof Pick<BattleState, 'user' | 'opponent'>];
      const opponent_user = user_side === 'user' ? battle_state.opponent : battle_state.user;

      // Note: Item system requires integration with inventory system
      // This is a placeholder that will forward to battleActionExecutor when implemented
      socket.emit('item_failed', {
        error: 'Item system requires full integration with hex battle system. Use hex_execute_turn with item action instead.'
      });

      // TODO: Full implementation will follow the pattern from use_power/cast_spell
      // when item system is fully integrated with hex battle mode
    });

    // Handle battle end from client
    // Frontend calculates damage locally, so we trust its final health values
    // but server re-validates winner based on those values
    socket.on('battle_end_client', async (data: {
      battle_id: string;
      result: { winner: 'user' | 'opponent'; user_health: number; opponent_health: number }
    }) => {
      try {
        const { battle_id, result } = data;

        // Validate battle_id
        if (!battle_id || typeof battle_id !== 'string') {
          console.error('❌ battle_end_client: Invalid battle_id');
          return;
        }

        // Get battle state
        const battle_state = this.active_battles.get(battle_id);
        if (!battle_state) {
          console.warn(`⚠️ battle_end_client: Battle ${battle_id} not found (may already be ended)`);
          return;
        }

        // Prevent duplicate end processing
        if (battle_state.phase === BATTLE_PHASES.BATTLE_END) {
          console.log(`ℹ️ battle_end_client: Battle ${battle_id} already ended, ignoring`);
          return;
        }

        console.log(`🏁 battle_end_client: Ending battle ${battle_id}`);
        console.log(`   Frontend reports: winner=${result.winner}, user_health=${result.user_health}, opponent_health=${result.opponent_health}`);

        // Update server's health values with frontend's (since frontend has accurate damage calculations)
        if (typeof result.user_health === 'number') {
          battle_state.user.health = Math.max(0, result.user_health);
        }
        if (typeof result.opponent_health === 'number') {
          battle_state.opponent.health = Math.max(0, result.opponent_health);
        }

        // Call existing end_battle which will determine winner from health values
        await this.end_battle(battle_state);

        console.log(`✅ battle_end_client: Battle ${battle_id} completed successfully`);
      } catch (error) {
        console.error('❌ battle_end_client error:', error);
      }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      const user_side = (socket as any).user_side;
      if (user_side && battle_state) {
        battle_state[user_side as keyof Pick<BattleState, 'user' | 'opponent'>].connected = false;

        // Notify opponent
        this.io.to(`battle:${battle_state.id}`).emit('opponent_disconnected', {
          side: user_side
        });

        // Clear any existing disconnect timer for this user before creating new one
        if (battle_state.disconnect_timers?.has(user_side)) {
          clearTimeout(battle_state.disconnect_timers.get(user_side)!);
        }

        // Start disconnect timer (30 seconds to reconnect) - STORE reference for cleanup
        const disconnect_timer = setTimeout(() => {
          if (!battle_state[user_side as keyof Pick<BattleState, 'user' | 'opponent'>].connected) {
            this.handle_forfeit(battle_state, user_side);
          }
          // Clean up timer reference after it fires
          battle_state.disconnect_timers?.delete(user_side);
        }, 30000);

        // Store timer reference so it can be cancelled on reconnect
        if (!battle_state.disconnect_timers) {
          battle_state.disconnect_timers = new Map();
        }
        battle_state.disconnect_timers.set(user_side, disconnect_timer);
        console.log(`⏳ Started 30s disconnect timer for ${user_side} in battle ${battle_state.id}`);
      }
    });
  }

  // Start chat phase
  private async start_chat_phase(battle_state: BattleState): Promise<void> {
    battle_state.phase = BATTLE_PHASES.CHAT_BREAK;
    battle_state.chat_enabled = true;

    // Notify players
    this.io.to(`battle:${battle_state.id}`).emit('chat_phase_start', {
      duration: BATTLE_CONFIG.CHAT_DURATION
    });

    // Set timer for next round
    this.start_phase_timer(
      battle_state.id,
      BATTLE_PHASES.CHAT_BREAK,
      BATTLE_CONFIG.CHAT_DURATION,
      () => this.end_chat_phase(battle_state)
    );
  }

  // End chat phase and prepare next round
  private async end_chat_phase(battle_state: BattleState): Promise<void> {
    battle_state.chat_enabled = false;
    battle_state.round++;

    if (battle_state.round > BATTLE_CONFIG.MAX_ROUNDS) {
      await this.end_battle(battle_state);
    } else {
      // Go directly to combat phase - coach gives orders per turn
      battle_state.phase = BATTLE_PHASES.ROUND_COMBAT;

      this.io.to(`battle:${battle_state.id}`).emit('round_start', {
        round: battle_state.round
      });
    }
  }

  // End battle
  private async end_battle(battle_state: BattleState): Promise<void> {
    battle_state.phase = BATTLE_PHASES.BATTLE_END;

    // CRITICAL: Clear all timers to prevent callbacks on ended battle
    if (battle_state.connection_timeout_timer) {
      clearTimeout(battle_state.connection_timeout_timer);
      battle_state.connection_timeout_timer = null;
    }
    if (battle_state.disconnect_timers) {
      battle_state.disconnect_timers.forEach((timer, side) => {
        clearTimeout(timer);
        console.log(`🧹 Cleared disconnect timer for ${side} on battle end`);
      });
      battle_state.disconnect_timers.clear();
    }
    if (battle_state.timer) {
      clearTimeout(battle_state.timer);
      battle_state.timer = null;
    }

    // Determine winner
    let winner_id: string, winner_side: string;
    if (battle_state.user.health <= 0) {
      winner_id = battle_state.opponent.user_id;
      winner_side = 'opponent';
    } else if (battle_state.opponent.health <= 0) {
      winner_id = battle_state.user.user_id;
      winner_side = 'user';
    } else {
      // Highest health percentage wins
      const user_percent = battle_state.user.health / battle_state.user.max_health;
      const opponent_percent = battle_state.opponent.health / battle_state.opponent.max_health;
      if (user_percent > opponent_percent) {
        winner_id = battle_state.user.user_id;
        winner_side = 'user';
      } else {
        winner_id = battle_state.opponent.user_id;
        winner_side = 'opponent';
      }
    }

    // Calculate rewards
    const rewards = this.calculate_rewards(battle_state, winner_side);

    // CRITICAL FIX: Use try/finally to GUARANTEE character unlock even if DB operations fail
    // This prevents characters from being permanently locked if battle end processing fails
    try {
      // Update database with hex grid state
      await db_adapter.battles.update(battle_state.id, {
        winner_user_id: winner_id,
        status: 'completed',
        ended_at: new Date(),
        xp_gained: rewards.xp,
        bond_gained: rewards.bond,
        currency_gained: rewards.currency,
        // Store hex grid state if enabled
        ...(battle_state.hex_battle_mode && {
          player_team_data: {
            ...((battle_state as any).player_team_data || {}),
            hex_grid_state: this.serialize_hex_grid_state(battle_state.hex_grid_state)
          }
        })
      });

      // Persist final state to battle_participants
      await this.update_battle_participants_persistence(battle_state);
    } catch (dbError) {
      console.error(`❌ Database error during battle end for ${battle_state.id}:`, dbError);
      // Continue to unlock characters even if DB update failed
    } finally {
      // ALWAYS unlock characters - this is the most critical operation
      try {
        await unlockCharactersFromBattle(battle_state.id);
        console.log(`🔓 Characters unlocked for battle ${battle_state.id}`);
      } catch (unlockError) {
        console.error(`❌ CRITICAL: Failed to unlock characters for battle ${battle_state.id}:`, unlockError);
      }
    }

    // Update characters
    await this.update_character_stats(battle_state, winner_side, rewards);

    // Apply psychology effects (morale, stress, trauma)
    try {
      const loser_side = winner_side === 'user' ? 'opponent' : 'user';
      const winner = battle_state[winner_side as keyof Pick<BattleState, 'user' | 'opponent'>];
      const loser = battle_state[loser_side as keyof Pick<BattleState, 'user' | 'opponent'>];

      await applyBattleOutcomeEffects({
        battle_id: battle_state.id,
        winner_character_ids: [winner.character_id],
        loser_character_ids: [loser.character_id],
        character_final_health: {
          [winner.character_id]: { current: winner.health, max: winner.max_health },
          [loser.character_id]: { current: loser.health, max: loser.max_health }
        },
        deaths: [
          ...(winner.health <= 0 ? [winner.character_id] : []),
          ...(loser.health <= 0 ? [loser.character_id] : [])
        ]
      });
    } catch (error) {
      console.error('Error applying psychology effects:', error);
    }

    // Award coach XP for both users
    try {
      const winner_user_id = battle_state[winner_side as keyof Pick<BattleState, 'user' | 'opponent'>].user_id;
      const loser_user_id = winner_side === 'user' ? battle_state.opponent.user_id : battle_state.user.user_id;

      // Award battle XP to both coaches (winner gets full XP, loser gets partial)
      await CoachProgressionService.awardBattleXP(winner_user_id, true, battle_state.id);
      await CoachProgressionService.awardBattleXP(loser_user_id, false, battle_state.id);
    } catch (error) {
      console.error('Error awarding coach XP:', error);
    }

    // Award ticket rewards for battle victories (2 tickets per 5 wins)
    // FIXED: Get total_wins from database after update to ensure consistency
    try {
      const winner_user_id = battle_state[winner_side as keyof Pick<BattleState, 'user' | 'opponent'>].user_id;
      const winner_character_id = battle_state[winner_side as keyof Pick<BattleState, 'user' | 'opponent'>].character_id;

      // Get updated character data from database to ensure total_wins is accurate
      const updated_character = await db_adapter.user_characters.find_by_id(winner_character_id);
      if (updated_character) {
        // Award battle tickets using actual database value (not calculated)
        await ticket_service.awardBattleTickets(
          winner_user_id,
          updated_character.total_wins, // Use actual database value after update
          battle_state.id,
          winner_character_id
        );
      } else {
        console.error('Error: Could not find updated character for ticket rewards');
      }
    } catch (error) {
      console.error('Error awarding ticket rewards:', error);
    }

    // Send battle victory mail notification to winner
    try {
      const mail_service = new InternalMailService();
      const winner_character = battle_state[winner_side as keyof Pick<BattleState, 'user' | 'opponent'>].character;
      const loser_character = winner_side === 'user' ? battle_state.opponent.character : battle_state.user.character;

      await mail_service.sendSystemMail(winner_id, {
        subject: `🏆 ${winner_character.name} Won a Battle!`,
        content: `${winner_character.name} defeated ${loser_character.name} in battle!\n\n_rewards:\n• ${rewards.xp} XP\n• ${rewards.currency} coins\n• ${rewards.bond} bond points`,
        category: 'notification',
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error sending battle victory mail:', error);
    }

    // Generate Hostmaster v8.72 victory announcement
    setTimeout(async () => {
      await this.generate_hostmaster_victory_announcement(battle_state, winner_id);
    }, 1000);

    // Notify users
    this.io.to(`battle:${battle_state.id}`).emit('battle_end', {
      winner: winner_side,
      rewards,
      final_stats: {
        user: {
          health: battle_state.user.health,
          max_health: battle_state.user.max_health
        },
        opponent: {
          health: battle_state.opponent.health,
          max_health: battle_state.opponent.max_health
        }
      }
    });

    // Track analytics
    const loser_side = winner_side === 'user' ? 'opponent' : 'user';
    analytics_service.trackBattleCompletion({
      battle_id: battle_state.id,
      duration: Math.round((Date.now() - battle_state.created_at) / 1000),
      rounds: battle_state.round,
      winner: winner_id,
      loser: battle_state[loser_side as keyof Pick<BattleState, 'user' | 'opponent'>].user_id,
      combat_events: battle_state.combat_log.length,
      chat_messages: 0, // Would count from chat logs
      disconnections: 0,
      forfeit: false
    });

    // Clean up
    setTimeout(() => {
      this.active_battles.delete(battle_state.id);
      // Clean up Hostmaster history
      hostmaster_service.cleanupBattle(battle_state.id);
    }, 60000); // Keep state for 1 minute for reconnections
  }

  // Calculate battle rewards
  private calculate_rewards(battle_state: BattleState, winner_side: string): BattleRewards {
    const base_xp = 100;
    const base_currency = 50;
    const base_bond = 1;

    const winner = battle_state[winner_side as keyof Pick<BattleState, 'user' | 'opponent'>];
    const loser = winner_side === 'user' ? battle_state.opponent : battle_state.user;

    // XP calculation
    let xp = base_xp;
    if (winner.character.level < loser.character.level) {
      xp *= 1.5; // Bonus for beating higher level
    }

    // Currency
    let currency = base_currency;
    if (battle_state.round === BATTLE_CONFIG.MAX_ROUNDS) {
      currency *= 1.2; // Bonus for full battle
    }

    // Bond points
    let bond = base_bond;
    const chat_count = battle_state.combat_log.filter(e => e.type === 'chat').length;
    if (chat_count > 5) {
      bond += 1; // Extra bond for active chatting
    }

    return {
      xp: Math.round(xp),
      currency: Math.round(currency),
      bond,
      winner: true
    };
  }

  // Update character stats after battle
  private async update_character_stats(battle_state: BattleState, winner_side: string, rewards: BattleRewards): Promise<void> {
    const winner = battle_state[winner_side as keyof Pick<BattleState, 'user' | 'opponent'>];
    const loser = winner_side === 'user' ? battle_state.opponent : battle_state.user;

    // Update winner character stats
    await db_adapter.user_characters.update(winner.character_id, {
      total_battles: winner.character.total_battles + 1,
      total_wins: winner.character.total_wins + 1,
      experience: winner.character.experience + rewards.xp,
      current_health: winner.health,
      last_battle_at: new Date()
    });

    // Update loser character stats and handle death/injury
    if (loser.health === 0) {
      // Determine if character dies or just gets injured
      const death_chance = this.calculate_death_chance(loser.character.level, battle_state.round);
      const should_die = Math.random() < death_chance;

      if (should_die) {
        // Character dies - handle death
        await ResurrectionService.handleCharacterDeath(loser.character_id, {
          battle_id: battle_state.id,
          round: battle_state.round,
          opponent: winner.character.name
        });

        // Update basic stats (death handler updates death-related fields)
        await db_adapter.user_characters.update(loser.character_id, {
          total_battles: loser.character.total_battles + 1,
          experience: loser.character.experience + Math.round(rewards.xp * 0.3), // 30% XP for losing
          last_battle_at: new Date()
        });
      } else {
        // Character is severely injured but alive
        const injury_severity = this.calculate_injury_severity(loser.health, loser.max_health, battle_state.round);
        const recovery_time = this.calculate_injury_recovery_time(injury_severity);

        await db_adapter.user_characters.update(loser.character_id, {
          total_battles: loser.character.total_battles + 1,
          experience: loser.character.experience + Math.round(rewards.xp * 0.3), // 30% XP for losing
          current_health: 1, // Barely alive
          is_injured: true,
          injury_severity: injury_severity,
          recovery_time: new Date(Date.now() + recovery_time * 60 * 60 * 1000), // Recovery in hours
          last_battle_at: new Date()
        });
      }
    } else {
      // Character survived with health - minor or no injury
      const injury_severity = this.calculate_injury_severity(loser.health, loser.max_health, battle_state.round);
      const recovery_time = injury_severity !== 'healthy' ? this.calculate_injury_recovery_time(injury_severity) : 0;

      await db_adapter.user_characters.update(loser.character_id, {
        total_battles: loser.character.total_battles + 1,
        experience: loser.character.experience + Math.round(rewards.xp * 0.3), // 30% XP for losing
        current_health: loser.health,
        is_injured: injury_severity !== 'healthy',
        injury_severity: injury_severity,
        recovery_time: recovery_time > 0 ? new Date(Date.now() + recovery_time * 60 * 60 * 1000) : null,
        last_battle_at: new Date()
      });
    }

    // Award character progression XP to both characters
    try {
      // Award XP to winner character (full amount with victory bonus)
      await CharacterProgressionService.awardExperience(
        winner.character_id,
        rewards.xp,
        'battle',
        `Victory in battle ${battle_state.id}`,
        1.5 // 50% bonus for winning
      );

      // Award XP to loser character (reduced amount)
      await CharacterProgressionService.awardExperience(
        loser.character_id,
        Math.round(rewards.xp * 0.6), // 60% XP for losing (more than the old system's 30%)
        'battle',
        `Battle experience from ${battle_state.id}`,
        1.0 // No bonus for losing
      );

      // Award skill progression based on battle performance
      // Both characters gain combat skill experience
      await CharacterProgressionService.progressSkill(winner.character_id, 'combat_mastery', 50);
      await CharacterProgressionService.progressSkill(loser.character_id, 'combat_mastery', 25);

      // Winner gets additional skill progression for victory
      await CharacterProgressionService.progressSkill(winner.character_id, 'battle_tactics', 30);

    } catch (error) {
      console.error('Error awarding character progression XP:', error);
    }

    // Update user currencies
    await db_adapter.currency.update(winner.user_id, { battle_tokens: rewards.currency });
  }

  // Check if battle should end
  private check_battle_end(battle_state: BattleState): boolean {
    // Check if either user's health is 0
    if (battle_state.user.health <= 0 || battle_state.opponent.health <= 0) {
      return true;
    }

    // Check if we've completed all rounds
    if (battle_state.round > BATTLE_CONFIG.MAX_ROUNDS) {
      return true;
    }

    return false;
  }

  // Start phase timer
  private start_phase_timer(battle_id: string, phase: string, duration: number, callback?: () => void): void {
    const battle_state = this.active_battles.get(battle_id);
    if (!battle_state) return;

    // Clear existing timer
    if (battle_state.timer) {
      clearTimeout(battle_state.timer);
    }

    // Set new timer
    battle_state.timer = setTimeout(() => {
      if (callback) {
        callback();
      } else {
        // Default behavior based on phase
        this.handle_phase_timeout(battle_id, phase);
      }
    }, duration * 1000);
  }

  // Handle phase timeout
  private handle_phase_timeout(battle_id: string, phase: string): void {
    const battle_state = this.active_battles.get(battle_id);
    if (!battle_state) return;

    switch (phase) {
      case BATTLE_PHASES.CHAT_BREAK:
        this.end_chat_phase(battle_state);
        break;
    }
  }

  // Handle user forfeit
  private async handle_forfeit(battle_state: BattleState, forfeiting_side: string): Promise<void> {
    const winner_side = forfeiting_side === 'user' ? 'opponent' : 'user';
    const winner_id = battle_state[winner_side as keyof Pick<BattleState, 'user' | 'opponent'>].user_id;


    // Update battle in database
    await db_adapter.battles.update(battle_state.id, {
      winner_user_id: winner_id,
      battle_result: 'forfeit',
      status: 'completed',
      ended_at: new Date()
    });

    // Persist final state to battle_participants
    await this.update_battle_participants_persistence(battle_state);

    // CRITICAL: Unlock characters from battle (was missing - caused stuck characters!)
    await unlockCharactersFromBattle(battle_state.id);

    // Notify remaining player
    this.io.to(`battle:${battle_state.id}`).emit('opponent_forfeited', {
      winner: winner_side
    });

    // Publish global battle ended event for multi-server coordination
    try {
      await cache.publishBattleEvent('global', {
        type: 'battle_ended',
        battle_id: battle_state.id,
        end_reason: 'forfeit',
        winner: winner_id,
        server_id: SERVER_ID
      });
    } catch (error) {
      console.error('Failed to publish battle_ended event:', error);
    }

    // Clean up
    this.active_battles.delete(battle_state.id);
  }

  // Abandon a battle (connection timeout, error, etc.) - ensures characters are unlocked
  private async abandon_battle(battle_id: string, reason: string): Promise<void> {
    try {
      console.log(`🚫 Abandoning battle ${battle_id} - reason: ${reason}`);

      // CRITICAL: Clear all timers to prevent callbacks on abandoned battle
      const battle_state = this.active_battles.get(battle_id);
      if (battle_state) {
        if (battle_state.connection_timeout_timer) {
          clearTimeout(battle_state.connection_timeout_timer);
          battle_state.connection_timeout_timer = null;
        }
        if (battle_state.disconnect_timers) {
          battle_state.disconnect_timers.forEach((timer) => clearTimeout(timer));
          battle_state.disconnect_timers.clear();
        }
        if (battle_state.timer) {
          clearTimeout(battle_state.timer);
          battle_state.timer = null;
        }
      }

      // Update battle status in database
      await db_adapter.query(`
        UPDATE battles
        SET status = 'abandoned', ended_at = NOW(), battle_result = $2
        WHERE id = $1 AND status = 'in_progress'
      `, [battle_id, reason]);

      // CRITICAL: Unlock all characters from this battle
      await unlockCharactersFromBattle(battle_id);

      // Remove from active battles
      this.active_battles.delete(battle_id);

      console.log(`✅ Battle ${battle_id} abandoned and characters unlocked`);
    } catch (error) {
      console.error(`❌ Error abandoning battle ${battle_id}:`, error);
      // Still try to unlock characters even if DB update failed
      await unlockCharactersFromBattle(battle_id).catch(e =>
        console.error(`❌ CRITICAL: Failed to unlock characters for abandoned battle ${battle_id}:`, e)
      );
    }
  }

  // Notify player through various channels
  private notify_user(user_id: string, event: string, data: any): void {
    // Send through WebSocket if connected
    const user_socket = this.get_user_socket(user_id);
    if (user_socket) {
      user_socket.emit(event, data);
    }
  }

  // Get user's socket connection
  private get_user_socket(user_id: string): Socket | null {
    const socket_id = this.user_socket_map.get(user_id);
    if (!socket_id) {
      return null;
    }
    return this.io.sockets.sockets.get(socket_id) ?? null;
  }

  // Estimate wait time based on rating
  private estimate_wait_time(rating: number): number {
    const queue_size = this.battle_queue.size;
    const similar_rating_count = Array.from(this.battle_queue.values())
      .filter(player => Math.abs(player.rating - rating) < 200)
      .length;

    if (similar_rating_count > 0) {
      return Math.round(10 + Math.random() * 20); // 10-30 seconds
    } else {
      return Math.round(30 + queue_size * 5); // Longer wait if no similar ratings
    }
  }

  // Helper function for delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate death chance based on character level and battle intensity
   */
  private calculate_death_chance(character_level: number, battle_rounds: number): number {
    // Base death chance starts at 15% for level 1, decreases as level increases
    const base_mortality = 0.15 - (character_level * 0.002); // -0.2% per level

    // Battle intensity factor - longer battles are more deadly
    const intensity_factor = Math.min(2, 1 + (battle_rounds - 10) * 0.1); // +10% per round after 10

    // Final death chance (minimum 1%, maximum 25%)
    return Math.max(0.01, Math.min(0.25, base_mortality * intensity_factor));
  }

  /**
   * Calculate injury severity based on remaining health and battle context
   */
  private calculate_injury_severity(current_health: number, max_health: number, battle_rounds: number): 'healthy' | 'light' | 'moderate' | 'severe' | 'critical' {
    const health_percent = current_health / max_health;

    if (current_health === 0) {
      return 'critical'; // On death's door but alive
    } else if (health_percent <= 0.1) {
      return 'severe';   // 0-10% health
    } else if (health_percent <= 0.3) {
      return 'moderate'; // 11-30% health
    } else if (health_percent <= 0.6) {
      return 'light';    // 31-60% health
    } else {
      return 'healthy';  // 61%+ health
    }
  }

  /**
   * Calculate recovery time for different injury severities
   */
  private calculate_injury_recovery_time(severity: 'healthy' | 'light' | 'moderate' | 'severe' | 'critical'): number {
    const recovery_hours = {
      'healthy': 0,
      'light': 1,      // 1 hour
      'moderate': 4,   // 4 hours
      'severe': 12,    // 12 hours
      'critical': 24   // 24 hours
    };

    return recovery_hours[severity];
  }

  // Public methods for external access
  get_active_battles(): Map<string, BattleState> {
    return this.active_battles;
  }

  get_battle_queue(): Map<string, QueueEntry> {
    return this.battle_queue;
  }

  set_user_socket(user_id: string, socket_id: string): void {
    this.user_socket_map.set(user_id, socket_id);
  }

  remove_user_socket(user_id: string): void {
    this.user_socket_map.delete(user_id);
  }

  // Battle Host Integration Methods

  private async generate_hostmaster_introduction(battle_state: BattleState): Promise<void> {
    try {
      const context = await this.build_hostmaster_context(battle_state);
      const announcement = await hostmaster_service.generateBattleIntroduction(context);
      await hostmaster_service.broadcastAnnouncement(battle_state.id, announcement);
    } catch (error) {
      console.error('Failed to generate host introduction:', error);
    }
  }

  private async generate_hostmaster_round_announcement(battle_state: BattleState): Promise<void> {
    try {
      const context = await this.build_hostmaster_context(battle_state);
      const announcement = await hostmaster_service.generateRoundAnnouncement(context);
      await hostmaster_service.broadcastAnnouncement(battle_state.id, announcement);
    } catch (error) {
      console.error('Failed to generate host round announcement:', error);
    }
  }

  private async generate_hostmaster_action_commentary(battle_state: BattleState, event: any): Promise<void> {
    try {
      const context = await this.build_hostmaster_context(battle_state);
      const announcement = await hostmaster_service.generateActionCommentary(context, event);
      await hostmaster_service.broadcastAnnouncement(battle_state.id, announcement);
    } catch (error) {
      console.error('Failed to generate host action commentary:', error);
    }
  }

  private async generate_hostmaster_victory_announcement(battle_state: BattleState, winner_id: string): Promise<void> {
    try {
      const context = await this.build_hostmaster_context(battle_state);
      const winner_name = battle_state.user.user_id === winner_id ?
        battle_state.user.character.name : battle_state.opponent.character.name;
      const announcement = await hostmaster_service.generateVictoryAnnouncement(context, winner_name);
      await hostmaster_service.broadcastAnnouncement(battle_state.id, announcement);
    } catch (error) {
      console.error('Failed to generate host victory announcement:', error);
    }
  }

  /**
   * Execute a queue of planned actions for a character's full turn.
   * Each action gets its own adherence check and can trigger dramatic events.
   *
   * AP costs come from the action execution result, NOT hardcoded values.
   * The executor looks up costs from the database (attack_types, power_definitions, etc.)
   */
  private async executeActionQueue(
    battle_state: BattleState,
    character_id: string,
    character_name: string,
    planned_actions: PlannedHexAction[]
  ): Promise<TurnQueueExecutionResult> {
    const actions_executed: ActionQueueResult[] = [];
    let ap_spent = 0;
    let turn_interrupted = false;
    let interruption_reason: string | undefined;

    for (let i = 0; i < planned_actions.length; i++) {
      const action = planned_actions[i];

      // Reconstruct state fresh for each action (event sourcing)
      const state: ReconstructedState = await reconstructBattleState(battle_state.id);

      // Convert to coach order
      const coach_order: CoachOrder = this.buildCoachOrder(action, state);

      // Execute through turn service (handles adherence, declarations, rebellions)
      const turn_result: TurnExecutionResult = await executeTurn(
        state,
        character_id,
        coach_order
      );

      // Determine dramatic event type
      let dramatic_event: DramaticEventType = 'action_executed';
      let character_killed: { character_id: string; character_name: string } | undefined;

      if (turn_result.is_rebellion) {
        dramatic_event = 'rebellion_occurred';
      } else if (action.type === 'power' || action.type === 'spell') {
        dramatic_event = 'power_unleashed';
      }

      // Check for kills in the result
      if (turn_result.action_result && 'target_state' in turn_result.action_result) {
        const target_state = (turn_result.action_result as any).target_state;
        if (target_state?.is_dead) {
          dramatic_event = 'character_killed';
          // Find the killed character's name
          const killed_char = state.context.characters.get(target_state.character_id);
          if (!killed_char) {
            throw new Error(`Killed character ${target_state.character_id} not found in battle context`);
          }
          character_killed = {
            character_id: target_state.character_id,
            character_name: killed_char.name
          };
        }
      }

      // Check for critical hit (high damage relative to target's health)
      if (turn_result.action_result && 'damage_dealt' in turn_result.action_result) {
        const damage = (turn_result.action_result as any).damage_dealt;
        if (damage >= 50 && dramatic_event === 'action_executed') {
          dramatic_event = 'critical_hit';
        }
      }

      // Build action result
      const action_result: ActionQueueResult = {
        action_index: i,
        action,
        result: turn_result.action_result,
        dramatic_event,
        declaration: turn_result.declaration,
        is_rebellion: turn_result.is_rebellion,
        character_killed
      };

      if (turn_result.is_rebellion && turn_result.rebellion_details) {
        action_result.rebellion_details = {
          coach_ordered: coach_order.label,
          character_did: turn_result.rebellion_details.chosen_action.label,
          judge_ruling: turn_result.rebellion_details.judge_ruling
        };
      }

      actions_executed.push(action_result);
      // Get AP cost from the action result - the executor calculates this from DB
      ap_spent += turn_result.action_result.ap_cost;

      // Check for interruption conditions
      // 1. Character died
      const char_battle_state = state.context.character_battle_state.get(character_id);
      if (char_battle_state?.is_dead) {
        turn_interrupted = true;
        interruption_reason = 'Character was killed';
        break;
      }

      // 2. Rebellion with severe penalty might interrupt
      if (turn_result.is_rebellion && turn_result.rebellion_details?.judge_ruling?.verdict === 'severely_penalized') {
        // Optional: interrupt on severe rebellion - uncomment if desired
        // turn_interrupted = true;
        // interruption_reason = 'Severe rebellion penalty';
        // break;
      }
    }

    // Get final AP state from reconstructed battle state
    const final_state = await reconstructBattleState(battle_state.id);
    const final_action_state = final_state.context.action_states.get(character_id);
    if (!final_action_state) {
      throw new Error(`Action state for character ${character_id} not found after turn execution`);
    }
    const ap_remaining = final_action_state.action_points_remaining;

    return {
      character_id,
      character_name,
      actions_executed,
      ap_spent,
      ap_remaining,
      turn_interrupted,
      interruption_reason
    };
  }

  /**
   * Advance to the next character's turn in the battle.
   * Handles round transitions and victory conditions.
   */
  private async advanceTurn(battle_state: BattleState): Promise<void> {
    if (!battle_state.hex_grid_state) return;

    const { turn_order, current_turn_index } = battle_state.hex_grid_state;
    const next_index = current_turn_index + 1;

    // Check if round is complete (all 6 characters have acted)
    if (next_index >= turn_order.length) {
      // Round complete - emit event and start new round
      battle_state.hex_grid_state.current_turn_index = 0;
      battle_state.round = battle_state.round + 1;

      // Reset AP for all characters
      for (const char_id of turn_order) {
        const action_state = battle_state.hex_grid_state.action_states.get(char_id);
        if (action_state) {
          action_state.action_points = action_state.max_action_points;
          action_state.has_acted = false;
        }
      }

      // Check victory conditions
      const victory_result = this.checkVictoryConditions(battle_state);
      if (victory_result.battle_ended) {
        this.io.to(`battle:${battle_state.id}`).emit('battle_end', {
          winner_user_id: victory_result.winner_user_id,
          reason: victory_result.reason
        });
        return;
      }

      // Emit round complete
      this.io.to(`battle:${battle_state.id}`).emit('round_complete', {
        round_ended: battle_state.round - 1,
        round_starting: battle_state.round,
        turn_order
      });
    } else {
      // Advance to next character
      battle_state.hex_grid_state.current_turn_index = next_index;
    }

    // Get next character
    const next_char_id = turn_order[battle_state.hex_grid_state.current_turn_index];
    const next_action_state = battle_state.hex_grid_state.action_states.get(next_char_id);
    if (!next_action_state) {
      throw new Error(`Action state not found for character ${next_char_id} in turn order`);
    }

    // Find which side this character belongs to
    const is_user_char = battle_state.user.team_characters?.some(c => c.id === next_char_id);
    const next_user_side = is_user_char ? 'user' : 'opponent';
    const next_char_name = is_user_char
      ? battle_state.user.team_characters?.find(c => c.id === next_char_id)?.name
      : battle_state.opponent.team_characters?.find(c => c.id === next_char_id)?.name;

    // Emit turn started
    this.io.to(`battle:${battle_state.id}`).emit('turn_started', {
      character_id: next_char_id,
      character_name: next_char_name,
      user_side: next_user_side,
      ap_available: next_action_state.action_points,
      round: battle_state.round,
      turn_index: battle_state.hex_grid_state.current_turn_index
    });
  }

  /**
   * Check if battle has ended (one team eliminated).
   */
  private checkVictoryConditions(battle_state: BattleState): {
    battle_ended: boolean;
    winner_user_id?: string;
    reason?: string
  } {
    if (!battle_state.hex_grid_state) {
      return { battle_ended: false };
    }

    // Count alive characters per team
    let user_alive = 0;
    let opponent_alive = 0;

    for (const char of battle_state.user.team_characters || []) {
      const battle_char_state = battle_state.hex_grid_state.action_states.get(char.id);
      // Check if character is alive (has health and not marked dead)
      if (battle_char_state && battle_char_state.action_points >= 0) {
        // Need to check actual health from reconstructed state
        user_alive++;
      }
    }

    for (const char of battle_state.opponent.team_characters || []) {
      const battle_char_state = battle_state.hex_grid_state.action_states.get(char.id);
      if (battle_char_state && battle_char_state.action_points >= 0) {
        opponent_alive++;
      }
    }

    // This is a simplified check - in reality we'd check health from the reconstructed state
    // For now, return no victory until proper integration
    if (user_alive === 0) {
      return {
        battle_ended: true,
        winner_user_id: battle_state.opponent.user_id,
        reason: 'All enemy team members eliminated'
      };
    }

    if (opponent_alive === 0) {
      return {
        battle_ended: true,
        winner_user_id: battle_state.user.user_id,
        reason: 'All enemy team members eliminated'
      };
    }

    // Check max rounds
    if (battle_state.round > battle_state.max_rounds) {
      // Determine winner by remaining health percentage
      return {
        battle_ended: true,
        winner_user_id: user_alive >= opponent_alive
          ? battle_state.user.user_id
          : battle_state.opponent.user_id,
        reason: 'Max rounds reached - winner by remaining fighters'
      };
    }

    return { battle_ended: false };
  }

  // Convert PlannedHexAction to CoachOrder for the turn service
  private buildCoachOrder(planned_action: PlannedHexAction, state: ReconstructedState): CoachOrder {
    let label = '';
    let action_type = planned_action.type;
    let ability_id: string | undefined;
    let attack_type_id: string | undefined;

    if (planned_action.type === 'attack') {
      if (!planned_action.attack_target_id) {
        throw new Error('Attack action requires attack_target_id');
      }
      if (!planned_action.attack_type_id) {
        throw new Error('Attack action requires attack_type_id (jab, strike, heavy, or all_out)');
      }
      const target = state.context.characters.get(planned_action.attack_target_id);
      if (!target) {
        throw new Error(`Attack target ${planned_action.attack_target_id} not found`);
      }
      attack_type_id = planned_action.attack_type_id;
      const attack_labels: Record<string, string> = {
        'jab': 'Jab',
        'strike': 'Strike',
        'heavy': 'Heavy Attack',
        'all_out': 'All-Out Attack'
      };
      const attack_label = attack_labels[attack_type_id];
      if (!attack_label) {
        throw new Error(`Unknown attack_type_id: ${attack_type_id}`);
      }
      label = `${attack_label} ${target.name}`;
      action_type = 'attack';
    } else if (planned_action.type === 'defend') {
      label = 'Take defensive stance';
      action_type = 'defend';
    } else if (planned_action.type === 'move' && planned_action.move_to_hex) {
      label = `Move to hex (${planned_action.move_to_hex.q}, ${planned_action.move_to_hex.r})`;
      action_type = 'move';
    } else if (planned_action.type === 'move_and_attack') {
      if (!planned_action.attack_target_id) {
        throw new Error('move_and_attack requires attack_target_id');
      }
      if (!planned_action.attack_type_id) {
        throw new Error('move_and_attack requires attack_type_id');
      }
      const target = state.context.characters.get(planned_action.attack_target_id);
      if (!target) {
        throw new Error(`Target ${planned_action.attack_target_id} not found`);
      }
      label = `Move and attack ${target.name}`;
      action_type = 'attack'; // Primary action is attack
      attack_type_id = planned_action.attack_type_id;
    } else if (planned_action.type === 'power') {
      if (!planned_action.ability_id) {
        throw new Error('power action requires ability_id');
      }
      if (!planned_action.ability_name) {
        throw new Error('power action requires ability_name');
      }
      const target = planned_action.attack_target_id
        ? state.context.characters.get(planned_action.attack_target_id)
        : null;
      label = target
        ? `Use ${planned_action.ability_name} on ${target.name}`
        : `Use ${planned_action.ability_name}`;
      action_type = 'power';
      ability_id = planned_action.ability_id;
    } else if (planned_action.type === 'spell') {
      if (!planned_action.ability_id) {
        throw new Error('spell action requires ability_id');
      }
      if (!planned_action.ability_name) {
        throw new Error('spell action requires ability_name');
      }
      const target = planned_action.attack_target_id
        ? state.context.characters.get(planned_action.attack_target_id)
        : null;
      label = target
        ? `Cast ${planned_action.ability_name} on ${target.name}`
        : `Cast ${planned_action.ability_name}`;
      action_type = 'spell';
      ability_id = planned_action.ability_id;
    } else if (planned_action.type === 'item') {
      if (!planned_action.item_id) {
        throw new Error('item action requires item_id');
      }
      label = `Use item`;
      action_type = 'item';
      ability_id = planned_action.item_id;
    }

    return {
      action_type,
      target_id: planned_action.attack_target_id,
      target_hex: planned_action.move_to_hex,
      ability_id,
      attack_type_id,
      label
    };
  }

  // Helper to update battle_participants table
  private async update_battle_participants_persistence(battle_state: BattleState): Promise<void> {
    if (!battle_state.hex_grid_state) return;

    const { action_states, character_positions } = battle_state.hex_grid_state;
    const all_characters = [
      ...(battle_state.user.team_characters || []),
      ...(battle_state.opponent.team_characters || [])
    ];

    for (const char of all_characters) {
      const action_state = action_states.get(char.id);
      const position = character_positions.get(char.id);

      if (action_state) {
        // Validate AP is within valid range [0, max_ap]
        const max_ap = action_state.max_action_points;
        const current_ap = Math.max(0, Math.min(max_ap, action_state.action_points));

        if (current_ap !== action_state.action_points) {
          console.warn(`Character ${char.id} AP ${action_state.action_points} out of range [0, ${max_ap}], clamping to ${current_ap}`);
        }

        await db_adapter.query(`
          UPDATE battle_participants
          SET
            current_health = $1,
            current_ap = $2,
            current_position = $3,
            last_updated = NOW()
          WHERE battle_id = $4 AND character_id = $5
        `, [
          char.current_health,
          current_ap,
          JSON.stringify(position),
          battle_state.id,
          char.id
        ]);
      }
    }
  }

  private async build_hostmaster_context(battle_state: BattleState): Promise<HostmasterContext> {
    // Fetch the user's assigned host from user_characters
    const hostResult = await db_adapter.query(
      'SELECT host_id FROM user_characters WHERE id = $1',
      [battle_state.user.character_id]
    );
    const host_id = hostResult.rows[0]?.host_id as 'pt_barnum' | 'mad_hatter' | 'betty_boop' | undefined;

    return {
      user_name: battle_state.user.character.name,
      opponent_name: battle_state.opponent.character.name,
      battle_id: battle_state.id,
      round: battle_state.round,
      phase: battle_state.phase,
      current_health: {
        user: battle_state.user.health,
        opponent: battle_state.opponent.health
      },
      max_health: {
        user: battle_state.user.max_health,
        opponent: battle_state.opponent.max_health
      },
      combat_events: battle_state.combat_log,
      battle_history: [],
      host_id
    };
  }
}

export default BattleManager;