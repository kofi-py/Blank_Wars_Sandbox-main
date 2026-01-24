"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEventBus = void 0;
const events_1 = require("events");
/**
 * Core event bus optimized for memory creation and prompt context building
 */
class GameEventBus extends events_1.EventEmitter {
    constructor() {
        super();
    }
    static getInstance() {
        if (!GameEventBus.instance) {
            GameEventBus.instance = new GameEventBus();
        }
        return GameEventBus.instance;
    }
    /**
     * Configure storage adapter (call once on startup)
     */
    configure(adapter) {
        this.adapter = adapter;
    }
    /**
     * Publish an event and create memories for all involved characters
     */
    async publish(event) {
        // Create full event with defaults
        const fullEvent = {
            ...event,
            id: this.generateId('event'),
            timestamp: new Date(),
            sceneRelevance: {},
            emotionalWeight: event.emotionalWeight || 50,
            conflictPotential: event.conflictPotential || 25,
            comedyPotential: event.comedyPotential || 25,
            quotableScore: event.quotableScore || 25
        };
        // Store event
        if (this.adapter) {
            await this.adapter.saveEvent(fullEvent);
        }
        // Create memories for each involved character
        const memories = await this.createMemoriesFromEvent(fullEvent);
        // Emit for real-time subscribers
        this.emit('event', fullEvent);
        this.emit(fullEvent.type, fullEvent);
        return fullEvent.id;
    }
    /**
     * Create character-specific memories from an event
     */
    async createMemoriesFromEvent(event) {
        const memories = [];
        for (const characterId of event.characterIds) {
            const memory = this.createMemoryForCharacter(event, characterId);
            memories.push(memory);
            if (this.adapter) {
                await this.adapter.saveMemory(memory);
            }
        }
        return memories;
    }
    /**
     * Create a memory from a character's perspective
     */
    createMemoryForCharacter(event, characterId) {
        const otherCharacters = event.characterIds.filter(id => id !== characterId);
        return {
            id: this.generateId('memory'),
            characterId,
            eventId: event.id,
            summary: event.description, // Simple implementation
            detailedContent: event.description,
            emotionalContext: {
                feeling: this.determineFeeling(event.type),
                intensity: Math.min(event.emotionalWeight, 100),
                valence: event.severity === 'critical' ? 'negative' : 'mixed'
            },
            importance: Math.min(event.emotionalWeight, 100),
            decay: 0,
            lastRecalled: new Date(),
            recallCount: 0,
            involvedCharacters: otherCharacters,
            relationshipImpact: {},
            bestUsedIn: this.determineBestScenes(event.type),
            triggerKeywords: event.description.toLowerCase().split(' ').slice(0, 5),
            contradictsWith: []
        };
    }
    determineFeeling(eventType) {
        const feelingMap = {
            'battle_victory': 'triumphant',
            'battle_defeat': 'defeated',
            'kitchen_argument': 'frustrated',
            'therapy_breakthrough': 'relieved',
            'financial_crisis': 'anxious'
        };
        return feelingMap[eventType] || 'neutral';
    }
    determineBestScenes(eventType) {
        const sceneMap = {
            // Battle Events
            'battle_start': ['battle', 'team_meeting'],
            'battle_end': ['battle', 'team_meeting'],
            'battle_victory': ['battle', 'team_meeting'],
            'battle_defeat': ['battle', 'team_meeting'],
            'critical_hit': ['battle'],
            'strategy_success': ['battle', 'training'],
            'strategy_failure': ['battle', 'training'],
            'team_coordination': ['battle', 'team_meeting'],
            'individual_heroics': ['battle', 'confessional'],
            'battle_chat_conflict': ['battle', 'therapy'],
            // Social/Living Events
            'kitchen_argument': ['kitchen', 'therapy'],
            'bathroom_conflict': ['kitchen', 'therapy'],
            'bedroom_dispute': ['kitchen', 'therapy'],
            'meal_sharing': ['kitchen', 'social_lounge'],
            'cleaning_conflict': ['kitchen', 'therapy'],
            'noise_complaint': ['kitchen', 'social_lounge'],
            'alliance_formed': ['social_lounge', 'team_meeting'],
            'alliance_broken': ['social_lounge', 'therapy'],
            'gossip_session': ['social_lounge', 'kitchen'],
            'late_night_conversation': ['social_lounge', 'personal_chat'],
            'group_activity': ['social_lounge', 'group_activity'],
            'living_complaint': ['kitchen', 'therapy'],
            'social_conflict': ['social_lounge', 'therapy'],
            'kitchen_conversation': ['kitchen', 'personal_chat'],
            // Therapy Events
            'therapy_session_start': ['therapy'],
            'therapy_breakthrough': ['therapy', 'personal_chat'],
            'therapy_resistance': ['therapy'],
            'conflict_revealed': ['therapy', 'team_meeting'],
            'conflict_resolved': ['therapy', 'team_meeting'],
            'emotional_revelation': ['therapy', 'confessional'],
            'group_therapy_insight': ['therapy', 'group_activity'],
            'therapist_intervention': ['therapy'],
            // Training Events
            'training_session': ['training', 'team_meeting'],
            'skill_improvement': ['training', 'personal_chat'],
            'mental_exhaustion': ['training', 'therapy'],
            'training_injury': ['training', 'therapy'],
            'new_technique_learned': ['training', 'team_meeting'],
            'training_milestone': ['training', 'confessional'],
            'sparring_session': ['training', 'battle'],
            'meditation_session': ['training', 'therapy'],
            // Financial Events
            'earnings_received': ['financial_advisory', 'confessional'],
            'financial_decision_pending': ['financial_advisory', 'therapy'],
            'financial_decision_made': ['financial_advisory', 'team_meeting'],
            'coach_financial_advice': ['financial_advisory', 'personal_chat'],
            'financial_stress_increase': ['financial_advisory', 'therapy'],
            'financial_stress_decrease': ['financial_advisory', 'confessional'],
            'luxury_purchase': ['financial_advisory', 'social_lounge'],
            'investment_made': ['financial_advisory'],
            'investment_outcome': ['financial_advisory', 'confessional'],
            'financial_crisis': ['financial_advisory', 'therapy'],
            'debt_incurred': ['financial_advisory', 'therapy'],
            'financial_breakthrough': ['financial_advisory', 'confessional'],
            'spending_spree': ['financial_advisory', 'social_lounge'],
            'financial_trauma': ['financial_advisory', 'therapy'],
            'trust_gained': ['personal_chat', 'team_meeting'],
            'trust_lost': ['personal_chat', 'therapy']
        };
        return sceneMap[eventType] || ['team_meeting'];
    }
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.GameEventBus = GameEventBus;
