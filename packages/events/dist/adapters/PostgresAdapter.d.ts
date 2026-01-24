import { IEventStore, IMemoryStore, IRelationshipStore } from '../GameEventBus';
import { GameEvent, CharacterMemory, CharacterRelationship, EmotionalState } from '../types';
/**
 * PostgreSQL adapter for persistent event and memory storage
 */
export declare class PostgresAdapter implements IEventStore, IMemoryStore, IRelationshipStore {
    private pool;
    constructor(connectionString: string);
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
    getMemoriesForScene(characterId: string, sceneType: string, otherCharacters: string[]): Promise<CharacterMemory[]>;
    getEmotionalState(characterId: string): Promise<EmotionalState>;
    private mapRowToEvent;
    private mapRowToMemory;
    private mapRowToRelationship;
    private updateRelationshipTrajectory;
    private calculateMood;
    close(): Promise<void>;
}
