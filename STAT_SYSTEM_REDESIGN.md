# Stat System Redesign - Complete Specification

**Date:** 2025-11-23
**Status:** Planning Phase
**Impact:** MASSIVE - Complete overhaul of character stat system

---

## Problem Statement

Current system has TWO parallel stat systems causing massive confusion:

### Current Mess:
```
characters table:        strength, dexterity, intelligence, etc. (static base)
user_characters table:   current_attack, current_defense, current_speed
Battle engine:           Uses both inconsistently with fallbacks everywhere
Equipment bonuses:       Applied inconsistently to different stat types
```

**Issues:**
- Fallbacks masking missing data (`|| 0`, `|| 50`, `?.`)
- Data flowing through incorrect mappings
- Equipment bonuses applied at wrong levels
- Battle engine using `getStat()` with multiple fallback attempts
- No clear source of truth

---

## Solution: FLATTEN THE SYSTEM

**Single stat system with clear separation:**
1. **Attributes** - core stats players invest in
2. **Vitals** - resource pools (health/mana/energy)
3. **Battle Stats** - calculated from attributes + equipment

---

## 1. The 7 Core Attributes

Stored in `user_characters` table, players spend points to increase:

```sql
strength INTEGER NOT NULL DEFAULT 10,      -- Physical damage output
endurance INTEGER NOT NULL DEFAULT 10,     -- Physical resistance/toughness
dexterity INTEGER NOT NULL DEFAULT 10,     -- Accuracy, crit chance, dodge
intelligence INTEGER NOT NULL DEFAULT 10,  -- Magic power
wisdom INTEGER NOT NULL DEFAULT 10,        -- Magic resistance, insight
charisma INTEGER NOT NULL DEFAULT 10,      -- Social power, inspiration
spirit INTEGER NOT NULL DEFAULT 10         -- Special abilities, spiritual power
```

**Remove these columns:**
- `current_attack` ❌
- `current_defense` ❌
- `current_speed` ❌

---

## 2. The 3 Vitals (Resource Pools)

Stored in `user_characters` table:

```sql
current_health INTEGER NOT NULL,
max_health INTEGER NOT NULL,
current_mana INTEGER NOT NULL,
max_mana INTEGER NOT NULL,
current_energy INTEGER NOT NULL,
max_energy INTEGER NOT NULL
```

**Growth system:** Hybrid model

### Automatic Growth (every level, archetype-based):
```typescript
// Stored in vitals_scaling table
Warrior:   +15 HP, +3 mana,  +5 energy per level
Mage:      +8 HP,  +12 mana, +3 energy per level
Trickster: +10 HP, +5 mana,  +8 energy per level
Tank:      +18 HP, +2 mana,  +4 energy per level
Berserker: +12 HP, +3 mana,  +10 energy per level
// etc. for all archetypes
```

### Core/Vital Points (every 3rd level - 3, 6, 9, 12...):
```typescript
Level 3:  Get 1 core point  → spend on +20 health/mana/energy
Level 6:  Get 2 core points → spend on +40 total (split or stack)
Level 9:  Get 3 core points → spend on +60 total
Level 12: Get 4 core points → spend on +80 total
// Pattern: points = level / 3
```

---

## 3. Progression System

### Every Level Up:
```typescript
1. Automatic vitals increase (archetype-based, see above)
2. Award 3 attribute points to spend on:
   - Strength (+1)
   - Endurance (+1)
   - Dexterity (+1)
   - Intelligence (+1)
   - Wisdom (+1)
   - Charisma (+1)
   - Spirit (+1)
```

### Every 3rd Level (Milestones):
```typescript
Additional: Award (level / 3) core points to spend ONLY on:
   - Health (+20 max_health per point)
   - Mana (+20 max_mana per point)
   - Energy (+20 max_energy per point)
```

---

## 4. Battle Stat Calculations (Derived, NOT stored)

Calculated on-the-fly during battle:

```typescript
// Physical combat
battle_damage = strength + weapon_atk_bonus + active_power_damage_bonus
battle_resistance = endurance + armor_def_bonus
battle_accuracy = (dexterity * 0.01) + equipment_accuracy_bonus
battle_crit_chance = (dexterity * 0.005) + equipment_crit_bonus
battle_dodge = (dexterity * 0.003) + equipment_evasion_bonus

// Magic combat
battle_magic_power = intelligence + spell_power_bonus + equipment_magic_atk
battle_magic_resist = wisdom + equipment_magic_def_bonus

// Resources (max pools already stored, these are regen rates)
energy_regen_per_turn = endurance * 0.1
mana_regen_per_turn = wisdom * 0.05
```

---

## 5. Equipment/Power/Spell Requirements

### Add requirement columns to `equipment` table:
```sql
ALTER TABLE equipment ADD COLUMN required_strength INTEGER;
ALTER TABLE equipment ADD COLUMN required_endurance INTEGER;
ALTER TABLE equipment ADD COLUMN required_dexterity INTEGER;
ALTER TABLE equipment ADD COLUMN required_intelligence INTEGER;
ALTER TABLE equipment ADD COLUMN required_wisdom INTEGER;
ALTER TABLE equipment ADD COLUMN required_charisma INTEGER;
ALTER TABLE equipment ADD COLUMN required_spirit INTEGER;

-- Already exists:
-- required_level INTEGER
-- required_archetype TEXT[]
```

### Add requirement columns to `powers` table:
```sql
ALTER TABLE powers ADD COLUMN required_level INTEGER;
ALTER TABLE powers ADD COLUMN required_strength INTEGER;
ALTER TABLE powers ADD COLUMN required_intelligence INTEGER;
ALTER TABLE powers ADD COLUMN required_spirit INTEGER;
ALTER TABLE powers ADD COLUMN required_charisma INTEGER;
```

### Add requirement columns to `spells` table:
```sql
ALTER TABLE spells ADD COLUMN required_level INTEGER;
ALTER TABLE spells ADD COLUMN required_intelligence INTEGER;
ALTER TABLE spells ADD COLUMN required_wisdom INTEGER;
ALTER TABLE spells ADD COLUMN required_spirit INTEGER;
```

**Usage:**
```typescript
// Can equip?
if (character.strength >= equipment.required_strength &&
    character.level >= equipment.required_level &&
    (equipment.required_archetype === null ||
     equipment.required_archetype.includes(character.archetype))) {
  // Can equip
}

// Can learn/use power?
if (character.strength >= power.required_strength &&
    character.intelligence >= power.required_intelligence &&
    character.level >= power.required_level) {
  // Can learn
}
```

---

## 6. Database Schema Changes

### New table: `vitals_scaling`
```sql
CREATE TABLE vitals_scaling (
  archetype VARCHAR(50) PRIMARY KEY,
  health_per_level INTEGER NOT NULL,
  mana_per_level INTEGER NOT NULL,
  energy_per_level INTEGER NOT NULL,

  -- Optional: individual character modifiers
  -- Applied on top of archetype base
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO vitals_scaling (archetype, health_per_level, mana_per_level, energy_per_level) VALUES
('warrior', 15, 3, 5),
('mage', 8, 12, 3),
('trickster', 10, 5, 8),
('tank', 18, 2, 4),
('berserker', 12, 3, 10),
('scholar', 9, 10, 4),
('mystic', 10, 8, 6),
('beast', 14, 4, 7);
-- etc.
```

### Modify `user_characters` table:
```sql
-- Remove old combat stats
ALTER TABLE user_characters DROP COLUMN current_attack;
ALTER TABLE user_characters DROP COLUMN current_defense;
ALTER TABLE user_characters DROP COLUMN current_speed;
ALTER TABLE user_characters DROP COLUMN current_special;

-- Add/ensure attribute columns exist
ALTER TABLE user_characters
  ADD COLUMN IF NOT EXISTS strength INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS endurance INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS dexterity INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS intelligence INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS wisdom INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS charisma INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS spirit INTEGER NOT NULL DEFAULT 10;

-- Add progression tracking
ALTER TABLE user_characters
  ADD COLUMN IF NOT EXISTS attribute_points_available INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS core_points_available INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attribute_point_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS core_point_history JSONB DEFAULT '[]'::jsonb;

-- Ensure vitals exist (should already be there)
-- current_health, max_health, current_mana, max_mana, current_energy, max_energy
```

### Optional: `character_vitals_modifiers` table
```sql
-- For individual characters who get bonuses beyond their archetype
CREATE TABLE character_vitals_modifiers (
  character_id VARCHAR(50) PRIMARY KEY REFERENCES characters(id),
  health_bonus INTEGER DEFAULT 0,    -- Extra HP per level beyond archetype
  mana_bonus INTEGER DEFAULT 0,      -- Extra mana per level
  energy_bonus INTEGER DEFAULT 0,    -- Extra energy per level

  notes TEXT  -- e.g., "Achilles gets +2 HP/level due to legendary toughness"
);

-- Examples
INSERT INTO character_vitals_modifiers (character_id, health_bonus, notes) VALUES
('achilles', 2, 'Legendary warrior durability'),
('merlin', 3, 'Exceptional magical reserves');
```

---

## 7. Data Migration Strategy

### Phase 1: Add new columns (safe, non-breaking)
```sql
-- Add attribute columns with defaults
-- Add progression tracking columns
-- Create vitals_scaling table
```

### Phase 2: Populate attributes from old stats
```sql
-- Strategy: Map old current_attack/defense/speed to new attributes
-- This is a ONE-TIME conversion

UPDATE user_characters SET
  strength = FLOOR(current_attack * 0.8),        -- Reverse the old calculation
  endurance = FLOOR(current_defense * 0.8),
  dexterity = FLOOR(current_speed * 0.8),
  intelligence = COALESCE(magic_attack * 0.8, 10),
  wisdom = COALESCE(magic_defense * 0.8, 10),
  charisma = 10,  -- Default for everyone
  spirit = 10;    -- Default for everyone

-- Recalculate max vitals based on level
UPDATE user_characters uc SET
  max_health = 50 + (uc.level * vs.health_per_level),
  max_mana = 30 + (uc.level * vs.mana_per_level),
  max_energy = 50 + (uc.level * vs.energy_per_level)
FROM vitals_scaling vs
JOIN characters c ON c.id = uc.character_id
WHERE vs.archetype = c.archetype;

-- Cap current values to new maxes
UPDATE user_characters SET
  current_health = LEAST(current_health, max_health),
  current_mana = LEAST(current_mana, max_mana),
  current_energy = LEAST(current_energy, max_energy);
```

### Phase 3: Award retroactive attribute points
```sql
-- Players should have gotten 3 points per level
-- Award them all retroactive points to spend
UPDATE user_characters SET
  attribute_points_available = (level - 1) * 3;

-- Award retroactive core points for milestone levels
-- Levels 3, 6, 9, 12, etc.
UPDATE user_characters SET
  core_points_available = FLOOR(level / 3) * (FLOOR(level / 3) + 1) / 2;
-- This formula: level 9 → 1+2+3 = 6 points total
```

### Phase 4: Drop old columns (AFTER everything works)
```sql
ALTER TABLE user_characters DROP COLUMN current_attack;
ALTER TABLE user_characters DROP COLUMN current_defense;
ALTER TABLE user_characters DROP COLUMN current_speed;
```

---

## 8. TypeScript Interface Changes

### Update `Contestant` interface:
```typescript
export interface Contestant {
  id: string;
  user_id: string;
  character_id: string;
  level: number;
  experience: number;
  bond_level: number;

  // ATTRIBUTES (core stats, NOT NULL)
  strength: number;
  endurance: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  spirit: number;

  // VITALS (resource pools, NOT NULL)
  current_health: number;
  max_health: number;
  current_mana: number;
  max_mana: number;
  current_energy: number;
  max_energy: number;

  // PROGRESSION
  attribute_points_available: number;
  core_points_available: number;

  // Remove these completely:
  // current_attack ❌
  // current_defense ❌
  // current_speed ❌

  // ... rest of fields
}
```

### Update `TeamCharacter` interface:
```typescript
export interface TeamCharacter {
  // Same attributes as Contestant
  strength: number;
  endurance: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  spirit: number;

  current_health: number;
  max_health: number;
  current_mana: number;
  max_mana: number;
  current_energy: number;
  max_energy: number;

  // Remove these:
  // defense ❌
  // speed ❌
  // attack ❌ (unless it's a display-only calculated value)

  // ... rest of fields
}
```

### Update `Equipment` interface:
```typescript
export interface Equipment {
  id: string;
  name: string;

  // REQUIREMENTS (new)
  required_level: number;
  required_archetype?: string[];
  required_strength?: number;
  required_endurance?: number;
  required_dexterity?: number;
  required_intelligence?: number;
  required_wisdom?: number;
  required_charisma?: number;
  required_spirit?: number;

  // BONUSES (what it adds)
  stats: EquipmentStats;  // atk, def, spd, etc.

  // ... rest
}
```

### Update `Power` and `Spell` interfaces:
```typescript
export interface Power {
  id: string;
  name: string;

  // REQUIREMENTS (new)
  required_level?: number;
  required_strength?: number;
  required_intelligence?: number;
  required_spirit?: number;
  required_charisma?: number;

  // ... rest
}

export interface Spell {
  id: string;
  name: string;

  // REQUIREMENTS (new)
  required_level?: number;
  required_intelligence?: number;
  required_wisdom?: number;
  required_spirit?: number;

  // ... rest
}
```

---

## 9. Code Changes Required

### A. Remove `characterConversion.ts` complexity
**Current:** Maps `current_attack` → `defense`, `current_speed` → `speed`, etc.
**New:** Direct 1:1 mapping, attributes stay as attributes

```typescript
// BEFORE (wrong):
defense: character.defense,  // Wrong field!
speed: character.speed,      // Wrong field!

// AFTER (correct):
strength: character.strength,
endurance: character.endurance,
dexterity: character.dexterity,
// etc. - direct mapping, NO conversions
```

### B. Remove `PhysicalBattleEngine.getStat()` fallback function
**Current:** Tries multiple locations with fallbacks
**New:** Attributes guaranteed to exist, access directly

```typescript
// BEFORE (has fallbacks):
private static getStat(bc: BattleCharacter, stat: string, fallback: number = 0): number {
  // Try direct property, try stats object, return fallback...
}

// AFTER (direct access):
const strength = attacker.character.strength;  // Guaranteed to exist!
const endurance = defender.character.endurance;
```

### C. Update battle damage calculations
```typescript
// PhysicalBattleEngine.ts

static calculateDamage(attacker: BattleCharacter, defender: BattleCharacter, action: ExecutedAction): number {
  const base_damage = this.getAbilityPower(action.ability);
  const strength = attacker.character.strength;  // Direct access
  const endurance = defender.character.endurance;  // Direct access

  const weapon_bonus = attacker.character.equipped_items.weapon?.stats.atk ?? 0;
  const armor_bonus = defender.character.equipped_items.armor?.stats.def ?? 0;

  const battle_damage = strength + weapon_bonus + base_damage;
  const battle_resistance = endurance + armor_bonus;

  const final_damage = Math.max(1, battle_damage - battle_resistance);

  return final_damage;
}
```

### D. Create requirement checking utilities
```typescript
// utils/requirementChecker.ts

export function canEquip(character: Contestant, equipment: Equipment): {
  canEquip: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (character.level < equipment.required_level) {
    reasons.push(`Requires level ${equipment.required_level}`);
  }

  if (equipment.required_strength && character.strength < equipment.required_strength) {
    reasons.push(`Requires ${equipment.required_strength} strength`);
  }

  if (equipment.required_endurance && character.endurance < equipment.required_endurance) {
    reasons.push(`Requires ${equipment.required_endurance} endurance`);
  }

  // ... check all attribute requirements

  if (equipment.required_archetype &&
      !equipment.required_archetype.includes(character.archetype)) {
    reasons.push(`Requires archetype: ${equipment.required_archetype.join(' or ')}`);
  }

  return {
    canEquip: reasons.length === 0,
    reasons
  };
}

export function canLearnPower(character: Contestant, power: Power): {
  canLearn: boolean;
  reasons: string[];
} {
  // Similar logic for powers
}

export function canLearnSpell(character: Contestant, spell: Spell): {
  canLearn: boolean;
  reasons: string[];
} {
  // Similar logic for spells
}
```

### E. Create level-up system
```typescript
// services/levelUpService.ts

export async function levelUp(character_id: string): Promise<{
  new_level: number;
  attribute_points_awarded: number;
  core_points_awarded: number;
  vitals_increase: { health: number; mana: number; energy: number };
}> {
  // 1. Get character
  const character = await getCharacter(character_id);
  const new_level = character.level + 1;

  // 2. Get archetype vitals scaling
  const scaling = await getVitalsScaling(character.archetype);

  // 3. Award regular attribute points (every level)
  const attribute_points = 3;

  // 4. Award core points if milestone level (every 3rd)
  const core_points = (new_level % 3 === 0) ? Math.floor(new_level / 3) : 0;

  // 5. Increase vitals automatically
  const vitals_increase = {
    health: scaling.health_per_level,
    mana: scaling.mana_per_level,
    energy: scaling.energy_per_level
  };

  // 6. Update database
  await query(`
    UPDATE user_characters SET
      level = $1,
      attribute_points_available = attribute_points_available + $2,
      core_points_available = core_points_available + $3,
      max_health = max_health + $4,
      max_mana = max_mana + $5,
      max_energy = max_energy + $6,
      current_health = max_health + $4,  -- Heal to new max on level up
      current_mana = max_mana + $5,
      current_energy = max_energy + $6
    WHERE id = $7
  `, [new_level, attribute_points, core_points,
      vitals_increase.health, vitals_increase.mana, vitals_increase.energy,
      character_id]);

  return {
    new_level,
    attribute_points_awarded: attribute_points,
    core_points_awarded: core_points,
    vitals_increase
  };
}

export async function spendAttributePoint(
  character_id: string,
  attribute: 'strength' | 'endurance' | 'dexterity' | 'intelligence' | 'wisdom' | 'charisma' | 'spirit'
): Promise<void> {
  // Verify has points available
  // Increase attribute by 1
  // Decrease points_available by 1
  // Log in history
}

export async function spendCorePoint(
  character_id: string,
  vital: 'health' | 'mana' | 'energy'
): Promise<void> {
  // Verify has core points available
  const increase = 20;
  const column = vital === 'health' ? 'max_health' :
                 vital === 'mana' ? 'max_mana' : 'max_energy';

  await query(`
    UPDATE user_characters SET
      ${column} = ${column} + $1,
      core_points_available = core_points_available - 1
    WHERE id = $2 AND core_points_available > 0
  `, [increase, character_id]);

  // Log in history
}
```

---

## 10. UI Changes Required

### A. Character Sheet Display
- Show attributes (strength, endurance, etc.) with clear labels
- Show vitals (current/max health, mana, energy)
- Show available attribute points and core points
- Show derived battle stats (calculated)

### B. Level Up Screen
- Celebrate level up
- Show automatic vitals increase
- Allow spending attribute points (3 dropdown selectors or +/- buttons)
- If milestone level (3, 6, 9...), show core point spending UI

### C. Equipment Screen
- Show requirements on equipment tooltips
- Disable/gray out equipment that doesn't meet requirements
- Show clear error messages ("Requires 50 Strength")

### D. Powers/Spells Screen
- Show requirements on ability tooltips
- Lock abilities that don't meet requirements
- Show progression path (what you need to unlock)

---

## 11. Testing Checklist

- [ ] New characters created with correct starting attributes
- [ ] Level up awards correct attribute points (3 per level)
- [ ] Level 3, 6, 9 award correct core points (1, 2, 3...)
- [ ] Vitals increase automatically per archetype scaling
- [ ] Spending attribute points works correctly
- [ ] Spending core points increases max vitals by 20
- [ ] Equipment requirement checking works
- [ ] Power/spell requirement checking works
- [ ] Battle damage calculations use new formulas
- [ ] Battle resistance calculations use new formulas
- [ ] Migrated old characters have correct attributes
- [ ] No fallbacks remain in codebase (search for `|| 0`, `|| 50`, `?.`)

---

## 12. Rollout Plan

### Phase 1: Preparation (This planning phase)
- ✅ Document complete specification (this file)
- [ ] Review with team
- [ ] Get user approval
- [ ] Create backup of current database

### Phase 2: Database Changes
- [ ] Create vitals_scaling table
- [ ] Add attribute columns to user_characters
- [ ] Add requirement columns to equipment/powers/spells
- [ ] Test migrations on dev database

### Phase 3: Backend Code Changes
- [ ] Update interfaces
- [ ] Create level-up service
- [ ] Create requirement checking utilities
- [ ] Update battle engine calculations
- [ ] Remove all fallback code

### Phase 4: Frontend Code Changes
- [ ] Update character conversion
- [ ] Update UI components
- [ ] Create level-up screens
- [ ] Update equipment/ability displays

### Phase 5: Data Migration
- [ ] Run migration scripts on production data
- [ ] Validate all characters converted correctly
- [ ] Award retroactive points

### Phase 6: Testing & Launch
- [ ] Full system testing
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 13. Open Questions / Decisions Needed

1. **Starting attribute values:** Should new level 1 characters have 10 in each, or vary by archetype?

2. **Attribute caps:** Is there a maximum for each attribute? (e.g., 100, 999?)

3. **Respec system:** Can players reset and redistribute their attribute points? Cost?

4. **Equipment stat bonuses:** Should equipment add to attributes OR to battle stats? (Current plan: battle stats)

5. **Individual character modifiers:** Use the optional character_vitals_modifiers table? Which characters get bonuses?

6. **Migration compensation:** Should players get extra points for the disruption?

---

## Summary

This redesign:
- ✅ Eliminates dual stat system confusion
- ✅ Single source of truth for character power
- ✅ Clear progression path (spend points on attributes)
- ✅ Equipment/powers gate on attributes (like D&D)
- ✅ Battle stats calculated clearly from attributes + equipment
- ✅ NO FALLBACKS needed - all data guaranteed to exist
- ✅ Hybrid vitals system (auto growth + strategic investment)
- ✅ Milestone moments every 3 levels (core points)

**Next Step:** Review this specification, get approval, then begin implementation!
