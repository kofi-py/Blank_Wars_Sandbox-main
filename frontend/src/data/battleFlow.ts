// Battle Flow Mechanics System - CORRECTED
// Physical combat system where psychology affects performance, NOT pure psychological warfare

import { Contestant } from '@blankwars/types';
import { TeamCharacter } from './teamBattleSystem';

import { Equipment } from './equipment';
import { PowerDefinition, SpellDefinition } from './magic';

// ============= BATTLE FLOW TYPES =============
// CORRECTED: Physical combat with psychology as modifiers, not the core combat system

export interface BattleState {
  id: string;
  battle_id?: string;
  phase: BattlePhase;
  teams: {
    player: BattleTeam;
    opponent: BattleTeam;
  };
  current_round: number;
  max_rounds: number;
  global_morale: {
    player: number; // 0-100
    opponent: number; // 0-100
  };
  battle_log: BattleLogEntry[];
  ai_judge_context: AIJudgeContext;
  coaching_data: CoachingData;
  last_update: Date;
  characterPlans?: any;
  result?: any;
}

export type BattlePhase =
  | 'combat'
  | 'coaching_timeout'
  | 'post_battle'
  | 'battle_complete'
  | 'matchmaking'
  | 'strategy-selection'
  | 'pre-battle'
  | 'round-combat'
  | 'round-end'
  | 'battle-end'
  | 'battle-cry';

export interface BattleTeam {
  characters: BattleCharacter[];
  team_chemistry: number; // 0-100
  current_morale: number; // 0-100
  coaching_credits: number; // 0-3 per battle
  status_effects: TeamStatusEffect[];
}

export interface BattleCharacter {
  character: Contestant | TeamCharacter;
  // PHYSICAL STATS - The core combat system
  current_health: number;
  max_health: number;
  current_mana: number;
  max_mana: number;
  position: { q: number; r: number; s: number }; // Hex grid position
  physical_damage_dealt: number;
  physical_damage_taken: number;
  status_effects: (StatusEffect | string)[];
  buffs: any[];
  debuffs: any[];
  // POWERS AND SPELLS - Loaded from database
  unlocked_powers: PowerDefinition[];
  unlocked_spells: SpellDefinition[];
  equipped_powers: PowerDefinition[];
  equipped_spells: SpellDefinition[];
  power_cooldowns: Map<string, number>; // powerId -> turns remaining
  spell_cooldowns: Map<string, number>; // spellId -> turns remaining
  // PSYCHOLOGY STATS - Nested object (transformed from flat DB columns by backend)
  psych_stats: {
    stress_level: number;
    team_trust: number;
    mental_health: number;
    confidence: number;
    battle_focus: number;
    gameplan_adherence: number;
    ego: number;
    team_player: number;
  };
  // DEPRECATED - kept for backward compatibility during migration
  mental_state?: MentalState;
  gameplan_adherence: number; // 0-100 - how likely to follow the coach's strategy
  battle_performance: BattlePerformance;
  relationship_modifiers: RelationshipModifier[];
  // EQUIPMENT EFFECTS - Physical combat modifiers
  equipment_bonuses: {
    attack_bonus: number;
    defense_bonus: number;
    speed_bonus: number;
    critical_chance_bonus: number;
  };
  // TEMPORARY STAT MODIFIERS - Applied during battle (financial stress, buffs, etc.)
  temporary_stats?: {
    strength: number;
    dexterity: number;
    intelligence: number;
    charisma: number;
    defense: number;
    speed: number;
  };
  // CHARACTER INFO - Convenience accessors
  id?: string;
  name?: string;
  // FINANCIAL STATS
  financial_personality?: any;
  financials?: any;
  monthly_earnings?: number;
  wallet?: number;
  recent_decisions?: any[];
  // NFT & STAKING INFO
  nft_metadata?: {
    asset_id: string;
    policy_id: string;
    asset_name: string;
    rarity: string;
  };
  is_staked?: boolean;
  staked_at?: Date;
}

export interface MentalState {
  current_mental_health: number; // 0-100
  stress: number; // 0-100
  confidence: number; // 0-100
  team_trust: number; // 0-100 - trust in teammates and coaching staff
  battle_focus: number; // 0-100
  emotional_state?: string; // Current emotional state
  recent_trauma?: any[];
}

export interface BattlePerformance {
  damage_dealt: number;
  damage_taken: number;
  damage_blocked?: number;
  healing_done?: number;
  buffs_done?: number;
  abilities_used: number;
  successful_hits: number;
  critical_hits: number;
  teamplay_actions: number;
  strategy_deviations: number; // Times they went off-gameplan
  // Additional properties
  damageReceived?: number;
  critical_hitsReceived?: number;
}

// ============= PRE-BATTLE HUDDLE SYSTEM =============

export interface PreBattleHuddle {
  phase: 'team_assessment' | 'strategy_briefing' | 'final_motivation';
  team_chemistryCheck: TeamChemistryResult;
  character_readiness: CharacterReadiness[];
  coaching_options: CoachingOption[];
  huddle_outcome: HuddleOutcome;
}

export interface TeamChemistryResult {
  overall_chemistry: number; // 0-100
  conflicting_personalities: string[];
  synergistic_pairs: string[];
  leadership_dynamics: string;
  predicted_challenges: string[];
  team_mood_description: string;
}

export interface CharacterReadiness {
  character_id: string;
  mental_readiness: number; // 0-100
  physical_readiness: number; // 0-100
  gameplan_adherence: number; // 0-100 - likely to follow coach's strategy
  concerns: string[];
  motivations: string[];
  special_notes: string[];
}

export interface CoachingOption {
  id: string;
  type: 'motivational_speech' | 'tactical_adjustment' | 'conflict_resolution' | 'confidence_boost';
  description: string;
  target_characters: string[];
  effects: CoachingEffect[];
  requirements: CoachingRequirement[];
  risk_level: 'low' | 'medium' | 'high';
}

export interface CoachingEffect {
  type: 'morale_boost' | 'strategy_focus_increase' | 'chemistry_improve' | 'stress_reduction';
  value: number;
  duration: 'huddle_only' | 'first_round' | 'entire_battle';
  target_scope: 'individual' | 'team' | 'specific_characters';
}

export interface HuddleOutcome {
  final_team_morale: number;
  character_states: Record<string, CharacterReadiness>;
  strategic_advantages: string[];
  potential_problems: string[];
  ai_judge_comments: string[];
}

// ============= DYNAMIC COMBAT SYSTEM =============

export interface CombatRound {
  round_number: number;
  initiative: InitiativeOrder[];
  actions: CombatAction[];
  morale_events: MoraleEvent[];
  rogue_actions: RogueAction[];
  round_outcome: RoundOutcome;
  team_morale_changes: MoraleChange[];
}

export interface InitiativeOrder {
  character_id: string;
  team: 'player' | 'opponent';
  speed: number;
  mental_modifiers: number; // Stress/confidence affecting turn order
  gameplan_adherence: number; // How likely to follow strategic plan
  planned_action?: PlannedAction;
}

export interface PlannedAction {
  type: 'ability' | 'basic_attack' | 'defend' | 'support' | 'coach_suggested';
  action_type?: string;
  target_id?: string;
  ability_id?: string;
  coaching_influence: number; // 0-100 - how much player input influenced this
}

export interface CombatAction {
  character_id: string;
  action_type: 'planned' | 'improvised' | 'panicked' | 'inspired';
  original_plan?: PlannedAction;
  actual_action: ExecutedAction;
  gameplan_check: GameplanAdherenceCheck;
  psychology_factors: PsychologyFactor[];
  outcome: ActionOutcome;
}

export interface ExecutedAction {
  type: 'ability' | 'basic_attack' | 'defend' | 'help_ally' | 'flee' | 'refuse_action' | 'attack_teammate';
  character_id?: string;
  target_id?: string;
  target?: string;
  ability_id?: string;
  timestamp?: number;
  // PHYSICAL DAMAGE - Real combat damage, not psychological
  physical_damage?: number;
  armor_piercing?: number;
  critical_hit?: boolean;
  effects?: ActionEffect[];
  narrative_description: string;
}

export interface GameplanAdherenceCheck {
  base_adherence: number;
  mental_healthModifier: number;
  team_chemistryModifier: number;
  relationship_modifier: number;
  stress_modifier: number;
  final_adherence: number;
  check_result: 'follows_strategy' | 'slight_deviation' | 'improvises' | 'goes_rogue';
  reasoning: string;
}

export interface RogueAction {
  character_id: string;
  trigger_reason: 'low_mental_health' | 'team_conflict' | 'stress_overload' | 'personality_clash';
  rogue_type: 'ignores_strategy' | 'attacks_teammate' | 'flees_battle' | 'goes_berserk' | 'helps_enemy';
  severity: 'minor' | 'moderate' | 'severe';
  consequences: RogueConsequence[];
  ai_judge_ruling: string;
}

export interface RogueConsequence {
  type: 'damage' | 'morale_loss' | 'relationship_damage' | 'team_chemistry_loss' | 'strategic_disadvantage';
  value: number;
  affected_characters: string[];
  description: string;
}

// ============= MORALE SYSTEM =============

export interface MoraleEvent {
  event_type: 'victory' | 'defeat' | 'critical_hit' | 'ally_down' | 'comeback' | 'betrayal' | 'heroic_save' | 'near_death';
  description: string;
  morale_impact: number; // -50 to +50
  affected_team: 'player' | 'opponent' | 'both';
  triggering_character?: string;
  cascade_effects: CascadeEffect[];
}

export interface CascadeEffect {
  type: 'inspiration' | 'demoralization' | 'anger' | 'determination' | 'panic';
  character_ids: string[];
  stat_modifiers: Record<string, number>;
  behavior_changes: string[];
}

export interface MoraleChange {
  character_id: string;
  old_morale: number;
  new_morale: number;
  reason: string;
  effects_on_performance: PerformanceModifier[];
}

export interface PerformanceModifier {
  stat: 'attack' | 'defense' | 'speed' | 'accuracy' | 'critical_chance';
  modifier: number; // Percentage change
  reason: string;
}

// ============= COACHING TIMEOUT SYSTEM =============

export interface CoachingTimeout {
  trigger_condition: TimeoutTrigger;
  available_actions: TimeoutAction[];
  time_limit: number; // seconds
  character_states: TimeoutCharacterState[];
  urgent_issues: UrgentIssue[];
  strategic_options: StrategicOption[];
}

export interface TimeoutTrigger {
  type: 'player_requested' | 'character_breakdown' | 'team_chemistry_crisis' | 'strategic_emergency';
  severity: 'minor' | 'moderate' | 'critical';
  description: string;
  time_remaining: number;
}

export interface TimeoutAction {
  id: string;
  type: 'individual_coaching' | 'team_rallying' | 'conflict_mediation' | 'strategic_pivot';
  description: string;
  target_characters: string[];
  effects: TimeoutEffect[];
  requirements: string[];
  success_chance: number; // 0-100
  time_consumed: number;
}

export interface TimeoutEffect {
  type: 'mental_health_restore' | 'gameplan_adherence_boost' | 'chemistry_repair' | 'strategy_adjustment';
  value: number;
  duration: 'immediate' | 'next_round' | 'rest_of_battle';
  description: string;
}

export interface TimeoutCharacterState {
  character_id: string;
  current_issues: string[];
  coaching_needs: string[];
  receptiveness: number; // 0-100 - how open to coaching right now
  quick_fix_options: QuickFix[];
  deep_issues: string[];
}

export interface QuickFix {
  action: string;
  effect: string;
  success_chance: number;
  risk_level: string;
}

// ============= POST-BATTLE DYNAMICS =============

export interface PostBattleAnalysis {
  battle_result: 'victory' | 'defeat' | 'draw';
  team_performance_metrics: TeamMetrics;
  character_evaluations: CharacterEvaluation[];
  relationship_changes: RelationshipChange[];
  psychological_consequences: PsychologicalConsequence[];
  training_recommendations: TrainingRecommendation[];
  team_chemistryEvolution: ChemistryEvolution;
}

export interface TeamMetrics {
  overall_teamwork: number; // 0-100
  gameplan_adherence: number; // 0-100 - how well team followed gameplan
  strategic_execution: number; // 0-100
  morale_management: number; // 0-100
  conflict_resolution: number; // 0-100
  adaptability: number; // 0-100
}

export interface CharacterEvaluation {
  character_id: string;
  battle_rating: number; // 0-100
  gameplan_adherenceScore: number; // 0-100 - how well they followed gameplan
  teamplay_score: number; // 0-100
  mentalhealth_change: number; // -50 to +50
  stress_level: number; // 0-100
  confidence_change: number; // -50 to +50
  notable_actions: string[];
  behavior_patterns: string[];
  growth_areas: string[];
  strengths_displayed: string[];
}

export interface RelationshipChange {
  character1: string;
  character2: string;
  old_relationship_strength: number;
  new_relationship_strength: number;
  change_reason: string;
  battle_events: string[];
  future_implications: string[];
}

export interface PsychologicalConsequence {
  character_id: string;
  type: 'trauma' | 'growth' | 'bonding' | 'resentment' | 'inspiration';
  severity: 'minor' | 'moderate' | 'significant';
  description: string;
  long_term_effects: string[];
  recovery_time: number; // battles needed to heal
  treatment_options: string[];
}

export interface TrainingRecommendation {
  character_id: string;
  type: 'mental_health' | 'strategy_focus' | 'team_chemistry' | 'combat_skills' | 'stress_management';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  expected_benefit: string;
  time_required: number; // training sessions
}

export interface ChemistryEvolution {
  old_chemistry: number;
  new_chemistry: number;
  evolution_factors: string[];
  emerging_dynamics: string[];
  strengthened_bonds: string[];
  weakened_bonds: string[];
  culture_shift: string;
}

// ============= AI JUDGE SYSTEM =============

export interface AIJudgeContext {
  battle_narrative: string;
  character_personalities: Record<string, string>;
  current_tensions: string[];
  previous_rulings: AIRuling[];
  battle_history?: any[];
  current_round_number?: number;
  player_teamName?: string;
  opponent_teamName?: string;
  judging_style: 'strict' | 'lenient' | 'dramatic' | 'realistic';
  judge?: any;
}

export interface AIRuling {
  situation: string;
  ruling: string;
  reasoning: string;
  gameplay_effect: string;
  narrative_impact: string;
  character_reactions: Record<string, string>;
}

// ============= UTILITY TYPES =============

export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff' | 'neutral';
  description: string;
  value: number;
  duration: number;
  stackable: boolean;
}

export interface TeamStatusEffect {
  id: string;
  name: string;
  description: string;
  effects: Record<string, number>;
  duration: number;
}

export interface RelationshipModifier {
  with_character: string;
  relationship: 'ally' | 'rival' | 'enemy' | 'mentor' | 'student';
  strength: number; // -100 to 100
  battle_modifiers: Record<string, number>;
}

export interface ActionEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'special';
  value: number;
  target_id: string;
  description: string;
}

export interface ActionOutcome {
  success: boolean;
  damage?: number;
  effects: ActionEffect[];
  critical_result?: boolean;
  narrative_description: string;
  audience_reaction: string;
}

export interface PsychologyFactor {
  factor: 'mental_health' | 'team_chemistry' | 'stress' | 'confidence' | 'relationship';
  impact: 'positive' | 'negative' | 'neutral';
  value: number;
  description: string;
}

export interface CoachingRequirement {
  type: 'character_trust' | 'team_chemistry' | 'time_available' | 'coaching_skill';
  minimum_value: number;
  description: string;
}

export interface RoundOutcome {
  winner: 'player' | 'opponent' | 'draw';
  key_events: string[];
  morale_shift: Record<string, number>;
  strategic_advantages: string[];
  unexpected_developments: string[];
  judge_commentary: string;
}

export interface BattleLogEntry {
  timestamp: Date;
  type: 'action' | 'morale_event' | 'coaching' | 'judge_ruling' | 'phase_change';
  description: string;
  character_involved?: string;
  gameplay_effect: string;
  dramatic_impact: string;
}

export interface UrgentIssue {
  type: 'character_breakdown' | 'team_conflict' | 'strategy_failing' | 'morale_collapse';
  severity: 'warning' | 'urgent' | 'critical';
  description: string;
  immediate_actions: string[];
  consequences_if_ignored: string[];
}

export interface StrategicOption {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  character_reactions: Record<string, string>;
  implementation_difficulty: number; // 0-100
}

export interface CoachingData {
  credits_used: number;
  credits_remaining: number;
  timeouts_used: number;
  max_timeouts: number;
  available_timeouts?: number;
  coaching_points?: number;
  relationship_boosts?: any[];
  coaching_effectiveness: number; // 0-100 - based on character trust levels
  team_respect: number; // 0-100 - how much team respects coach
}

export interface BattleMemory {
  character_id: string;
  notable_events: string[];
  emotional_impact: number;
  relationship_moments: string[];
  personal_growth: string[];
  trauma: string[];
}

// BattleFlowManager class archived - was dead code with hardcoded values
// See: frontend/src/data/battleFlow.ts.archived_class for original if needed
