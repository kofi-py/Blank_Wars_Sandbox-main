/**
 * Type definitions for the prompt assembly system.
 *
 * See: docs/gameplans/006-universal-template-refactor.md
 */

// =====================================================
// 3 DATA PACKAGES (returned by DB function)
// =====================================================

export interface IdentityPackage {
  id: string;
  userchar_id: string;
  name: string;
  coach_name: string;
  title: string;
  species: string;
  archetype: string;
  origin_era: string;
  backstory: string;
  personality_traits: string[];
  conversation_style: string;
  conversation_topics: string[];
  comedian_name: string;
  comedy_style: string;
  comedian_category: string;  // 'public_domain' or 'inspired'
  level: number;
  experience: number;
  total_battles: number;
  total_wins: number;
  total_losses: number;
  win_percentage: number;
  wallet: number;
  debt: number;
  monthly_earnings: number;
  sleeping_arrangement: string;
  hq_tier: string;
  team_id: string;
  team_name: string;
  scene_type: string;
  time_of_day: string;
  recent_memories: Memory[];
  recent_decisions: Decision[];
  recent_opponents: string[];
  roommates: Roommate[];
  teammates: Teammate[];
}

export interface CombatPackage {
  current_health: number;
  current_max_health: number;
  current_energy: number;
  current_max_energy: number;
  current_mana: number;
  current_max_mana: number;
  current_attack: number;
  current_defense: number;
  current_speed: number;
  current_dexterity: number;
  current_intelligence: number;
  current_wisdom: number;
  current_spirit: number;
  current_magic_attack: number;
  current_magic_defense: number;
  current_initiative: number;
  current_fire_resistance: number;
  current_cold_resistance: number;
  current_lightning_resistance: number;
  current_toxic_resistance: number;
  current_elemental_resistance: number;
  energy_regen_rate: number;
  mana_regen_rate: number;
  powers: Power[];
  spells: Spell[];
  equipment: Equipment[];
  inventory: Equipment[];
  items: Item[];
}

export interface PsychologicalPackage {
  current_mental_health: number;
  current_stress: number;
  current_morale: number;
  current_fatigue: number;
  current_confidence: number;
  current_ego: number;
  current_team_player: number;
  coach_trust_level: number;
  bond_level: number;
  financial_stress: number;
  gameplan_adherence: number;
  current_mood: number;
  gameplay_mood_modifiers: GameplayMoodModifiers;
  equipment_prefs: EquipmentPrefs;
  category_preferences: CategoryPreference[];
  relationships: Relationship[];
}

/**
 * The complete character data returned by get_full_character_data().
 * Contains 3 NESTED packages: IDENTITY, COMBAT, PSYCHOLOGICAL.
 */
export interface CharacterData {
  IDENTITY: IdentityPackage;
  COMBAT: CombatPackage;
  PSYCHOLOGICAL: PsychologicalPackage;
}

// =====================================================
// SYSTEM CHARACTER TYPES (judges, therapists)
// =====================================================

/**
 * Identity package for system characters (judges, therapists).
 * Contains only identity + memories/decisions - no combat or psychological stats.
 */
export interface SystemCharacterIdentity {
  // Core identity from characters table
  id: string;
  userchar_id: string;
  name: string;
  title: string;
  backstory: string;
  personality_traits: string[];
  species: string;
  archetype: string;
  origin_era: string;
  role: string;
  // Communication style
  conversation_style: string;
  conversation_topics: string[];
  // Comedy style (for personality)
  comedian_name: string;
  comedy_style: string;
  comedian_category: string;
  // Experience data (from user_characters)
  recent_memories: Memory[];
  recent_decisions: Decision[];
}

/**
 * Data returned by get_system_character_data().
 * System characters only have IDENTITY - no COMBAT or PSYCHOLOGICAL packages.
 */
export interface SystemCharacterData {
  IDENTITY: SystemCharacterIdentity;
}

/**
 * Granular preferences returned by get_character_preferences().
 * Only fetched for domains that need detailed preference info.
 */
export interface PreferencesPackage {
  power_preferences: PowerPreference[];
  spell_preferences: SpellPreference[];
  equipment_preferences: EquipmentPreference[];
  attribute_preferences: CategoryPreference[];
  resource_preferences: CategoryPreference[];
}

export interface PowerPreference {
  power_id: string;
  name: string;
  preference_score: number;
}

export interface SpellPreference {
  spell_id: string;
  name: string;
  preference_score: number;
}

export interface EquipmentPreference {
  equipment_id: string;
  name: string;
  slot: string;
  preference_score: number;
}

// =====================================================
// NESTED TYPES
// =====================================================

export interface Memory {
  content: string;
  emotion_type: string;
  intensity: number;
  importance: number;
  tags: string[];
  created_at: string;
}

export interface Decision {
  decision_type: string;
  domain: string;
  description: string;
  coach_advice: string;
  followed_advice: boolean;
  outcome: string;
  created_at: string;
}

export interface Roommate {
  id: string;
  character_id: string;
  name: string;
  sleeping_arrangement: string;
}

export interface Teammate {
  id: string;
  character_id: string;
  name: string;
  archetype: string;
  level: number;
  current_health: number;
  current_max_health: number;
}

export interface Power {
  id: string;
  name: string;
  description: string;
  current_rank: number;
  on_cooldown: boolean;
  cooldown_expires_at: string | null;
  preference_score: number;
}

export interface Spell {
  id: string;
  name: string;
  description: string;
  current_rank: number;
  on_cooldown: boolean;
  cooldown_expires_at: string | null;
  preference_score: number;
}

export interface Equipment {
  equipment_id: string;
  slot: string;
  item_name: string;
  item_stats: Record<string, number>;
  is_equipped: boolean;
}

export interface Item {
  id: string;
  name: string;
  quantity: number;
}

export interface EquipmentPrefs {
  armor_proficiency: string;
  weapon_proficiencies: string[];
  preferred_armor_type: string;
  preferred_weapons: string[];
}

export interface Relationship {
  character_id: string;
  character_name: string;
  trust: number;
  respect: number;
  affection: number;
  rivalry: number;
  shared_battles: number;
  therapy_sessions_together: number;
}

export interface CategoryPreference {
  category_type: string;
  category_value: string;
  preference_score: number;
}

export interface MoodModifier {
  source: string;  // References mood_event_types.id
  value: number;
  decay_rate?: number;
  expires_at?: string;
  removable_by?: string[];
  created_at: string;
}

export interface GameplayMoodModifiers {
  modifiers: MoodModifier[];
}

// =====================================================
// DOMAIN AND ROLE TYPES
// =====================================================

export type Domain =
  | 'therapy'
  | 'battle'
  | 'training'
  | 'confessional'
  | 'tutorial'
  | 'controlRoom'
  | 'financial'
  | 'performance'
  | 'personalProblems'
  | 'groupActivities'
  | 'equipment'
  | 'kitchenTable'
  | 'realEstate'
  | 'socialLounge'
  | 'messageBoard'
  | 'progression'
  | 'attributes'
  | 'abilities'
  | 'resources'
  | 'employeeLounge';

/**
 * Character role type: contestant (fighting character) or system (staff like therapist, judge).
 */
export type RoleType = 'contestant' | 'system';

export interface KitchenBuildOptions {
  immediate_situation: string;
  memory: string;
  relationship_context: string;
  mood: string;
  energy_level: number;
}

export interface ConfessionalBuildOptions {
  hostmaster_style: 'gentle' | 'probing' | 'confrontational';
  memory_context: string;
  turn_number: number;
  host_name: string;
  host_style: string;
  contestant_data: CharacterData;
}

export interface PerformanceBuildOptions {
  immediate_situation: string;
  memory_context: string;
  coach_message: string;
  // Note: recent_opponents comes from IDENTITY.recent_opponents (fetched by get_full_character_data)
}

export type PersonalProblemCategory =
  | 'relationship_conflict'
  | 'trust_issues'
  | 'financial_crisis'
  | 'financial_pressure'
  | 'mental_health_struggle'
  | 'overwhelming_stress'
  | 'lost_hope'
  | 'coach_trust_issues'
  | 'ego_crisis'
  | 'self_worth_crisis'
  | 'burnout'
  | 'living_conditions'
  | 'no_privacy'
  | 'overcrowding'
  | 'performance_crisis'
  | 'pre_battle_anxiety'
  | 'existential_reflection';

export interface PersonalProblemContext {
  /** The category of problem */
  category: PersonalProblemCategory;
  /** Severity affects how the character expresses this */
  severity: 'minor' | 'moderate' | 'severe';
  /** What data triggered this problem selection */
  source: string;
  /** Specific context for the prompt to use */
  details: Record<string, string | number | boolean | null>;
}

export interface PersonalProblemsBuildOptions {
  /** The generated problem context from backend service */
  problem_context: PersonalProblemContext;
  /** Coach's current message */
  coach_message: string;
  /** Memory context from EventContextService */
  memory_context?: string;
}

// =====================================================
// GROUP ACTIVITIES DOMAIN TYPES
// =====================================================

export interface GroupActivityParticipant {
  /** Character ID (e.g., 'dracula', 'holmes') */
  character_id: string;
  /** Display name */
  name: string;
}

export interface GroupActivitiesBuildOptions {
  /** The current activity being performed */
  activity_type: string;
  /** Description of what's happening right now */
  immediate_situation: string;
  /** Memory context from EventContextService */
  memory_context: string;
  /** Relationship context prose */
  relationship_context: string;
  /** Current mood (calculated numeric value) */
  mood: number;
  /** Current energy level (0-100+) */
  energy_level: number;
  /** Who's in this specific group activity session (1-3 other contestants) */
  participants: GroupActivityParticipant[];
  /** Coach's current message/instruction if any */
  coach_message?: string;
}

// =====================================================
// CHARACTER TAB DOMAIN OPTIONS
// =====================================================

export interface EquipmentItem {
  id: string;
  name: string;
  slot: string;
  rarity: string;
  stats: Record<string, number>;
  is_equipped: boolean;
  required_level: number;
  shop_price: number;
  equipment_type: string;
}

export interface EquipmentPreferences {
  weapon_profs: string[];
  preferred_weapons: string[];
  armor_prof: string;
  preferred_armor: string;
  notes: string;
}

export interface EquipmentBuildOptions {
  coach_message: string;
  memory_context: string;
  inventory: EquipmentItem[];
  available_equipment: EquipmentItem[];
  equipment_prefs: EquipmentPreferences;
}

export interface PowerDefinition {
  id: string;
  name: string;
  tier: 'skill' | 'ability' | 'species' | 'signature';
  category: string;
  description: string;
  max_rank: number;
  unlock_cost: number;
  rank_up_cost: number;
  archetype: string;
  species: string;
  power_type: string;
  energy_cost: number;
  cooldown: number;
  // Status flags (from character_powers join)
  is_unlocked: boolean;
  is_equipped: boolean;
  current_rank: number;
  slot_number: number;
}

export interface SpellDefinition {
  id: string;
  name: string;
  tier: 'universal' | 'archetype' | 'species' | 'signature';
  category: string;
  school: string;
  description: string;
  max_rank: number;
  unlock_cost: number;
  rank_up_cost: number;
  mana_cost: number;
  cooldown_turns: number;
  // Status flags (from character_spells join)
  is_unlocked: boolean;
  is_equipped: boolean;
  current_rank: number;
  slot_number: number;
}

export interface AbilitiesBuildOptions {
  coach_message: string;
  memory_context: string;
  ability_points: number;
  level: number;
  // Powers the character has unlocked (all owned, includes equipped and unequipped)
  unlocked_powers: PowerDefinition[];
  // Powers currently in active loadout slots (1-8)
  equipped_powers: PowerDefinition[];
  // Spells the character has unlocked (all owned)
  unlocked_spells: SpellDefinition[];
  // Spells currently in active loadout slots (1-8)
  equipped_spells: SpellDefinition[];
}

export interface AttributeStats {
  strength: number;
  dexterity: number;
  attack: number;
  defense: number;
  speed: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  spirit: number;
  energy_regen: number;
}

export interface AttributesBuildOptions {
  coach_message: string;
  memory_context: string;
  level: number;
  unspent_points: number;
  base_stats: AttributeStats;
  allocations: Record<string, number>;
}

export interface ResourcesBuildOptions {
  coach_message: string;
  memory_context: string;
  unspent_points: number;
  current_health: number;
  current_max_health: number;
  current_energy: number;
  current_max_energy: number;
  current_mana: number;
  current_max_mana: number;
  resource_preferences: {
    health_priority: number;
    energy_priority: number;
    mana_priority: number;
  };
}

export interface ProgressionDecision {
  type: string;
  goal_type: string;
  progress: number;
  target: number;
  deadline: string;
  status: string;
}

export interface ProgressionBuildOptions {
  coach_message: string;
  memory_context: string;
  level: number;
  experience: number;
  total_battles: number;
  total_wins: number;
  bond_level: number;
  acquired_at: Date;
  recent_decisions: ProgressionDecision[];
}

// =====================================================
// EMPLOYEE LOUNGE DOMAIN TYPES
// =====================================================

export type EmployeeLoungeRole = 'mascot' | 'judge' | 'therapist' | 'trainer' | 'host' | 'real_estate_agent';

export interface EmployeeLoungeStaffMember {
  userchar_id: string;
  character_id: string;
  name: string;
  role: EmployeeLoungeRole;
  species: string;
  archetype: string;
}

/**
 * Simplified contestant data for Employee Lounge context.
 * Staff discuss these contestants in casual conversation.
 */
export interface ContestantSummary {
  userchar_id: string;
  name: string;
  species: string;
  archetype: string;
  level: number;
  wins: number;
  losses: number;
  current_mental_health: number;
  current_stress: number;
  current_morale: number;
  is_active: boolean; // true = active roster, false = backup
  roommates: string[]; // names of roommates
}

// Message type for group chat scenes
export type EmployeeLoungeMessageType = 'opening' | 'continuing' | 'coach_message';

// Participant in group chat
export interface EmployeeLoungeParticipant {
  role: EmployeeLoungeRole;
  name: string;
  userchar_id: string;
}

// Context for responding to a previous message
export interface EmployeeLoungeRespondingTo {
  speaker_name: string;
  speaker_role: EmployeeLoungeRole;
  content: string;
}

export interface EmployeeLoungeBuildOptions {
  coach_name: string;
  coach_message: string;
  memory_context: string;
  speaking_character_role: EmployeeLoungeRole;
  all_staff: EmployeeLoungeStaffMember[];
  contestants: ContestantSummary[]; // Team contestants staff can discuss
  recent_messages: Array<{
    speaker_name: string;
    speaker_role: 'coach' | EmployeeLoungeRole;
    content: string;
    timestamp: string;
  }>;
  team_context: {
    team_name: string;
    total_wins: number;
    total_losses: number;
    monthly_earnings: number;
    hq_tier: string;
  };
  // Group chat mode fields
  group_mode?: boolean;
  message_type?: EmployeeLoungeMessageType;
  active_participants?: EmployeeLoungeParticipant[];
  responding_to?: EmployeeLoungeRespondingTo;
}

// =====================================================
// TRAINING DOMAIN TYPES
// =====================================================

export type TrainingRole = 'trainee' | 'trainer';

export type TrainingPhase = 'warmup' | 'skill_practice' | 'sparring' | 'cooldown';

export type TrainingIntensity = 'light' | 'moderate' | 'intense';

export interface TrainingParticipant {
  userchar_id: string;
  character_id: string;
  name: string;
  archetype: string;
  species: string;
  level: number;
  wallet: number;
  debt: number;
  wins: number;
  losses: number;
  win_percentage: number;
  current_health: number;
  max_health: number;
}

export interface TrainingBuildOptions {
  role: TrainingRole;
  coach_message: string;
  memory_context: string;
  // Trainer info (for trainee role)
  trainer_name?: string;
  trainer_userchar_id?: string;
  // Trainee info (for trainer role)
  trainee_name?: string;
  trainee_species?: string;
  trainee_userchar_id?: string;
  // Session context
  intensity_level: TrainingIntensity;
  training_phase: TrainingPhase;
  session_duration: number;  // Required - must be >= 1 when training session is active
  time_of_day: string;  // Session time context
  trainee_hq_tier: string;  // Primary trainee's living situation (for psychological context)
  // Group training participants
  group_participants: TrainingParticipant[];
  // Equipment available
  available_equipment: string[];
  facility_tier: string;
}

// =====================================================
// REAL ESTATE DOMAIN TYPES
// =====================================================

export type RealEstateRole = 'agent';

export interface RealEstateAgent {
  id: string;           // character_id (e.g., 'barry', 'lmb_3000', 'zyxthala')
  name: string;         // display name
  userchar_id: string;  // user_characters UUID for fetching SystemCharacterData
}

export interface HQTierInfo {
  tier_id: string;
  name: string;
  description: string;
  max_rooms: number;
  max_beds: number;
  upgrade_cost_currency: number;
  upgrade_cost_premium: number;
}

export interface RealEstateBuildOptions {
  role: RealEstateRole;
  agent: RealEstateAgent;
  competing_agents: RealEstateAgent[];
  // Current HQ state
  current_hq_tier: string;
  current_balance: number;
  current_gems: number;
  current_room_count: number;
  current_bed_count: number;
  current_character_count: number;
  characters_without_beds: number;
  // Available upgrades
  available_tiers: HQTierInfo[];
  // Coach context
  coach_name: string;
  team_name: string;
  // Team performance (agents need this context)
  team_total_wins: number;
  team_total_losses: number;
  team_win_percentage: number;
  team_monthly_earnings: number;
  team_total_earnings: number;
  // Memory/conversation
  coach_message: string;
  memory_context: string;
}

// =====================================================
// SOCIAL LOUNGE DOMAIN TYPES
// =====================================================

export type SocialTriggerType =
  | 'battle_victory'
  | 'battle_defeat'
  | 'rivalry_escalation'
  | 'random_drama'
  | 'user_message'
  | 'character_interaction'
  | 'idle_chat';

export interface SocialParticipant {
  userchar_id: string;
  character_id: string;
  name: string;
  team_name: string;
  is_own_team: boolean;  // Is this character on the same team as the posting character?
  relationship?: {
    trust: number;
    rivalry: number;
    affection: number;
  };
}

export interface RecentSocialMessage {
  author_name: string;
  author_type: 'coach' | 'contestant';
  content: string;
  timestamp: string;
  is_own_message: boolean;
}

export interface RecentEvent {
  type: string;
  description: string;
  category: string;
  timestamp: string;
}

export interface SocialLoungeBuildOptions {
  /** What triggered this message generation */
  trigger_type: SocialTriggerType;
  /** User/coach message to respond to (if trigger is user_message) */
  user_message?: string;
  /** Who else is present in the lounge right now */
  present_participants: SocialParticipant[];
  /** Recent messages in the chat to reference */
  recent_messages: RecentSocialMessage[];
  /** Recent public events the character might reference */
  recent_events: RecentEvent[];
  /** Memory context from EventContextService */
  memory_context: string;
  /** Battle context if trigger is battle_victory/defeat */
  battle_context?: {
    opponent_name: string;
    was_victory: boolean;
    was_close_match: boolean;
  };
  /** Rivalry context if trigger is rivalry_escalation */
  rivalry_context?: {
    rival_name: string;
    rivalry_level: number;
    recent_incident: string;
  };
}

// =====================================================
// MESSAGE BOARD DOMAIN TYPES
// =====================================================

export type MessageBoardPostType =
  | 'trash_talk'
  | 'announcement'
  | 'challenge'
  | 'gossip'
  | 'reply'
  | 'general';

export interface MessageBoardPost {
  id: string;
  author_name: string;
  author_type: 'coach' | 'contestant';
  author_team: string;
  content: string;
  post_type: MessageBoardPostType;
  likes: number;
  flames: number;
  timestamp: string;
}

export interface MessageBoardBuildOptions {
  /** What triggered this post */
  trigger_type: SocialTriggerType;
  /** The post type being created */
  post_type: MessageBoardPostType;
  /** If replying, the original post */
  replying_to?: MessageBoardPost;
  /** If reacting to a user's post */
  user_post?: string;
  /** Recent posts on the board for context */
  recent_posts: MessageBoardPost[];
  /** Recent public events the character might reference */
  recent_events: RecentEvent[];
  /** Memory context from EventContextService */
  memory_context: string;
  /** Battle context if trigger is battle_victory/defeat */
  battle_context?: {
    opponent_name: string;
    was_victory: boolean;
    was_close_match: boolean;
  };
  /** Rivalry context if trigger is rivalry_escalation */
  rivalry_context?: {
    rival_name: string;
    rivalry_level: number;
    recent_incident: string;
  };
}

// =====================================================
// FINANCIAL DOMAIN TYPES
// =====================================================

/**
 * Financial tier matching the FinancialTier type from frontend
 */
export type FinancialTier =
  | 'poor'
  | 'free'
  | 'bronze'
  | 'silver'
  | 'middle'
  | 'gold'
  | 'wealthy'
  | 'platinum'
  | 'noble'
  | 'royal';

/**
 * Categories of financial challenges
 */
export type FinancialChallengeCategory =
  | 'essentials'      // Basic needs (groceries, bus pass, phone)
  | 'discretionary'   // Wants (vacation, luxury items)
  | 'debt'            // Debt-related decisions
  | 'savings'         // Emergency fund, retirement
  | 'investment'      // Investment opportunities
  | 'bad_decision';   // Character proposing a poor financial choice

/**
 * The generated financial challenge context
 */
export interface FinancialChallengeContext {
  /** Challenge category */
  category: FinancialChallengeCategory;
  /** Specific challenge type ID */
  challenge_id: string;
  /** Title for display */
  title: string;
  /** What the character says about this challenge */
  character_question: string;
  /** Dollar amount involved */
  amount: number;
  /** How urgent this is */
  urgency: 'low' | 'medium' | 'high';
  /** Payment methods available */
  payment_methods: ('cash' | 'debt')[];
  /** For bad decisions - why this is problematic */
  problems?: string[];
  /** Whether this is a good or bad decision */
  is_bad_decision: boolean;
}

export interface FinancialBuildOptions {
  /** The generated challenge context - optional for normal chat mode */
  challenge_context?: FinancialChallengeContext;
  /** Coach's current message */
  coach_message: string;
  /** Memory context from EventContextService */
  memory_context?: string;
}

// =====================================================
// BATTLE DOMAIN TYPES
// =====================================================

export type BattleRole = 'combatant' | 'judge' | 'host';

export interface BattleTeammate {
  id: string;
  name: string;
  archetype: string;
  current_health: number;
  max_health: number;
  is_dead: boolean;
}

export interface BattleEnemy {
  id: string;
  name: string;
  archetype: string;
  current_health: number;
  max_health: number;
  is_dead: boolean;
}

export interface BattleStateContext {
  battle_id: string;
  current_round: number;
  current_turn: number;
  character_health: number;
  character_max_health: number;
  character_energy: number;
  character_max_energy: number;
  character_mana: number;
  character_max_mana: number;
  teammates: BattleTeammate[];
  enemies: BattleEnemy[];
  team_winning: boolean;
  recent_action?: string;
}

export interface CoachOrderContext {
  label: string;
  action_type: string;
  target_name?: string;
  ability_name?: string;
}

export interface RebellionContext {
  rebel_name: string;
  rebel_declaration: string;
  coach_ordered: string;
  rebel_did: string;
  rebellion_type: string;
  rebel_health_percent: number;
}

export interface BattleBuildOptions {
  role: BattleRole;
  battle_state: BattleStateContext;
  // For combatant role
  coach_order?: CoachOrderContext;
  is_rebellion?: boolean;
  rebellion_options?: string[];
  // For judge role
  rebellion?: RebellionContext;
}

// Tutorial domain - one-on-one coach-host chat during onboarding
export interface TutorialBuildOptions {
  slide_id?: string;  // Optional - which slide the user is on
  coach_message: string;  // What the user (coach) said
}

// Control Room domain - one-on-one coach-host chat for ongoing help/support
export interface ControlRoomBuildOptions {
  coach_message: string;  // User's help query
  search_topic?: string;  // Optional - specific topic from knowledge base
}

// =====================================================
// ASSEMBLY TYPES
// =====================================================

export interface AssemblyRequest {
  userchar_id: string;  // The user_characters UUID - canonical character_id is derived internally
  domain: Domain;
  role: string;
  role_type: RoleType;
  conversation_history: string;
  // Second character's userchar_id (therapist, opponent, trainer, patient)
  context_userchar_id?: string;

  // Therapy-specific options (only used when domain === 'therapy')
  therapy_options?: {
    session_type: 'individual' | 'group';
    intensity_strategy?: 'soft' | 'medium' | 'hard';  // Required for therapist, undefined for patient (reacts to content, not meta-knowledge)
    group_participants?: Array<{
      userchar_id: string;  // Changed from character_id
      name: string;
      financial_stress: number;
      current_stress: number;
    }>;
    // For judge role - session transcript with speaker attribution
    transcript?: Array<{ message: string; speaker_name: string; speaker_id: string }>;
  };

  // Kitchen table specific options (only used when domain === 'kitchenTable')
  kitchen_options?: KitchenBuildOptions;

  // Confessional specific options
  confessional_options?: ConfessionalBuildOptions;

  // Performance coaching specific options (only used when domain === 'performance')
  performance_options?: PerformanceBuildOptions;

  // Personal problems coaching specific options (only used when domain === 'personalProblems')
  personal_problems_options?: PersonalProblemsBuildOptions;

  // Group activities specific options (only used when domain === 'groupActivities')
  group_activities_options?: GroupActivitiesBuildOptions;

  // Character tab domain options
  equipment_options?: EquipmentBuildOptions;
  abilities_options?: AbilitiesBuildOptions;
  attributes_options?: AttributesBuildOptions;
  resources_options?: ResourcesBuildOptions;
  progression_options?: ProgressionBuildOptions;

  // Training domain options
  training_options?: TrainingBuildOptions;

  // Real estate domain options
  real_estate_options?: RealEstateBuildOptions;

  // Social domain options
  social_lounge_options?: SocialLoungeBuildOptions;
  message_board_options?: MessageBoardBuildOptions;

  // Battle domain options
  battle_options?: BattleBuildOptions;

  // Financial domain options
  financial_options?: FinancialBuildOptions;

  // Employee lounge domain options
  employee_lounge_options?: EmployeeLoungeBuildOptions;

  // Tutorial domain options
  tutorial_options?: TutorialBuildOptions;

  // Control Room domain options
  control_room_options?: ControlRoomBuildOptions;
}

export interface AssembledPrompt {
  system_prompt: string;
  data: CharacterData | SystemCharacterData;
  preferences?: PreferencesPackage;  // Only included for preference-heavy domains
  domain: Domain;
  role: string;
}
