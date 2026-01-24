import { query } from '../database';
import { PreferenceScoringService } from './preferenceScoringService';

export class PreferencePopulationService {

    /**
     * Initialize Category Rankings for a character based on their Archetype.
     * This should be called when a character is created or when their archetype changes.
     */
    static async initializeRankings(character_id: string, archetype: string): Promise<void> {
        try {
            console.log(`Initializing preferences for ${character_id} (${archetype})`);

            const preferences = this.getArchetypePreferences(archetype);

            // Insert preferences into DB
            for (const pref of preferences) {
                await query(
                    `INSERT INTO character_category_preferences (character_id, category_type, category_value, rank)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (character_id, category_type, category_value) 
           DO UPDATE SET rank = $4`,
                    [character_id, pref.type, pref.value, pref.rank]
                );
            }

            // After populating, immediately calculate the scores
            await PreferenceScoringService.refreshCharacterScores(character_id);

        } catch (error) {
            console.error('Error initializing preferences:', error);
            throw error;
        }
    }

    private static getArchetypePreferences(archetype: string): Array<{ type: string, value: string, rank: number }> {
        const prefs: Array<{ type: string, value: string, rank: number }> = [];
        const arch = archetype.toLowerCase();

        // Default: Rank 2 (Neutral) for everything not specified
        // We only explicitly insert non-neutral preferences to save space, 
        // or we can insert everything. For now, let's insert key preferences.

        if (arch === 'warrior' || arch === 'tank') {
            // Equipment
            prefs.push({ type: 'equipment_type', value: 'sword', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'shield', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'heavy_armor', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'axe', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'mace', rank: 3 });
            prefs.push({ type: 'equipment_type', value: 'spear', rank: 3 });
            prefs.push({ type: 'equipment_type', value: 'hammer', rank: 3 });

            // Damage
            prefs.push({ type: 'damage_type', value: 'physical', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'slashing', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'bludgeoning', rank: 4 });

            // Spell tiers (warriors prefer signature combat spells over universal magic)
            prefs.push({ type: 'spell_tier', value: 'signature', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'species', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'archetype', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'universal', rank: 2 });

            // Power categories
            prefs.push({ type: 'power_category', value: 'combat', rank: 4 });
            prefs.push({ type: 'power_category', value: 'defensive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'offensive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'passive', rank: 3 });
            prefs.push({ type: 'power_category', value: 'support', rank: 2 });
            prefs.push({ type: 'power_category', value: 'utility', rank: 1 });

            // Attributes - all 19 allocatable
            prefs.push({ type: 'attribute', value: 'strength', rank: 4 });
            prefs.push({ type: 'attribute', value: 'dexterity', rank: 3 });
            prefs.push({ type: 'attribute', value: 'endurance', rank: 4 });
            prefs.push({ type: 'attribute', value: 'attack', rank: 4 });
            prefs.push({ type: 'attribute', value: 'defense', rank: 4 });
            prefs.push({ type: 'attribute', value: 'speed', rank: 3 });
            prefs.push({ type: 'attribute', value: 'magic_attack', rank: 1 });
            prefs.push({ type: 'attribute', value: 'magic_defense', rank: 2 });
            prefs.push({ type: 'attribute', value: 'intelligence', rank: 1 });
            prefs.push({ type: 'attribute', value: 'wisdom', rank: 2 });
            prefs.push({ type: 'attribute', value: 'spirit', rank: 2 });
            prefs.push({ type: 'attribute', value: 'charisma', rank: 2 });
            prefs.push({ type: 'attribute', value: 'communication', rank: 2 });
            prefs.push({ type: 'attribute', value: 'energy_regen', rank: 3 });
            // Resistances
            prefs.push({ type: 'attribute', value: 'fire_resistance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'cold_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'lightning_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'toxic_resistance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'elemental_resistance', rank: 3 });

            // Resources
            prefs.push({ type: 'resource', value: 'health', rank: 4 });
            prefs.push({ type: 'resource', value: 'energy', rank: 3 });
            prefs.push({ type: 'resource', value: 'mana', rank: 1 });
        }
        else if (arch === 'mage' || arch === 'mystic' || arch === 'scholar') {
            // Equipment
            prefs.push({ type: 'equipment_type', value: 'staff', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'wand', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'robes', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'sword', rank: 1 });
            prefs.push({ type: 'equipment_type', value: 'heavy_armor', rank: 1 });

            // Damage
            prefs.push({ type: 'damage_type', value: 'fire', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'ice', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'lightning', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'magic', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'arcane', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'psychic', rank: 3 });
            prefs.push({ type: 'damage_type', value: 'physical', rank: 1 });

            // Spell tiers (mages love all magic, especially universal)
            prefs.push({ type: 'spell_tier', value: 'universal', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'archetype', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'species', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'signature', rank: 3 });

            // Power categories
            prefs.push({ type: 'power_category', value: 'offensive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'utility', rank: 4 });
            prefs.push({ type: 'power_category', value: 'debuff', rank: 3 });
            prefs.push({ type: 'power_category', value: 'support', rank: 3 });
            prefs.push({ type: 'power_category', value: 'passive', rank: 2 });
            prefs.push({ type: 'power_category', value: 'combat', rank: 1 });

            // Attributes - all 19 allocatable
            prefs.push({ type: 'attribute', value: 'strength', rank: 1 });
            prefs.push({ type: 'attribute', value: 'dexterity', rank: 2 });
            prefs.push({ type: 'attribute', value: 'endurance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'attack', rank: 1 });
            prefs.push({ type: 'attribute', value: 'defense', rank: 2 });
            prefs.push({ type: 'attribute', value: 'speed', rank: 2 });
            prefs.push({ type: 'attribute', value: 'magic_attack', rank: 4 });
            prefs.push({ type: 'attribute', value: 'magic_defense', rank: 4 });
            prefs.push({ type: 'attribute', value: 'intelligence', rank: 4 });
            prefs.push({ type: 'attribute', value: 'wisdom', rank: 4 });
            prefs.push({ type: 'attribute', value: 'spirit', rank: 4 });
            prefs.push({ type: 'attribute', value: 'charisma', rank: 3 });
            prefs.push({ type: 'attribute', value: 'communication', rank: 3 });
            prefs.push({ type: 'attribute', value: 'energy_regen', rank: 2 });
            // Resistances - mages favor elemental
            prefs.push({ type: 'attribute', value: 'fire_resistance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'cold_resistance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'lightning_resistance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'toxic_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'elemental_resistance', rank: 4 });

            // Resources
            prefs.push({ type: 'resource', value: 'mana', rank: 4 });
            prefs.push({ type: 'resource', value: 'energy', rank: 1 });
        }
        else if (arch === 'assassin' || arch === 'trickster') {
            // Equipment
            prefs.push({ type: 'equipment_type', value: 'dagger', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'bow', rank: 3 });
            prefs.push({ type: 'equipment_type', value: 'light_armor', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'knife', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'cloak', rank: 4 });

            // Damage
            prefs.push({ type: 'damage_type', value: 'poison', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'piercing', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'shadow', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'dark', rank: 3 });

            // Spell tiers (assassins prefer signature strikes)
            prefs.push({ type: 'spell_tier', value: 'signature', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'species', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'archetype', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'universal', rank: 2 });

            // Power categories
            prefs.push({ type: 'power_category', value: 'offensive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'passive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'debuff', rank: 4 });
            prefs.push({ type: 'power_category', value: 'utility', rank: 3 });

            // Attributes - all 19 allocatable
            prefs.push({ type: 'attribute', value: 'strength', rank: 2 });
            prefs.push({ type: 'attribute', value: 'dexterity', rank: 4 });
            prefs.push({ type: 'attribute', value: 'endurance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'attack', rank: 4 });
            prefs.push({ type: 'attribute', value: 'defense', rank: 2 });
            prefs.push({ type: 'attribute', value: 'speed', rank: 4 });
            prefs.push({ type: 'attribute', value: 'magic_attack', rank: 2 });
            prefs.push({ type: 'attribute', value: 'magic_defense', rank: 2 });
            prefs.push({ type: 'attribute', value: 'intelligence', rank: 3 });
            prefs.push({ type: 'attribute', value: 'wisdom', rank: 2 });
            prefs.push({ type: 'attribute', value: 'spirit', rank: 2 });
            prefs.push({ type: 'attribute', value: 'charisma', rank: 3 });
            prefs.push({ type: 'attribute', value: 'communication', rank: 3 });
            prefs.push({ type: 'attribute', value: 'energy_regen', rank: 4 });
            // Resistances - poison users are resistant
            prefs.push({ type: 'attribute', value: 'fire_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'cold_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'lightning_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'toxic_resistance', rank: 4 });
            prefs.push({ type: 'attribute', value: 'elemental_resistance', rank: 2 });

            // Resources
            prefs.push({ type: 'resource', value: 'energy', rank: 4 });
        }
        else if (arch === 'beast') {
            // Equipment - natural weapons, minimal armor
            prefs.push({ type: 'equipment_type', value: 'natural_weapon', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'claws', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'natural_armor', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'light_armor', rank: 3 });
            prefs.push({ type: 'equipment_type', value: 'staff', rank: 1 });
            prefs.push({ type: 'equipment_type', value: 'robes', rank: 1 });
            prefs.push({ type: 'equipment_type', value: 'wand', rank: 1 });

            // Damage - physical, natural
            prefs.push({ type: 'damage_type', value: 'physical', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'piercing', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'nature', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'slashing', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'magic', rank: 1 });
            prefs.push({ type: 'damage_type', value: 'arcane', rank: 1 });

            // Spell tiers (beasts prefer species-specific abilities)
            prefs.push({ type: 'spell_tier', value: 'species', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'signature', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'archetype', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'universal', rank: 1 });

            // Power categories - combat focused
            prefs.push({ type: 'power_category', value: 'offensive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'combat', rank: 4 });
            prefs.push({ type: 'power_category', value: 'passive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'defensive', rank: 3 });
            prefs.push({ type: 'power_category', value: 'utility', rank: 2 });

            // Attributes - all 19 allocatable (physical prowess)
            prefs.push({ type: 'attribute', value: 'strength', rank: 4 });
            prefs.push({ type: 'attribute', value: 'dexterity', rank: 4 });
            prefs.push({ type: 'attribute', value: 'endurance', rank: 4 });
            prefs.push({ type: 'attribute', value: 'attack', rank: 4 });
            prefs.push({ type: 'attribute', value: 'defense', rank: 3 });
            prefs.push({ type: 'attribute', value: 'speed', rank: 4 });
            prefs.push({ type: 'attribute', value: 'magic_attack', rank: 1 });
            prefs.push({ type: 'attribute', value: 'magic_defense', rank: 2 });
            prefs.push({ type: 'attribute', value: 'intelligence', rank: 1 });
            prefs.push({ type: 'attribute', value: 'wisdom', rank: 2 });
            prefs.push({ type: 'attribute', value: 'spirit', rank: 3 });
            prefs.push({ type: 'attribute', value: 'charisma', rank: 1 });
            prefs.push({ type: 'attribute', value: 'communication', rank: 1 });
            prefs.push({ type: 'attribute', value: 'energy_regen', rank: 4 });
            // Resistances - natural toughness
            prefs.push({ type: 'attribute', value: 'fire_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'cold_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'lightning_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'toxic_resistance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'elemental_resistance', rank: 2 });

            // Resources
            prefs.push({ type: 'resource', value: 'health', rank: 4 });
            prefs.push({ type: 'resource', value: 'energy', rank: 4 });
            prefs.push({ type: 'resource', value: 'mana', rank: 1 });
        }
        else if (arch === 'beastmaster') {
            // Equipment - support/control gear
            prefs.push({ type: 'equipment_type', value: 'staff', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'whip', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'light_armor', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'cloak', rank: 3 });
            prefs.push({ type: 'equipment_type', value: 'heavy_armor', rank: 1 });

            // Damage - nature based
            prefs.push({ type: 'damage_type', value: 'nature', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'physical', rank: 3 });
            prefs.push({ type: 'damage_type', value: 'poison', rank: 3 });

            // Spell tiers (beastmasters prefer archetype animal control spells)
            prefs.push({ type: 'spell_tier', value: 'archetype', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'species', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'universal', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'signature', rank: 3 });

            // Power categories - support/utility
            prefs.push({ type: 'power_category', value: 'support', rank: 4 });
            prefs.push({ type: 'power_category', value: 'utility', rank: 4 });
            prefs.push({ type: 'power_category', value: 'passive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'heal', rank: 3 });
            prefs.push({ type: 'power_category', value: 'offensive', rank: 2 });

            // Attributes - all 19 allocatable
            prefs.push({ type: 'attribute', value: 'strength', rank: 2 });
            prefs.push({ type: 'attribute', value: 'dexterity', rank: 3 });
            prefs.push({ type: 'attribute', value: 'endurance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'attack', rank: 2 });
            prefs.push({ type: 'attribute', value: 'defense', rank: 2 });
            prefs.push({ type: 'attribute', value: 'speed', rank: 3 });
            prefs.push({ type: 'attribute', value: 'magic_attack', rank: 3 });
            prefs.push({ type: 'attribute', value: 'magic_defense', rank: 3 });
            prefs.push({ type: 'attribute', value: 'intelligence', rank: 3 });
            prefs.push({ type: 'attribute', value: 'wisdom', rank: 4 });
            prefs.push({ type: 'attribute', value: 'spirit', rank: 4 });
            prefs.push({ type: 'attribute', value: 'charisma', rank: 4 });
            prefs.push({ type: 'attribute', value: 'communication', rank: 4 });
            prefs.push({ type: 'attribute', value: 'energy_regen', rank: 3 });
            // Resistances
            prefs.push({ type: 'attribute', value: 'fire_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'cold_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'lightning_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'toxic_resistance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'elemental_resistance', rank: 2 });

            // Resources
            prefs.push({ type: 'resource', value: 'energy', rank: 4 });
            prefs.push({ type: 'resource', value: 'mana', rank: 3 });
        }
        else if (arch === 'detective') {
            // Equipment - investigation tools, ranged
            prefs.push({ type: 'equipment_type', value: 'revolver', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'pistol', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'knife', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'cane', rank: 3 });
            prefs.push({ type: 'equipment_type', value: 'light_armor', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'fedora', rank: 3 });
            prefs.push({ type: 'equipment_type', value: 'heavy_armor', rank: 1 });

            // Damage - precise, mental
            prefs.push({ type: 'damage_type', value: 'physical', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'piercing', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'ranged', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'psychic', rank: 3 });

            // Spell tiers (detectives prefer signature deduction abilities)
            prefs.push({ type: 'spell_tier', value: 'signature', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'archetype', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'species', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'universal', rank: 2 });

            // Power categories - observation, deduction
            prefs.push({ type: 'power_category', value: 'passive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'utility', rank: 4 });
            prefs.push({ type: 'power_category', value: 'debuff', rank: 4 });
            prefs.push({ type: 'power_category', value: 'offensive', rank: 3 });

            // Attributes - all 19 allocatable (mental acuity)
            prefs.push({ type: 'attribute', value: 'strength', rank: 2 });
            prefs.push({ type: 'attribute', value: 'dexterity', rank: 4 });
            prefs.push({ type: 'attribute', value: 'endurance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'attack', rank: 3 });
            prefs.push({ type: 'attribute', value: 'defense', rank: 2 });
            prefs.push({ type: 'attribute', value: 'speed', rank: 3 });
            prefs.push({ type: 'attribute', value: 'magic_attack', rank: 2 });
            prefs.push({ type: 'attribute', value: 'magic_defense', rank: 2 });
            prefs.push({ type: 'attribute', value: 'intelligence', rank: 4 });
            prefs.push({ type: 'attribute', value: 'wisdom', rank: 4 });
            prefs.push({ type: 'attribute', value: 'spirit', rank: 3 });
            prefs.push({ type: 'attribute', value: 'charisma', rank: 3 });
            prefs.push({ type: 'attribute', value: 'communication', rank: 4 });
            prefs.push({ type: 'attribute', value: 'energy_regen', rank: 3 });
            // Resistances
            prefs.push({ type: 'attribute', value: 'fire_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'cold_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'lightning_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'toxic_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'elemental_resistance', rank: 2 });

            // Resources
            prefs.push({ type: 'resource', value: 'energy', rank: 4 });
            prefs.push({ type: 'resource', value: 'mana', rank: 2 });
        }
        else if (arch === 'leader') {
            // Equipment - command/inspire gear
            prefs.push({ type: 'equipment_type', value: 'sword', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'crown', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'banner', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'shield', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'heavy_armor', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'spear', rank: 3 });
            prefs.push({ type: 'equipment_type', value: 'robes', rank: 2 });

            // Damage - commanding presence
            prefs.push({ type: 'damage_type', value: 'physical', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'holy', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'slashing', rank: 3 });
            prefs.push({ type: 'damage_type', value: 'psychic', rank: 3 });

            // Spell tiers (leaders prefer universal/archetype command abilities)
            prefs.push({ type: 'spell_tier', value: 'archetype', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'universal', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'signature', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'species', rank: 3 });

            // Power categories - support/command
            prefs.push({ type: 'power_category', value: 'support', rank: 4 });
            prefs.push({ type: 'power_category', value: 'defensive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'passive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'combat', rank: 3 });
            prefs.push({ type: 'power_category', value: 'ultimate', rank: 3 });
            prefs.push({ type: 'power_category', value: 'utility', rank: 3 });

            // Attributes - all 19 allocatable (leadership)
            prefs.push({ type: 'attribute', value: 'strength', rank: 3 });
            prefs.push({ type: 'attribute', value: 'dexterity', rank: 2 });
            prefs.push({ type: 'attribute', value: 'endurance', rank: 4 });
            prefs.push({ type: 'attribute', value: 'attack', rank: 3 });
            prefs.push({ type: 'attribute', value: 'defense', rank: 4 });
            prefs.push({ type: 'attribute', value: 'speed', rank: 3 });
            prefs.push({ type: 'attribute', value: 'magic_attack', rank: 2 });
            prefs.push({ type: 'attribute', value: 'magic_defense', rank: 3 });
            prefs.push({ type: 'attribute', value: 'intelligence', rank: 3 });
            prefs.push({ type: 'attribute', value: 'wisdom', rank: 4 });
            prefs.push({ type: 'attribute', value: 'spirit', rank: 4 });
            prefs.push({ type: 'attribute', value: 'charisma', rank: 4 });
            prefs.push({ type: 'attribute', value: 'communication', rank: 4 });
            prefs.push({ type: 'attribute', value: 'energy_regen', rank: 3 });
            // Resistances - leaders are resilient
            prefs.push({ type: 'attribute', value: 'fire_resistance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'cold_resistance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'lightning_resistance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'toxic_resistance', rank: 3 });
            prefs.push({ type: 'attribute', value: 'elemental_resistance', rank: 3 });

            // Resources
            prefs.push({ type: 'resource', value: 'health', rank: 4 });
            prefs.push({ type: 'resource', value: 'energy', rank: 4 });
            prefs.push({ type: 'resource', value: 'mana', rank: 2 });
        }
        else if (arch === 'magical_appliance') {
            // Equipment - tech/energy gear
            prefs.push({ type: 'equipment_type', value: 'energy_weapon', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'tech_armor', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'core', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'generator', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'coil', rank: 4 });
            prefs.push({ type: 'equipment_type', value: 'plating', rank: 3 });
            prefs.push({ type: 'equipment_type', value: 'sword', rank: 1 });
            prefs.push({ type: 'equipment_type', value: 'bow', rank: 1 });

            // Damage - energy based
            prefs.push({ type: 'damage_type', value: 'fire', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'lightning', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'energy', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'elemental', rank: 4 });
            prefs.push({ type: 'damage_type', value: 'physical', rank: 2 });

            // Spell tiers (magical appliances prefer unique signature abilities)
            prefs.push({ type: 'spell_tier', value: 'signature', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'species', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'archetype', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'universal', rank: 2 });

            // Power categories - offensive/special
            prefs.push({ type: 'power_category', value: 'offensive', rank: 4 });
            prefs.push({ type: 'power_category', value: 'utility', rank: 4 });
            prefs.push({ type: 'power_category', value: 'special', rank: 4 });
            prefs.push({ type: 'power_category', value: 'passive', rank: 3 });
            prefs.push({ type: 'power_category', value: 'debuff', rank: 3 });

            // Attributes - all 19 allocatable (durable energy machine)
            prefs.push({ type: 'attribute', value: 'strength', rank: 2 });
            prefs.push({ type: 'attribute', value: 'dexterity', rank: 2 });
            prefs.push({ type: 'attribute', value: 'endurance', rank: 4 });
            prefs.push({ type: 'attribute', value: 'attack', rank: 3 });
            prefs.push({ type: 'attribute', value: 'defense', rank: 4 });
            prefs.push({ type: 'attribute', value: 'speed', rank: 2 });
            prefs.push({ type: 'attribute', value: 'magic_attack', rank: 4 });
            prefs.push({ type: 'attribute', value: 'magic_defense', rank: 3 });
            prefs.push({ type: 'attribute', value: 'intelligence', rank: 4 });
            prefs.push({ type: 'attribute', value: 'wisdom', rank: 2 });
            prefs.push({ type: 'attribute', value: 'spirit', rank: 2 });
            prefs.push({ type: 'attribute', value: 'charisma', rank: 1 });
            prefs.push({ type: 'attribute', value: 'communication', rank: 2 });
            prefs.push({ type: 'attribute', value: 'energy_regen', rank: 4 });
            // Resistances - appliances are tough
            prefs.push({ type: 'attribute', value: 'fire_resistance', rank: 4 });
            prefs.push({ type: 'attribute', value: 'cold_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'lightning_resistance', rank: 4 });
            prefs.push({ type: 'attribute', value: 'toxic_resistance', rank: 4 });
            prefs.push({ type: 'attribute', value: 'elemental_resistance', rank: 3 });

            // Resources
            prefs.push({ type: 'resource', value: 'energy', rank: 4 });
            prefs.push({ type: 'resource', value: 'mana', rank: 3 });
            prefs.push({ type: 'resource', value: 'health', rank: 3 });
        }
        else if (arch === 'system') {
            // System characters (judges, therapists, hosts) - non-combat NPCs
            // These characters favor social/support abilities over combat
            prefs.push({ type: 'power_category', value: 'utility', rank: 4 });
            prefs.push({ type: 'power_category', value: 'support', rank: 4 });
            prefs.push({ type: 'power_category', value: 'heal', rank: 3 });
            prefs.push({ type: 'power_category', value: 'offensive', rank: 1 });
            prefs.push({ type: 'power_category', value: 'combat', rank: 1 });

            // Attributes - social focused
            prefs.push({ type: 'attribute', value: 'charisma', rank: 4 });
            prefs.push({ type: 'attribute', value: 'wisdom', rank: 4 });
            prefs.push({ type: 'attribute', value: 'intelligence', rank: 4 });
            prefs.push({ type: 'attribute', value: 'communication', rank: 4 });
            prefs.push({ type: 'attribute', value: 'spirit', rank: 3 });
            prefs.push({ type: 'attribute', value: 'strength', rank: 1 });
            prefs.push({ type: 'attribute', value: 'attack', rank: 1 });
            prefs.push({ type: 'attribute', value: 'defense', rank: 2 });
            prefs.push({ type: 'attribute', value: 'dexterity', rank: 2 });
            prefs.push({ type: 'attribute', value: 'endurance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'speed', rank: 2 });
            prefs.push({ type: 'attribute', value: 'magic_attack', rank: 2 });
            prefs.push({ type: 'attribute', value: 'magic_defense', rank: 2 });
            prefs.push({ type: 'attribute', value: 'energy_regen', rank: 3 });
            // Resistances - neutral
            prefs.push({ type: 'attribute', value: 'fire_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'cold_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'lightning_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'toxic_resistance', rank: 2 });
            prefs.push({ type: 'attribute', value: 'elemental_resistance', rank: 2 });

            // Resources
            prefs.push({ type: 'resource', value: 'energy', rank: 3 });
            prefs.push({ type: 'resource', value: 'mana', rank: 3 });
            prefs.push({ type: 'resource', value: 'health', rank: 3 });

            // Spell tiers - system characters prefer universal support spells
            prefs.push({ type: 'spell_tier', value: 'universal', rank: 4 });
            prefs.push({ type: 'spell_tier', value: 'archetype', rank: 3 });
            prefs.push({ type: 'spell_tier', value: 'species', rank: 2 });
            prefs.push({ type: 'spell_tier', value: 'signature', rank: 2 });
        }

        return prefs;
    }
}
