"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisAdapter = void 0;
const ioredis_1 = require("ioredis");
/**
 * Redis adapter for hot storage and real-time event distribution
 * Stores recent events (last 2 weeks) for fast access
 */
class RedisAdapter {
    constructor(redisUrl) {
        // TTL settings (in seconds)
        this.EVENT_TTL = 14 * 24 * 60 * 60; // 14 days
        this.MEMORY_TTL = 7 * 24 * 60 * 60; // 7 days
        this.HOT_MEMORY_TTL = 24 * 60 * 60; // 24 hours
        this.redis = new ioredis_1.Redis(redisUrl);
        this.subscriber = new ioredis_1.Redis(redisUrl);
        this.publisher = new ioredis_1.Redis(redisUrl);
    }
    // IEventStore Implementation
    async saveEvent(event) {
        const key = `event:${event.id}`;
        const data = JSON.stringify(event);
        // Store event with TTL
        await this.redis.setex(key, this.EVENT_TTL, data);
        // Add to character event lists
        for (const characterId of event.characterIds) {
            const charKey = `character:${characterId}:events`;
            await this.redis.zadd(charKey, event.timestamp.getTime(), event.id);
            // Trim old events from sorted set
            const cutoff = Date.now() - (this.EVENT_TTL * 1000);
            await this.redis.zremrangebyscore(charKey, '-inf', cutoff);
        }
        // Add to event type index
        const typeKey = `events:type:${event.type}`;
        await this.redis.zadd(typeKey, event.timestamp.getTime(), event.id);
        // Publish for real-time subscribers
        await this.publishEvent(event);
    }
    async getById(id) {
        const key = `event:${id}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    async getRecent(characterId, hours) {
        const charKey = `character:${characterId}:events`;
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        // Get event IDs from sorted set
        const eventIds = await this.redis.zrevrangebyscore(charKey, '+inf', cutoff);
        if (eventIds.length === 0)
            return [];
        // Get event data
        const pipeline = this.redis.pipeline();
        for (const id of eventIds) {
            pipeline.get(`event:${id}`);
        }
        const results = await pipeline.exec();
        const events = [];
        if (results) {
            for (const [err, data] of results) {
                if (!err && data) {
                    events.push(JSON.parse(data));
                }
            }
        }
        return events;
    }
    // IMemoryStore Implementation
    async saveMemory(memory) {
        // Store in both hot cache and regular cache
        await this.saveHotMemory(memory);
        const key = `memory:${memory.characterId}:${memory.id}`;
        const data = JSON.stringify(memory);
        await this.redis.setex(key, this.MEMORY_TTL, data);
    }
    async getByCharacter(characterId, limit) {
        const charKey = `character:${characterId}:hot_memories`;
        const maxLimit = limit || 50;
        // Get top memories by importance
        const memoryIds = await this.redis.zrevrange(charKey, 0, maxLimit - 1);
        if (memoryIds.length === 0)
            return [];
        const pipeline = this.redis.pipeline();
        for (const id of memoryIds) {
            pipeline.get(`memory:${characterId}:${id}`);
        }
        const results = await pipeline.exec();
        const memories = [];
        if (results) {
            for (const [err, data] of results) {
                if (!err && data) {
                    memories.push(JSON.parse(data));
                }
            }
        }
        return memories;
    }
    async getByEvent(eventId) {
        // Search for memories related to this event
        const keys = await this.redis.keys('memory:*');
        const pipeline = this.redis.pipeline();
        for (const key of keys) {
            pipeline.get(key);
        }
        const results = await pipeline.exec();
        const memories = [];
        if (results) {
            for (const [err, data] of results) {
                if (!err && data) {
                    const memory = JSON.parse(data);
                    if (memory.eventId === eventId) {
                        memories.push(memory);
                    }
                }
            }
        }
        return memories;
    }
    async updateRecall(memoryId) {
        // Find the memory across all characters
        const keys = await this.redis.keys('memory:*');
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                const memory = JSON.parse(data);
                if (memory.id === memoryId) {
                    memory.lastRecalled = new Date();
                    memory.recallCount = (memory.recallCount || 0) + 1;
                    memory.decay = Math.max(0, (memory.decay || 0) - 5);
                    await this.redis.setex(key, this.MEMORY_TTL, JSON.stringify(memory));
                    break;
                }
            }
        }
    }
    // Memory Hot Storage (internal helper)
    async saveHotMemory(memory) {
        const key = `memory:hot:${memory.characterId}:${memory.id}`;
        const data = JSON.stringify(memory);
        // Store with shorter TTL for hot memories
        await this.redis.setex(key, this.HOT_MEMORY_TTL, data);
        // Add to character's hot memory set
        const charKey = `character:${memory.characterId}:hot_memories`;
        await this.redis.zadd(charKey, memory.importance, // Score by importance
        memory.id);
        // Keep only top 50 hot memories
        await this.redis.zremrangebyrank(charKey, 0, -51);
    }
    async getHotMemories(characterId) {
        const charKey = `character:${characterId}:hot_memories`;
        // Get top memories by importance
        const memoryIds = await this.redis.zrevrange(charKey, 0, 49);
        if (memoryIds.length === 0)
            return [];
        const pipeline = this.redis.pipeline();
        for (const id of memoryIds) {
            pipeline.get(`memory:hot:${characterId}:${id}`);
        }
        const results = await pipeline.exec();
        const memories = [];
        if (results) {
            for (const [err, data] of results) {
                if (!err && data) {
                    memories.push(JSON.parse(data));
                }
            }
        }
        return memories;
    }
    // Scene Context Caching
    async cacheSceneContext(characterId, sceneType, context) {
        const key = `context:${characterId}:${sceneType}`;
        const data = JSON.stringify(context);
        // Cache for 1 hour
        await this.redis.setex(key, 3600, data);
    }
    async getCachedSceneContext(characterId, sceneType) {
        const key = `context:${characterId}:${sceneType}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    // Real-time Event Publishing
    async publishEvent(event) {
        // Publish to general event channel
        await this.publisher.publish('game:events', JSON.stringify(event));
        // Publish to character-specific channels
        for (const characterId of event.characterIds) {
            await this.publisher.publish(`character:${characterId}:events`, JSON.stringify(event));
        }
        // Publish to event type channel
        await this.publisher.publish(`events:${event.type}`, JSON.stringify(event));
    }
    // Event Subscription
    async subscribeToEvents(callback, options) {
        const channels = [];
        if (options?.characterId) {
            channels.push(`character:${options.characterId}:events`);
        }
        else {
            channels.push('game:events');
        }
        if (options?.eventTypes) {
            for (const type of options.eventTypes) {
                channels.push(`events:${type}`);
            }
        }
        // Subscribe to channels
        await this.subscriber.subscribe(...channels);
        // Set up message handler
        this.subscriber.on('message', (channel, message) => {
            try {
                const event = JSON.parse(message);
                callback(event);
            }
            catch (error) {
                console.error('Failed to parse event:', error);
            }
        });
        // Return unsubscribe function
        return async () => {
            await this.subscriber.unsubscribe(...channels);
        };
    }
    // IRelationshipStore Implementation
    async saveRelationship(relationship) {
        const key = `relationship:${relationship.characterId}:${relationship.targetId}`;
        const data = JSON.stringify(relationship);
        // Cache for 1 hour
        await this.redis.setex(key, 3600, data);
        // Add to character's relationship list
        const charKey = `character:${relationship.characterId}:relationships`;
        await this.redis.sadd(charKey, relationship.targetId);
    }
    async get(characterId, targetId) {
        const key = `relationship:${characterId}:${targetId}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    async getForCharacter(characterId) {
        const charKey = `character:${characterId}:relationships`;
        const targetIds = await this.redis.smembers(charKey);
        if (targetIds.length === 0)
            return [];
        const pipeline = this.redis.pipeline();
        for (const targetId of targetIds) {
            pipeline.get(`relationship:${characterId}:${targetId}`);
        }
        const results = await pipeline.exec();
        const relationships = [];
        if (results) {
            for (const [err, data] of results) {
                if (!err && data) {
                    relationships.push(JSON.parse(data));
                }
            }
        }
        return relationships;
    }
    // Relationship Caching (backward compatibility)
    async cacheRelationship(relationship) {
        await this.saveRelationship(relationship);
    }
    async getCachedRelationship(characterId, targetId) {
        return this.get(characterId, targetId);
    }
    // Memory Decay Tracking
    async trackMemoryDecay() {
        // Run this periodically to update memory decay
        const script = `
      local keys = redis.call('keys', 'memory:hot:*')
      for i=1,#keys do
        local memory = redis.call('get', keys[i])
        if memory then
          local data = cjson.decode(memory)
          data.decay = data.decay + 1
          redis.call('setex', keys[i], ${this.HOT_MEMORY_TTL}, cjson.encode(data))
        end
      end
      return #keys
    `;
        await this.redis.eval(script, 0);
    }
    // Performance Metrics
    async getEventMetrics() {
        const pipeline = this.redis.pipeline();
        // Count total events
        pipeline.eval(`return #redis.call('keys', 'event:*')`, 0);
        // Count events by type
        const eventTypes = [
            'battle_start', 'battle_end', 'kitchen_argument',
            'therapy_session', 'financial_crisis'
        ];
        for (const type of eventTypes) {
            pipeline.zcard(`events:type:${type}`);
        }
        const results = await pipeline.exec();
        if (!results) {
            return { totalEvents: 0, eventsByType: {}, recentEvents: 0 };
        }
        const [totalErr, totalCount] = results[0];
        const eventsByType = {};
        for (let i = 0; i < eventTypes.length; i++) {
            const [err, count] = results[i + 1];
            if (!err && count) {
                eventsByType[eventTypes[i]] = count;
            }
        }
        return {
            totalEvents: totalCount || 0,
            eventsByType,
            recentEvents: Object.values(eventsByType).reduce((a, b) => a + b, 0)
        };
    }
    async close() {
        await this.redis.quit();
        await this.subscriber.quit();
        await this.publisher.quit();
    }
}
exports.RedisAdapter = RedisAdapter;
