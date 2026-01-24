import { TeamCharacter } from '@/data/teamBattleSystem';
import { type BattleCharacter } from '@/data/battleFlow';
import { createStatusEffects } from '@/services/statusEffectAPI';

// Convert TeamCharacter to BattleCharacter format for battle engine
// Loads powers, spells, and status effects from database asynchronously
export const convertToBattleCharacter = async (character: TeamCharacter, morale: number): Promise<BattleCharacter> => {
  // NO FALLBACKS - All powers and spells come from database
  // Migration 122 ensures all characters have Strength power and Minor Heal spell unlocked
  // Backend loader already filters to unlocked powers/spells, so we use them directly
  const unlocked_powers = character.powers;
  const unlocked_spells = character.spells;

  // Load real status effects from database
  const status_effects = await createStatusEffects(character.status_effects);

  return {
    character: character,
    current_health: character.current_health,
    max_health: character.max_health,
    current_mana: character.current_mana,
    max_mana: character.max_mana,
    position: character.position,
    physical_damage_dealt: 0,
    physical_damage_taken: 0,
    status_effects,
    buffs: character.buffs,
    debuffs: character.debuffs,
    unlocked_powers,
    unlocked_spells,
    equipped_powers: character.equipped_powers,
    equipped_spells: character.equipped_spells,
    power_cooldowns: new Map(),
    spell_cooldowns: new Map(),
    // Use ALL psychology values directly from database - NO frontend calculations
    psych_stats: {
      confidence: character.current_confidence,
      stress_level: character.current_stress,
      mental_health: character.current_mental_health,
      battle_focus: character.battle_focus,
      team_trust: character.team_trust,
      gameplan_adherence: character.gameplan_adherence,
      ego: character.psych_stats?.ego || 50,
      team_player: character.psych_stats?.team_player || 50
    },
    // Deprecated mental_state for backward compatibility
    mental_state: {
      confidence: character.current_confidence,
      stress: character.current_stress,
      current_mental_health: character.current_mental_health,
      battle_focus: character.battle_focus,
      team_trust: character.team_trust
    },
    gameplan_adherence: character.gameplan_adherence, // From DB
    battle_performance: {
      damage_dealt: 0,
      damage_taken: 0,
      abilities_used: 0,
      successful_hits: 0,
      critical_hits: 0,
      teamplay_actions: 0,
      strategy_deviations: 0
    },
    relationship_modifiers: character.relationship_modifiers,
    equipment_bonuses: {
      attack_bonus: character.equipment_bonuses.atk || 0,
      defense_bonus: character.equipment_bonuses.def || 0,
      speed_bonus: character.equipment_bonuses.spd || 0,
      critical_chance_bonus: character.equipment_bonuses.crit_rate || 0
    },
    // Default NFT/Staking values (will be populated if available in TeamCharacter)
    nft_metadata: (character as any).nft_metadata,
    is_staked: (character as any).is_staked || false,
    staked_at: (character as any).staked_at ? new Date((character as any).staked_at) : undefined
  };
};
