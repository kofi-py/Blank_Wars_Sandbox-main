import { EventEmitter } from 'events';
import { GameEvent, CharacterMemory, CharacterRelationship } from './types';
/**
 * Storage interfaces for dependency injection
 */
export interface IEventStore {
    saveEvent(event: GameEvent): Promise<void>;
    getById(id: string): Promise<GameEvent | null>;
    getRecent(characterId: string, hours: number): Promise<GameEvent[]>;
}
export interface IMemoryStore {
    saveMemory(memory: CharacterMemory): Promise<void>;
    getByCharacter(characterId: string, limit?: number): Promise<CharacterMemory[]>;
    getByEvent(eventId: string): Promise<CharacterMemory[]>;
    updateRecall(memoryId: string): Promise<void>;
}
export interface IRelationshipStore {
    saveRelationship(relationship: CharacterRelationship): Promise<void>;
    get(characterId: string, targetId: string): Promise<CharacterRelationship | null>;
    getForCharacter(characterId: string): Promise<CharacterRelationship[]>;
}
/**
 * Core event bus optimized for memory creation and prompt context building
 */
export declare class GameEventBus extends EventEmitter {
    private static instance;
    private adapter?;
    private constructor();
    static getInstance(): GameEventBus;
    /**
     * Configure storage adapter (call once on startup)
     */
    configure(adapter: any): void;
    /**
     * Publish an event and create memories for all involved characters
     */
    publish(event: Omit<GameEvent, 'id' | 'timestamp' | 'sceneRelevance'>): Promise<string>;
    /**
     * Create character-specific memories from an event
     */
    private createMemoriesFromEvent;
    /**
     * Create a memory from a character's perspective
     */
    private createMemoryForCharacter;
    private determineFeeling;
    private determineBestScenes;
    private generateId;
}
