"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryContextBuilder = void 0;
/**
 * Builds optimized memory contexts for prompt injection
 * This is the core of making characters "remember" their experiences
 */
class MemoryContextBuilder {
    constructor(memoryStore, eventStore) {
        this.memoryStore = memoryStore;
        this.eventStore = eventStore;
    }
    /**
     * Build complete context for a scene
     */
    async buildContext(characterId, scene, otherCharacters = []) {
        // Get all relevant data in parallel
        const [recentEvents, allMemories, relationships, emotionalState] = await Promise.all([
            this.getRecentEvents(characterId, 6), // Last 6 hours
            this.memoryStore.getCharacterMemories(characterId),
            this.getRelationships(characterId, otherCharacters),
            this.getEmotionalState(characterId)
        ]);
        // Select best memories for this scene
        const relevantMemories = this.selectMemoriesForScene(allMemories, scene, otherCharacters, emotionalState);
        return {
            character: characterId,
            scene,
            otherCharacters,
            recentEvents,
            relevantMemories,
            relationships,
            currentEmotionalState: emotionalState
        };
    }
    /**
     * Select the most relevant memories for a specific scene
     */
    selectMemoriesForScene(allMemories, scene, otherCharacters, emotionalState) {
        const profile = this.getSceneProfile(scene);
        // Score each memory
        const scoredMemories = allMemories.map(memory => ({
            memory,
            score: this.scoreMemoryRelevance(memory, scene, otherCharacters, emotionalState, profile)
        }));
        // Sort by score and take top memories within token budget
        return scoredMemories
            .sort((a, b) => b.score - a.score)
            .slice(0, profile.maxMemories || 10)
            .map(({ memory }) => memory);
    }
    /**
     * Score how relevant a memory is for the current scene
     */
    scoreMemoryRelevance(memory, scene, otherCharacters, emotionalState, profile) {
        let score = 0;
        const weights = profile.relevanceWeights;
        // 1. Scene relevance (pre-computed)
        score += (memory.sceneRelevance[scene] || 0) * 0.3;
        // 2. Recency score
        const hoursSince = (Date.now() - memory.lastRecalled.getTime()) / (1000 * 60 * 60);
        const recencyScore = Math.max(0, 100 - hoursSince * 2); // Decay over time
        score += recencyScore * weights.recency;
        // 3. Emotional relevance
        if (emotionalState.stress > 70 && memory.emotionalContext.valence === 'negative') {
            score += 30 * weights.emotional; // Stressed characters dwell on negative memories
        }
        score += memory.emotionalContext.intensity * weights.emotional * 0.01;
        // 4. Character involvement
        const involvedOthers = memory.involvedCharacters.filter(id => otherCharacters.includes(id));
        if (involvedOthers.length > 0) {
            score += 40; // Big boost for memories involving present characters
        }
        // 5. Conflict relevance
        if (emotionalState.activeConflicts.some(conflict => memory.triggerKeywords.includes(conflict))) {
            score += 50 * weights.conflict;
        }
        // 6. Comedy potential (for callbacks)
        if (memory.comedyPotential > 70 && scene !== 'therapy') {
            score += memory.comedyPotential * weights.comedy * 0.01;
        }
        // 7. Importance and decay
        score += memory.importance * 0.2;
        score -= memory.decay * 0.1;
        return Math.max(0, Math.min(100, score));
    }
    /**
     * Format memories into prompt-ready text
     */
    formatMemoriesForPrompt(memories, style = 'summary') {
        if (memories.length === 0)
            return '';
        const formatted = memories.map(memory => {
            const timeAgo = this.getTimeAgo(memory.lastRecalled);
            const emotionalNote = memory.emotionalContext.intensity > 70
                ? ` (still ${memory.emotionalContext.feeling})`
                : '';
            if (style === 'detailed') {
                return `- ${timeAgo}: ${memory.detailedContent}${emotionalNote}`;
            }
            else {
                return `- ${memory.summary} (${timeAgo}${emotionalNote})`;
            }
        });
        return `Recent memories:\n${formatted.join('\n')}`;
    }
    /**
     * Find contradictions between memories for comedy/drama
     */
    findContradictions(memories) {
        const contradictions = [];
        for (let i = 0; i < memories.length; i++) {
            for (let j = i + 1; j < memories.length; j++) {
                const m1 = memories[i];
                const m2 = memories[j];
                // Check if memories reference contradictory behavior
                if (m1.contradictsWith?.includes(m2.id)) {
                    contradictions.push(`You said "${m1.summary}" but then did "${m2.summary}"`);
                }
            }
        }
        return contradictions;
    }
    /**
     * Generate callback opportunities from past memories
     */
    findCallbacks(currentScene, memories) {
        return memories
            .filter(m => m.comedyPotential > 60 &&
            m.bestUsedIn.includes(currentScene) &&
            m.recallCount < 3 // Don't overuse callbacks
        )
            .map(m => m.summary);
    }
    getTimeAgo(date) {
        const hours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
        if (hours < 1)
            return 'just now';
        if (hours < 24)
            return `${Math.floor(hours)} hours ago`;
        if (hours < 168)
            return `${Math.floor(hours / 24)} days ago`;
        return `${Math.floor(hours / 168)} weeks ago`;
    }
    getSceneProfile(scene) {
        const baseProfile = MemoryContextBuilder.SCENE_PROFILES[scene] || {};
        return {
            scene,
            priorityCategories: baseProfile.priorityCategories || [],
            relevanceWeights: baseProfile.relevanceWeights || {
                recency: 0.25,
                emotional: 0.25,
                conflict: 0.25,
                comedy: 0.25
            },
            maxMemories: baseProfile.maxMemories || 10
        };
    }
    // Placeholder interfaces - implement based on storage choice
    async getRecentEvents(characterId, hours) {
        return this.eventStore.getRecentEvents(characterId, hours);
    }
    async getRelationships(characterId, otherCharacters) {
        return this.memoryStore.getRelationships(characterId, otherCharacters);
    }
    async getEmotionalState(characterId) {
        return this.memoryStore.getEmotionalState(characterId);
    }
}
exports.MemoryContextBuilder = MemoryContextBuilder;
// Scene-specific memory selection profiles
MemoryContextBuilder.SCENE_PROFILES = {
    kitchen: {
        relevanceWeights: {
            recency: 0.3,
            emotional: 0.2,
            conflict: 0.4, // Kitchen drama!
            comedy: 0.1
        },
        priorityCategories: [
            'kitchen_argument', 'meal_sharing', 'living_complaint',
            'cleaning_conflict', 'alliance_formed', 'gossip_session'
        ]
    },
    therapy: {
        relevanceWeights: {
            recency: 0.2,
            emotional: 0.5, // Therapy focuses on feelings
            conflict: 0.2,
            comedy: 0.1
        },
        priorityCategories: [
            'therapy_breakthrough', 'emotional_revelation', 'conflict_revealed',
            'financial_trauma', 'training_injury', 'battle_defeat'
        ]
    },
    battle: {
        relevanceWeights: {
            recency: 0.4,
            emotional: 0.2,
            conflict: 0.3,
            comedy: 0.1
        },
        priorityCategories: [
            'battle_victory', 'battle_defeat', 'training_milestone',
            'strategy_success', 'individual_heroics', 'team_coordination'
        ]
    },
    financial_advisory: {
        relevanceWeights: {
            recency: 0.5, // Recent financial events matter most
            emotional: 0.3,
            conflict: 0.1,
            comedy: 0.1
        },
        priorityCategories: [
            'financial_crisis', 'luxury_purchase', 'investment_outcome',
            'financial_breakthrough', 'spending_spree', 'trust_lost'
        ]
    }
};
