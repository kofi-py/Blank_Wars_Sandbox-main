"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridAdapter = void 0;
const PostgresAdapter_1 = require("./PostgresAdapter");
const RedisAdapter_1 = require("./RedisAdapter");
/**
 * Hybrid adapter that combines Redis (hot storage) with PostgreSQL (persistent storage)
 * Optimized for the prompt injection memory system
 */
class HybridAdapter {
    constructor(postgresUrl, redisUrl) {
        // Cache settings
        this.HOT_MEMORY_THRESHOLD = 70; // Importance threshold for hot cache
        this.RECENT_HOURS_THRESHOLD = 24; // Hours for "recent" events
        this.postgres = new PostgresAdapter_1.PostgresAdapter(postgresUrl);
        this.redis = new RedisAdapter_1.RedisAdapter(redisUrl);
    }
    // IEventStore Implementation
    async saveEvent(event) {
        // Save to both systems in parallel
        await Promise.all([
            this.postgres.saveEvent(event),
            this.redis.saveEvent(event)
        ]);
    }
    async getById(id) {
        // Try Redis first (faster)
        const redisResult = await this.redis.getById?.(id);
        if (redisResult)
            return redisResult;
        // Fallback to PostgreSQL
        return this.postgres.getById(id);
    }
    async getRecent(characterId, hours) {
        if (hours <= this.RECENT_HOURS_THRESHOLD) {
            // Use Redis for recent events
            return this.redis.getRecent(characterId, hours);
        }
        else {
            // Use PostgreSQL for longer history
            return this.postgres.getRecent(characterId, hours);
        }
    }
    // IMemoryStore Implementation  
    async saveMemory(memory) {
        // Always save to PostgreSQL
        await this.postgres.saveMemory(memory);
        // Save to Redis cache
        await this.redis.saveMemory(memory);
    }
    async getByCharacter(characterId, limit) {
        // Try Redis first for recent/hot memories
        const redisMemories = await this.redis.getByCharacter(characterId, limit);
        if (redisMemories.length > 0) {
            return redisMemories;
        }
        // Fallback to PostgreSQL
        const pgMemories = await this.postgres.getByCharacter(characterId, limit);
        // Cache some results in Redis for next time
        if (pgMemories.length > 0) {
            const topMemories = pgMemories.slice(0, 10);
            await Promise.all(topMemories.map(m => this.redis.saveMemory(m)));
        }
        return pgMemories;
    }
    async getByEvent(eventId) {
        // Try Redis first
        const redisResult = await this.redis.getByEvent(eventId);
        if (redisResult.length > 0)
            return redisResult;
        // Fallback to PostgreSQL
        return this.postgres.getByEvent(eventId);
    }
    async updateRecall(memoryId) {
        await Promise.all([
            this.postgres.updateRecall(memoryId),
            this.redis.updateRecall(memoryId)
        ]);
    }
    // IRelationshipStore Implementation
    async saveRelationship(relationship) {
        await Promise.all([
            this.postgres.saveRelationship(relationship),
            this.redis.saveRelationship(relationship)
        ]);
    }
    async get(characterId, targetId) {
        // Try Redis cache first
        const cached = await this.redis.get(characterId, targetId);
        if (cached)
            return cached;
        // Get from PostgreSQL and cache
        const relationship = await this.postgres.get(characterId, targetId);
        if (relationship) {
            await this.redis.saveRelationship(relationship);
        }
        return relationship;
    }
    async getForCharacter(characterId) {
        // Try Redis first
        const redisResult = await this.redis.getForCharacter(characterId);
        if (redisResult.length > 0)
            return redisResult;
        // Fallback to PostgreSQL and cache results
        const pgResult = await this.postgres.getForCharacter(characterId);
        if (pgResult.length > 0) {
            await Promise.all(pgResult.map(r => this.redis.saveRelationship(r)));
        }
        return pgResult;
    }
    // Additional helper method for relationship updates
    async updateRelationship(characterId, targetId, changes) {
        await this.postgres.updateRelationship(characterId, targetId, changes);
        // Invalidate Redis cache by removing it
        const dummyRelationship = {
            characterId,
            targetId,
            trust: changes.trust,
            respect: changes.respect,
            affection: changes.affection,
            history: [],
            trajectory: 'stable',
            tensionPoints: []
        };
        // Re-cache the updated relationship
        const updated = await this.postgres.get(characterId, targetId);
        if (updated) {
            await this.redis.saveRelationship(updated);
        }
    }
    // Extended Methods for Prompt Building
    /**
     * Get memories optimized for a specific scene with smart caching
     */
    async getMemoriesForScene(characterId, sceneType, otherCharacters = []) {
        // Check cache first
        const cacheKey = `${sceneType}:${otherCharacters.sort().join(',')}`;
        const cached = await this.redis.getCachedSceneContext?.(characterId, cacheKey);
        if (cached && this.isCacheValid(cached.timestamp)) {
            return cached.memories;
        }
        // Get optimized memories - fallback to regular getByCharacter if method doesn't exist
        const memories = await this.getByCharacter(characterId, 20);
        // Cache the result
        await this.redis.cacheSceneContext?.(characterId, cacheKey, {
            memories,
            timestamp: Date.now()
        });
        return memories;
    }
    /**
     * Get full prompt context with performance optimization
     */
    async getPromptContext(characterId, sceneType, otherCharacters = []) {
        // Fetch everything in parallel for performance
        const [recentEvents, relevantMemories, relationshipsData, emotionalState] = await Promise.all([
            this.getRecent(characterId, 6), // Last 6 hours
            this.getMemoriesForScene(characterId, sceneType, otherCharacters),
            Promise.all(otherCharacters.map(id => this.get(characterId, id))),
            this.getEmotionalState(characterId)
        ]);
        const relationships = relationshipsData.filter(r => r !== null);
        return {
            recentEvents,
            relevantMemories,
            relationships,
            emotionalState
        };
    }
    async getEmotionalState(characterId) {
        // For now, return a default emotional state
        // This would need to be implemented in PostgresAdapter properly
        return {
            stress: 30,
            confidence: 50,
            currentMood: 'neutral',
            activeConflicts: []
        };
    }
    // Real-time Event Subscription
    async subscribeToEvents(callback, options) {
        return this.redis.subscribeToEvents?.(callback, options) || (() => { });
    }
    // Performance and Monitoring
    async getPerformanceMetrics() {
        const redisMetrics = await this.redis.getEventMetrics?.() || {};
        return {
            redis: redisMetrics,
            postgres: { connectionCount: 0 }, // Would need actual implementation
            cacheHitRate: 0 // Would track this over time
        };
    }
    // Memory Management
    async runMaintenance() {
        await Promise.all([
            this.redis.trackMemoryDecay?.(),
            this.runMemoryDecay()
        ]);
    }
    async runMemoryDecay() {
        // Run PostgreSQL decay function
        // This would execute the decay_memories() function we created
    }
    isCacheValid(timestamp) {
        const maxAge = 10 * 60 * 1000; // 10 minutes
        return Date.now() - timestamp < maxAge;
    }
    // Cleanup
    async close() {
        await Promise.all([
            this.postgres.close(),
            this.redis.close()
        ]);
    }
    // Batch Operations for Performance
    async batchSaveEvents(events) {
        // Save all events in parallel
        await Promise.all(events.map(event => this.saveEvent(event)));
    }
    async batchSaveMemories(memories) {
        // Save all memories in parallel
        await Promise.all(memories.map(memory => this.saveMemory(memory)));
    }
    // Advanced Querying
    async findMemoryContradictions(characterId) {
        // This would use the memory_contradictions table
        // For now, return empty array
        return [];
    }
    async getMemoryCallbacks(characterId, currentScene) {
        const memories = await this.getByCharacter(characterId);
        return memories.filter(memory => memory.bestUsedIn.includes(currentScene) &&
            memory.recallCount < 3);
    }
}
exports.HybridAdapter = HybridAdapter;
