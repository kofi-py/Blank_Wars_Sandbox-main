import { Server as SocketIOServer, Socket } from 'socket.io';
import { EventEmitter } from 'events';
import { dbAdapter } from './databaseAdapter';
import { analyticsService } from './analytics';
import { cache } from '../database/index';
import { hostmasterService, HostmasterContext } from './hostmasterService';
import { applyHeadquartersEffectsToCharacter, getHeadquartersData } from './headquartersEffectsService';
import { CoachProgressionService } from './coachProgressionService';
import { CharacterProgressionService } from './characterProgressionService';
import { ResurrectionService } from './resurrectionService';
import { ticketService } from './ticketService';
import { InternalMailService } from './internalMailService';
import * as BattleMechanics from './battleMechanicsService';
import {
  loadBattleCharacter,
  initializePowerCooldowns,
  initializeSpellCooldowns,
  PowerDefinition,
  SpellDefinition
} from './battleCharacterLoader';
import {
  executePower,
  executeSpell,
  applyActionEffects,
  PowerExecutionContext,
  SpellExecutionContext
} from './battleActionsService';

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
  abilities: Ability[];
  personality_traits: string[];
  equipment: any[];
  is_injured: boolean;
  recovery_time?: Date;
  total_battles: number;
  total_wins: number;
  // Powers & Spells Integration
  unlockedPowers?: PowerDefinition[];
  unlockedSpells?: SpellDefinition[];
  equippedPowers?: PowerDefinition[];
  equippedSpells?: SpellDefinition[];
}

interface Ability {
  name: string;
  power: number;
  cooldown: number;
  type: string;
  effect?: string;
}

interface BattleUser {
  userId: string;
  characterId: string;
  character: BattleCharacter;
  strategy: string | null;
  connected: boolean;
  health: number;
  maxHealth: number;
  effects: StatusEffect[];
  cooldowns: Record<string, number>;
  rating: number;
  // Powers & Spells Cooldowns
  powerCooldowns?: Map<string, number>;
  spellCooldowns?: Map<string, number>;
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
  user: BattleUser;
  opponent: BattleUser;
  combatLog: CombatEvent[];
  chatEnabled: boolean;
  timer: NodeJS.Timeout | null;
  createdAt: number;
  // Hex Grid Battle Mode
  hexBattleMode?: boolean;
  hexGridState?: HexGridState;
}

interface HexGridState {
  gridSize: { q: number; r: number };
  characterPositions: Map<string, HexPosition>;
  actionStates: Map<string, CharacterHexActionState>;
  terrainFeatures: TerrainFeature[];
  turnOrder: string[];
  currentTurnIndex: number;
}

interface HexPosition {
  q: number;
  r: number;
  s: number;
}

interface CharacterHexActionState {
  characterId: string;
  position: HexPosition;
  actionPoints: number;
  maxActionPoints: number;
  hasActed: boolean;
  plannedAction?: PlannedHexAction;
}

interface PlannedHexAction {
  type: 'move' | 'attack' | 'move_and_attack' | 'defend';
  moveToHex?: HexPosition;
  attackTargetId?: string;
  attackTargetHex?: HexPosition;
}

interface TerrainFeature {
  position: HexPosition;
  type: 'broadcast_tower' | 'shark_perimeter' | 'cover' | 'hazard';
  blocksMovement?: boolean;
  blocksLineOfSight?: boolean;
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
  remainingHealth?: Record<string, number>;
  order?: string[];
  character?: string;
  target?: string;
  effect?: string;
  amount?: number;
  reason?: string;
  // Hex Grid Battle Events
  hexPosition?: HexPosition;
  hexMovePath?: HexPosition[];
  flanking?: boolean;
  lineOfSight?: boolean;
  rangeModifier?: number;
}

interface QueueEntry {
  userId: string;
  characterId: string;
  character: BattleCharacter;
  rating: number;
  joinedAt: number;
  mode: string;
}

interface StrategyModifiers {
  atkMod: number;
  defMod: number;
  spdMod: number;
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
  STRATEGY_SELECT: 'strategy_select',
  ROUND_COMBAT: 'round_combat',
  CHAT_BREAK: 'chat_break',
  BATTLE_END: 'battle_end'
} as const;

// Battle configuration
const BATTLE_CONFIG = {
  MAX_ROUNDS: 3,
  ROUND_DURATION: 30, // seconds
  CHAT_DURATION: 45, // seconds
  STRATEGY_DURATION: 15, // seconds
  TURN_SPEED_BONUS: 0.1, // 10% speed bonus for going first
  CRIT_MULTIPLIER: 2.0, // Default critical hit damage multiplier
} as const;

/**
 * Main Battle Manager
 * Handles matchmaking, battle lifecycle, and real-time communication
 */
export class BattleManager extends EventEmitter {
  private io: SocketIOServer;
  private activeBattles: Map<string, BattleState>;
  private battleQueue: Map<string, QueueEntry>;
  private userSocketMap: Map<string, string>; // Map userId to socket.id

  constructor(io: SocketIOServer) {
    super();
    this.io = io;
    this.activeBattles = new Map();
    this.battleQueue = new Map();
    this.userSocketMap = new Map();
    
    // Initialize Hostmaster v8.72 with the same io instance
    if (typeof global !== 'undefined') {
      (global as any).io = io;
    }
    
    // Subscribe to battle events for multi-server coordination
    this.initializeMultiServerCoordination().catch(error => {
      console.warn('⚠️ Failed to initialize multi-server coordination:', error instanceof Error ? error.message : String(error));
    });
  }

  // Initialize multi-server coordination with Redis
  private async initializeMultiServerCoordination(): Promise<void> {
    try {
      // Subscribe to global battle events
      if (cache.isUsingRedis()) {
        await cache.subscribeToBattleEvents('global', (event: any) => {
          this.handleGlobalBattleEvent(event);
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
  private handleGlobalBattleEvent(event: any): void {
    try {
      switch (event.type) {
        case 'battle_created':
          // Another server created a battle, track it for coordination
          console.log(`📊 Battle ${event.battleId} created on server ${event.serverId}`);
          // Remove users from local queue if they exist
          if (event.userId) {
            this.battleQueue.delete(event.userId);
          }
          if (event.opponentId) {
            this.battleQueue.delete(event.opponentId);
          }
          break;
        case 'battle_ended':
          // Another server ended a battle, clean up any local references
          console.log(`📊 Battle ${event.battleId} ended on server ${event.serverId}`);
          if (event.battleId && this.activeBattles.has(event.battleId)) {
            // Remove from local state if somehow we have a reference
            this.activeBattles.delete(event.battleId);
          }
          break;
        case 'user_disconnected':
          // Handle user disconnection across servers
          console.log(`📊 User ${event.userId} disconnected from server ${event.serverId}`);
          // Remove from local queue if they exist
          if (event.userId) {
            this.battleQueue.delete(event.userId);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling global battle event:', error);
    }
  }

  // Redis-enhanced matchmaking
  private async addToDistributedQueue(queueEntry: QueueEntry): Promise<void> {
    try {
      await cache.addUserToMatchmaking(queueEntry.userId, {
        characterId: queueEntry.characterId,
        character: queueEntry.character,
        rating: queueEntry.rating,
        joinedAt: queueEntry.joinedAt,
        mode: queueEntry.mode,
        serverId: process.env.SERVER_ID || 'default'
      }, queueEntry.mode);
    } catch (error) {
      console.error('Failed to add user to distributed queue:', error);
      // Fallback to local queue
      this.battleQueue.set(queueEntry.userId, queueEntry);
    }
  }

  private async removeFromDistributedQueue(userId: string, mode: string): Promise<void> {
    try {
      await cache.removeUserFromMatchmaking(userId, mode);
    } catch (error) {
      console.error('Failed to remove user from distributed queue:', error);
    }
    // Always clean local queue
    this.battleQueue.delete(userId);
  }

  private async findDistributedOpponent(queueEntry: QueueEntry): Promise<QueueEntry | null> {
    try {
      const queueUsers = await cache.getMatchmakingQueue(queueEntry.mode);

      for (const user of queueUsers) {
        // Skip self
        if (user.id === queueEntry.userId) continue;

        const userData = user.data;
        const ratingDiff = Math.abs(queueEntry.rating - userData.rating);
        const waitTime = Date.now() - queueEntry.joinedAt;
        
        // Expand rating range based on wait time
        const maxRatingDiff = Math.min(200 + waitTime / 1000, 500);
        
        if (ratingDiff <= maxRatingDiff) {
          // Use distributed lock to prevent race conditions between servers
          const lockKey = `match_lock:${[queueEntry.userId, user.id].sort().join(':')}`;

          try {
            // Try to acquire lock with Redis SETNX
            const lockValue = `${process.env.SERVER_ID || 'server'}:${Date.now()}`;
            await cache.set(lockKey, lockValue, 5); // 5 second expiry
            const lockAcquired = 'OK'; // Simplified for in-memory cache

            if (lockAcquired === 'OK') {
              // Double-check both users are still in queue before proceeding
              const queueUsersCheck = await cache.getMatchmakingQueue(queueEntry.mode);
              const userStillInQueue = queueUsersCheck.some(p => p.id === queueEntry.userId);
              const opponentStillInQueue = queueUsersCheck.some(p => p.id === user.id);

              if (userStillInQueue && opponentStillInQueue) {
                // Found a match! Convert back to QueueEntry format
                const opponent: QueueEntry = {
                  userId: user.id,
                  characterId: userData.characterId,
                  character: userData.character,
                  rating: userData.rating,
                  joinedAt: userData.joinedAt,
                  mode: userData.mode
                };

                // Remove both users from queue atomically
                await this.removeFromDistributedQueue(queueEntry.userId, queueEntry.mode);
                await this.removeFromDistributedQueue(opponent.userId, opponent.mode);
                
                // Release lock before returning
                await cache.del(lockKey);
                
                return opponent;
              } else {
                // One of the players was already matched, release lock and continue searching
                await cache.del(lockKey);
              }
            }
            // If lock not acquired, another server is processing this match, skip this player
          } catch (lockError) {
            console.error('Error with distributed lock:', lockError);
            // Continue without lock as fallback
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to find distributed opponent:', error);
      // Fallback to local matchmaking
      return this.findOpponent(queueEntry);
    }
  }

  // Find match for player
  async findMatch(userId: string, characterId: string, mode: string = 'ranked'): Promise<any> {
    try {
      const user = await dbAdapter.users.findById(userId);

      // Load character with powers/spells equipped
      const battleCharacter = await loadBattleCharacter(characterId);

      if (!battleCharacter || battleCharacter.user_id !== userId) {
        throw new Error('Invalid character');
      }

      // Apply headquarters effects to character stats
      const headquarters = await getHeadquartersData(userId);
      const enhancedCharacter = headquarters
        ? applyHeadquartersEffectsToCharacter(battleCharacter as any, headquarters)
        : battleCharacter;
      
      // Check daily battle limits
      const { usageTrackingService } = require('./usageTrackingService');
      const { db } = require('../database/postgres');
      
      const canBattle = await usageTrackingService.trackBattleUsage(userId, db);
      if (!canBattle) {
        throw new Error('Daily battle limit reached. Upgrade to premium for more battles!');
      }
      
      // Check if character is injured
      if (enhancedCharacter.is_injured && enhancedCharacter.recovery_time && enhancedCharacter.recovery_time > new Date()) {
        throw new Error('Character is still recovering');
      }
      
      // Add to queue
      const queueEntry: QueueEntry = {
        userId,
        characterId,
        character: enhancedCharacter as any as BattleCharacter,
        rating: user?.rating || 1000,
        joinedAt: Date.now(),
        mode
      };
      
      // Add to distributed queue (Redis) for multi-server support
      await this.addToDistributedQueue(queueEntry);
      analyticsService.trackUserAction(userId, 'matchmaking_start', { characterId, mode });
      
      // Try to find opponent across all servers
      const opponent = await this.findDistributedOpponent(queueEntry);
      
      if (opponent) {
        // Match found! (players already removed from distributed queue)
        
        // Create battle
        const battle = await this.createBattle(queueEntry, opponent);
        
        // Publish battle creation event for multi-server coordination
        await cache.publishBattleEvent('global', {
          type: 'battle_created',
          battleId: battle?.id,
          userId: userId,
          opponentId: opponent.userId,
          serverId: process.env.SERVER_ID || 'default'
        });
        
        analyticsService.trackMatchmaking(userId, Date.now() - queueEntry.joinedAt, await cache.getMatchmakingQueueSize(queueEntry.mode));
        analyticsService.trackMatchmaking(opponent.userId, Date.now() - opponent.joinedAt, await cache.getMatchmakingQueueSize(opponent.mode));
        
        // Get opponent user data for frontend
        const opponentUser = await dbAdapter.users.findById(opponent.userId);
        
        if (!opponent.character) {
          console.error('Opponent character data missing');
          throw new Error('Invalid opponent data');
        }
        
        return {
          status: 'found',
          battle_id: battle?.id,
          websocket_url: `/battle/${battle?.id}`,
          opponent: {
            id: opponent.userId,
            username: opponentUser?.username || 'Unknown Player',
            rating: opponent.rating || 1000
          },
          character: {
            id: opponent.character.character_id || opponent.character.id,
            name: opponent.character.name,
            title: opponent.character.title,
            level: opponent.character.level,
            current_health: opponent.character.current_health,
            max_health: opponent.character.max_health,
            abilities: opponent.character.abilities.map(ability => ({
              name: ability.name,
              damage_multiplier: ability.power || 1.0,
              cooldown: ability.cooldown || 0,
              effect: ability.effect
            }))
          }
        };
      } else {
        // Still searching
        const queueSize = await cache.getMatchmakingQueueSize(queueEntry.mode);
        return {
          status: 'waiting',
          queue_position: queueSize,
          estimated_wait: this.estimateWaitTime(queueEntry.rating)
        };
      }
    } catch (error) {
      console.error('Matchmaking error:', error);
      throw error;
    }
  }

  // Find suitable opponent
  private findOpponent(player: QueueEntry): QueueEntry | null {
    const RATING_RANGE = 200;
    const WAIT_TIME_EXPANSION = 50; // Expand range by 50 per 10 seconds
    const waitTime = Date.now() - player.joinedAt;
    const expandedRange = RATING_RANGE + Math.floor(waitTime / 10000) * WAIT_TIME_EXPANSION;
    
    for (const [opponentId, opponent] of this.battleQueue) {
      if (opponentId === player.userId) continue;
      if (opponent.mode !== player.mode) continue;
      
      const ratingDiff = Math.abs(player.rating - opponent.rating);
      if (ratingDiff <= expandedRange) {
        return opponent;
      }
    }
    
    return null;
  }

  // Create new battle
  private async createBattle(user: QueueEntry, opponent: QueueEntry): Promise<BattleState | null> {
    try {
      const battleData = {
        user_id: user.userId,
        opponent_user_id: opponent.userId,
        user_character_id: user.characterId,
        opponent_character_id: opponent.characterId,
        battle_type: 'ranked',
        status: 'active',
        phase: 'strategy_select',
        current_round: 1,
        max_rounds: 3,
        user_team_data: { characters: [user.character] },
        opponent_team_data: { characters: [opponent.character] },
        battle_log: [],
        round_results: [],
        coaching_data: {},
        ai_judge_context: {},
        global_morale: { user: 50, opponent: 50 }
      };

      const battle = await dbAdapter.battles.create(battleData);
      if (!battle) {
        throw new Error('Failed to create battle in database');
      }
      
      // Initialize battle state
      const battleState: BattleState = {
        id: battle.id,
        phase: BATTLE_PHASES.STRATEGY_SELECT,
        round: 1,
        turn: 0,

        user: {
          userId: user.userId,
          characterId: user.characterId,
          character: user.character,
          strategy: null,
          connected: false,
          health: user.character.current_health,
          maxHealth: user.character.max_health,
          effects: [],
          cooldowns: {},
          rating: user.rating,
          // Initialize power/spell cooldowns
          powerCooldowns: initializePowerCooldowns(user.character.equippedPowers),
          spellCooldowns: initializeSpellCooldowns(user.character.equippedSpells)
        },

        opponent: {
          userId: opponent.userId,
          characterId: opponent.characterId,
          character: opponent.character,
          strategy: null,
          connected: false,
          health: opponent.character.current_health,
          maxHealth: opponent.character.max_health,
          effects: [],
          cooldowns: {},
          rating: opponent.rating,
          // Initialize power/spell cooldowns
          powerCooldowns: initializePowerCooldowns(opponent.character.equippedPowers),
          spellCooldowns: initializeSpellCooldowns(opponent.character.equippedSpells)
        },

        combatLog: [],
        chatEnabled: false,
        timer: null,
        createdAt: Date.now()
      };
      
      this.activeBattles.set(battle.id, battleState);

      // Notify users
      this.notifyUser(user.userId, 'match_found', { battleId: battle.id });
      this.notifyUser(opponent.userId, 'match_found', { battleId: battle.id });

      // Generate Hostmaster v8.72 battle introduction
      setTimeout(async () => {
        await this.generateHostmasterIntroduction(battleState);
      }, 2000);

      // Track analytics
      analyticsService.trackUserAction(user.userId, 'battle_start', { battleId: battle.id });
      analyticsService.trackUserAction(opponent.userId, 'battle_start', { battleId: battle.id });
      
      // Start strategy phase timer
      this.startPhaseTimer(battle.id, BATTLE_PHASES.STRATEGY_SELECT, BATTLE_CONFIG.STRATEGY_DURATION);
      
      return battleState;
    } catch (error) {
      console.error('Error creating battle:', error);
      return null;
    }
  }

  // Initialize hex grid battle state
  private initializeHexGridBattle(battleState: BattleState, user: QueueEntry, opponent: QueueEntry): void {
    // Create 12x12 hex grid
    const gridSize = { q: 12, r: 12 };

    // Initialize character positions (user on rows 0-2, opponent on rows 9-11)
    const characterPositions = new Map<string, HexPosition>();
    const actionStates = new Map<string, CharacterHexActionState>();

    // Position user's character (starting zone: rows 0-2)
    const userStartPos: HexPosition = { q: 5, r: 1, s: -6 };
    characterPositions.set(user.characterId, userStartPos);
    actionStates.set(user.characterId, {
      characterId: user.characterId,
      position: userStartPos,
      actionPoints: 3,
      maxActionPoints: 3,
      hasActed: false
    });

    // Position opponent's character (starting zone: rows 9-11)
    const opponentStartPos: HexPosition = { q: 5, r: 10, s: -15 };
    characterPositions.set(opponent.characterId, opponentStartPos);
    actionStates.set(opponent.characterId, {
      characterId: opponent.characterId,
      position: opponentStartPos,
      actionPoints: 3,
      maxActionPoints: 3,
      hasActed: false
    });

    // Add terrain features (broadcast tower at center, shark perimeter)
    const terrainFeatures: TerrainFeature[] = [
      // Broadcast tower at center
      {
        position: { q: 5, r: 5, s: -10 },
        type: 'broadcast_tower',
        blocksMovement: true,
        blocksLineOfSight: true
      }
    ];

    // Add shark perimeter (edges of grid)
    for (let q = 0; q < gridSize.q; q++) {
      terrainFeatures.push({
        position: { q, r: 0, s: -q },
        type: 'shark_perimeter',
        blocksMovement: true,
        blocksLineOfSight: false
      });
      terrainFeatures.push({
        position: { q, r: gridSize.r - 1, s: -(q + gridSize.r - 1) },
        type: 'shark_perimeter',
        blocksMovement: true,
        blocksLineOfSight: false
      });
    }

    // Determine turn order by speed (same as abstract combat)
    const userSpeed = user.character.speed * (1 + Math.random() * 0.1);
    const opponentSpeed = opponent.character.speed * (1 + Math.random() * 0.1);
    const turnOrder = userSpeed >= opponentSpeed ? [user.characterId, opponent.characterId] : [opponent.characterId, user.characterId];

    // Set hex grid state
    battleState.hexBattleMode = true;
    battleState.hexGridState = {
      gridSize,
      characterPositions,
      actionStates,
      terrainFeatures,
      turnOrder,
      currentTurnIndex: 0
    };

    // Log initialization
    battleState.combatLog.push({
      type: 'hex_grid_initialized',
      timestamp: Date.now(),
      hexPosition: { q: gridSize.q, r: gridSize.r, s: 0 }
    });
  }

  // Serialize hex grid state for database storage
  private serializeHexGridState(hexState: HexGridState | undefined): any {
    if (!hexState) return null;

    return {
      gridSize: hexState.gridSize,
      characterPositions: Array.from(hexState.characterPositions.entries()).map(([id, pos]) => ({ characterId: id, position: pos })),
      actionStates: Array.from(hexState.actionStates.entries()).map(([id, state]) => ({ characterId: id, ...state })),
      terrainFeatures: hexState.terrainFeatures,
      turnOrder: hexState.turnOrder,
      currentTurnIndex: hexState.currentTurnIndex
    };
  }

  // Handle player connection to battle
  async connectToBattle(socket: Socket, battleId: string, userId: string): Promise<void> {
    const battleState = this.activeBattles.get(battleId);
    if (!battleState) {
      throw new Error('Battle not found');
    }
    
    // Verify user belongs to battle
    const userSide = battleState.user.userId === userId ? 'user' :
                     battleState.opponent.userId === userId ? 'opponent' : null;

    if (!userSide) {
      throw new Error('Not authorized for this battle');
    }
    
    // Update connection status
    battleState[userSide].connected = true;
    socket.join(`battle:${battleId}`);
    (socket as any).battleId = battleId;
    (socket as any).userSide = userSide;
    (socket as any).userId = userId;

    // Send current state
    socket.emit('battle_state', this.getUserView(battleState, userSide));

    // Notify opponent
    const opponentSide = userSide === 'user' ? 'opponent' : 'user';
    this.io.to(`battle:${battleId}`).emit('opponent_connected', {
      side: opponentSide,
      connected: true
    });
    
    // Set up event handlers
    this.setupSocketHandlers(socket, battleState);
  }

  // Get user-specific view of battle state
  private getUserView(battleState: BattleState, userSide: string): any {
    const currentUser = battleState[userSide as keyof Pick<BattleState, 'user' | 'opponent'>];
    const opponentUser = userSide === 'user' ? battleState.opponent : battleState.user;

    // Convert cooldown maps to objects for serialization
    const serializePowerCooldowns = (cooldowns?: Map<string, number>) => {
      if (!cooldowns) return {};
      return Object.fromEntries(cooldowns);
    };

    const serializeSpellCooldowns = (cooldowns?: Map<string, number>) => {
      if (!cooldowns) return {};
      return Object.fromEntries(cooldowns);
    };

    const baseView = {
      battleId: battleState.id,
      phase: battleState.phase,
      round: battleState.round,
      yourCharacter: {
        id: currentUser.character.id,
        name: currentUser.character.name,
        archetype: currentUser.character.archetype,
        level: currentUser.character.level,
        health: currentUser.health,
        maxHealth: currentUser.maxHealth,
        attack: currentUser.character.attack,
        defense: currentUser.character.defense,
        speed: currentUser.character.speed,
        magic_attack: currentUser.character.magic_attack,
        magic_defense: currentUser.character.magic_defense,
        abilities: currentUser.character.abilities,
        equipment: currentUser.character.equipment,
        effects: currentUser.effects,
        strategy: currentUser.strategy,
        is_injured: currentUser.character.is_injured,
        total_battles: currentUser.character.total_battles,
        total_wins: currentUser.character.total_wins,
        personality_traits: currentUser.character.personality_traits,
        // Powers & Spells
        equippedPowers: currentUser.character.equippedPowers,
        equippedSpells: currentUser.character.equippedSpells,
        powerCooldowns: serializePowerCooldowns(currentUser.powerCooldowns),
        spellCooldowns: serializeSpellCooldowns(currentUser.spellCooldowns)
      },
      opponentCharacter: {
        id: opponentUser.character.id,
        name: opponentUser.character.name,
        archetype: opponentUser.character.archetype,
        level: opponentUser.character.level,
        health: opponentUser.health,
        maxHealth: opponentUser.maxHealth,
        attack: opponentUser.character.attack,
        defense: opponentUser.character.defense,
        speed: opponentUser.character.speed,
        magic_attack: opponentUser.character.magic_attack,
        magic_defense: opponentUser.character.magic_defense,
        effects: opponentUser.effects,
        strategy: opponentUser.strategy,
        // Show equipped powers/spells count but not details (fog of war)
        equippedPowersCount: opponentUser.character.equippedPowers.length,
        equippedSpellsCount: opponentUser.character.equippedSpells.length
      },
      combatLog: battleState.combatLog.slice(-10), // Last 10 events
      chatEnabled: battleState.chatEnabled,
      connected: {
        you: currentUser.connected,
        opponent: opponentUser.connected
      }
    };

    // Add hex grid state if in hex battle mode
    if (battleState.hexBattleMode && battleState.hexGridState) {
      return {
        ...baseView,
        hexBattleMode: true,
        hexGridState: this.serializeHexGridState(battleState.hexGridState)
      };
    }

    return baseView;
  }

  // Socket event handlers
  private setupSocketHandlers(socket: Socket, battleState: BattleState): void {
    // Strategy selection
    socket.on('select_strategy', async (strategy: string) => {
      if (battleState.phase !== BATTLE_PHASES.STRATEGY_SELECT) return;

      const userSide = (socket as any).userSide;
      if (battleState[userSide as keyof Pick<BattleState, 'user' | 'opponent'>].strategy) return; // Already selected

      // Validate strategy
      if (!['aggressive', 'defensive', 'balanced'].includes(strategy)) return;

      battleState[userSide as keyof Pick<BattleState, 'user' | 'opponent'>].strategy = strategy;

      // Check if both users ready
      if (battleState.user.strategy && battleState.opponent.strategy) {
        await this.startCombatRound(battleState);
      }
    });
    
    // Chat message (placeholder - would integrate with existing chat service)
    socket.on('send_chat', async (message: string) => {
      if (battleState.phase !== BATTLE_PHASES.CHAT_BREAK) return;
      if (!battleState.chatEnabled) return;

      const userSide = (socket as any).userSide;
      const character = battleState[userSide as keyof Pick<BattleState, 'user' | 'opponent'>].character;
      
      try {
        // Use real AI chat service for battle combat responses
        const { aiChatService } = require('./aiChatService');
        const { db } = require('../database/postgres');
        
        // Build character context for battle
        const chatContext = {
          characterId: character.character_id,
          characterName: character.name || 'Warrior',
          personality: {
            traits: ['Battle-focused', 'Strategic', 'Determined'],
            speechStyle: 'Direct and tactical during combat',
            motivations: ['Victory', 'Honor in battle', 'Team coordination'],
            fears: ['Defeat', 'Letting allies down']
          },
          historicalPeriod: (character as any).origin_era || 'Ancient times',
          currentBondLevel: (character as any).bond_level || 50,
          previousMessages: []
        };
        
        // Generate real AI response for battle context
        const aiResponse = await aiChatService.generateCharacterResponse(
          chatContext,
          message,
          (socket as any).userId,
          db,
          { 
            isInBattle: true, 
            isCombatChat: true, // This bypasses usage limits
            battlePhase: 'chat_break',
            currentHealth: character.current_health,
            maxHealth: character.max_health,
            opponentName: 'opponent'
          }
        );
        
        // Broadcast to battle room
        this.io.to(`battle:${battleState.id}`).emit('chat_message', {
          side: userSide,
          userMessage: message,
          characterResponse: aiResponse.message,
          bondIncreased: aiResponse.bondIncrease
        });
        
        analyticsService.trackCharacterInteraction(
          (socket as any).userId,
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
    socket.on('hex_submit_action', (plannedAction: PlannedHexAction) => {
      if (!battleState.hexBattleMode || !battleState.hexGridState) return;

      const userSide = (socket as any).userSide;
      const currentUser = battleState[userSide as keyof Pick<BattleState, 'user' | 'opponent'>];
      const characterId = currentUser.characterId;

      const actionState = battleState.hexGridState.actionStates.get(characterId);
      if (actionState) {
        actionState.plannedAction = plannedAction;

        // Notify both users
        this.io.to(`battle:${battleState.id}`).emit('hex_action_planned', {
          characterId,
          userSide,
          hasPlanned: true
        });
      }
    });

    // Hex Grid: Execute turn (coach confirms action)
    socket.on('hex_execute_turn', async () => {
      if (!battleState.hexBattleMode || !battleState.hexGridState) return;

      const userSide = (socket as any).userSide;
      const currentUser = battleState[userSide as keyof Pick<BattleState, 'user' | 'opponent'>];
      const characterId = currentUser.characterId;

      // This would integrate with useHexBattleEngine on frontend
      // Backend validates and broadcasts the executed action
      const actionState = battleState.hexGridState.actionStates.get(characterId);
      if (actionState && actionState.plannedAction) {
        battleState.combatLog.push({
          type: 'hex_action_executed',
          character: characterId,
          timestamp: Date.now(),
          hexPosition: actionState.position,
          hexMovePath: actionState.plannedAction.moveToHex ? [actionState.position, actionState.plannedAction.moveToHex] : undefined
        });

        // Broadcast to both players
        this.io.to(`battle:${battleState.id}`).emit('hex_turn_executed', {
          characterId,
          action: actionState.plannedAction,
          newState: this.serializeHexGridState(battleState.hexGridState)
        });
      }
    });

    // Power/Spell: Use Power
    socket.on('use_power', async (data: { powerId: string; targetCharacterId?: string; targetPosition?: any }) => {
      const userSide = (socket as any).userSide;
      const currentUser = battleState[userSide as keyof Pick<BattleState, 'user' | 'opponent'>];
      const opponentUser = userSide === 'user' ? battleState.opponent : battleState.user;

      // Find the power
      const power = currentUser.character.equippedPowers?.find(p => p.id === data.powerId);
      if (!power) {
        socket.emit('power_failed', { error: 'Power not found or not equipped' });
        return;
      }

      // Get cooldown
      const cooldown = currentUser.powerCooldowns?.get(data.powerId) || 0;

      // Get positions (if hex mode)
      const casterPosition = battleState.hexGridState?.actionStates.get(currentUser.characterId)?.position;
      const targetPosition = data.targetCharacterId
        ? battleState.hexGridState?.actionStates.get(data.targetCharacterId)?.position
        : data.targetPosition;

      // Build execution context
      const context: PowerExecutionContext = {
        power,
        caster: {
          id: currentUser.characterId,
          name: currentUser.character.name,
          position: casterPosition || { q: 0, r: 0, s: 0 },
          currentAP: battleState.hexGridState?.actionStates.get(currentUser.characterId)?.actionPoints || 3,
          maxAP: 3
        },
        target: data.targetCharacterId ? {
          id: data.targetCharacterId,
          name: data.targetCharacterId === currentUser.characterId ? currentUser.character.name : opponentUser.character.name,
          position: targetPosition || { q: 0, r: 0, s: 0 },
          health: data.targetCharacterId === currentUser.characterId ? currentUser.health : opponentUser.health,
          maxHealth: data.targetCharacterId === currentUser.characterId ? currentUser.maxHealth : opponentUser.maxHealth
        } : undefined,
        targetPosition: data.targetPosition
      };

      // Execute power
      const result = executePower(context, cooldown);

      if (!result.success) {
        socket.emit('power_failed', { error: result.errors?.join(', ') });
        return;
      }

      // Apply effects
      const { healthChanges, statusEffects } = applyActionEffects(result.effects, battleState);

      // Update health
      healthChanges.forEach((change, targetId) => {
        if (targetId === currentUser.characterId) {
          currentUser.health = Math.max(0, Math.min(currentUser.maxHealth, currentUser.health + change));
        } else {
          opponentUser.health = Math.max(0, Math.min(opponentUser.maxHealth, opponentUser.health + change));
        }
      });

      // Update AP
      if (battleState.hexGridState) {
        const actionState = battleState.hexGridState.actionStates.get(currentUser.characterId);
        if (actionState) {
          actionState.actionPoints -= result.apCost;
        }
      }

      // Set cooldown
      if (currentUser.powerCooldowns) {
        currentUser.powerCooldowns.set(data.powerId, result.cooldownTurns);
      }

      // Add to combat log
      battleState.combatLog.push({
        type: 'power_used',
        character: currentUser.character.name,
        ability: power.name,
        timestamp: Date.now(),
        damage: healthChanges.get(data.targetCharacterId || '') || 0
      });

      // Broadcast to both players
      this.io.to(`battle:${battleState.id}`).emit('power_used', {
        powerId: data.powerId,
        powerName: power.name,
        casterSide: userSide,
        narrative: result.narrative,
        effects: result.effects,
        healthChanges: Object.fromEntries(healthChanges),
        newState: this.getUserView(battleState, userSide)
      });
    });

    // Power/Spell: Cast Spell
    socket.on('cast_spell', async (data: { spellId: string; targetCharacterId?: string; targetPosition?: any }) => {
      const userSide = (socket as any).userSide;
      const currentUser = battleState[userSide as keyof Pick<BattleState, 'user' | 'opponent'>];
      const opponentUser = userSide === 'user' ? battleState.opponent : battleState.user;

      // Find the spell
      const spell = currentUser.character.equippedSpells?.find(s => s.id === data.spellId);
      if (!spell) {
        socket.emit('spell_failed', { error: 'Spell not found or not equipped' });
        return;
      }

      // Get cooldown
      const cooldown = currentUser.spellCooldowns?.get(data.spellId) || 0;

      // Get positions (if hex mode)
      const casterPosition = battleState.hexGridState?.actionStates.get(currentUser.characterId)?.position;
      const targetPosition = data.targetCharacterId
        ? battleState.hexGridState?.actionStates.get(data.targetCharacterId)?.position
        : data.targetPosition;

      // Build execution context
      const context: SpellExecutionContext = {
        spell,
        caster: {
          id: currentUser.characterId,
          name: currentUser.character.name,
          position: casterPosition || { q: 0, r: 0, s: 0 },
          currentAP: battleState.hexGridState?.actionStates.get(currentUser.characterId)?.actionPoints || 3,
          maxAP: 3,
          currentMana: (currentUser.character as any).current_mana || 100,
          maxMana: (currentUser.character as any).max_mana || 100
        },
        target: data.targetCharacterId ? {
          id: data.targetCharacterId,
          name: data.targetCharacterId === currentUser.characterId ? currentUser.character.name : opponentUser.character.name,
          position: targetPosition || { q: 0, r: 0, s: 0 },
          health: data.targetCharacterId === currentUser.characterId ? currentUser.health : opponentUser.health,
          maxHealth: data.targetCharacterId === currentUser.characterId ? currentUser.maxHealth : opponentUser.maxHealth
        } : undefined,
        targetPosition: data.targetPosition
      };

      // Execute spell
      const result = executeSpell(context, cooldown);

      if (!result.success) {
        socket.emit('spell_failed', { error: result.errors?.join(', ') });
        return;
      }

      // Apply effects
      const { healthChanges, statusEffects } = applyActionEffects(result.effects, battleState);

      // Update health
      healthChanges.forEach((change, targetId) => {
        if (targetId === currentUser.characterId) {
          currentUser.health = Math.max(0, Math.min(currentUser.maxHealth, currentUser.health + change));
        } else {
          opponentUser.health = Math.max(0, Math.min(opponentUser.maxHealth, opponentUser.health + change));
        }
      });

      // Update AP
      if (battleState.hexGridState) {
        const actionState = battleState.hexGridState.actionStates.get(currentUser.characterId);
        if (actionState) {
          actionState.actionPoints -= result.apCost;
        }
      }

      // Deduct mana
      if ((currentUser.character as any).current_mana !== undefined) {
        (currentUser.character as any).current_mana -= result.manaCost || 0;
      }

      // Set cooldown
      if (currentUser.spellCooldowns) {
        currentUser.spellCooldowns.set(data.spellId, result.cooldownTurns);
      }

      // Add to combat log
      battleState.combatLog.push({
        type: 'spell_cast',
        character: currentUser.character.name,
        ability: spell.name,
        timestamp: Date.now(),
        damage: healthChanges.get(data.targetCharacterId || '') || 0
      });

      // Broadcast to both players
      this.io.to(`battle:${battleState.id}`).emit('spell_cast', {
        spellId: data.spellId,
        spellName: spell.name,
        casterSide: userSide,
        narrative: result.narrative,
        effects: result.effects,
        healthChanges: Object.fromEntries(healthChanges),
        newState: this.getUserView(battleState, userSide)
      });
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      const userSide = (socket as any).userSide;
      if (userSide && battleState) {
        battleState[userSide as keyof Pick<BattleState, 'user' | 'opponent'>].connected = false;

        // Notify opponent
        this.io.to(`battle:${battleState.id}`).emit('opponent_disconnected', {
          side: userSide
        });

        // Start disconnect timer (30 seconds to reconnect)
        setTimeout(() => {
          if (!battleState[userSide as keyof Pick<BattleState, 'user' | 'opponent'>].connected) {
            this.handleForfeit(battleState, userSide);
          }
        }, 30000);
      }
    });
  }

  // Start combat round
  private async startCombatRound(battleState: BattleState): Promise<void> {
    battleState.phase = BATTLE_PHASES.ROUND_COMBAT;
    battleState.combatLog.push({
      type: 'round_start',
      round: battleState.round,
      timestamp: Date.now()
    });
    
    // Apply strategy modifiers
    const userMods = this.getStrategyModifiers(battleState.user.strategy!);
    const opponentMods = this.getStrategyModifiers(battleState.opponent.strategy!);

    // Notify users
    this.io.to(`battle:${battleState.id}`).emit('round_start', {
      round: battleState.round,
      strategies: {
        user: battleState.user.strategy,
        opponent: battleState.opponent.strategy
      }
    });

    // Generate Hostmaster v8.72 round announcement
    setTimeout(async () => {
      await this.generateHostmasterRoundAnnouncement(battleState);
    }, 1000);
    
    // Execute combat simulation
    const combatResult = await this.simulateCombat(battleState, userMods, opponentMods);

    // Update state
    battleState.user.health = combatResult.user.health;
    battleState.opponent.health = combatResult.opponent.health;
    battleState.user.effects = combatResult.user.effects;
    battleState.opponent.effects = combatResult.opponent.effects;
    battleState.user.cooldowns = combatResult.user.cooldowns;
    battleState.opponent.cooldowns = combatResult.opponent.cooldowns;
    battleState.combatLog.push(...combatResult.events);
    
    // Send combat events to players with Hostmaster commentary
    for (const event of combatResult.events) {
      await this.sleep(500); // Delay for dramatic effect
      this.io.to(`battle:${battleState.id}`).emit('combat_event', event);
      
      // Generate Hostmaster commentary for significant events
      if (event.type === 'attack' && (event.critical || (event.damage && event.damage > 30))) {
        setTimeout(async () => {
          await this.generateHostmasterActionCommentary(battleState, event);
        }, 1000);
      }
    }
    
    // Check for battle end
    if (this.checkBattleEnd(battleState)) {
      await this.endBattle(battleState);
    } else {
      // Start chat phase
      await this.startChatPhase(battleState);
    }
  }

  // Strategy modifiers
  private getStrategyModifiers(strategy: string): StrategyModifiers {
    switch (strategy) {
      case 'aggressive':
        return { atkMod: 1.2, defMod: 0.9, spdMod: 1.0 };
      case 'defensive':
        return { atkMod: 0.9, defMod: 1.2, spdMod: 0.95 };
      case 'balanced':
      default:
        return { atkMod: 1.0, defMod: 1.0, spdMod: 1.0 };
    }
  }

  // Simulate combat between characters
  private async simulateCombat(battleState: BattleState, userMods: StrategyModifiers, opponentMods: StrategyModifiers): Promise<CombatResult> {
    const events: CombatEvent[] = [];
    const user = { ...battleState.user };
    const opponent = { ...battleState.opponent };
    
    // Initialize effects arrays if not present
    user.effects = user.effects || [];
    opponent.effects = opponent.effects || [];

    // Process start of round effects
    const userStartEvents = this.processStatusEffects(user, true);
    const opponentStartEvents = this.processStatusEffects(opponent, true);
    events.push(...userStartEvents, ...opponentStartEvents);

    // Calculate effective stats with modifiers
    const userStats = this.calculateEffectiveStats(user.character, userMods);
    const opponentStats = this.calculateEffectiveStats(opponent.character, opponentMods);

    // Determine turn order
    const userSpeed = userStats.speed * (1 + Math.random() * 0.1);
    const opponentSpeed = opponentStats.speed * (1 + Math.random() * 0.1);
    const turnOrder = userSpeed >= opponentSpeed ? ['user', 'opponent'] : ['opponent', 'user'];
    
    events.push({
      type: 'turn_order',
      order: turnOrder,
      timestamp: Date.now()
    });
    
    // Execute turns (3 per round)
    for (let turn = 0; turn < 3; turn++) {
      for (const attacker of turnOrder) {
        const defender = attacker === 'user' ? 'opponent' : 'user';
        const attackerState = attacker === 'user' ? user : opponent;
        const defenderState = defender === 'user' ? user : opponent;

        // Check if battle is over
        if (attackerState.health <= 0 || defenderState.health <= 0) break;

        // Choose ability
        const ability = this.chooseAbility(attackerState.character, attackerState.cooldowns);

        // Calculate and apply damage
        if (ability.power > 0) {
          let damage = this.calculateDamage(
            attacker === 'user' ? userStats : opponentStats,
            defender === 'user' ? userStats : opponentStats,
            ability,
            attacker === 'user' ? userMods : opponentMods
          );
          
          // Apply damage with BOUNDS CHECK
          const currentHealth = Math.max(0, Math.min(99999, defenderState.health || 0));
          defenderState.health = Math.max(0, currentHealth - damage);
          
          // Create attack event
          events.push({
            type: 'attack',
            attacker,
            defender,
            ability: ability.name,
            damage,
            critical: false,
            remainingHealth: {
              [attacker]: attackerState.health,
              [defender]: defenderState.health
            },
            timestamp: Date.now()
          });
        }
        
        // Update cooldowns
        if (ability.cooldown > 0) {
          attackerState.cooldowns[ability.name] = ability.cooldown;
        }
      }
      
      // Process end of turn effects
      const userEndEvents = this.processStatusEffects(user, false);
      const opponentEndEvents = this.processStatusEffects(opponent, false);
      events.push(...userEndEvents, ...opponentEndEvents);

      // Reduce cooldowns
      this.reduceCooldowns(user.cooldowns);
      this.reduceCooldowns(opponent.cooldowns);
    }

    return {
      user: {
        health: user.health,
        effects: user.effects,
        cooldowns: user.cooldowns
      },
      opponent: {
        health: opponent.health,
        effects: opponent.effects,
        cooldowns: opponent.cooldowns
      },
      events
    };
  }

  // Helper methods (simplified versions)
  private processStatusEffects(battleUser: BattleUser, isStartOfTurn: boolean): CombatEvent[] {
    // Use battleMechanicsService for comprehensive status effect processing
    const battleCharacter: BattleMechanics.BattleCharacter = {
      health: battleUser.health,
      maxHealth: battleUser.maxHealth,
      attack: battleUser.character.attack,
      defense: battleUser.character.defense,
      speed: battleUser.character.speed,
      magic_attack: battleUser.character.magic_attack,
      magic_defense: battleUser.character.magic_defense,
      effects: battleUser.effects,
    };

    const mechanicsEvents = BattleMechanics.processStatusEffects(battleCharacter, isStartOfTurn);

    // Update battleUser with processed values
    battleUser.health = battleCharacter.health;
    battleUser.effects = battleCharacter.effects;

    // Convert mechanics events to combat events
    const events: CombatEvent[] = mechanicsEvents.map(event => ({
      type: event.type,
      target: battleUser.userId,
      effect: event.data.effect,
      amount: event.data.amount,
      timestamp: Date.now(),
    }));

    return events;
  }

  private calculateEffectiveStats(character: BattleCharacter, mods: StrategyModifiers): any {
    // Use headquarters-enhanced stats if available
    const baseAttack = (character as any).effective_attack || character.attack;
    const baseDefense = (character as any).effective_defense || character.defense;
    const baseSpeed = (character as any).effective_speed || character.speed;
    const criticalChance = (character as any).effective_critical_chance || 10;

    return {
      health: character.max_health,
      attack: baseAttack * mods.atkMod,
      defense: baseDefense * mods.defMod,
      speed: baseSpeed * mods.spdMod,
      special: character.magic_attack,
      criticalChance: criticalChance,
      // Log headquarters effects for debugging
      headquartersEffects: (character as any).headquarters_effects || null
    };
  }

  private chooseAbility(character: BattleCharacter, cooldowns: Record<string, number>): Ability {
    // Filter available abilities (not on cooldown)
    const availableAbilities = character.abilities.filter(ability => 
      !cooldowns[ability.name] || cooldowns[ability.name] <= 0
    );

    if (availableAbilities.length === 0) {
      return { name: 'Basic Attack', power: 1.0, cooldown: 0, type: 'attack' };
    }

    return availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
  }

  private calculateDamage(attacker: any, defender: any, ability: Ability, mods: StrategyModifiers): number {
    // BOUNDS CHECK: Ensure valid attacker stats
    const attackStat = Math.max(0, Math.min(9999, attacker.attack));
    const abilityPower = Math.max(0.1, Math.min(10, ability?.power || 1));
    const atkModifier = Math.max(0.1, Math.min(5, mods?.atkMod || 1));

    // BOUNDS CHECK: Ensure valid defender stats
    const defenseStat = Math.max(0, Math.min(9999, defender.defense));
    const defModifier = Math.max(0.1, Math.min(5, mods?.defMod || 1));

    // Calculate base damage with bounds
    const baseDamage = attackStat * abilityPower * atkModifier;
    const defense = defenseStat * defModifier;
    const variance = 0.85 + Math.random() * 0.3;

    // Calculate raw damage
    let damage = Math.max(5, (baseDamage - defense * 0.5) * variance);

    // Critical hit chance (integrates with battleMechanicsService)
    const critChance = 0.15;
    const isCritical = Math.random() < critChance || BattleMechanics.checkAndConsumeForceCritical(attacker);
    if (isCritical) {
      // BOUNDS CHECK: Ensure crit multiplier is reasonable
      const critMultiplier = Math.max(1.5, Math.min(3, BATTLE_CONFIG.CRIT_MULTIPLIER || 1.5));
      damage *= critMultiplier;
    }

    // Use battleMechanicsService for damage resistance calculation
    const damageType = ability.type || 'physical';
    const finalDamage = BattleMechanics.calculateDamageWithResistance(
      damage,
      damageType,
      defender as BattleMechanics.BattleCharacter
    );

    // BOUNDS CHECK: Cap final damage
    return Math.max(1, Math.min(9999, Math.round(finalDamage)));
  }

  private reduceCooldowns(cooldowns: Record<string, number>): void {
    for (const ability in cooldowns) {
      cooldowns[ability] = Math.max(0, cooldowns[ability] - 1);
    }
  }

  // Start chat phase
  private async startChatPhase(battleState: BattleState): Promise<void> {
    battleState.phase = BATTLE_PHASES.CHAT_BREAK;
    battleState.chatEnabled = true;
    
    // Notify players
    this.io.to(`battle:${battleState.id}`).emit('chat_phase_start', {
      duration: BATTLE_CONFIG.CHAT_DURATION
    });
    
    // Set timer for next round
    this.startPhaseTimer(
      battleState.id,
      BATTLE_PHASES.CHAT_BREAK,
      BATTLE_CONFIG.CHAT_DURATION,
      () => this.endChatPhase(battleState)
    );
  }

  // End chat phase and prepare next round
  private async endChatPhase(battleState: BattleState): Promise<void> {
    battleState.chatEnabled = false;
    battleState.round++;
    
    if (battleState.round > BATTLE_CONFIG.MAX_ROUNDS) {
      await this.endBattle(battleState);
    } else {
      // Reset strategies
      battleState.user.strategy = null;
      battleState.opponent.strategy = null;
      
      // Start new strategy phase
      battleState.phase = BATTLE_PHASES.STRATEGY_SELECT;
      
      this.io.to(`battle:${battleState.id}`).emit('strategy_phase_start', {
        round: battleState.round,
        duration: BATTLE_CONFIG.STRATEGY_DURATION
      });
      
      this.startPhaseTimer(
        battleState.id,
        BATTLE_PHASES.STRATEGY_SELECT,
        BATTLE_CONFIG.STRATEGY_DURATION
      );
    }
  }

  // End battle
  private async endBattle(battleState: BattleState): Promise<void> {
    battleState.phase = BATTLE_PHASES.BATTLE_END;
    
    // Determine winner
    let winnerId: string, winnerSide: string;
    if (battleState.user.health <= 0) {
      winnerId = battleState.opponent.userId;
      winnerSide = 'opponent';
    } else if (battleState.opponent.health <= 0) {
      winnerId = battleState.user.userId;
      winnerSide = 'user';
    } else {
      // Highest health percentage wins
      const userPercent = battleState.user.health / battleState.user.maxHealth;
      const opponentPercent = battleState.opponent.health / battleState.opponent.maxHealth;
      if (userPercent > opponentPercent) {
        winnerId = battleState.user.userId;
        winnerSide = 'user';
      } else {
        winnerId = battleState.opponent.userId;
        winnerSide = 'opponent';
      }
    }
    
    // Calculate rewards
    const rewards = this.calculateRewards(battleState, winnerSide);
    
    // Update database with hex grid state
    await dbAdapter.battles.update(battleState.id, {
      winner_user_id: winnerId,
      status: 'completed',
      ended_at: new Date(),
      xp_gained: rewards.xp,
      bond_gained: rewards.bond,
      currency_gained: rewards.currency,
      // Store hex grid state if enabled
      ...(battleState.hexBattleMode && {
        player_team_data: {
          ...((battleState as any).player_team_data || {}),
          hexGridState: this.serializeHexGridState(battleState.hexGridState)
        }
      })
    });
    
    // Update characters
    await this.updateCharacterStats(battleState, winnerSide, rewards);
    
    // Award coach XP for both users
    try {
      const winnerUserId = battleState[winnerSide as keyof Pick<BattleState, 'user' | 'opponent'>].userId;
      const loserUserId = winnerSide === 'user' ? battleState.opponent.userId : battleState.user.userId;
      
      // Award battle XP to both coaches (winner gets full XP, loser gets partial)
      await CoachProgressionService.awardBattleXP(winnerUserId, true, battleState.id);
      await CoachProgressionService.awardBattleXP(loserUserId, false, battleState.id);
    } catch (error) {
      console.error('Error awarding coach XP:', error);
    }
    
    // Award ticket rewards for battle victories (2 tickets per 5 wins)
    // FIXED: Get total_wins from database after update to ensure consistency
    try {
      const winnerUserId = battleState[winnerSide as keyof Pick<BattleState, 'user' | 'opponent'>].userId;
      const winnerCharacterId = battleState[winnerSide as keyof Pick<BattleState, 'user' | 'opponent'>].characterId;
      
      // Get updated character data from database to ensure total_wins is accurate
      const updatedCharacter = await dbAdapter.userCharacters.findById(winnerCharacterId);
      if (updatedCharacter) {
        // Award battle tickets using actual database value (not calculated)
        await ticketService.awardBattleTickets(
          winnerUserId,
          updatedCharacter.total_wins, // Use actual database value after update
          battleState.id,
          winnerCharacterId
        );
      } else {
        console.error('Error: Could not find updated character for ticket rewards');
      }
    } catch (error) {
      console.error('Error awarding ticket rewards:', error);
    }
    
    // Send battle victory mail notification to winner
    try {
      const mailService = new InternalMailService();
      const winnerCharacter = battleState[winnerSide as keyof Pick<BattleState, 'user' | 'opponent'>].character;
      const loserCharacter = winnerSide === 'user' ? battleState.opponent.character : battleState.user.character;

      await mailService.sendSystemMail(winnerId, {
        subject: `🏆 ${winnerCharacter.name} Won a Battle!`,
        content: `${winnerCharacter.name} defeated ${loserCharacter.name} in battle!\n\nRewards:\n• ${rewards.xp} XP\n• ${rewards.currency} coins\n• ${rewards.bond} bond points`,
        category: 'notification',
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error sending battle victory mail:', error);
    }

    // Generate Hostmaster v8.72 victory announcement
    setTimeout(async () => {
      await this.generateHostmasterVictoryAnnouncement(battleState, winnerId);
    }, 1000);

    // Notify users
    this.io.to(`battle:${battleState.id}`).emit('battle_end', {
      winner: winnerSide,
      rewards,
      finalStats: {
        user: {
          health: battleState.user.health,
          maxHealth: battleState.user.maxHealth
        },
        opponent: {
          health: battleState.opponent.health,
          maxHealth: battleState.opponent.maxHealth
        }
      }
    });

    // Track analytics
    const loserSide = winnerSide === 'user' ? 'opponent' : 'user';
    analyticsService.trackBattleCompletion({
      battleId: battleState.id,
      duration: Math.round((Date.now() - battleState.createdAt) / 1000),
      rounds: battleState.round,
      winner: winnerId,
      loser: battleState[loserSide as keyof Pick<BattleState, 'user' | 'opponent'>].userId,
      strategies: {
        user: battleState.user.strategy || 'balanced',
        opponent: battleState.opponent.strategy || 'balanced'
      },
      combatEvents: battleState.combatLog.length,
      chatMessages: 0, // Would count from chat logs
      disconnections: 0,
      forfeit: false
    });
    
    // Clean up
    setTimeout(() => {
      this.activeBattles.delete(battleState.id);
      // Clean up Hostmaster history
      hostmasterService.cleanupBattle(battleState.id);
    }, 60000); // Keep state for 1 minute for reconnections
  }

  // Calculate battle rewards
  private calculateRewards(battleState: BattleState, winnerSide: string): BattleRewards {
    const baseXP = 100;
    const baseCurrency = 50;
    const baseBond = 1;

    const winner = battleState[winnerSide as keyof Pick<BattleState, 'user' | 'opponent'>];
    const loser = winnerSide === 'user' ? battleState.opponent : battleState.user;
    
    // XP calculation
    let xp = baseXP;
    if (winner.character.level < loser.character.level) {
      xp *= 1.5; // Bonus for beating higher level
    }
    
    // Currency
    let currency = baseCurrency;
    if (battleState.round === BATTLE_CONFIG.MAX_ROUNDS) {
      currency *= 1.2; // Bonus for full battle
    }
    
    // Bond points
    let bond = baseBond;
    const chatCount = battleState.combatLog.filter(e => e.type === 'chat').length;
    if (chatCount > 5) {
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
  private async updateCharacterStats(battleState: BattleState, winnerSide: string, rewards: BattleRewards): Promise<void> {
    const winner = battleState[winnerSide as keyof Pick<BattleState, 'user' | 'opponent'>];
    const loser = winnerSide === 'user' ? battleState.opponent : battleState.user;
    
    // Update winner character stats
    await dbAdapter.userCharacters.update(winner.characterId, {
      total_battles: winner.character.total_battles + 1,
      total_wins: winner.character.total_wins + 1,
      experience: winner.character.experience + rewards.xp,
      current_health: winner.health,
      last_battle_at: new Date()
    });
    
    // Update loser character stats and handle death/injury
    if (loser.health === 0) {
      // Determine if character dies or just gets injured
      const deathChance = this.calculateDeathChance(loser.character.level, battleState.round);
      const shouldDie = Math.random() < deathChance;
      
      if (shouldDie) {
        // Character dies - handle death
        await ResurrectionService.handleCharacterDeath(loser.characterId, {
          battleId: battleState.id,
          round: battleState.round,
          opponent: winner.character.name
        });
        
        // Update basic stats (death handler updates death-related fields)
        await dbAdapter.userCharacters.update(loser.characterId, {
          total_battles: loser.character.total_battles + 1,
          experience: loser.character.experience + Math.round(rewards.xp * 0.3), // 30% XP for losing
          last_battle_at: new Date()
        });
      } else {
        // Character is severely injured but alive
        const injurySeverity = this.calculateInjurySeverity(loser.health, loser.maxHealth, battleState.round);
        const recoveryTime = this.calculateInjuryRecoveryTime(injurySeverity);
        
        await dbAdapter.userCharacters.update(loser.characterId, {
          total_battles: loser.character.total_battles + 1,
          experience: loser.character.experience + Math.round(rewards.xp * 0.3), // 30% XP for losing
          current_health: 1, // Barely alive
          is_injured: true,
          injury_severity: injurySeverity,
          recovery_time: new Date(Date.now() + recoveryTime * 60 * 60 * 1000), // Recovery in hours
          last_battle_at: new Date()
        });
      }
    } else {
      // Character survived with health - minor or no injury
      const injurySeverity = this.calculateInjurySeverity(loser.health, loser.maxHealth, battleState.round);
      const recoveryTime = injurySeverity !== 'healthy' ? this.calculateInjuryRecoveryTime(injurySeverity) : 0;
      
      await dbAdapter.userCharacters.update(loser.characterId, {
        total_battles: loser.character.total_battles + 1,
        experience: loser.character.experience + Math.round(rewards.xp * 0.3), // 30% XP for losing
        current_health: loser.health,
        is_injured: injurySeverity !== 'healthy',
        injury_severity: injurySeverity,
        recovery_time: recoveryTime > 0 ? new Date(Date.now() + recoveryTime * 60 * 60 * 1000) : null,
        last_battle_at: new Date()
      });
    }
    
    // Award character progression XP to both characters
    try {
      // Award XP to winner character (full amount with victory bonus)
      await CharacterProgressionService.awardExperience(
        winner.characterId,
        rewards.xp,
        'battle',
        `Victory in battle ${battleState.id}`,
        1.5 // 50% bonus for winning
      );
      
      // Award XP to loser character (reduced amount)
      await CharacterProgressionService.awardExperience(
        loser.characterId,
        Math.round(rewards.xp * 0.6), // 60% XP for losing (more than the old system's 30%)
        'battle',
        `Battle experience from ${battleState.id}`,
        1.0 // No bonus for losing
      );
      
      // Award skill progression based on battle performance
      // Both characters gain combat skill experience
      await CharacterProgressionService.progressSkill(winner.characterId, 'combat_mastery', 50);
      await CharacterProgressionService.progressSkill(loser.characterId, 'combat_mastery', 25);
      
      // Winner gets additional skill progression for victory
      await CharacterProgressionService.progressSkill(winner.characterId, 'battle_tactics', 30);
      
    } catch (error) {
      console.error('Error awarding character progression XP:', error);
    }
    
    // Update user currencies
    await dbAdapter.currency.update(winner.userId, { battle_tokens: rewards.currency });
  }

  // Check if battle should end
  private checkBattleEnd(battleState: BattleState): boolean {
    // Check if either user's health is 0
    if (battleState.user.health <= 0 || battleState.opponent.health <= 0) {
      return true;
    }
    
    // Check if we've completed all rounds
    if (battleState.round > BATTLE_CONFIG.MAX_ROUNDS) {
      return true;
    }
    
    return false;
  }

  // Start phase timer
  private startPhaseTimer(battleId: string, phase: string, duration: number, callback?: () => void): void {
    const battleState = this.activeBattles.get(battleId);
    if (!battleState) return;
    
    // Clear existing timer
    if (battleState.timer) {
      clearTimeout(battleState.timer);
    }
    
    // Set new timer
    battleState.timer = setTimeout(() => {
      if (callback) {
        callback();
      } else {
        // Default behavior based on phase
        this.handlePhaseTimeout(battleId, phase);
      }
    }, duration * 1000);
  }

  // Handle phase timeout
  private handlePhaseTimeout(battleId: string, phase: string): void {
    const battleState = this.activeBattles.get(battleId);
    if (!battleState) return;
    
    switch (phase) {
      case BATTLE_PHASES.STRATEGY_SELECT:
        // Auto-select balanced strategy for users who didn't choose
        if (!battleState.user.strategy) {
          battleState.user.strategy = 'balanced';
        }
        if (!battleState.opponent.strategy) {
          battleState.opponent.strategy = 'balanced';
        }
        this.startCombatRound(battleState);
        break;
        
      case BATTLE_PHASES.CHAT_BREAK:
        this.endChatPhase(battleState);
        break;
    }
  }

  // Handle user forfeit
  private async handleForfeit(battleState: BattleState, forfeitingSide: string): Promise<void> {
    const winnerSide = forfeitingSide === 'user' ? 'opponent' : 'user';
    const winnerId = battleState[winnerSide as keyof Pick<BattleState, 'user' | 'opponent'>].userId;
    
    // Update battle in database
    await dbAdapter.battles.update(battleState.id, {
      winner_user_id: winnerId,
      battle_result: 'forfeit',
      status: 'completed',
      ended_at: new Date()
    });
    
    // Notify remaining player
    this.io.to(`battle:${battleState.id}`).emit('opponent_forfeited', {
      winner: winnerSide
    });
    
    // Publish global battle ended event for multi-server coordination
    try {
      await cache.publishBattleEvent('global', {
        type: 'battle_ended',
        battleId: battleState.id,
        endReason: 'forfeit',
        winner: winnerId,
        serverId: process.env.SERVER_ID || 'default'
      });
    } catch (error) {
      console.error('Failed to publish battle_ended event:', error);
    }
    
    // Clean up
    this.activeBattles.delete(battleState.id);
  }

  // Notify player through various channels
  private notifyUser(userId: string, event: string, data: any): void {
    // Send through WebSocket if connected
    const userSocket = this.getUserSocket(userId);
    if (userSocket) {
      userSocket.emit(event, data);
    }
  }

  // Get user's socket connection
  private getUserSocket(userId: string): Socket | null {
    const socketId = this.userSocketMap.get(userId);
    return this.io.sockets.sockets.get(socketId || '') || null;
  }

  // Estimate wait time based on rating
  private estimateWaitTime(rating: number): number {
    const queueSize = this.battleQueue.size;
    const similarRatingCount = Array.from(this.battleQueue.values())
      .filter(player => Math.abs(player.rating - rating) < 200)
      .length;
    
    if (similarRatingCount > 0) {
      return Math.round(10 + Math.random() * 20); // 10-30 seconds
    } else {
      return Math.round(30 + queueSize * 5); // Longer wait if no similar ratings
    }
  }

  // Helper function for delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate death chance based on character level and battle intensity
   */
  private calculateDeathChance(characterLevel: number, battleRounds: number): number {
    // Base death chance starts at 15% for level 1, decreases as level increases
    const baseMortality = 0.15 - (characterLevel * 0.002); // -0.2% per level
    
    // Battle intensity factor - longer battles are more deadly
    const intensityFactor = Math.min(2, 1 + (battleRounds - 10) * 0.1); // +10% per round after 10
    
    // Final death chance (minimum 1%, maximum 25%)
    return Math.max(0.01, Math.min(0.25, baseMortality * intensityFactor));
  }

  /**
   * Calculate injury severity based on remaining health and battle context
   */
  private calculateInjurySeverity(currentHealth: number, maxHealth: number, battleRounds: number): string {
    const healthPercent = currentHealth / maxHealth;
    
    if (currentHealth === 0) {
      return 'critical'; // On death's door but alive
    } else if (healthPercent <= 0.1) {
      return 'severe';   // 0-10% health
    } else if (healthPercent <= 0.3) {
      return 'moderate'; // 11-30% health
    } else if (healthPercent <= 0.6) {
      return 'light';    // 31-60% health
    } else {
      return 'healthy';  // 61%+ health
    }
  }

  /**
   * Calculate recovery time for different injury severities
   */
  private calculateInjuryRecoveryTime(severity: string): number {
    const recoveryHours = {
      'healthy': 0,
      'light': 1,      // 1 hour
      'moderate': 4,   // 4 hours 
      'severe': 12,    // 12 hours
      'critical': 24   // 24 hours
    };
    
    return recoveryHours[severity as keyof typeof recoveryHours] || 0;
  }

  // Public methods for external access
  getActiveBattles(): Map<string, BattleState> {
    return this.activeBattles;
  }

  getBattleQueue(): Map<string, QueueEntry> {
    return this.battleQueue;
  }

  setUserSocket(userId: string, socketId: string): void {
    this.userSocketMap.set(userId, socketId);
  }

  removeUserSocket(userId: string): void {
    this.userSocketMap.delete(userId);
  }

  // Hostmaster v8.72 Integration Methods

  private async generateHostmasterIntroduction(battleState: BattleState): Promise<void> {
    try {
      const context = this.buildHostmasterContext(battleState);
      const announcement = await hostmasterService.generateBattleIntroduction(context);
      await hostmasterService.broadcastAnnouncement(battleState.id, announcement);
    } catch (error) {
      console.error('Failed to generate Hostmaster introduction:', error);
    }
  }

  private async generateHostmasterRoundAnnouncement(battleState: BattleState): Promise<void> {
    try {
      const context = this.buildHostmasterContext(battleState);
      const announcement = await hostmasterService.generateRoundAnnouncement(context);
      await hostmasterService.broadcastAnnouncement(battleState.id, announcement);
    } catch (error) {
      console.error('Failed to generate Hostmaster round announcement:', error);
    }
  }

  private async generateHostmasterActionCommentary(battleState: BattleState, event: any): Promise<void> {
    try {
      const context = this.buildHostmasterContext(battleState);
      const announcement = await hostmasterService.generateActionCommentary(context, event);
      await hostmasterService.broadcastAnnouncement(battleState.id, announcement);
    } catch (error) {
      console.error('Failed to generate Hostmaster action commentary:', error);
    }
  }

  private async generateHostmasterVictoryAnnouncement(battleState: BattleState, winnerId: string): Promise<void> {
    try {
      const context = this.buildHostmasterContext(battleState);
      const winnerName = battleState.user.userId === winnerId ?
        battleState.user.character.name : battleState.opponent.character.name;
      const announcement = await hostmasterService.generateVictoryAnnouncement(context, winnerName);
      await hostmasterService.broadcastAnnouncement(battleState.id, announcement);
    } catch (error) {
      console.error('Failed to generate Hostmaster victory announcement:', error);
    }
  }

  private buildHostmasterContext(battleState: BattleState): HostmasterContext {
    return {
      userName: battleState.user.character.name,
      opponentName: battleState.opponent.character.name,
      battleId: battleState.id,
      round: battleState.round,
      phase: battleState.phase,
      currentHealth: {
        user: battleState.user.health,
        opponent: battleState.opponent.health
      },
      maxHealth: {
        user: battleState.user.maxHealth,
        opponent: battleState.opponent.maxHealth
      },
      strategies: {
        user: battleState.user.strategy || 'balanced',
        opponent: battleState.opponent.strategy || 'balanced'
      },
      combatEvents: battleState.combatLog,
      battleHistory: [] // Could be expanded to include past rounds
    };
  }
}

export default BattleManager;