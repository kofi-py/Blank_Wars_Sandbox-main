import { IEventStore, IMemoryStore, IRelationshipStore } from '../GameEventBus';
import { GameEvent, CharacterMemory, CharacterRelationship, EmotionalState } from '../types';
/**
 * Hybrid adapter that combines Redis (hot storage) with PostgreSQL (persistent storage)
 * Optimized for the prompt injection memory system
 */
export declare class HybridAdapter implements IEventStore, IMemoryStore, IRelationshipStore {
    private postgres;
    private redis;
    private readonly HOT_MEMORY_THRESHOLD;
    private readonly RECENT_HOURS_THRESHOLD;
    constructor(postgresUrl: string, redisUrl: string);
    saveEvent(event: GameEvent): Promise<void>;
    getById(id: string): Promise<GameEvent | null>;
    getRecent(characterId: string, hours: number): Promise<GameEvent[]>;
    saveMemory(memory: CharacterMemory): Promise<void>;
    getByCharacter(characterId: string, limit?: number): Promise<CharacterMemory[]>;
    getByEvent(eventId: string): Promise<CharacterMemory[]>;
    updateRecall(memoryId: string): Promise<void>;
    saveRelationship(relationship: CharacterRelationship): Promise<void>;
    get(characterId: string, targetId: string): Promise<CharacterRelationship | null>;
    getForCharacter(characterId: string): Promise<CharacterRelationship[]>;
    updateRelationship(characterId: string, targetId: string, changes: {
        trust: number;
        respect: number;
        affection: number;
    }): Promise<void>;
    /**
     * Get memories optimized for a specific scene with smart caching
     */
    getMemoriesForScene(characterId: string, sceneType: string, otherCharacters?: string[]): Promise<CharacterMemory[]>;
    /**
     * Get full prompt context with performance optimization
     */
    getPromptContext(characterId: string, sceneType: string, otherCharacters?: string[]): Promise<{
        recentEvents: GameEvent[];
        relevantMemories: CharacterMemory[];
        relationships: CharacterRelationship[];
        emotionalState: EmotionalState;
    }>;
    getEmotionalState(characterId: string): Promise<EmotionalState>;
    subscribeToEvents(callback: (event: GameEvent) => void, options?: {
        characterId?: string;
        eventTypes?: string[];
    }): Promise<() => void>;
    getPerformanceMetrics(): Promise<{
        redis: any;
        postgres: {
            connectionCount: number;
        };
        cacheHitRate: number;
    }>;
    runMaintenance(): Promise<void>;
    private runMemoryDecay;
    private isCacheValid;
    close(): Promise<void>;
    batchSaveEvents(events: GameEvent[]): Promise<void>;
    batchSaveMemories(memories: CharacterMemory[]): Promise<void>;
    findMemoryContradictions(characterId: string): Promise<{
        memory1: CharacterMemory;
        memory2: CharacterMemory;
        contradictionType: string;
    }[]>;
    getMemoryCallbacks(characterId: string, currentScene: string): Promise<CharacterMemory[]>;
}
