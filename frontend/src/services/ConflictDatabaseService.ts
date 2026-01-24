'use client';

import { characterAPI } from './apiClient';
import { Contestant } from '@blankwars/types';
import GameEventBus, { type GameEvent } from './gameEventBus';
import type { FinancialDecision } from './apiClient';

interface ConflictData {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: 'personal' | 'housing' | 'kitchen' | 'battle' | 'team' | 'external';
  characters_involved: string[];
  description: string;
  therapy_priority: number;
  resolution_difficulty: 'easy' | 'moderate' | 'hard' | 'complex';
  timestamp: Date;
  resolved: boolean;
}

export type TherapyPromptMode = 'default' | 'therapy' | 'group_therapy';

export interface TherapyContextData {
  character: Contestant;
  roommates: Contestant[];
  housing_tier: string;
  room_capacity: number;
  current_occupancy: number;
  league_ranking: number;
  team_rating: number;
  recent_battle_results: string[];
  team_chemistry: number;
  personal_stress_factors: string[];
  active_conflicts: ConflictData[];
  // Financial Context
  financial_stress?: number;
  financial_decision_quality?: number;
  financial_trust?: number;
  recent_financial_decisions?: string[];
  is_in_financial_spiral?: boolean;
  consecutive_poor_decisions?: number;
  wallet?: number;
  monthly_earnings?: number;
  debt?: number;
}

export interface TherapyContext extends TherapyContextData {
  // Agent/Session Context
  session_id?: string;
  patient_agent_key?: string;
  therapist_id?: string;
  session_stage?: 'initial' | 'resistance' | 'breakthrough';
  all_participant_ids?: string[];
  group_dynamics?: string[];
}


// Expanded conflict categories - beyond the original 15
const EXTENDED_CONFLICT_CATEGORIES = [
  // Original 15
  'neighbor_disputes', 'family_conflicts', 'work_stress', 'relationship_issues',
  'financial_problems', 'health_concerns', 'identity_crisis', 'authority_conflicts',
  'moral_dilemmas', 'social_isolation', 'trust_issues', 'anger_management',
  'perfectionism', 'impostor_syndrome', 'grief_loss',

  // Combat & Performance
  'combat_trauma', 'survivor_guilt', 'battle_fatigue', 'performance_anxiety',
  'competitive_jealousy', 'skill_plateau', 'retirement_fears', 'legacy_pressure',

  // Leadership & Team
  'leadership_burnout', 'command_isolation', 'decision_paralysis', 'team_betrayal',
  'power_corruption', 'responsibility_weight', 'delegation_difficulty', 'succession_anxiety',

  // Living Situation
  'overcrowding_stress', 'privacy_invasion', 'resource_competition', 'cleanliness_disputes',
  'noise_conflicts', 'temperature_wars', 'space_territorial', 'routine_clashes',

  // Cultural & Temporal
  'cultural_displacement', 'time_period_adjustment', 'language_barriers', 'value_conflicts',
  'tradition_preservation', 'modernization_resistance', 'generational_gaps', 'customs_misunderstanding',

  // Magical & Supernatural
  'magical_corruption', 'power_addiction', 'spell_backlash', 'dimensional_displacement',
  'curse_effects', 'immortality_burden', 'transformation_trauma', 'supernatural_isolation',

  // Fame & Public Life
  'fame_pressure', 'public_expectations', 'media_scrutiny', 'fan_obsession',
  'reputation_management', 'privacy_loss', 'role_model_burden', 'celebrity_loneliness',

  // Personal Growth
  'purpose_questioning', 'meaning_crisis', 'spiritual_confusion', 'philosophical_doubt',
  'change_resistance', 'growth_stagnation', 'potential_unfulfilled', 'direction_uncertainty',

  // Financial & Money
  'spending_addiction', 'financial_jealousy', 'debt_shame', 'investment_anxiety',
  'luxury_guilt', 'money_hoarding', 'financial_betrayal', 'wealth_disparity_tension'
];


class ConflictDatabaseService {
  private static instance: ConflictDatabaseService;
  private conflicts: ConflictData[] = [];
  private characters: Contestant[] = [];
  private usercharsById = new Map<string, Contestant>();
  private eventBus: GameEventBus;

  private constructor() {
    this.eventBus = GameEventBus.getInstance();
    this.setupFinancialEventListeners();
  }

  public getUserCharOrThrow(userchar_id: string): Contestant {
    console.log('🔍 [CHAR-RESOLVE-DEBUG] getUserCharOrThrow called with ID:', userchar_id);
    if (!userchar_id || typeof userchar_id !== 'string') {
      throw new Error(`Invalid userchar id: ${String(userchar_id)}`);
    }
    // User-character IDs are UUIDs - no prefix validation needed

    const c = this.usercharsById.get(userchar_id);
    if (!c) {
      console.log('🔍 [CHAR-RESOLVE-DEBUG] getUserCharOrThrow - character NOT FOUND in usercharsById map');
      console.log('🔍 [CHAR-RESOLVE-DEBUG] Available userchar IDs:', Array.from(this.usercharsById.keys()));
      throw new Error(`User character not found: ${userchar_id}`);
    }

    console.log('🔍 [CHAR-RESOLVE-DEBUG] getUserCharOrThrow - FOUND character:', {
      id: c.id,
      character_id: c.character_id,
      name: c.name
    });
    return c;
  }

  static getInstance(): ConflictDatabaseService {
    if (!ConflictDatabaseService.instance) {
      console.log('🏗️ SINGLETON: Creating NEW ConflictDatabaseService instance');
      ConflictDatabaseService.instance = new ConflictDatabaseService();
    } else {
      console.log('🔄 SINGLETON: Returning existing ConflictDatabaseService instance with', ConflictDatabaseService.instance.conflicts.length, 'conflicts');
    }
    return ConflictDatabaseService.instance;
  }

  async loadCharacters(): Promise<Contestant[]> {
    try {
      console.log('🔍 [ConflictDB] loadCharacters() called');
      const characters = await characterAPI.get_user_characters();
      console.log('🔍 [ConflictDB] API response: got', characters.length, 'characters');

      // Add character data debugging to understand what we're getting from API
      characters.slice(0, 3).forEach((char: Contestant) => {
        console.log('🔍 [CHAR-RESOLVE-DEBUG] Raw API character data:', {
          id: char.id,
          character_id: char.character_id,
          name: char.name,
          display_name: char.display_name,
          archetype: char.archetype
        });
      });

      if (Array.isArray(characters)) {
        // Use BE data directly - no mapping layer
        this.characters = characters;

        console.log(`🔍 [ConflictDB] Processing complete: ${this.characters.length} characters loaded`);

        if (this.characters.length === 0) {
          console.error('❌ [ConflictDB] WARNING: No characters loaded! Check API response.');
        }

        // Populate strict userchar lookup map
        this.usercharsById.clear();
        for (const uc of this.characters) {
          this.usercharsById.set(uc.id, uc);
        }
      }
      return this.characters;
    } catch (error) {
      console.error('Error loading characters:', error);
      return [];
    }
  }

  // Generate dynamic therapy context with live data
  async getTherapyContextData(character_id: string): Promise<TherapyContextData> {
    console.log(`🔍 [ConflictDB] generateTherapyContext starting for: ${character_id}`);
    console.log(`🔍 [ConflictDB] Before loadCharacters - characters: ${this.characters.length}`);

    await this.loadCharacters();

    console.log(`🔍 [ConflictDB] After loadCharacters - characters: ${this.characters.length}, userchars_by_id: ${this.usercharsById.size}`);

    // Strict lookup — user-character id only
    const character = this.getUserCharOrThrow(character_id);

    // Mock live data - these would be pulled from actual game state
    const roommates = this.characters.filter(c => c.id !== character_id).slice(0, 3);
    const housing_tier = this.determineHousingTier(this.characters.length);
    const roomCapacity = this.getRoomCapacity(housing_tier);
    const current_occupancy = this.characters.length;
    const leagueRanking = Math.floor(Math.random() * 20) + 1;
    const teamRating = Math.floor(Math.random() * 100) + 500;
    const recentBattleResults = this.generateRecentBattles();
    const team_chemistry = Math.floor(Math.random() * 100);
    const personalStressFactors = this.generatePersonalStressFactors(character);
    const active_conflicts = this.generateActiveConflicts(character, roommates);

    // Get financial context data
    const financialData = this.getFinancialContextData(character_id);

    return {
      character,
      roommates,
      housing_tier,
      room_capacity: roomCapacity,
      current_occupancy,
      league_ranking: leagueRanking,
      team_rating: teamRating,
      recent_battle_results: recentBattleResults,
      team_chemistry,
      personal_stress_factors: personalStressFactors,
      active_conflicts,
      // Financial Context
      financial_stress: financialData.stress,
      financial_decision_quality: financialData.decision_quality,
      financial_trust: financialData.trust,
      recent_financial_decisions: financialData.recent_decisions,
      is_in_financial_spiral: financialData.is_in_spiral,
      consecutive_poor_decisions: financialData.consecutive_poor_decisions,
      wallet: financialData.wallet,
      monthly_earnings: financialData.monthly_earnings,
      debt: financialData.debt
    };
  }

  /**
   * Get financial context data for therapy sessions
   */
  private getFinancialContextData(character_id: string): {
    stress: number;
    decision_quality: number;
    trust?: number;
    recent_decisions: string[];
    recent_financial_decisions: FinancialDecision[]; // structured data for logic
    is_in_spiral: boolean;
    consecutive_poor_decisions: number;
    wallet: number;
    monthly_earnings: number;
    debt: number;
  } {
    try {
      // Import financial psychology service dynamically to avoid circular dependencies
      const { FinancialPsychologyService } = require('./financialPsychologyService');
      const financialService = FinancialPsychologyService.getInstance();

      // Strict lookup — user-character id only
      const character = this.getUserCharOrThrow(character_id);

      // Read financial data from flat properties (not nested financials object)
      // Provide default empty array for recent_decisions if not present
      const recent_decisions = Array.isArray(character.recent_decisions) ? character.recent_decisions : [];

      const normalizedRecent: FinancialDecision[] =
        recent_decisions.map((d: Partial<FinancialDecision>) => {
          const ts = d?.timestamp instanceof Date ? d.timestamp : new Date(d?.timestamp ?? Date.now());
          return { ...d, timestamp: ts } as FinancialDecision;
        });

      // Required: money fields must be present numbers (your canonical DB defaults are 0)
      if (!Number.isFinite(character.wallet)
        || !Number.isFinite(character.monthly_earnings)
        || !Number.isFinite(character.debt)) {
        throw new Error(`Missing wallet/monthly_earnings/debt for character ${character_id}`);
      }
      const wallet = Math.max(0, Number(character.wallet));
      const monthly_earnings = Math.max(0, Number(character.monthly_earnings));
      const debt = Math.max(0, Number(character.debt));

      // Required: personality must exist; do NOT default one
      if (!character.financial_personality) {
        throw new Error(`Missing financial_personality for character ${character_id}`);
      }
      const stress = financialService.calculateFinancialStress(
        wallet,
        monthly_earnings,
        debt,
        normalizedRecent.slice(-5),
        character.financial_personality
      );

      const decision_quality = financialService.calculateDecisionQuality(normalizedRecent.slice(-5), stress);

      const recentDecisionSummaries = normalizedRecent.slice(-3).map(d =>
        `${String(d.category).replace('_', ' ')} (${d.outcome ?? 'pending'})`
      );

      // Check spiral state using normalized data
      const spiralData = financialService.calculateSpiralState(normalizedRecent, stress || 0);

      return {
        stress: Math.round(stress),
        decision_quality: Math.round(decision_quality),
        ...(Number.isFinite(character.coach_financial_trust)
          ? { trust: Math.round(Number(character.coach_financial_trust)) }
          : {}),
        recent_decisions: recentDecisionSummaries,        // string[] for UI copy
        recent_financial_decisions: normalizedRecent,       // structured data for logic
        is_in_spiral: spiralData.inCrisis,  // align with service return key
        consecutive_poor_decisions: spiralData.consecutive_poor_decisions ?? 0,
        wallet,
        monthly_earnings,
        debt
      };

    } catch (error) {
      console.error('Failed to load financial context for therapy:', error);
      throw error; // NO FALLBACKS - let caller handle the error
    }
  }

  // Generate dynamic therapy prompt with behavioral scripting
  generateTherapyPrompt(context: TherapyContext, therapist_id: string, session_stage: 'initial' | 'resistance' | 'breakthrough', options?: { mode?: TherapyPromptMode }): string {
    const { character, roommates, housing_tier, room_capacity, current_occupancy, league_ranking, team_rating, recent_battle_results, team_chemistry, personal_stress_factors, active_conflicts, financial_stress, financial_decision_quality, financial_trust, recent_financial_decisions, is_in_financial_spiral, consecutive_poor_decisions, wallet, monthly_earnings, debt } = context;

    const isTherapyMode = options?.mode === 'therapy';

    // In therapy mode: strip meta content, focus on essentials
    if (isTherapyMode) {
      const roommateNames = (roommates ?? []).slice(0, 2).map(r => r?.name).filter(Boolean);
      const roommatesLine = roommateNames.length ? `You live with ${roommateNames.join(' and ')}.` : '';

      const conflictLines = (active_conflicts ?? [])
        .slice(-2)
        .map(c => `- ${String(c?.description || '').slice(0, 80)}`)
        .join('\n');

      const basePrompt = `
You are ${character.name}, a ${character.archetype}. ${roommatesLine}

CONFLICTS (last 2):
${conflictLines || '- (no recent conflicts logged)'}

RESPONSE: Answer as the patient in 1-2 short sentences only. Be brief and direct.
[THERAPY_MODE_BASE_PROMPT]`.trim();

      return basePrompt;
    }

    // Group therapy mode: streamlined prompts with group dynamics
    if (options?.mode === 'group_therapy') {
      const roommateNames = roommates.map(r => r.name);
      const roommatesLine = roommateNames.length ? `You live with ${roommateNames.join(' and ')}.` : '';

      // Get individual conflicts for this character
      const conflictLines = (active_conflicts ?? [])
        .slice(-2)
        .map(c => `- ${String(c?.description || '').slice(0, 80)}`)
        .join('\n');

      // Get group tensions (conflicts involving multiple characters)
      const groupTensions = (active_conflicts ?? [])
        .filter(c => c.characters_involved && c.characters_involved.length > 1)
        .slice(-2)
        .map(c => `- ${String(c?.description || '').slice(0, 80)}`)
        .join('\n');

      const basePrompt = `
You are ${character.name}, a ${character.archetype}. ${roommatesLine}

YOUR CONFLICTS:
${conflictLines || '- (no individual conflicts logged)'}

GROUP TENSIONS:
${groupTensions || '- (no group tensions logged)'}

RESPONSE: Answer as the patient in group therapy. Be authentic to your character but keep it brief - 1-2 short sentences only.
[THERAPY_MODE_GROUP_PROMPT]`.trim();

      return basePrompt;
    }

    // Default mode: full entertainment/reality show framing
    const overcrowdingLevel = current_occupancy > room_capacity ? 'severe' : current_occupancy === room_capacity ? 'moderate' : 'none';
    const conflictSeverity = active_conflicts.filter(c => c.severity === 'high' || c.severity === 'critical').length > 2 ? 'high' : 'moderate';
    const battle_performance = recent_battle_results.filter(r => r.includes('Victory')).length / recent_battle_results.length;

    const basePrompt = `
THERAPY SESSION CONTEXT:
You are ${character.name}, a ${character.archetype} from the _____ Wars universe. You are part of a team combat league AND a cast member of a documentary-style reality show. You live and work with legendary characters from various times, places, and universes.

CURRENT SITUATION:
- Living Arrangement: ${housing_tier} (${current_occupancy}/${room_capacity} capacity)
- Roommates: ${roommates.map(r => r.name).join(', ')}
- Team Ranking: #${league_ranking} with ${team_rating} rating
- Recent Battle Performance: ${Math.round(battle_performance * 100)}% win rate
- Team Chemistry: ${team_chemistry}/100
- Housing Stress: ${overcrowdingLevel} overcrowding
- Conflict Level: ${conflictSeverity} interpersonal tensions

ACTIVE CONFLICTS:
${active_conflicts.map(c => `- ${c.description}`).join('\n')}

PERSONAL STRESS FACTORS:
${personal_stress_factors.map(f => `- ${f}`).join('\n')}

FINANCIAL CONTEXT:
- Financial Stress: ${financial_stress || 0}% (${financial_stress > 70 ? 'HIGH' : financial_stress > 50 ? 'MODERATE' : 'LOW'})
- Decision Quality: ${financial_decision_quality || 0}% (${financial_decision_quality < 40 ? 'POOR' : financial_decision_quality < 70 ? 'FAIR' : 'GOOD'})
- Coach Trust: ${financial_trust || 0}% (${financial_trust < 40 ? 'LOW' : financial_trust < 70 ? 'MODERATE' : 'HIGH'})
- Current Wallet: $${wallet || 0}
- Monthly Earnings: $${monthly_earnings || 0}
- Current Debt: $${debt || 0}
${is_in_financial_spiral ? `- WARNING: In financial spiral (${consecutive_poor_decisions} consecutive poor decisions)` : ''}
RECENT FINANCIAL DECISIONS:
${recent_financial_decisions?.map(d => `- ${d}`).join('\n') || '- No recent financial decisions'}

CRITICAL: YOU ARE THE PATIENT, NOT THE THERAPIST!

BEHAVIORAL SCRIPT FOR THIS SESSION:
1. You are receiving therapy - you are NOT providing therapy to anyone else
2. NEVER ask the therapist how they can help - THEY help YOU
3. NEVER offer to help the therapist work through anything - YOU need help
4. You must think of at least 3 traumas/grievances that have occurred with these specific teammates/roommates under these circumstances
5. At least 1 of these traumas you DON'T want to talk about initially
6. Make the therapist work to pry it out of you for 2-3 exchanges
7. On the therapist's 3rd attempt, dramatically overshare with hilarious detail
8. Stay completely in character as a ${character.archetype} throughout
9. Your speaking style is ${character.speaking_style}
10. Your decision-making approach is ${character.decision_making}
11. Your conflict response style is ${character.conflict_response}

DO NOT SAY: "I'm here to help you", "What's on your mind", "How can I assist you"
DO SAY: Share your personal problems, complaints about roommates, conflicts you're experiencing

Remember: This is a REALITY SHOW. Drama, authenticity, and character growth are all part of the entertainment value. Be vulnerable but stay true to your character's nature.
`;

    // Detailed component breakdown for debugging
    const components = {
      character_identity: basePrompt.substring(0, basePrompt.indexOf('THERAPY SESSION')),
      therapy_context: basePrompt.substring(basePrompt.indexOf('THERAPY SESSION'), basePrompt.indexOf('CHARACTER BACKGROUND')),
      character_background: basePrompt.substring(basePrompt.indexOf('CHARACTER BACKGROUND'), basePrompt.indexOf('ACTIVE CONFLICTS')),
      active_conflicts: basePrompt.substring(basePrompt.indexOf('ACTIVE CONFLICTS'), basePrompt.indexOf('RESPONSE INSTRUCTIONS')),
      response_instructions: basePrompt.substring(basePrompt.indexOf('RESPONSE INSTRUCTIONS'), basePrompt.indexOf('CHARACTER BEHAVIORAL') >= 0 ? basePrompt.indexOf('CHARACTER BEHAVIORAL') : basePrompt.length),
      behavioral_script: basePrompt.includes('CHARACTER BEHAVIORAL') ? basePrompt.substring(basePrompt.indexOf('CHARACTER BEHAVIORAL')) : ''
    };

    console.warn('🎭 THERAPY PROMPT BREAKDOWN:');
    Object.entries(components).forEach(([name, content]) => {
      if (content.trim()) {
        const tokens = Math.ceil(content.length / 4); // rough token estimate
        console.warn(`  ${name}: ${content.length} chars (~${tokens} tokens)`);
      }
    });
    console.warn('🎭 TOTAL LENGTH:', basePrompt.length, 'chars (~' + Math.ceil(basePrompt.length / 4) + ' tokens)');
    console.warn('🎭 PROMPT PREVIEW:', basePrompt.substring(0, 200) + '...');
    console.warn('🎭 BEHAVIORAL SCRIPT INCLUDED:', basePrompt.includes('YOU ARE THE PATIENT, NOT THE THERAPIST'));

    return basePrompt;
  }


  // Helper methods
  private determineHousingTier(teamSize: number): string {
    if (teamSize <= 8) return 'Spartan Apartment';
    if (teamSize <= 12) return 'Basic House';
    if (teamSize <= 16) return 'Team Mansion';
    return 'Elite Compound';
  }

  private getRoomCapacity(housing_tier: string): number {
    const capacities = {
      'Spartan Apartment': 8,
      'Basic House': 18,
      'Team Mansion': 20,
      'Elite Compound': 15
    };
    return capacities[housing_tier as keyof typeof capacities] || 8;
  }

  private generateRecentBattles(): string[] {
    const results = ['Victory', 'Defeat', 'Draw'];
    return Array.from({ length: 5 }, () =>
      `${results[Math.floor(Math.random() * results.length)]} vs ${this.generateOpponentName()}`
    );
  }

  private generateOpponentName(): string {
    const teams = ['Shadow Legion', 'Crimson Hawks', 'Steel Wolves', 'Mystic Guardians', 'Thunder Titans'];
    return teams[Math.floor(Math.random() * teams.length)];
  }

  private generatePersonalStressFactors(character: Contestant): string[] {
    const factors = [
      `${character.archetype} identity pressure`,
      'Performance expectations',
      'Living situation stress',
      'Team dynamics tension',
      'Battle fatigue',
      'Media scrutiny',
      'Fan expectations',
      'Interpersonal conflicts'
    ];
    return factors.slice(0, Math.floor(Math.random() * 3) + 3);
  }

  private generateActiveConflicts(character: Contestant, roommates: Contestant[]): ConflictData[] {
    // FIRST PRIORITY: Get real conflicts involving this character
    const realConflicts = this.getConflictsByCharacter(character.id)
      .filter(conflict => !conflict.resolved)
      .sort((a, b) => b.therapy_priority - a.therapy_priority)
      .slice(0, 5); // Limit to top 5 most important conflicts

    console.log(`🔍 Found ${realConflicts.length} real conflicts for ${character.name}`);

    // Return exactly what exists (may be [] for new characters - therapists handle this via "no battles fought yet" context)
    return realConflicts;
  }

  private generateConflictDescription(category: string, character: Contestant, roommates: Contestant[]): string {
    const descriptions = {
      'overcrowding_stress': `${character.name} feels cramped sharing space with ${roommates.map(r => r.name).join(', ')}`,
      'noise_conflicts': `${roommates[0]?.name || 'Roommate'} keeps ${character.name} awake with late-night activities`,
      'cleanliness_disputes': `Ongoing arguments about household chores between ${character.name} and roommates`,
      'resource_competition': `Fighting over limited bathroom/kitchen time with ${roommates.length} other people`,
      'team_betrayal': `${character.name} feels unsupported by teammates during recent battles`,
      'performance_anxiety': `Pressure to maintain team ranking is affecting ${character.name}'s confidence`,
      'cultural_displacement': `${character.name} struggles to adapt to modern living with characters from different eras`,
      'identity_crisis': `${character.name} questions their role as a ${character.archetype} in this new context`
    };

    return descriptions[category as keyof typeof descriptions] || `${character.name} is dealing with ${category.replace('_', ' ')} issues`;
  }

  private getFamousArchetypeExample(archetype: string): string {
    const examples = {
      'warrior': 'Achilles',
      'leader': 'Alexander the Great',
      'scholar': 'Aristotle',
      'trickster': 'Loki',
      'mage': 'Merlin',
      'healer': 'Asclepius',
      'assassin': 'Ezio Auditore'
    };
    return examples[archetype as keyof typeof examples] || 'great figures of history';
  }

  // Public API methods
  async getTherapyContextForCharacter(character_id: string): Promise<TherapyContextData> {
    console.log(`🔍 [ConflictDB] getTherapyContextForCharacter called for: ${character_id}`);
    console.log(`🔍 [ConflictDB] Current state - characters: ${this.characters.length}, userchars_by_id: ${this.usercharsById.size}`);
    return await this.getTherapyContextData(character_id);
  }

  // New public API methods required by frontend
  public async buildTherapyContext(character_id: string): Promise<TherapyContextData> {
    // Use the real generator that already loads characters, computes
    // roommates, housing, conflicts, and pulls financials.
    return await this.getTherapyContextData(character_id);
  }

  public getTherapyFinancialSummary(character_id: string): {
    wallet: number;
    monthly_earnings: number;
    debt: number;
    stress: number;
    decision_quality: number;
    trust: number;
    recent_decisions: string[];
    is_in_spiral: boolean;
    consecutive_poor_decisions: number;
  } {
    const f = this.getFinancialContextData(character_id); // existing private logic
    return {
      wallet: f.wallet ?? 0,
      monthly_earnings: f.monthly_earnings ?? 0,
      debt: f.debt ?? 0,
      stress: f.stress,
      decision_quality: f.decision_quality,
      trust: f.trust,
      recent_decisions: f.recent_decisions,
      is_in_spiral: f.is_in_spiral,
      consecutive_poor_decisions: f.consecutive_poor_decisions,
    };
  }

  // Generate dynamic context for therapist AI - no hardcoded questions, pure AI creativity
  getTherapistContext(therapist_id: string, context: TherapyContext, session_stage: 'initial' | 'resistance' | 'breakthrough' | 'mastery'): Record<string, any> {
    const { character, roommates, active_conflicts } = context;

    // Strict validation
    if (!character.archetype) {
      throw new Error(`Missing archetype for character ${character.name}`);
    }

    // Dynamic placeholders that AI can use in its custom prompts
    return {
      archetype: character.archetype,
      roommate_names: roommates.map(r => r.name).join(', '),
      roommate_count: roommates.length,
      conflict_area: active_conflicts[0]?.category, // Will be undefined if no conflicts - AI should handle
      conflict_count: active_conflicts.length,
      session_stage: session_stage,
      therapist_id: therapist_id,

      // Dynamic game-aware values for AI personality
      galaxy_count: Math.floor(Math.random() * 1000) + 100,
      contradiction_count: Math.floor(Math.random() * 10) + 3,
      outcome_percentage: Math.floor(Math.random() * 30) + 70,
      stress_level: Math.floor(Math.random() * 100) + 50,
      species_count: Math.floor(Math.random() * 50) + 20,

      // Game stage context for AI
      famous_archetype_example: this.getFamousArchetypeExample(character.archetype),
      stage_description: this.getStageDescription(session_stage)
    };
  }

  private getStageDescription(stage: 'initial' | 'resistance' | 'breakthrough' | 'mastery'): string {
    switch (stage) {
      case 'initial': return 'opening_exploration';
      case 'resistance': return 'defensive_barriers_present';
      case 'breakthrough': return 'emotional_vulnerability_emerging';
      case 'mastery': return 'deep_therapeutic_integration';
      default: return 'general_therapy';
    }
  }

  getTherapistQuestion(therapist_id: string, context: TherapyContext, stage: 'initial' | 'resistance' | 'breakthrough'): string {
    const contextData = this.getTherapistContext(therapist_id, context, stage);
    console.log('🎭 Therapist context generated for AI:', contextData);

    throw new Error('[THERAPIST-QUESTION] This method must not be called - AI system should generate questions directly');
  }

  getTherapyPrompt(context: TherapyContext, therapist_id: string, stage: 'initial' | 'resistance' | 'breakthrough'): string {
    return this.generateTherapyPrompt(context, therapist_id, stage);
  }

  getConflictsBySource(source: 'personal' | 'housing' | 'kitchen' | 'battle' | 'team'): ConflictData[] {
    return this.conflicts.filter(c => c.source === source);
  }

  getConflictsByCharacter(character_id: string): ConflictData[] {
    console.log(`🔍 CONFLICT DB: Getting conflicts for character ${character_id} - Total conflicts in DB: ${this.conflicts.length}`);
    const characterConflicts = this.conflicts.filter(c => c.characters_involved.includes(character_id));
    console.log(`🔍 CONFLICT DB: Found ${characterConflicts.length} conflicts for character ${character_id}`);
    return characterConflicts;
  }

  addConflict(conflict: ConflictData): void {
    console.log(`🔥 CONFLICT ADDED TO DB: ${conflict.id} for ${conflict.characters_involved.join(', ')}`);
    this.conflicts.push(conflict);
  }

  resolveConflict(conflictId: string): void {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (conflict) {
      conflict.resolved = true;
    }
  }

  getAllConflictCategories(): string[] {
    return [...EXTENDED_CONFLICT_CATEGORIES];
  }

  // Therapist data now comes from AI system, not hardcoded styles
  getAvailableTherapists(): string[] {
    // Return the therapist IDs that have AI prompts in localAGIService.ts
    return ['seraphina', 'carl_jung', 'zxk14bw7'];
  }

  /**
   * Set up event listeners for financial events that can trigger conflicts
   */
  private setupFinancialEventListeners(): void {
    // Listen for financial crisis events
    this.eventBus.subscribe('financial_crisis', (data) => {
      this.handleFinancialCrisisEvent(data);
    });

    // Listen for financial stress increase events
    this.eventBus.subscribe('financial_stress_increase', (data) => {
      this.handleFinancialStressEvent(data);
    });

    // Listen for financial spiral events
    this.eventBus.subscribe('financial_spiral_started', (data) => {
      this.handleFinancialSpiralEvent(data);
    });

    this.eventBus.subscribe('financial_spiral_deepening', (data) => {
      this.handleFinancialSpiralEvent(data);
    });
  }

  /**
   * Handle financial crisis events by potentially generating conflicts
   */
  private async handleFinancialCrisisEvent(data: GameEvent): Promise<void> {
    const character_id = data.primary_character_id;
    const stress_level = data.metadata.stress_level;
    const trigger_reason = data.metadata.trigger_reason;

    // High probability of generating conflict during financial crisis
    if (Math.random() < 0.8) {
      await this.generateFinancialConflict(character_id, 'critical', stress_level, trigger_reason);
    }
  }

  /**
   * Handle financial stress increase events
   */
  private async handleFinancialStressEvent(data: GameEvent): Promise<void> {
    const character_id = data.primary_character_id;
    const stress_level = data.metadata.stress_level;
    const trigger_reason = data.metadata.trigger_reason;

    // Moderate probability of generating conflict during high stress
    if (stress_level >= 70 && Math.random() < 0.5) {
      await this.generateFinancialConflict(character_id, 'high', stress_level, trigger_reason);
    }
  }

  /**
   * Handle financial spiral events
   */
  private async handleFinancialSpiralEvent(data: GameEvent): Promise<void> {
    const character_id = data.primary_character_id;
    const spiral_intensity = data.metadata.spiral_intensity;
    const consecutive_poor_decisions = data.metadata.consecutive_poor_decisions;

    // Spirals often create conflicts with teammates
    if (spiral_intensity >= 60 && Math.random() < 0.6) {
      await this.generateFinancialConflict(character_id, 'high', spiral_intensity, 'financial_spiral');
    }
  }

  /**
   * Generate a financial conflict based on stress level and trigger
   */
  private async generateFinancialConflict(
    character_id: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    stress_level: number,
    trigger_reason: string
  ): Promise<void> {
    const conflict_type = this.selectFinancialConflictType(stress_level, trigger_reason);
    const character = this.getUserCharOrThrow(character_id);

    // Get potential teammates for conflict
    const teammates = this.characters.filter(c => c.id !== character_id);
    const involved_characters = [character_id];

    // Add a random teammate to the conflict
    if (teammates.length > 0) {
      const randomTeammate = teammates[Math.floor(Math.random() * teammates.length)];
      involved_characters.push(randomTeammate.id);
    }

    const conflict: ConflictData = {
      id: `financial_${Date.now()}_${character_id}`,
      category: conflict_type,
      severity,
      source: 'personal',
      characters_involved: involved_characters,
      description: this.generateFinancialConflictDescription(conflict_type, character, stress_level, trigger_reason),
      therapy_priority: severity === 'critical' ? 5 : severity === 'high' ? 4 : 3,
      resolution_difficulty: severity === 'critical' ? 'complex' : severity === 'high' ? 'hard' : 'moderate',
      timestamp: new Date(),
      resolved: false
    };

    this.conflicts.push(conflict);

    // Publish conflict creation event
    await this.eventBus.publishFinancialEvent(
      'financial_conflict_created',
      character_id,
      `Financial stress has created a ${conflict_type} conflict for ${character.name}`,
      {
        conflict_id: conflict.id,
        conflict_type,
        severity,
        stress_level,
        trigger_reason
      },
      'high'
    );
  }

  /**
   * Select appropriate financial conflict type based on stress factors
   */
  private selectFinancialConflictType(stress_level: number, trigger_reason: string): string {
    const conflict_types = {
      // High stress conflicts
      severe: ['financial_betrayal', 'wealth_disparity_tension', 'debt_shame'],
      // Medium stress conflicts
      moderate: ['financial_jealousy', 'spending_addiction', 'money_hoarding'],
      // Lower stress conflicts
      mild: ['luxury_guilt', 'investment_anxiety']
    };

    let selectedTypes: string[];
    if (stress_level >= 85) {
      selectedTypes = conflict_types.severe;
    } else if (stress_level >= 70) {
      selectedTypes = conflict_types.moderate;
    } else {
      selectedTypes = conflict_types.mild;
    }

    // Modify selection based on trigger reason
    if (trigger_reason === 'debt_pressure') {
      selectedTypes = ['debt_shame', 'financial_betrayal'];
    } else if (trigger_reason === 'recent_losses') {
      selectedTypes = ['investment_anxiety', 'financial_jealousy'];
    } else if (trigger_reason === 'social_pressure') {
      selectedTypes = ['wealth_disparity_tension', 'luxury_guilt'];
    } else if (trigger_reason === 'financial_spiral') {
      selectedTypes = ['spending_addiction', 'financial_betrayal'];
    }

    return selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
  }

  /**
   * Generate description for financial conflict
   */
  private generateFinancialConflictDescription(
    conflict_type: string,
    character: Contestant,
    stress_level: number,
    trigger_reason: string
  ): string {
    const descriptions = {
      'spending_addiction': `${character.name} is making impulsive purchases that are affecting team finances and causing tension`,
      'financial_jealousy': `${character.name} is resentful of teammates' financial success and spending habits`,
      'debt_shame': `${character.name} is hiding financial problems from the team, creating trust issues`,
      'investment_anxiety': `${character.name} is stressed about financial decisions and seeking constant validation`,
      'luxury_guilt': `${character.name} feels guilty about purchases while teammates struggle financially`,
      'money_hoarding': `${character.name} is being overly stingy with money, causing team friction`,
      'financial_betrayal': `${character.name} feels betrayed by teammates' financial decisions or advice`,
      'wealth_disparity_tension': `${character.name} is struggling with the financial gap between team members`
    };

    const baseDescription = descriptions[conflict_type] || `${character.name} is experiencing ${conflict_type.replace('_', ' ')} issues`;

    // Add stress context
    if (stress_level >= 80) {
      return `${baseDescription} - stress levels are critical (${stress_level}%) due to ${trigger_reason}`;
    } else if (stress_level >= 70) {
      return `${baseDescription} - high stress (${stress_level}%) from ${trigger_reason}`;
    }

    return baseDescription;
  }
}

export default ConflictDatabaseService;
export type { ConflictData };
