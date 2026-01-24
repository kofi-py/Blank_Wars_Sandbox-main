import { IEventStore, IMemoryStore, IRelationshipStore } from '../GameEventBus';
import { GameEvent, CharacterMemory, CharacterRelationship } from '../types';
/**
 * Redis adapter for hot storage and real-time event distribution
 * Stores recent events (last 2 weeks) for fast access
 */
export declare class RedisAdapter implements IEventStore, IMemoryStore, IRelationshipStore {
    private redis;
    private subscriber;
    private publisher;
    private readonly EVENT_TTL;
    private readonly MEMORY_TTL;
    private readonly HOT_MEMORY_TTL;
    constructor(redisUrl: string);
    saveEvent(event: GameEvent): Promise<void>;
    getById(id: string): Promise<GameEvent | null>;
    getRecent(characterId: string, hours: number): Promise<GameEvent[]>;
    saveMemory(memory: CharacterMemory): Promise<void>;
    getByCharacter(characterId: string, limit?: number): Promise<CharacterMemory[]>;
    getByEvent(eventId: string): Promise<CharacterMemory[]>;
    updateRecall(memoryId: string): Promise<void>;
    private saveHotMemory;
    getHotMemories(characterId: string): Promise<CharacterMemory[]>;
    cacheSceneContext(characterId: string, sceneType: string, context: any): Promise<void>;
    getCachedSceneContext(characterId: string, sceneType: string): Promise<any | null>;
    private publishEvent;
    subscribeToEvents(callback: (event: GameEvent) => void, options?: {
        characterId?: string;
        eventTypes?: string[];
    }): Promise<() => void>;
    saveRelationship(relationship: CharacterRelationship): Promise<void>;
    get(characterId: string, targetId: string): Promise<CharacterRelationship | null>;
    getForCharacter(characterId: string): Promise<CharacterRelationship[]>;
    cacheRelationship(relationship: CharacterRelationship): Promise<void>;
    getCachedRelationship(characterId: string, targetId: string): Promise<CharacterRelationship | null>;
    trackMemoryDecay(): Promise<void>;
    getEventMetrics(): Promise<{
        totalEvents: number;
        eventsByType: Record<string, number>;
        recentEvents: number;
    }>;
    close(): Promise<void>;
}
