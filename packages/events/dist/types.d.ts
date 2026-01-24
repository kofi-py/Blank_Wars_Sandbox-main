export type EventType = 'battle_start' | 'battle_end' | 'battle_victory' | 'battle_defeat' | 'critical_hit' | 'strategy_success' | 'strategy_failure' | 'team_coordination' | 'individual_heroics' | 'battle_chat_conflict' | 'kitchen_argument' | 'bathroom_conflict' | 'bedroom_dispute' | 'meal_sharing' | 'cleaning_conflict' | 'noise_complaint' | 'alliance_formed' | 'alliance_broken' | 'gossip_session' | 'late_night_conversation' | 'group_activity' | 'living_complaint' | 'social_conflict' | 'kitchen_conversation' | 'privacy_concern' | 'public_callout' | 'battle_challenge_issued' | 'public_complaint' | 'group_therapy_session' | 'group_competition' | 'group_wellness_session' | 'group_activity_started' | 'therapy_session_start' | 'therapy_breakthrough' | 'therapy_resistance' | 'conflict_revealed' | 'conflict_resolved' | 'emotional_revelation' | 'group_therapy_insight' | 'therapist_intervention' | 'training_session' | 'skill_improvement' | 'mental_exhaustion' | 'training_injury' | 'new_technique_learned' | 'training_milestone' | 'sparring_session' | 'meditation_session' | 'performance_coaching' | 'equipment_advice' | 'skill_consultation' | 'personal_training' | 'team_meeting' | 'casual_conversation' | 'earnings_received' | 'financial_decision_pending' | 'financial_decision_made' | 'coach_financial_advice' | 'financial_stress_increase' | 'financial_stress_decrease' | 'luxury_purchase' | 'investment_made' | 'investment_outcome' | 'financial_crisis' | 'debt_incurred' | 'financial_breakthrough' | 'spending_spree' | 'financial_trauma' | 'trust_gained' | 'trust_lost';
export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SceneType = 'battle' | 'kitchen' | 'therapy' | 'training' | 'financial_advisory' | 'equipment_room' | 'social_lounge' | 'confessional' | 'group_activity' | 'team_meeting' | 'personal_chat' | 'headquarters';
export interface GameEvent {
    id: string;
    type: EventType;
    timestamp: Date;
    characterIds: string[];
    severity: EventSeverity;
    description: string;
    metadata: Record<string, any>;
    sceneRelevance: Partial<Record<SceneType, number>>;
    emotionalWeight: number;
    conflictPotential: number;
    comedyPotential: number;
    quotableScore: number;
}
export interface CharacterMemory {
    id: string;
    characterId: string;
    eventId: string;
    summary: string;
    detailedContent: string;
    emotionalContext: {
        feeling: string;
        intensity: number;
        valence: 'positive' | 'negative' | 'mixed';
    };
    importance: number;
    decay: number;
    lastRecalled: Date;
    recallCount: number;
    involvedCharacters: string[];
    relationshipImpact: Record<string, {
        trust: number;
        respect: number;
        affection: number;
    }>;
    bestUsedIn: SceneType[];
    triggerKeywords: string[];
    contradictsWith?: string[];
}
export interface PromptContext {
    character: string;
    scene: SceneType;
    otherCharacters: string[];
    recentEvents: GameEvent[];
    relevantMemories: CharacterMemory[];
    relationships: CharacterRelationship[];
    currentEmotionalState: EmotionalState;
}
export interface CharacterRelationship {
    characterId: string;
    targetId: string;
    trust: number;
    respect: number;
    affection: number;
    history: string[];
    trajectory: 'improving' | 'declining' | 'stable' | 'volatile';
    tensionPoints: string[];
}
export interface EmotionalState {
    stress: number;
    confidence: number;
    currentMood: string;
    recentTrauma?: string;
    activeConflicts: string[];
}
export interface SceneMemoryProfile {
    scene: SceneType;
    priorityCategories: EventType[];
    relevanceWeights: {
        recency: number;
        emotional: number;
        conflict: number;
        comedy: number;
    };
    maxMemories: number;
    mustInclude?: (memory: CharacterMemory) => boolean;
}
export interface MemoryFormatter {
    formatForPrompt(memories: CharacterMemory[], style: 'detailed' | 'summary'): string;
    selectBestMemories(all: CharacterMemory[], profile: SceneMemoryProfile): CharacterMemory[];
    generateContradictions(memories: CharacterMemory[]): string[];
    findCallbacks(current: SceneType, memories: CharacterMemory[]): string[];
}
