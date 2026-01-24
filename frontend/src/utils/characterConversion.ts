import type { Contestant } from '@blankwars/types';
import type { TeamCharacter, CharacterAbility } from '@/data/teamBattleSystem';
import type { Equipment, EquipmentStats } from '@/data/equipment';

/**
 * Calculate equipment bonuses from equipped items
 */
function calculateEquipmentBonuses(equipped_items: { weapon?: Equipment; armor?: Equipment; accessory?: Equipment }): EquipmentStats {
  const bonuses: EquipmentStats = {
    atk: 0,
    def: 0,
    spd: 0,
    hp: 0,
    crit_rate: 0,
    crit_damage: 0,
    accuracy: 0,
    evasion: 0,
    energy_regen: 0,
    xp_bonus: 0
  };

  // Process all equipped items - safely handle undefined equipped_items
  const items = equipped_items
    ? [equipped_items.weapon, equipped_items.armor, equipped_items.accessory].filter(Boolean) as Equipment[]
    : [];

  items.forEach(item => {
    if (item.stats) {
      // Map equipment stat names to our bonus structure
      Object.entries(item.stats).forEach(([key, value]) => {
        if (typeof value === 'number') {
          switch (key) {
            case 'atk':
            case 'attack':
              bonuses.atk += value;
              break;
            case 'def':
            case 'defense':
              bonuses.def += value;
              break;
            case 'spd':
            case 'speed':
              bonuses.spd += value;
              break;
            case 'hp':
            case 'health':
              bonuses.hp += value;
              break;
            case 'critRate':
            case 'critical_chance':
              bonuses.crit_rate += value;
              break;
            case 'critDamage':
            case 'critical_damage':
              bonuses.crit_damage += value;
              break;
            case 'accuracy':
              bonuses.accuracy += value;
              break;
            case 'evasion':
              bonuses.evasion += value;
              break;
            case 'energy_regen':
              bonuses.energy_regen += value;
              break;
            case 'xp_bonus':
              bonuses.xp_bonus += value;
              break;
          }
        }
      });
    }
  });

  return bonuses;
}

// Merge powers and spells into a unified legacy ability shape
export function mergePowersAndSpellsIntoAbilities(character: Contestant): CharacterAbility[] {
  const mappedPowers: CharacterAbility[] = character.powers.map((p) => {
    const basePower = p.effects && p.effects.length > 0 ? p.effects[0].value : 0;
    const mappedType: CharacterAbility['type'] =
      p.power_type?.toLowerCase().includes('def') ? 'defense' :
        p.power_type?.toLowerCase().includes('support') ? 'support' :
          p.power_type?.toLowerCase().includes('attack') ? 'attack' : 'special';

    return {
      id: p.power_id || p.id,
      name: p.name,
      type: mappedType,
      power: basePower,
      cooldown: p.cooldown_turns ?? 0,
      current_cooldown: p.current_rank ?? 0,
      description: p.description || '',
      icon: p.icon || '⭐',
      mental_healthRequired: 0 // Not tracked for powers; treat as no minimum
    };
  });

  const mappedSpells: CharacterAbility[] = character.spells.map((s) => {
    const basePower = s.effects && s.effects.length > 0 ? s.effects[0].value : 0;
    const mappedType: CharacterAbility['type'] =
      s.category?.toLowerCase().includes('heal') ? 'support' :
        s.category?.toLowerCase().includes('def') ? 'defense' :
          'special';

    return {
      id: s.spell_id || s.id,
      name: s.name,
      type: mappedType,
      power: basePower,
      cooldown: s.cooldown_turns ?? 0,
      current_cooldown: s.current_rank ?? 0,
      description: s.description || '',
      icon: s.icon || '✨',
      mental_healthRequired: 0 // Not tracked for spells; treat as no minimum
    };
  });

  return [...mappedPowers, ...mappedSpells];
}

/**
 * Convert a Character to TeamCharacter format for battle system compatibility
 */
export function convertCharacterToTeamCharacter(character: Contestant): TeamCharacter & { strength: number; speed: number; defense: number } {
  const unifiedAbilities: CharacterAbility[] = mergePowersAndSpellsIntoAbilities(character);

  const teamChar: TeamCharacter = {
    // Basic Identity
    id: character.id,
    name: character.name,
    avatar: character.avatar || '/avatars/default.png',
    archetype: character.archetype as any, // Cast string from DB to specific union type
    rarity: 'common', // Default, as not in DB yet

    // Core Stats
    level: character.level,
    experience: character.experience,
    experience_to_next: character.experience_to_next,

    // Combat Stats (flat snake_case)
    // Attributes from characters table (base template, NOT NULL DEFAULT 50)
    strength: character.strength,
    dexterity: character.dexterity,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
    spirit: character.spirit,
    // Current combat stats from user_characters table (base 50 + archetype + species + individual modifiers, NOT NULL)
    defense: character.current_defense,
    speed: character.current_speed,
    current_health: character.current_health,
    max_health: character.current_max_health,

    // Psychological Stats
    psych_stats: character.psych_stats,

    // Resources (snake_case to match database)
    current_mana: character.current_mana,
    max_mana: character.current_max_mana,
    current_energy: character.current_energy,
    max_energy: character.current_max_energy,

    // Adherence system fields (from database)
    gameplan_adherence: character.gameplan_adherence,
    current_stress: character.current_stress,
    team_trust: character.team_trust,
    current_mental_health: character.current_mental_health,
    battle_focus: character.battle_focus,
    current_confidence: character.current_confidence,

    // Temporary stats from coaching
    temporary_stats: character.temporary_stats,

    // Character Personality
    personality_traits: character.personality_traits,
    speaking_style: 'formal', // Default
    decision_making: 'logical', // Default since interface differs
    conflict_response: 'diplomatic' as const, // Default since interface differs

    // Current Status
    status_effects: [], // Default empty for Character conversion
    injuries: [], // Default empty for Character conversion
    rest_days_needed: 0, // Default for Character conversion

    // Battle Properties (always initialize to avoid fallbacks)
    buffs: [],
    debuffs: [],
    relationship_modifiers: [],

    // Abilities - unified from powers/spells for legacy consumers
    abilities: unifiedAbilities,
    special_powers: [], // Default empty for Character conversion

    // Powers & Spells (New System)
    powers: character.powers,
    spells: character.spells,
    equipped_powers: character.equipped_powers,
    equipped_spells: character.equipped_spells,

    // Equipment Integration
    equipped_items: character.equipped_items,

    // Equipment-derived stats (calculated from equipped items)
    equipment_bonuses: calculateEquipmentBonuses(character.equipped_items),

    // Core Skills (required by TeamCharacter) - derive from character level
    core_skills: {
      combat: { level: Math.max(1, Math.floor(character.level * 0.8)), experience: 0, max_level: 999 },
      survival: { level: Math.max(1, Math.floor(character.level * 0.6)), experience: 0, max_level: 999 },
      mental: { level: Math.max(1, Math.floor(character.level * 0.7)), experience: 0, max_level: 999 },
      social: { level: Math.max(1, Math.floor(character.level * 0.5)), experience: 0, max_level: 999 },
      spiritual: { level: Math.max(1, Math.floor(character.level * 0.4)), experience: 0, max_level: 999 }
    },

    // Battle Image Data (Required from DB)
    battle_image_name: character.battle_image_name,
    battle_image_variants: character.battle_image_variants,
    scene_image_slug: character.scene_image_slug
  };

  // Add convenience properties for backward compatibility
  return {
    ...teamChar,
    strength: character.strength + (character.equipped_items?.weapon?.stats?.atk || 0),
    speed: character.speed + (character.equipped_items?.armor?.stats?.spd || 0),
    defense: character.defense
  };
}

/**
 * Convert an array of Characters to TeamCharacters
 */
export function convertCharactersToTeamCharacters(characters: Contestant[]): TeamCharacter[] {
  return characters.map(convertCharacterToTeamCharacter);
}
