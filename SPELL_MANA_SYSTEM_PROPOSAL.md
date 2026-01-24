# Spell & Mana System - Complete Implementation Proposal

## Executive Summary

This document outlines a complete **4-tier spell system** with **mana-based resource management**, designed to run **parallel to** the existing power system (which uses energy/stamina).

---

## 1. System Architecture Overview

### Two Parallel Systems:

**POWER SYSTEM** (Existing - uses Energy/Stamina)
- Physical combat abilities
- Stamina-based resource management
- 4 tiers: Skill, Archetype, Species, Signature Powers

**SPELL SYSTEM** (New - uses Mana)
- Magical/spellcasting abilities
- Mana-based resource management
- 4 tiers: Universal, Archetype, Species, Signature Spells

### Key Principle:
**All spells use mana, regardless of archetype** - A Warrior with magical species traits will have a small mana pool for those limited spells.

---

## 2. Spell Access Tiers by Archetype

**Perfect 3-3-3 Distribution across 9 archetypes:**

### Full Spellcasters (4 Tiers)
**Archetypes:** Mage, Mystic, Scholar
- ✅ Universal Spells
- ✅ Archetype Spells (powerful combat magic)
- ✅ Species Spells
- ✅ Signature Spells

**Mana Pool:** Large (200-300 base)
**Mana Regen:** High (20-30 per turn)

### Partial Spellcasters (3 Tiers)
**Archetypes:** Assassin, Trickster, Leader
- ❌ Universal Spells
- ✅ Archetype Spells (utility/support focused, weaker than full casters)
- ✅ Species Spells
- ✅ Signature Spells

**Mana Pool:** Medium (100-150 base)
**Mana Regen:** Medium (10-15 per turn)

### Non-Spellcasters (0-2 Tiers)
**Archetypes:** Warrior, Tank, Beast
- ❌ Universal Spells
- ❌ Archetype Spells
- ✅ Species Spells (ONLY if magical species - Deity, Vampire, Demon, etc.)
- ✅ Signature Spells (ONLY if lore-appropriate - divine miracles, etc.)

**Mana Pool:** Small (50-100 base) - Only if they have spells
**Mana Regen:** Low (5-10 per turn)

---

## 3. Database Schema

### New Tables

#### `spell_definitions` (Master Spell Catalog)
```sql
CREATE TABLE spell_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('universal', 'archetype', 'species', 'signature')),
  category TEXT, -- 'offensive', 'defensive', 'utility', 'buff', 'debuff'
  archetype TEXT, -- NULL for universal, specific archetype for archetype spells
  species TEXT, -- NULL unless species spell
  character_id TEXT, -- NULL unless signature spell
  description TEXT NOT NULL,
  flavor_text TEXT,
  icon TEXT,

  -- Ranking
  max_rank INTEGER NOT NULL DEFAULT 1,
  rank_bonuses JSONB, -- How spell improves per rank

  -- Unlock requirements
  unlock_level INTEGER,
  unlock_challenge TEXT,
  unlock_cost INTEGER, -- Spell points needed to unlock
  prerequisite_spell_id TEXT REFERENCES spell_definitions(id),

  -- Spell mechanics
  spell_type TEXT CHECK (spell_type IN ('instant', 'channeled', 'persistent')),
  target_type TEXT CHECK (target_type IN ('self', 'single_enemy', 'all_enemies', 'single_ally', 'all_allies', 'area')),
  effects JSONB, -- Damage, healing, buffs, debuffs, etc.

  -- Resource costs
  mana_cost INTEGER NOT NULL DEFAULT 0,
  cooldown INTEGER DEFAULT 0, -- Turns before can cast again
  cast_time INTEGER DEFAULT 0, -- Turns to channel (0 = instant)

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rank_up_cost INTEGER DEFAULT 1
);

CREATE INDEX idx_spell_definitions_tier ON spell_definitions(tier);
CREATE INDEX idx_spell_definitions_archetype ON spell_definitions(archetype);
CREATE INDEX idx_spell_definitions_species ON spell_definitions(species);
CREATE INDEX idx_spell_definitions_character ON spell_definitions(character_id);
CREATE INDEX idx_spell_definitions_category ON spell_definitions(category);
```

#### `character_spells` (Character's Spell Book)
```sql
CREATE TABLE character_spells (
  id TEXT PRIMARY KEY DEFAULT ('charspell_' || EXTRACT(epoch FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),
  character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  spell_id TEXT NOT NULL REFERENCES spell_definitions(id),

  -- Progression
  current_rank INTEGER NOT NULL DEFAULT 1,
  experience INTEGER NOT NULL DEFAULT 0,

  -- Unlock tracking
  unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMP,
  unlocked_by TEXT, -- 'coach_suggestion' | 'character_rebellion' | 'auto' | 'quest_reward'

  -- Usage stats
  times_cast INTEGER NOT NULL DEFAULT 0,
  total_damage_dealt INTEGER DEFAULT 0,
  total_healing_done INTEGER DEFAULT 0,
  last_cast_at TIMESTAMP,

  -- Cooldown tracking
  on_cooldown BOOLEAN DEFAULT false,
  cooldown_expires_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(character_id, spell_id)
);

CREATE INDEX idx_character_spells_character ON character_spells(character_id);
CREATE INDEX idx_character_spells_spell ON character_spells(spell_id);
CREATE INDEX idx_character_spells_unlocked ON character_spells(unlocked);
```

#### `spell_unlock_log` (Audit Trail)
```sql
CREATE TABLE spell_unlock_log (
  id SERIAL PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  spell_id TEXT NOT NULL REFERENCES spell_definitions(id),
  action TEXT NOT NULL CHECK (action IN ('unlock', 'rank_up')),
  from_rank INTEGER NOT NULL DEFAULT 0,
  to_rank INTEGER NOT NULL,
  triggered_by TEXT NOT NULL, -- 'coach_suggestion' | 'character_rebellion' | 'auto'
  points_spent INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spell_unlock_log_character ON spell_unlock_log(character_id);
CREATE INDEX idx_spell_unlock_log_timestamp ON spell_unlock_log(timestamp);
```

### Modified Tables

#### `user_characters` - Add Spell Points & Mana
```sql
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS universal_spell_points INTEGER DEFAULT 0;
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS archetype_spell_points INTEGER DEFAULT 0;
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS species_spell_points INTEGER DEFAULT 0;
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS signature_spell_points INTEGER DEFAULT 0;

ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS current_mana INTEGER DEFAULT 100;
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS max_mana INTEGER DEFAULT 100;
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS mana_regen INTEGER DEFAULT 10;

ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS current_energy INTEGER DEFAULT 100;
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS max_energy INTEGER DEFAULT 100;
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS energy_regen INTEGER DEFAULT 10;
```

#### `characters` Base Template - Set Default Mana/Energy by Archetype
```sql
-- Already has max_mana, energy_regen columns
-- Need to populate defaults based on archetype:

UPDATE characters SET max_mana = 250, energy_regen = 25 WHERE archetype IN ('mage', 'mystic', 'scholar'); -- Full casters
UPDATE characters SET max_mana = 150, energy_regen = 15 WHERE archetype IN ('trickster', 'leader'); -- Partial casters
UPDATE characters SET max_mana = 75, energy_regen = 7 WHERE archetype IN ('warrior', 'assassin', 'tank', 'beast'); -- Non-casters (only use mana if magical species)
```

---

## 4. Resource Management: Energy vs Mana

### Energy (Stamina)
**Used For:** Physical Powers (all 4 tiers of power system)
- Skill Powers (Swordsmanship, Defensive Tactics, etc.)
- Archetype Powers (Battle Cry, Shadow Strike, etc.)
- Species Powers (Human Adaptability, Vampire strength, etc.)
- Signature Powers (Achilles' Heel, Wrath of Achilles, etc.)

**Consumption:**
- Small powers: 5-15 energy
- Medium powers: 20-40 energy
- Large powers: 50+ energy
- Passive powers: 0 energy (always active)

**Regeneration:**
- Base regen per turn (10-30 based on archetype)
- Affected by: rest, items, HQ bonuses, meditation skill

**Current Energy Tracking:** Character starts each battle at max energy, depletes with ability use

### Mana (Magic Power)
**Used For:** Spells (all 4 tiers of spell system)
- Universal Spells
- Archetype Spells
- Species Spells
- Signature Spells

**Consumption:**
- Cantrips (basic spells): 10-20 mana
- Standard spells: 30-50 mana
- Powerful spells: 60-100 mana
- Ultimate spells: 100+ mana

**Regeneration:**
- Base regen per turn (5-30 based on archetype)
- Affected by: meditation, items, rest, magical environment

**Current Mana Tracking:** Character starts each battle at max mana, depletes with spell use

---

## 5. Unified Point System - Powers AND Spells Share Points!

**CRITICAL DESIGN:** Points are NOT separate for powers vs spells. When you earn a point, you CHOOSE whether to spend it on a Power or a Spell in that tier.

### Point Earning (Level Up, Victories, Quests)
```
Level Up Rewards (Example):
- Tier 1 (Universal Points): +1
- Tier 2 (Archetype Points): +1
- Tier 3 (Species Points): +1
- Tier 4 (Signature Points): +0.5 (every 2 levels = 1 point)
```

### How Points Are Spent
**Tier 1 - Universal Points:**
- Spend on: Skill Power (Swordsmanship, Meditation, etc.) OR Universal Spell (Fireball, Shield, etc.)
- Cost: 1 point to unlock, 1 point per rank

**Tier 2 - Archetype Points:**
- Spend on: Archetype Power (Battle Cry, Shadow Strike, etc.) OR Archetype Spell (Meteor, Blood Magic, etc.)
- Cost: 2 points to unlock, 1 point per rank

**Tier 3 - Species Points:**
- Spend on: Species Power (Human Adaptability, etc.) OR Species Spell (Vampire Blood Magic, etc.)
- Cost: 3 points to unlock, 2 points per rank

**Tier 4 - Signature Points:**
- Spend on: Signature Power (Achilles' Heel, etc.) OR Signature Spell (Merlin's Excalibur, etc.)
- Cost: 5 points to unlock, 3 points per rank

**Strategic Choice Example:**
Merlin levels up and gets 1 Universal Point. He can either:
- Unlock "Swordsmanship" (Skill Power) to improve melee combat, OR
- Unlock "Fireball" (Universal Spell) to gain ranged magic attack

**Non-Caster Example:**
Achilles levels up and gets 1 Universal Point. He MUST spend it on a Skill Power (no spell options available since he's a non-caster).

---

## 6. Backend Implementation

### New Service: `spellService.ts`
Mirror structure of `powerService.ts`:

```typescript
// Core functions:
- getCharacterSpells(characterId) → Returns unlocked + available spells
- unlockSpell(characterId, spellId, triggeredBy)
- rankUpSpell(characterId, spellId, triggeredBy)
- grantSpellPoints(characterId, points, source)
- castSpell(characterId, spellId, targetId?) → Consumes mana, applies effects
- checkManaCost(characterId, spellId) → Can afford to cast?
```

### New Routes: `spellRoutes.ts`
Mirror structure of `powerRoutes.ts`:

```typescript
GET /api/spells/character/:characterId → Get spell book
POST /api/spells/unlock → Unlock spell (spend points)
POST /api/spells/rank-up → Rank up spell (spend points)
POST /api/spells/cast → Cast spell in battle (consume mana)
POST /api/spells/grant-points → Award spell points
GET /api/spells/definitions → Get master spell catalog
```

### Mana Management
```typescript
// Add to battle system:
- consumeMana(characterId, amount)
- regenerateMana(characterId) → Called each turn
- checkManaSufficient(characterId, spellId) → Before casting
```

---

## 7. Frontend Implementation

### New Components

#### `SpellManager.tsx` (mirrors `PowerManager.tsx`)
- Display character's spell book
- Show 4 tiers with filters
- Unlock/rank up spells
- Show mana costs, cooldowns
- Spell point pools display

#### `SpellCard.tsx` (mirrors `PowerCard.tsx`)
- Individual spell card
- Shows tier, mana cost, cooldown, effects
- Unlock/rank up buttons
- Rank progression display

#### `ManaDisplay.tsx`
- Current/max mana bar
- Regen rate indicator
- Color-coded (blue for mana, green for energy)

#### `ResourceBars.tsx` (Unified)
- Shows both Energy and Mana side-by-side
- Used in battle UI, character sheets
- Updates in real-time during combat

### Modified Components

#### `PowerManager.tsx`
- Add link/button to switch to Spell Manager
- "View Spells →" button if character can cast

#### Battle UI
- Add mana bar below/beside energy bar
- Show spell cooldowns
- Mana cost on spell buttons
- "Not enough mana" state

---

## 8. Integration with Existing Systems

### Battle System
```typescript
interface BattleCharacter {
  // Existing
  current_hp: number;
  max_hp: number;
  current_energy: number;
  max_energy: number;

  // NEW
  current_mana: number;
  max_mana: number;
  mana_regen: number;
  unlocked_spells: string[]; // Spell IDs
  spell_cooldowns: Record<string, number>; // spellId → turns remaining
}

// Each turn:
1. Regen energy for all characters
2. Regen mana for all characters
3. Decrease cooldowns for spells
4. Allow actions (use power OR cast spell)
```

### Rebellion System
Already exists for powers, extend to spells:
- If adherence < 70, character may auto-spend spell points
- Character picks spells based on AI personality/strategy
- Logged as 'character_rebellion' unlock

---

## 9. Content Creation Pipeline

### Phase 1: Define Shared Spell Pools
1. ✅ 10-15 Universal Spells (basic magic all full casters learn)
2. ✅ Archetype Spells for each caster type:
   - Mage: 7-10 combat spells
   - Mystic: 7-10 dark/life magic spells
   - Scholar: 7-10 knowledge/analysis spells
   - Trickster: 7-10 illusion/deception spells
   - Leader: 7-10 command/inspiration spells (if partial caster)

3. ✅ Species Spells for magical species:
   - Vampire: Blood magic, transformation
   - Deity: Divine powers
   - Demon: Fire/shadow magic
   - Elemental: Element control
   - Zeta Reticulan Grey: Psychic powers
   - Human/Magical: Basic arcane
   - Cyborg: Tech-magic hybrid
   - Dire Wolf: Primal magic
   - Golem: Earth magic

### Phase 2: Define Signature Spells
Character-specific unique spells (like Merlin's Excalibur Summoning, Dracula's Blood Moon, etc.)

### Phase 3: Implementation
1. Database migrations
2. Backend services & routes
3. Frontend components
4. Battle system integration
5. Testing with 2-3 characters
6. Full rollout

---

## 10. Example Character Breakdowns

### Merlin (Mage/Human-Magical)
**Can Access:**
- ✅ Universal Spells (fireball, magic missile, shield, etc.)
- ✅ Mage Archetype Spells (meteor, time stop, etc.)
- ✅ Human-Magical Species Spells (basic arcane)
- ✅ Merlin Signature Spells (Excalibur, Avalon's Blessing, etc.)

**Resources:**
- Powers: Use Energy (physical abilities)
- Spells: Use Mana (magical abilities)

### Tesla (Scholar/Human)
**Can Access:**
- ✅ Universal Spells (basic magic)
- ✅ Scholar Archetype Spells (analyze, predict, enhance)
- ✅ Human Species Spells (adaptability buffs)
- ✅ Tesla Signature Spells (Tesla Coil, Wireless Energy, etc.)

**Resources:**
- Powers: Use Energy (inventions, physical abilities)
- Spells: Use Mana (scientific "magic")

### Achilles (Warrior/Human)
**Can Access:**
- ❌ No spells (non-magical archetype + non-magical species)

**Resources:**
- Powers: Use Energy ONLY

### Sun Wukong (Trickster/Deity)
**Can Access:**
- ❌ No Universal Spells (partial caster)
- ✅ Trickster Archetype Spells (illusions, transformations)
- ✅ Deity Species Spells (divine power, immortality magic)
- ✅ Sun Wukong Signature Spells (72 Transformations, Cloud Somersault, etc.)

**Resources:**
- Powers: Use Energy (staff combat, physical powers)
- Spells: Use Mana (transformations, divine magic)

### Dracula (Mystic/Vampire)
**Can Access:**
- ✅ Universal Spells (basic magic)
- ✅ Mystic Archetype Spells (dark magic, curses, life drain)
- ✅ Vampire Species Spells (blood magic, bat transformation, hypnosis)
- ✅ Dracula Signature Spells (Crimson Moon, Army of Night, etc.)

**Resources:**
- Powers: Use Energy (physical vampire abilities)
- Spells: Use Mana (blood magic, dark spells)

---

## 11. Migration Strategy

### Step 1: Database Setup
```sql
-- Run migrations to create tables
-- Populate default spell definitions (universal first)
-- Set character mana/energy defaults by archetype
```

### Step 2: Backend Services
```bash
# Implement in order:
1. spellService.ts (core logic)
2. spellRoutes.ts (API endpoints)
3. Mana consumption in battle system
4. Spell point awards on level up
```

### Step 3: Frontend Components
```bash
# Implement in order:
1. SpellCard.tsx
2. ManaDisplay.tsx
3. SpellManager.tsx
4. Integrate into MainTabSystem
5. Update battle UI with mana bars
```

### Step 4: Testing
- Test with Merlin (full caster)
- Test with Sun Wukong (partial caster)
- Test with Achilles (non-caster)
- Verify mana consumption/regen works
- Verify spell point spending works

### Step 5: Content Population
- Define all universal spells
- Define archetype spells for each caster type
- Define species spells for magical species
- Define signature spells for each character
- Add spell descriptions, effects, mana costs

---

## 12. Open Questions for Discussion

1. **Should Leader be a partial spellcaster?**
   - Pros: Makes 3-3-3 archetype distribution
   - Cons: Leaders feel more physical/tactical than magical
   - Suggestion: Make them partial casters with "command magic" theme

2. **Spell cooldowns in addition to mana costs?**
   - Prevents spam-casting most powerful spells
   - Adds strategic depth (when to use ultimate spell?)
   - Recommendation: YES - powerful spells have cooldowns

3. **Can spells be upgraded independently of rank?**
   - Like equipment enhancements?
   - Recommendation: NO - keep it simple, just rank progression

4. **Should there be spell combo system?**
   - Cast 2 spells together for bonus effect?
   - Recommendation: DEFER - add in future iteration if needed

5. **Spell failure chance?**
   - Based on Intelligence stat or skill level?
   - Recommendation: NO - keep it deterministic for now

6. **Can non-casters learn ANY spells through items/quests?**
   - Example: Achilles finds a magic scroll and learns one spell?
   - Recommendation: YES - but rare, quest-reward only

---

## 13. Success Metrics

How we'll know the system works:

✅ **Technical Success:**
- Spells unlock/rank up correctly
- Mana consumption works in battles
- No conflicts with existing power system
- Frontend displays spell book properly

✅ **Gameplay Success:**
- Full casters feel distinct from non-casters
- Resource management (mana vs energy) adds strategy
- Spell variety creates build diversity
- Players understand the difference between powers and spells

✅ **Balance Success:**
- Full casters not overpowered vs physical fighters
- Mana costs balanced (can cast 3-5 spells per battle)
- Spell point progression feels rewarding
- Non-casters with magical species still feel viable

---

## 14. Timeline Estimate

**Phase 1: Design & Approval** (Current)
- Define spell tiers ✅
- Review/approve this proposal ⏳
- Finalize archetype spell access ⏳

**Phase 2: Database Setup** (1-2 hours)
- Create migrations
- Add spell tables
- Modify user_characters table
- Populate initial spell definitions

**Phase 3: Backend Implementation** (3-4 hours)
- Build spellService.ts
- Build spellRoutes.ts
- Integrate mana into battle system
- Add spell point awards

**Phase 4: Frontend Implementation** (4-5 hours)
- Build SpellManager component
- Build SpellCard component
- Build ManaDisplay component
- Integrate into MainTabSystem
- Update battle UI

**Phase 5: Content Creation** (5-10 hours)
- Define all universal spells
- Define archetype spells
- Define species spells
- Define signature spells (per character)

**Phase 6: Testing & Polish** (2-3 hours)
- Test all spell operations
- Balance mana costs
- Fix bugs
- UI/UX polish

**Total Estimated Time:** 15-24 hours

---

## 15. Conclusion

This proposal creates a **complete, parallel spell system** that:
- Mirrors the existing power system architecture (proven to work)
- Adds strategic depth through mana resource management
- Maintains clear archetype identities (spellcasters vs fighters)
- Scales to support future content (new spells, species, archetypes)
- Integrates cleanly with existing rebellion/adherence mechanics

**Recommendation:** Proceed with implementation in phases, starting with database setup and backend, then frontend, then content population.

**Next Steps:**
1. Review and approve this proposal
2. Finalize whether Leader is partial spellcaster (3-3-3 balance)
3. Begin Phase 2: Database migrations
4. Define first batch of Universal Spells (10-15 spells)
