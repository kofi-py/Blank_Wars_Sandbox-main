"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAdapter = void 0;
/**
 * Simple in-memory adapter for development and testing
 */
class InMemoryAdapter {
    constructor() {
        this.events = new Map();
        this.memories = new Map();
        this.relationships = new Map();
    }
    // IEventStore Implementation
    async saveEvent(event) {
        this.events.set(event.id, event);
    }
    async getById(id) {
        return this.events.get(id) || null;
    }
    async getRecent(characterId, hours) {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        return Array.from(this.events.values())
            .filter(event => event.characterIds.includes(characterId) &&
            event.timestamp > cutoff)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 50);
    }
    // IMemoryStore Implementation
    async saveMemory(memory) {
        this.memories.set(memory.id, memory);
    }
    async getByCharacter(characterId, limit) {
        const characterMemories = Array.from(this.memories.values())
            .filter(memory => memory.characterId === characterId)
            .sort((a, b) => b.importance - a.importance);
        return limit ? characterMemories.slice(0, limit) : characterMemories;
    }
    async getByEvent(eventId) {
        return Array.from(this.memories.values())
            .filter(memory => memory.eventId === eventId);
    }
    async updateRecall(memoryId) {
        const memory = this.memories.get(memoryId);
        if (memory) {
            memory.lastRecalled = new Date();
            memory.recallCount++;
        }
    }
    // IRelationshipStore Implementation
    async saveRelationship(relationship) {
        const key = `${relationship.characterId}:${relationship.targetId}`;
        this.relationships.set(key, relationship);
    }
    async get(characterId, targetId) {
        const key = `${characterId}:${targetId}`;
        return this.relationships.get(key) || null;
    }
    async getForCharacter(characterId) {
        return Array.from(this.relationships.values())
            .filter(rel => rel.characterId === characterId);
    }
    // Utility methods for testing
    clear() {
        this.events.clear();
        this.memories.clear();
        this.relationships.clear();
    }
    getStats() {
        return {
            events: this.events.size,
            memories: this.memories.size,
            relationships: this.relationships.size
        };
    }
}
exports.InMemoryAdapter = InMemoryAdapter;
