import { IEventStore, IMemoryStore, IRelationshipStore, GameEvent, CharacterMemory, CharacterRelationship } from '../index';
/**
 * Simple in-memory adapter for development and testing
 */
export declare class InMemoryAdapter implements IEventStore, IMemoryStore, IRelationshipStore {
    private events;
    private memories;
    private relationships;
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
    clear(): void;
    getStats(): {
        events: number;
        memories: number;
        relationships: number;
    };
}
