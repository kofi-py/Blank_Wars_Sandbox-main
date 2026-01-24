/**
 * EXTERNAL CHAT SERVICE
 *
 * NOT READY FOR USE - Commented out until feature is complete.
 *
 * Purpose: Allow external applications to chat with BlankWars characters
 * via API. Creates memories from external conversations.
 *
 * TODO before enabling:
 * - Implement API key verification
 * - Complete character data mapping
 * - Test memory creation via gameEventBus
 * - Add rate limiting
 */

/*
import { db } from '../database';
import { ai_chat_service } from './aiChatService';
import { gameEventBus } from './gameEventBus';
import { loadBattleCharacter } from './battleCharacterLoader';

export class ExternalChatService {

    async generateUniversalPrompt(characterId: string): Promise<any> {
        const character = await loadBattleCharacter(characterId);

        if (!character) {
            throw new Error('Character not found');
        }

        const memoriesResult = await db.query(
            `SELECT content FROM character_memories
             WHERE character_id = $1
             ORDER BY importance DESC, created_at DESC
             LIMIT 5`,
            [characterId]
        );
        const recentMemories = memoriesResult.rows.map((r: any) => r.content);

        return {
            schema_version: "1.0.0",
            character: {
                id: character.character_id,
                name: character.name,
                class: character.archetype,
                level: character.level,
                stats: {
                    hp: character.current_max_health,
                    mana: character.current_max_mana,
                    strength: character.attack,
                    intelligence: character.magic_attack,
                    dexterity: character.speed
                },
                psychology: {
                    stress_level: character.current_stress,
                    team_trust: character.team_trust,
                    battle_focus: character.battle_focus
                },
                personality: {
                    traits: character.personality_traits || [],
                    motivations: [],
                    fears: [],
                    speech_style: "Standard"
                }
            },
            context: {
                recent_memories: recentMemories,
                current_status: "Available",
                home_world: "Blank Wars"
            }
        };
    }

    async handleExternalChat(apiKey: string, characterId: string, message: string, context: any = {}): Promise<string> {
        // TODO: Verify API Key

        const character = await loadBattleCharacter(characterId);
        if (!character) {
            throw new Error('Character not found');
        }

        const memoriesResult = await db.query(
            `SELECT content FROM character_memories
             WHERE character_id = $1
             ORDER BY importance DESC, created_at DESC
             LIMIT 5`,
            [characterId]
        );
        const relevantMemories = memoriesResult.rows.map((r: any) => r.content);

        const chatContext = {
            character_id: characterId,
            character_name: character.name,
            personality: {
                traits: character.personality_traits || [],
                speech_style: "Standard",
                motivations: [],
                fears: []
            },
            historical_period: "Unknown",
            event_context: {
                recent_events: relevantMemories.join('\n')
            }
        };

        const response = await ai_chat_service.generate_character_response(
            chatContext,
            message,
            "external_user",
            db,
            {
                chat_id: `ext_${Date.now()}`,
                skip_bond_tracking: true
            }
        );

        await gameEventBus.emit({
            type: 'social_interaction',
            primary_character_id: characterId,
            secondary_character_ids: [],
            data: {
                interaction_type: 'external_chat',
                content: `User: ${message}\nMe: ${response.message}`,
            },
            tags: ['external_chat', 'social'],
            importance_hint: 3,
        });

        return response.message;
    }
}

export const externalChatService = new ExternalChatService();
*/
