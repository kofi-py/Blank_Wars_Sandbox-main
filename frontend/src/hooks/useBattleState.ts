import { useReducer, useCallback } from 'react';
import { Team, BattleState } from '@/data/teamBattleSystem';
import { BattlePhase } from '@/data/battleFlow';
import { type MatchmakingResult } from '@/data/weightClassSystem';
import { type PsychologyState, type DeviationEvent } from '@/data/characterPsychology';
import { type JudgeDecision, judgePersonalities } from '@/data/aiJudgeSystem';
import { type RogueAction } from '@/data/aiJudge';
import { type CoachingSession } from '@/data/coachingSystem';
import { createBattleStats, BattleStats } from '@/data/combatRewards';
import { HexBattleGrid, HexGridSystem } from '@/systems/hexGridSystem';

// Local type definitions (copied from archived combatSkillProgression)
interface SkillGain {
  skill: string;
  experience: number;
  reason: string;
  multiplier: number;
  base_gain: number;
}

interface CombatSkillReward {
  character_id: string;
  battle_id: string;
  skill_gains: SkillGain[];
  total_experience: number;
  skill_level_ups: { skill: string; new_level: number }[];
  new_interactions_unlocked: string[];
  performance_rating: 'poor' | 'average' | 'good' | 'excellent' | 'legendary';
}
import { CharacterActionState, HexMovementEngine } from '@/systems/hexMovementEngine';
import { BattleValidation } from '@/utils/battleValidation';
import { type CoachSkillsWithOverall } from '@/services/coachProgressionAPI';
import type { TeamCharacter } from '@/data/teamBattleSystem';

// Consolidated battle state interface
export interface BattleStateData {
  // Team State
  player_team: Team;
  opponent_team: Team;
  battle_state: BattleState | null;
  
  // Match/Round State
  current_round: number;
  current_match: number;
  player_morale: number;
  opponent_morale: number;
  player_match_wins: number;
  opponent_match_wins: number;
  player_round_wins: number;
  opponent_round_wins: number;
  
  // Battle Flow State
  phase: BattlePhase;
  current_announcement: string;
  selected_opponent: MatchmakingResult | null;
  show_matchmaking: boolean;
  
  // Psychology System State
  character_psychology: Map<string, PsychologyState>;
  active_deviations: DeviationEvent[];
  judge_decisions: JudgeDecision[];
  current_judge: any;
  
  // Battle Control State
  battle_cries: { player1: string; player2: string };
  timer: number | null;
  is_timer_active: boolean;
  show_audio_settings: boolean;
  
  // Coaching System State
  active_coaching_session: CoachingSession | null;
  show_coaching_modal: boolean;
  selected_characterForCoaching: TeamCharacter | null;
  coaching_messages: string[];
  character_response: string;
  show_disagreement: boolean;
  coach_skills: CoachSkillsWithOverall;

  // Judge/Rogue Actions State
  current_rogue_action: RogueAction | null;
  judge_ruling: any;
  
  // Battle Mode State
  is_fast_battle_mode: boolean;
  fast_battle_consent: { player1: boolean; player2: boolean };
  
  // Strategy State (matching original structure exactly)
  selected_strategies: {
    attack: string | null;
    defense: string | null;
    special: string | null;
  };
  pending_strategy: {
    type: 'attack' | 'defense' | 'special';
    strategy: string;
  } | null;
  character_strategies: Map<string, {
    character_id: string;
    attack: string | null;
    defense: string | null;
    special: string | null;
    is_complete: boolean;
  }>;
  
  // Chat State
  chat_messages: string[];
  custom_message: string;
  is_character_typing: boolean;
  selected_chat_character: TeamCharacter;
  
  // Rewards/Progression State
  show_rewards: boolean;
  battle_rewards: any;
  show_skill_progression: boolean;
  combat_skill_reward: CombatSkillReward | null;
  
  // Card System State
  player_cards: TeamCharacter[];
  show_card_collection: boolean;
  show_card_packs: boolean;
  player_currency: number;
  selected_team_cards: string[];
  
  // Character Battle State
  user_character: TeamCharacter;
  opponent_character: TeamCharacter;
  user_character_battle_stats: BattleStats;
  opponent_characterBattleStats: BattleStats;

  // Hex Grid Battle State (3D Positioning Mode)
  hex_battle_mode: boolean;
  hex_battle_grid: HexBattleGrid | null;
  character_action_states: Map<string, CharacterActionState>;
  active_character_id: string | null;

  // Additional properties (camelCase variants and battle_id)
  battle_id?: string;
  userCharacterBattleStats?: BattleStats;
  selectedOpponent?: MatchmakingResult | null;
  userCharacter?: TeamCharacter;
}

// Action types for the reducer
export type BattleStateAction =
  | { type: 'SET_PLAYER_TEAM'; payload: Team }
  | { type: 'SET_OPPONENT_TEAM'; payload: Team }
  | { type: 'SET_BATTLE_STATE'; payload: BattleState | null }
  | { type: 'SET_CURRENT_ROUND'; payload: number }
  | { type: 'SET_CURRENT_MATCH'; payload: number }
  | { type: 'SET_PLAYER_MORALE'; payload: number }
  | { type: 'SET_OPPONENT_MORALE'; payload: number }
  | { type: 'SET_PLAYER_MATCH_WINS'; payload: number }
  | { type: 'SET_OPPONENT_MATCH_WINS'; payload: number }
  | { type: 'SET_PLAYER_ROUND_WINS'; payload: number }
  | { type: 'SET_OPPONENT_ROUND_WINS'; payload: number }
  | { type: 'SET_PHASE'; payload: BattlePhase }
  | { type: 'SET_CURRENT_ANNOUNCEMENT'; payload: string }
  | { type: 'SET_SELECTED_OPPONENT'; payload: MatchmakingResult | null }
  | { type: 'SET_SHOW_MATCHMAKING'; payload: boolean }
  | { type: 'SET_CHARACTER_PSYCHOLOGY'; payload: Map<string, PsychologyState> }
  | { type: 'SET_ACTIVE_DEVIATIONS'; payload: DeviationEvent[] }
  | { type: 'SET_JUDGE_DECISIONS'; payload: JudgeDecision[] }
  | { type: 'SET_CURRENT_JUDGE'; payload: any }
  | { type: 'SET_BATTLE_CRIES'; payload: { player1: string; player2: string } }
  | { type: 'SET_TIMER'; payload: number | null }
  | { type: 'SET_IS_TIMER_ACTIVE'; payload: boolean }
  | { type: 'SET_SHOW_AUDIO_SETTINGS'; payload: boolean }
  | { type: 'SET_ACTIVE_COACHING_SESSION'; payload: CoachingSession | null }
  | { type: 'SET_SHOW_COACHING_MODAL'; payload: boolean }
  | { type: 'SET_SELECTED_CHARACTER_FOR_COACHING'; payload: TeamCharacter | null }
  | { type: 'SET_COACHING_MESSAGES'; payload: string[] }
  | { type: 'SET_CHARACTER_RESPONSE'; payload: string }
  | { type: 'SET_SHOW_DISAGREEMENT'; payload: boolean }
  | { type: 'SET_CURRENT_ROGUE_ACTION'; payload: RogueAction | null }
  | { type: 'SET_JUDGE_RULING'; payload: any }
  | { type: 'SET_IS_FAST_BATTLE_MODE'; payload: boolean }
  | { type: 'SET_FAST_BATTLE_CONSENT'; payload: { player1: boolean; player2: boolean } }
  | { type: 'SET_SELECTED_STRATEGIES'; payload: { attack: string | null; defense: string | null; special: string | null } }
  | { type: 'SET_PENDING_STRATEGY'; payload: { type: 'attack' | 'defense' | 'special'; strategy: string } | null }
  | { type: 'SET_CHARACTER_STRATEGIES'; payload: Map<string, { character_id: string; attack: string | null; defense: string | null; special: string | null; is_complete: boolean }> }
  | { type: 'SET_CHAT_MESSAGES'; payload: string[] }
  | { type: 'ADD_CHAT_MESSAGE'; payload: string }
  | { type: 'SET_CUSTOM_MESSAGE'; payload: string }
  | { type: 'SET_IS_CHARACTER_TYPING'; payload: boolean }
  | { type: 'SET_SELECTED_CHAT_CHARACTER'; payload: TeamCharacter }
  | { type: 'SET_SHOW_REWARDS'; payload: boolean }
  | { type: 'SET_BATTLE_REWARDS'; payload: any }
  | { type: 'SET_SHOW_SKILL_PROGRESSION'; payload: boolean }
  | { type: 'SET_COMBAT_SKILL_REWARD'; payload: CombatSkillReward | null }
  | { type: 'SET_PLAYER_CARDS'; payload: TeamCharacter[] }
  | { type: 'SET_SHOW_CARD_COLLECTION'; payload: boolean }
  | { type: 'SET_SHOW_CARD_PACKS'; payload: boolean }
  | { type: 'SET_PLAYER_CURRENCY'; payload: number }
  | { type: 'SET_SELECTED_TEAM_CARDS'; payload: string[] }
  | { type: 'SET_USER_CHARACTER'; payload: TeamCharacter }
  | { type: 'SET_OPPONENT_CHARACTER'; payload: TeamCharacter }
  | { type: 'SET_USER_CHARACTER_BATTLE_STATS'; payload: BattleStats }
  | { type: 'SET_OPPONENT_CHARACTER_BATTLE_STATS'; payload: BattleStats }
  | { type: 'SET_HEX_BATTLE_MODE'; payload: boolean }
  | { type: 'SET_HEX_BATTLE_GRID'; payload: HexBattleGrid | null }
  | { type: 'SET_CHARACTER_ACTION_STATES'; payload: Map<string, CharacterActionState> }
  | { type: 'SET_ACTIVE_CHARACTER_ID'; payload: string | null }
  | { type: 'RESET_BATTLE_STATE' };

// Initial state factory
const createInitialState = (coach_skills: CoachSkillsWithOverall): BattleStateData => {
  // Initialize with EMPTY team - will be populated from user's real characters
  const emptyTeam: Team = {
    id: 'empty_team',
    name: 'Loading...',
    coach_name: 'Coach',
    characters: [],
    coaching_points: 3,
    consecutive_losses: 0,
    team_chemistry: 0,
    team_culture: 'balanced',
    average_level: 1,
    total_power: 0,
    psychology_score: 0,
    wins: 0,
    losses: 0,
    battles_played: 0,
    last_battle_date: new Date()
  };

  return {
    // Team State
    player_team: emptyTeam,
    opponent_team: emptyTeam,
    battle_state: null,
    
    // Match/Round State
    current_round: 1,
    current_match: 1,
    player_morale: 75,
    opponent_morale: 75,
    player_match_wins: 0,
    opponent_match_wins: 0,
    player_round_wins: 0,
    opponent_round_wins: 0,
    
    // Battle Flow State
    phase: 'matchmaking' as BattlePhase,
    current_announcement: 'Welcome to the Arena! Choose your opponent to begin battle!',
    selected_opponent: null,
    show_matchmaking: true,
    
    // Psychology System State
    character_psychology: new Map(),
    active_deviations: [],
    judge_decisions: [],
    current_judge: judgePersonalities[0],
    
    // Battle Control State
    battle_cries: { player1: '', player2: '' },
    timer: null,
    is_timer_active: false,
    show_audio_settings: false,
    
    // Coaching System State
    active_coaching_session: null,
    show_coaching_modal: false,
    selected_characterForCoaching: null,
    coaching_messages: [],
    character_response: '',
    show_disagreement: false,
    coach_skills,

    // Judge/Rogue Actions State
    current_rogue_action: null,
    judge_ruling: null,
    
    // Battle Mode State
    is_fast_battle_mode: false,
    fast_battle_consent: { player1: false, player2: false },
    
    // Strategy State
    selected_strategies: {
      attack: null,
      defense: null,
      special: null
    },
    pending_strategy: null,
    character_strategies: new Map(),
    
    // Chat State
    chat_messages: [],
    custom_message: '',
    is_character_typing: false,
    selected_chat_character: emptyTeam.characters[0] || getTeamCharacter({
      id: 'default',
      name: 'Default Character',
      health: 100,
      max_health: 100,
      attack: 50,
      defense: 50,
      speed: 50,
      intelligence: 50,
      battle_personality: 'balanced'
    }),

    // Rewards/Progression State
    show_rewards: false,
    battle_rewards: null,
    show_skill_progression: false,
    combat_skill_reward: null,
    
    // Card System State
    player_cards: [],
    show_card_collection: false,
    show_card_packs: false,
    player_currency: 1000,
    selected_team_cards: [],
    
    // Character Battle State
    user_character: emptyTeam.characters[0] || getTeamCharacter({
      id: 'default1',
      name: 'Player 1',
      health: 100,
      max_health: 100,
      attack: 50,
      defense: 50,
      speed: 50,
      intelligence: 50,
      battle_personality: 'balanced'
    }),
    opponent_character: emptyTeam.characters[1] || emptyTeam.characters[0] || getTeamCharacter({
      id: 'default2',
      name: 'Player 2',
      health: 100,
      max_health: 100,
      attack: 50,
      defense: 50,
      speed: 50,
      intelligence: 50,
      battle_personality: 'balanced'
    }),
    user_character_battle_stats: createBattleStats(),
    opponent_characterBattleStats: createBattleStats(),

    // Hex Grid Battle State
    hex_battle_mode: false,
    hex_battle_grid: null,
    character_action_states: new Map(),
    active_character_id: null,
  };
};

// Reducer function
const battle_stateReducer = (state: BattleStateData, action: BattleStateAction): BattleStateData => {
  switch (action.type) {
    case 'SET_PLAYER_TEAM':
      return { ...state, player_team: action.payload };
    case 'SET_OPPONENT_TEAM':
      return { ...state, opponent_team: action.payload };
    case 'SET_BATTLE_STATE':
      return { ...state, battle_state: action.payload };
    case 'SET_CURRENT_ROUND':
      return { ...state, current_round: BattleValidation.validateRound(action.payload) };
    case 'SET_CURRENT_MATCH':
      return { ...state, current_match: BattleValidation.validateRound(action.payload) };
    case 'SET_PLAYER_MORALE':
      return { ...state, player_morale: BattleValidation.validateMorale(action.payload) };
    case 'SET_OPPONENT_MORALE':
      return { ...state, opponent_morale: BattleValidation.validateMorale(action.payload) };
    case 'SET_PLAYER_MATCH_WINS':
      return { ...state, player_match_wins: action.payload };
    case 'SET_OPPONENT_MATCH_WINS':
      return { ...state, opponent_match_wins: action.payload };
    case 'SET_PLAYER_ROUND_WINS':
      return { ...state, player_round_wins: action.payload };
    case 'SET_OPPONENT_ROUND_WINS':
      return { ...state, opponent_round_wins: action.payload };
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'SET_CURRENT_ANNOUNCEMENT':
      return { ...state, current_announcement: action.payload };
    case 'SET_SELECTED_OPPONENT':
      return { ...state, selected_opponent: action.payload };
    case 'SET_SHOW_MATCHMAKING':
      return { ...state, show_matchmaking: action.payload };
    case 'SET_CHARACTER_PSYCHOLOGY':
      return { ...state, character_psychology: action.payload };
    case 'SET_ACTIVE_DEVIATIONS':
      return { ...state, active_deviations: action.payload };
    case 'SET_JUDGE_DECISIONS':
      return { ...state, judge_decisions: action.payload };
    case 'SET_CURRENT_JUDGE':
      return { ...state, current_judge: action.payload };
    case 'SET_BATTLE_CRIES':
      return { ...state, battle_cries: action.payload };
    case 'SET_TIMER':
      return { ...state, timer: action.payload };
    case 'SET_IS_TIMER_ACTIVE':
      return { ...state, is_timer_active: action.payload };
    case 'SET_SHOW_AUDIO_SETTINGS':
      return { ...state, show_audio_settings: action.payload };
    case 'SET_ACTIVE_COACHING_SESSION':
      return { ...state, active_coaching_session: action.payload };
    case 'SET_SHOW_COACHING_MODAL':
      return { ...state, show_coaching_modal: action.payload };
    case 'SET_SELECTED_CHARACTER_FOR_COACHING':
      return { ...state, selected_characterForCoaching: action.payload };
    case 'SET_COACHING_MESSAGES':
      return { ...state, coaching_messages: action.payload };
    case 'SET_CHARACTER_RESPONSE':
      return { ...state, character_response: action.payload };
    case 'SET_SHOW_DISAGREEMENT':
      return { ...state, show_disagreement: action.payload };
    case 'SET_CURRENT_ROGUE_ACTION':
      return { ...state, current_rogue_action: action.payload };
    case 'SET_JUDGE_RULING':
      return { ...state, judge_ruling: action.payload };
    case 'SET_IS_FAST_BATTLE_MODE':
      return { ...state, is_fast_battle_mode: action.payload };
    case 'SET_FAST_BATTLE_CONSENT':
      return { ...state, fast_battle_consent: action.payload };
    case 'SET_SELECTED_STRATEGIES':
      return { ...state, selected_strategies: action.payload };
    case 'SET_PENDING_STRATEGY':
      return { ...state, pending_strategy: action.payload };
    case 'SET_CHARACTER_STRATEGIES':
      return { ...state, character_strategies: action.payload };
    case 'SET_CHAT_MESSAGES':
      return { ...state, chat_messages: action.payload };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chat_messages: [...state.chat_messages, action.payload] };
    case 'SET_CUSTOM_MESSAGE':
      return { ...state, custom_message: action.payload };
    case 'SET_IS_CHARACTER_TYPING':
      return { ...state, is_character_typing: action.payload };
    case 'SET_SELECTED_CHAT_CHARACTER':
      return { ...state, selected_chat_character: action.payload };
    case 'SET_SHOW_REWARDS':
      return { ...state, show_rewards: action.payload };
    case 'SET_BATTLE_REWARDS':
      return { ...state, battle_rewards: action.payload };
    case 'SET_SHOW_SKILL_PROGRESSION':
      return { ...state, show_skill_progression: action.payload };
    case 'SET_COMBAT_SKILL_REWARD':
      return { ...state, combat_skill_reward: action.payload };
    case 'SET_PLAYER_CARDS':
      return { ...state, player_cards: action.payload };
    case 'SET_SHOW_CARD_COLLECTION':
      return { ...state, show_card_collection: action.payload };
    case 'SET_SHOW_CARD_PACKS':
      return { ...state, show_card_packs: action.payload };
    case 'SET_PLAYER_CURRENCY':
      return { ...state, player_currency: action.payload };
    case 'SET_SELECTED_TEAM_CARDS':
      return { ...state, selected_team_cards: action.payload };
    case 'SET_USER_CHARACTER':
      return { ...state, user_character: action.payload };
    case 'SET_OPPONENT_CHARACTER':
      return { ...state, opponent_character: action.payload };
    case 'SET_USER_CHARACTER_BATTLE_STATS':
      return { ...state, user_character_battle_stats: action.payload };
    case 'SET_OPPONENT_CHARACTER_BATTLE_STATS':
      return { ...state, opponent_characterBattleStats: action.payload };
    case 'SET_HEX_BATTLE_MODE':
      return { ...state, hex_battle_mode: action.payload };
    case 'SET_HEX_BATTLE_GRID':
      return { ...state, hex_battle_grid: action.payload };
    case 'SET_CHARACTER_ACTION_STATES':
      return { ...state, character_action_states: action.payload };
    case 'SET_ACTIVE_CHARACTER_ID':
      return { ...state, active_character_id: action.payload };
    case 'RESET_BATTLE_STATE':
      return createInitialState(state.coach_skills);
    default:
      return state;
  }
};

// Helper function
function getTeamCharacter(character: any): TeamCharacter {
  // Assume character is already TeamCharacter, just type it
  return character as TeamCharacter;
}

// Custom hook
export const useBattleState = (coach_skills: CoachSkillsWithOverall) => {
  const [state, dispatch] = useReducer(battle_stateReducer, undefined, () => createInitialState(coach_skills));
  
  // Memoized action creators for better performance
  const actions = {
    set_player_team: useCallback((team: Team) => dispatch({ type: 'SET_PLAYER_TEAM', payload: team }), []),
    set_opponent_team: useCallback((team: Team) => dispatch({ type: 'SET_OPPONENT_TEAM', payload: team }), []),
    set_battle_state: useCallback((battle_state: BattleState | null) => dispatch({ type: 'SET_BATTLE_STATE', payload: battle_state }), []),
    set_current_round: useCallback((round: number) => dispatch({ type: 'SET_CURRENT_ROUND', payload: round }), []),
    set_current_match: useCallback((match: number) => dispatch({ type: 'SET_CURRENT_MATCH', payload: match }), []),
    set_player_morale: useCallback((morale: number) => dispatch({ type: 'SET_PLAYER_MORALE', payload: morale }), []),
    set_opponent_morale: useCallback((morale: number) => dispatch({ type: 'SET_OPPONENT_MORALE', payload: morale }), []),
    set_player_match_wins: useCallback((wins: number) => dispatch({ type: 'SET_PLAYER_MATCH_WINS', payload: wins }), []),
    set_opponent_match_wins: useCallback((wins: number) => dispatch({ type: 'SET_OPPONENT_MATCH_WINS', payload: wins }), []),
    set_player_round_wins: useCallback((wins: number) => dispatch({ type: 'SET_PLAYER_ROUND_WINS', payload: wins }), []),
    set_opponent_round_wins: useCallback((wins: number) => dispatch({ type: 'SET_OPPONENT_ROUND_WINS', payload: wins }), []),
    set_phase: useCallback((phase: BattlePhase) => dispatch({ type: 'SET_PHASE', payload: phase }), []),
    set_current_announcement: useCallback((announcement: string) => dispatch({ type: 'SET_CURRENT_ANNOUNCEMENT', payload: announcement }), []),
    set_selected_opponent: useCallback((opponent: MatchmakingResult | null) => dispatch({ type: 'SET_SELECTED_OPPONENT', payload: opponent }), []),
    set_show_matchmaking: useCallback((show: boolean) => dispatch({ type: 'SET_SHOW_MATCHMAKING', payload: show }), []),
    set_character_psychology: useCallback((psychology: Map<string, PsychologyState>) => dispatch({ type: 'SET_CHARACTER_PSYCHOLOGY', payload: psychology }), []),
    set_active_deviations: useCallback((deviations: DeviationEvent[]) => dispatch({ type: 'SET_ACTIVE_DEVIATIONS', payload: deviations }), []),
    set_judge_decisions: useCallback((decisions: JudgeDecision[]) => dispatch({ type: 'SET_JUDGE_DECISIONS', payload: decisions }), []),
    set_current_judge: useCallback((judge: any) => dispatch({ type: 'SET_CURRENT_JUDGE', payload: judge }), []),
    set_battle_cries: useCallback((cries: { player1: string; player2: string }) => dispatch({ type: 'SET_BATTLE_CRIES', payload: cries }), []),
    set_timer: useCallback((timer: number | null) => dispatch({ type: 'SET_TIMER', payload: timer }), []),
    set_is_timer_active: useCallback((active: boolean) => dispatch({ type: 'SET_IS_TIMER_ACTIVE', payload: active }), []),
    set_show_audio_settings: useCallback((show: boolean) => dispatch({ type: 'SET_SHOW_AUDIO_SETTINGS', payload: show }), []),
    set_active_coaching_session: useCallback((session: CoachingSession | null) => dispatch({ type: 'SET_ACTIVE_COACHING_SESSION', payload: session }), []),
    set_show_coaching_modal: useCallback((show: boolean) => dispatch({ type: 'SET_SHOW_COACHING_MODAL', payload: show }), []),
    set_selected_character_for_coaching: useCallback((character: TeamCharacter | null) => dispatch({ type: 'SET_SELECTED_CHARACTER_FOR_COACHING', payload: character }), []),
    set_coaching_messages: useCallback((messages: string[]) => dispatch({ type: 'SET_COACHING_MESSAGES', payload: messages }), []),
    set_character_response: useCallback((response: string) => dispatch({ type: 'SET_CHARACTER_RESPONSE', payload: response }), []),
    set_show_disagreement: useCallback((show: boolean) => dispatch({ type: 'SET_SHOW_DISAGREEMENT', payload: show }), []),
    set_current_rogue_action: useCallback((action: RogueAction | null) => dispatch({ type: 'SET_CURRENT_ROGUE_ACTION', payload: action }), []),
    set_judge_ruling: useCallback((ruling: any) => dispatch({ type: 'SET_JUDGE_RULING', payload: ruling }), []),
    set_is_fast_battle_mode: useCallback((fast: boolean) => dispatch({ type: 'SET_IS_FAST_BATTLE_MODE', payload: fast }), []),
    set_fast_battle_consent: useCallback((consent: { player1: boolean; player2: boolean }) => dispatch({ type: 'SET_FAST_BATTLE_CONSENT', payload: consent }), []),
    set_selected_strategies: useCallback((strategies: { attack: string | null; defense: string | null; special: string | null }) => dispatch({ type: 'SET_SELECTED_STRATEGIES', payload: strategies }), []),
    set_pending_strategy: useCallback((strategy: { type: 'attack' | 'defense' | 'special'; strategy: string } | null) => dispatch({ type: 'SET_PENDING_STRATEGY', payload: strategy }), []),
    set_character_strategies: useCallback((strategies: Map<string, { character_id: string; attack: string | null; defense: string | null; special: string | null; is_complete: boolean }>) => dispatch({ type: 'SET_CHARACTER_STRATEGIES', payload: strategies }), []),
    set_chat_messages: useCallback((messages: string[]) => dispatch({ type: 'SET_CHAT_MESSAGES', payload: messages }), []),
    add_chat_message: useCallback((message: string) => dispatch({ type: 'ADD_CHAT_MESSAGE', payload: message }), []),
    set_custom_message: useCallback((message: string) => dispatch({ type: 'SET_CUSTOM_MESSAGE', payload: message }), []),
    set_is_character_typing: useCallback((typing: boolean) => dispatch({ type: 'SET_IS_CHARACTER_TYPING', payload: typing }), []),
    set_selected_chat_character: useCallback((character: TeamCharacter) => dispatch({ type: 'SET_SELECTED_CHAT_CHARACTER', payload: character }), []),
    set_show_rewards: useCallback((show: boolean) => dispatch({ type: 'SET_SHOW_REWARDS', payload: show }), []),
    set_battle_rewards: useCallback((rewards: any) => dispatch({ type: 'SET_BATTLE_REWARDS', payload: rewards }), []),
    set_show_skill_progression: useCallback((show: boolean) => dispatch({ type: 'SET_SHOW_SKILL_PROGRESSION', payload: show }), []),
    set_combat_skill_reward: useCallback((reward: CombatSkillReward | null) => dispatch({ type: 'SET_COMBAT_SKILL_REWARD', payload: reward }), []),
    set_player_cards: useCallback((cards: TeamCharacter[]) => dispatch({ type: 'SET_PLAYER_CARDS', payload: cards }), []),
    set_show_card_collection: useCallback((show: boolean) => dispatch({ type: 'SET_SHOW_CARD_COLLECTION', payload: show }), []),
    set_show_card_packs: useCallback((show: boolean) => dispatch({ type: 'SET_SHOW_CARD_PACKS', payload: show }), []),
    set_player_currency: useCallback((currency: number) => dispatch({ type: 'SET_PLAYER_CURRENCY', payload: currency }), []),
    set_selected_team_cards: useCallback((cards: string[]) => dispatch({ type: 'SET_SELECTED_TEAM_CARDS', payload: cards }), []),
    set_user_character: useCallback((player: TeamCharacter) => dispatch({ type: 'SET_USER_CHARACTER', payload: player }), []),
    set_opponent_character: useCallback((player: TeamCharacter) => dispatch({ type: 'SET_OPPONENT_CHARACTER', payload: player }), []),
    set_user_character_battle_stats: useCallback((stats: BattleStats) => dispatch({ type: 'SET_USER_CHARACTER_BATTLE_STATS', payload: stats }), []),
    set_opponent_character_battle_stats: useCallback((stats: BattleStats) => dispatch({ type: 'SET_OPPONENT_CHARACTER_BATTLE_STATS', payload: stats }), []),
    set_hex_battle_mode: useCallback((enabled: boolean) => dispatch({ type: 'SET_HEX_BATTLE_MODE', payload: enabled }), []),
    set_hex_battle_grid: useCallback((grid: HexBattleGrid | null) => dispatch({ type: 'SET_HEX_BATTLE_GRID', payload: grid }), []),
    set_character_action_states: useCallback((states: Map<string, CharacterActionState>) => dispatch({ type: 'SET_CHARACTER_ACTION_STATES', payload: states }), []),
    set_active_character_id: useCallback((id: string | null) => dispatch({ type: 'SET_ACTIVE_CHARACTER_ID', payload: id }), []),
    reset_battle_state: useCallback(() => dispatch({ type: 'RESET_BATTLE_STATE' }), []),
  };
  
  return { state, actions };
};
