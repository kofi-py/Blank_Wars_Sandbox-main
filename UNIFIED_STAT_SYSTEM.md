# Unified Stat System for Blank Wars

## Core Principle
ONE stat system. All stats affect battle AND other activities. No artificial separation.

## Complete Stat List

### Combat Stats (Direct Battle Values)
- **health** - Hit points, how much damage you can take before defeat
- **attack** - Physical damage output
- **defense** - Physical damage reduction/armor
- **speed** - Turn order, initiative, movement
- **magic_attack** - Magical/special damage output
- **magic_defense** - Magical/special damage reduction

### Attribute Stats (Affect Multiple Systems)
- **strength** - Melee damage modifier, carry capacity, physical power checks
- **dexterity** - Accuracy, dodge chance, sleight of hand, precision tasks
- **stamina** - Endurance, sustained activity, actions per turn
- **intelligence** - Learning rate, problem solving, tactics, spell complexity
- **wisdom** - Perception, insight, judgment, spiritual power
- **charisma** - Social influence, leadership, negotiation, inspiration
- **spirit** - Willpower, special abilities, mental fortitude

### Advanced Combat Stats
- **critical_chance** - Probability of landing critical hits (%)
- **critical_damage** - Damage multiplier on critical hits (%)
- **accuracy** - Hit chance modifier
- **evasion** - Dodge chance modifier
- **max_mana** - Energy for special abilities
- **energy_regen** - Mana/energy recovery per turn

### Psychological Stats (Character State)
- **training** - Practice/discipline level (0-100)
- **team_player** - Cooperation/teamwork ability (0-100)
- **ego** - Self-confidence/pride level (0-100)
- **mental_health** - Current psychological wellbeing (0-100)
- **communication** - Ability to coordinate with team (0-100)
- **gameplan_adherence** - Following strategy/instructions (0-100)
- **stress_level** - Current stress (0-100, lower is better)
- **team_trust** - Trust in teammates (0-100)
- **current_mental_health** - Current mental state (0-100)
- **battle_focus** - Focus during combat (0-100)

### Resistance Stats
- **physical_resistance** - Resistance to physical damage (0-100)
- **magical_resistance** - Resistance to magical damage (0-100)
- **elemental_resistance** - Resistance to elemental damage (0-100)

### Equipment & Proficiency Stats
- **weapon_proficiencies** - Array of weapon types character can use
- **preferred_weapons** - Array of preferred weapon types
- **armor_proficiency** - Armor types character can equip
- **preferred_armor_type** - Preferred armor category
- **equipment_notes** - Additional equipment information

### Character Metadata
- **starting_wallet** - Initial currency amount
- **comedian_style_id** - Reference to comedian style (if applicable)
- **secondary_species** - Additional species classification

## Database Migration Status

### ✅ COMPLETED - All migrations have been applied to both local and production databases

The following columns were renamed and added:
- ✅ Renamed: base_health → health, base_attack → attack, base_defense → defense, base_speed → speed
- ✅ Renamed: base_special → magic_attack, gameplan_adherence_level → gameplan_adherence
- ✅ Added all attribute stats: magic_defense, strength, dexterity, stamina, intelligence, wisdom, charisma, spirit
- ✅ Added all advanced combat stats: critical_chance, critical_damage, accuracy, evasion, max_mana, energy_regen
- ✅ Added resistance stats: physical_resistance, magical_resistance, elemental_resistance
- ✅ Added equipment proficiency fields: weapon_proficiencies, preferred_weapons, armor_proficiency, preferred_armor_type, equipment_notes

## Equipment Stat Mapping

Equipment can provide bonuses to ANY stat using these keys:

### Combat Stats
- `hp` → health
- `atk` → attack
- `def` → defense
- `spd` → speed
- `magicAttack` → magic_attack
- `magicDefense` → magic_defense

### Attribute Stats
- `str` → strength
- `dex` → dexterity
- `sta` → stamina
- `int` → intelligence
- `wis` → wisdom
- `cha` → charisma
- `spr` → spirit

### Advanced Combat Stats
- `critRate` → critical_chance
- `critDamage` → critical_damage
- `accuracy` → accuracy
- `evasion` → evasion
- `mana` → max_mana
- `energyRegen` → energy_regen

### Psychological Stats (Special Items)
- `stress` → stress_level (reduces stress)
- `focus` → gameplan_adherence
- `mentalHealth` → mental_health
- `teamwork` → team_player
- `confidence` → ego
- `trust` → team_trust
- `battleFocus` → battle_focus
- `currentMentalHealth` → current_mental_health

### Resistance Stats
- `physicalRes` → physical_resistance
- `magicalRes` → magical_resistance
- `elementalRes` → elemental_resistance

## Frontend Display Structure

```typescript
interface CharacterStats {
  // Combat Stats
  health: number;
  attack: number;
  defense: number;
  speed: number;
  magic_attack: number;
  magic_defense: number;

  // Attribute Stats
  strength: number;
  dexterity: number;
  stamina: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  spirit: number;

  // Advanced Combat
  critical_chance: number;
  critical_damage: number;
  accuracy: number;
  evasion: number;
  max_mana: number;
  energy_regen: number;

  // Psychological
  training: number;
  team_player: number;
  ego: number;
  mental_health: number;
  communication: number;
  gameplan_adherence: number;
  stress_level: number;
  team_trust: number;
}
```

## Stat Calculation Formula

```
Final Stat = Base Stat + Equipment Bonuses + Temporary Modifiers
```

No caps. No artificial limits. If you stack defense items, you get high defense.

## Implementation Order

1. ✅ Create this specification document
2. Create and run database migration
3. Update serializer to return raw column names (no translation)
4. Update frontend types to match
5. Update equipment calculation system
6. Update UI to display all stats with bonuses
7. Test with actual equipment
