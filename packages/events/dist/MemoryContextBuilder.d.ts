import { CharacterMemory, SceneType, PromptContext, GameEvent, CharacterRelationship, EmotionalState } from './types';
/**
 * Builds optimized memory contexts for prompt injection
 * This is the core of making characters "remember" their experiences
 */
export declare class MemoryContextBuilder {
    private memoryStore;
    private eventStore;
    private static readonly SCENE_PROFILES;
    constructor(memoryStore: MemoryStore, eventStore: EventStore);
    /**
     * Build complete context for a scene
     */
    buildContext(characterId: string, scene: SceneType, otherCharacters?: string[]): Promise<PromptContext>;
    /**
     * Select the most relevant memories for a specific scene
     */
    private selectMemoriesForScene;
    /**
     * Score how relevant a memory is for the current scene
     */
    private scoreMemoryRelevance;
    /**
     * Format memories into prompt-ready text
     */
    formatMemoriesForPrompt(memories: CharacterMemory[], style?: 'detailed' | 'summary'): string;
    /**
     * Find contradictions between memories for comedy/drama
     */
    findContradictions(memories: CharacterMemory[]): string[];
    /**
     * Generate callback opportunities from past memories
     */
    findCallbacks(currentScene: SceneType, memories: CharacterMemory[]): string[];
    private getTimeAgo;
    private getSceneProfile;
    private getRecentEvents;
    private getRelationships;
    private getEmotionalState;
}
interface MemoryStore {
    getCharacterMemories(characterId: string): Promise<CharacterMemory[]>;
    getRelationships(characterId: string, targets: string[]): Promise<CharacterRelationship[]>;
    getEmotionalState(characterId: string): Promise<EmotionalState>;
}
interface EventStore {
    getRecentEvents(characterId: string, hours: number): Promise<GameEvent[]>;
}
export {};
