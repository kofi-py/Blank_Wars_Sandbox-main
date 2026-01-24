import { TeamCharacter } from '@/data/teamBattleSystem';
import { type BattleCharacter } from '@/data/battleFlow';
import { getCharacterPowers } from '@/services/powerAPI';
import { getCharacterSpells } from '@/services/spellAPI';

// Convert TeamCharacter to BattleCharacter format for battle engine
// Loads powers and spells from database asynchronously
export const convertToBattleCharacter = async (character: TeamCharacter, morale: number): Promise<BattleCharacter> => {
  const migratedCharacter = normalizeCharacterProperties(character);

  // Load powers and spells from database
  let unlockedPowers: any[] = [];
  let unlockedSpells: any[] = [];

  try {
    const powersResponse = await getCharacterPowers(character.id);
    unlockedPowers = powersResponse.unlockedPowers.filter(p => p.unlocked);

    const spellsResponse = await getCharacterSpells(character.id);
    unlockedSpells = spellsResponse.unlockedSpells.filter(s => s.unlocked);
  } catch (error) {
    console.error(`Failed to load powers/spells for ${character.name}:`, error);
    // Fail loudly - no fallbacks
    throw new Error(`Cannot load powers/spells for ${character.name}: ${error}`);
  }

  // Create a proper Character object
  const properCharacter: any = {
    ...migratedCharacter,
    abilities: {
      characterId: character.name.toLowerCase().replace(/\s+/g, '_'),
      equipped: [],
      available: Array.isArray(character.abilities) ? character.abilities : [],
      cooldowns: {},
      lastUpdated: new Date()
    }
  };

  return {
    character: properCharacter,
    currentHealth: migratedCharacter.health || migratedCharacter.maxHealth || character.currentHp,
    currentMana: migratedCharacter.mana || migratedCharacter.max_mana || character.currentMana || 0,
    maxMana: migratedCharacter.max_mana || character.maxMana || 100,
    position: character.position || { q: 0, r: 0, s: 0 },
    physicalDamageDealt: 0,
    physicalDamageTaken: 0,
    statusEffects: (character.statusEffects || []).map((effect: any) => ({
      id: `effect_${Date.now()}_${Math.random()}`,
      name: typeof effect === 'string' ? effect : effect?.name || 'Unknown Effect',
      description: typeof effect === 'string' ? `${effect} effect` : effect?.description || '',
      type: typeof effect === 'string' ? effect : effect?.type || 'buff',
      value: typeof effect === 'string' ? 1 : effect?.intensity || 1,
      duration: typeof effect === 'string' ? 3 : effect?.duration || 3,
      stackable: false
    })),
    buffs: character.buffs || [],
    debuffs: character.debuffs || [],
    unlockedPowers,
    unlockedSpells,
    powerCooldowns: new Map(),
    spellCooldowns: new Map(),
    mentalState: {
      confidence: character.confidence || character.mentalState?.confidence || 50,
      stress: character.stress || character.mentalState?.stress || 0,
      currentMentalHealth: character.currentMentalHealth || character.mentalState?.currentMentalHealth || 100,
      battleFocus: character.battleFocus || character.mentalState?.battleFocus || 50,
      teamTrust: morale,
      strategyDeviationRisk: character.strategyDeviationRisk || character.mentalState?.strategyDeviationRisk || 25
    },
    gameplanAdherence: character.gameplanAdherence || 75,
    battlePerformance: {
      damageDealt: 0,
      damageTaken: 0,
      abilitiesUsed: 0,
      successfulHits: 0,
      criticalHits: 0,
      teamplayActions: 0,
      strategyDeviations: 0
    },
    relationshipModifiers: character.relationshipModifiers || [],
    equipmentBonuses: character.equipmentBonuses || {
      attackBonus: 0,
      defenseBonus: 0,
      speedBonus: 0,
      criticalChanceBonus: 0
    }
  };
};
