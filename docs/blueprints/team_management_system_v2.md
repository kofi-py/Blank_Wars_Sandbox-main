# Team Management System V2 - Blueprint

## Overview

Expand the current 3-contestant team system into a comprehensive team management system with:
- Full roster (active + bench) for contestants and system characters
- Mascots as a new character type with personalities and team bonuses
- Experience-based bonus scaling for system characters
- Team-specific tenure and chemistry tracking

---

## Current Production State (as of 2026-01-02)

### Existing Data
- **129 teams** - all with 3 contestant slots filled
- **400 contestant user_characters**
- **83 system character user_characters:**
  - 11 hosts (1 template: Hostmaster v8.72)
  - 21 judges (3 templates: Anubis, Eleanor Roosevelt, King Solomon)
  - 21 real estate agents (3 templates: Barry, LMB-3000, Zyxthala)
  - 24 therapists (3 templates: Carl Jung, Seraphina, Zxk14bW^7)
  - 6 trainers (1 template: Argock)
- **0 team_relationships** populated (table exists but unused)

### Current Schema Limitations
1. `teams` table has only 3 contestant slots - **NO system character slots**
2. Users DO own system characters (in `user_characters` with role field)
3. No way to assign system characters to teams currently
4. `team_relationships` exists but isn't wired up

### Existing Bonus Tables (ready to use)
- `judge_bonuses` - difficulty-scaled bonuses per judge character
- `therapist_bonuses` - difficulty-scaled bonuses per therapist character

---

## 1. Roster Structure

### Starting Team (9 slots)
| Position | Role | Count |
|----------|------|-------|
| Mascot | Team spirit/identity | 1 |
| Contestants | Playable fighters | 3 |
| System Characters | Staff (judge, therapist, trainer, host, real_estate_agent) | 5 |

### Full Roster with Backups (18 slots max)
| Position | Active | Backup | Total |
|----------|--------|--------|-------|
| Mascot | 1 | 1 | 2 |
| Contestants | 3 | 3 | 6 |
| System Characters | 5 | 5 | 10 |
| **TOTAL** | **9** | **9** | **18** |

### Key Rules
- Users start with 9 (starter pack provides 1 mascot + 3 contestants + 5 system chars)
- Backup slots are optional - fill as you acquire more characters
- Any character CAN be on multiple teams, BUT bonuses are team-specific
- Only ONE team can be active at a time per user

---

## 2. Mascot System

### What Mascots Are
- Characters in `characters` table with role = 'mascot'
- User instances in `user_characters` table (same as all other characters)
- Have persistent personalities via prompt domains
- Can chat and interact with contestants and coach
- Each mascot TYPE provides different team bonuses

### Mascot Acquisition
- First mascot: Random selection in starter pack
- Additional mascots: Card packs, achievements, purchases
- When creating a new team: Coach picks from available mascots

### Mascot Roster (13 mascots)

Each mascot provides: **Stat Bonuses** + **Team Buff** + **Enemy Debuff**

#### Great Tier (Lucky Pulls)
| Mascot | Stat Bonuses | Team Buff | Enemy Debuff |
|--------|--------------|-----------|--------------|
| Honey Badger | +6 attack, +8 confidence | 5% rage proc | 5% fear |
| Sphinx | +6 wisdom, +6 intelligence, +4 accuracy | None | 4% confusion |
| Orca | +5 attack, +7 team_player, +4 speed | 6% haste on kill | 8% bleed |

#### Good Tier
| Mascot | Stat Bonuses | Team Buff | Enemy Debuff |
|--------|--------------|-----------|--------------|
| Platypus | +8 toxic_resistance, +4 dexterity, +3 evasion | None | 6% poison |
| Locusts | +8 speed, +4 attack | On kill, next attack stronger | 7% armor_break |
| Streptococcus-A | +4 critical_chance, +4 disease_resistance | Crit spreads +damage to team | 10% infection, 5% grievous_wound |
| Wraith | +8 evasion, +4 magic_attack, +4 critical_damage | None | 6% fear, 6% armor_break |

#### Decent Tier
| Mascot | Stat Bonuses | Team Buff | Enemy Debuff |
|--------|--------------|-----------|--------------|
| Porcupine | +6 defense, +4 endurance | 8% shield on low HP | 12% bleed (retaliation) |
| Phoenix | +8 max_health, +5 morale, +3 spirit | 10% regeneration | None |
| Elephant | +6 strength, +5 defense, +4 bond_level | +% bond_level gain | 6% armor_break |

#### Meh Tier
| Mascot | Stat Bonuses | Team Buff | Enemy Debuff |
|--------|--------------|-----------|--------------|
| Goldfish | +4 charisma, -4 stress | 5% resist charm | 8% confusion |
| Emu | +6 evasion, +5 endurance, +3 ego | 5% CC resist | 3% fear |

#### Thoughts and Prayers Tier
| Mascot | Stat Bonuses | Team Buff | Enemy Debuff |
|--------|--------------|-----------|--------------|
| Cupcake | +2 morale, +2 charisma, +2 max_health | 2% regeneration | 3% charm |

### Mascot Scaling (XP-based, Underdog Bonus)

Worse mascots scale faster - dedication pays off.

| Experience Tier | Events | Great | Good | Decent | Meh | Thoughts & Prayers |
|-----------------|--------|-------|------|--------|-----|-------------------|
| Rookie | 0-10 | 1.0x | 1.0x | 1.0x | 1.0x | 1.0x |
| Seasoned | 11-30 | 1.25x | 1.35x | 1.4x | 1.5x | 1.5x |
| Veteran | 31-60 | 1.5x | 1.7x | 1.9x | 2.0x | 2.25x |
| Legend | 61+ | 2.0x | 2.3x | 2.6x | 2.75x | 3.5x |

**Example comparison:**
- Legend Cupcake (3.5x): 21 total stats
- Veteran Honey Badger (1.5x): 21 total stats
- Legend Honey Badger (2.0x): 28 total stats

Underdog grinders can compete with mid-tier players of better mascots, but top-tier grinders still have an edge.

### Mascot Prompt Domain Structure
```
backend/src/services/prompts/domains/mascot/
├── index.ts
├── scene.ts
├── roles/
│   └── mascot.ts
└── personas/
    ├── honey_badger.ts
    ├── sphinx.ts
    ├── orca.ts
    ├── platypus.ts
    ├── locusts.ts
    ├── streptococcus_a.ts
    ├── wraith.ts
    ├── porcupine.ts
    ├── phoenix.ts
    ├── elephant.ts
    ├── goldfish.ts
    ├── emu.ts
    └── cupcake.ts
```

---

## 2b. New System Characters

### Host Roster (replacing Hostmaster v8.72)

| ID | Name | Year/Source | Personality |
|----|------|-------------|-------------|
| groucho_marx | Groucho Marx | 1928 vaudeville | Witty, sarcastic, comedic anchor |
| mad_hatter | Mad Hatter | 1865 Lewis Carroll | Chaotic, whimsical, unpredictable |
| betty_boop | Betty Boop | 1930 Fleischer | Playful, flirty, performer |

**Host domains:** battle, confessional, performance, kitchenTable

### Trainer Roster (joining Argock)

| ID | Name | Source | Personality |
|----|------|--------|-------------|
| athena | Athena | Greek mythology | Strategic, wise, disciplined |
| popeye | Popeye | 1929 Thimble Theatre | Scrappy, determined, encouraging |

**Trainer domains:** training

### Updated System Character Totals

| Role | Count | Characters |
|------|-------|------------|
| Judges | 3 | Anubis, Eleanor Roosevelt, King Solomon |
| Therapists | 3 | Carl Jung, Seraphina, Zxk14bW^7 |
| Trainers | 3 | Argock, Athena, Popeye |
| Hosts | 3 | Groucho Marx, Mad Hatter, Betty Boop |
| Real Estate Agents | 3 | Barry, LMB-3000, Zyxthala |

### Database Entries Required

**`characters` table (5 new entries):**
- groucho_marx (role: host)
- mad_hatter (role: host)
- betty_boop (role: host)
- athena (role: trainer)
- popeye (role: trainer)

**`characters` table (1 removal):**
- hostmaster_v8_72

**Hostmaster migration:**
- Existing user_characters with hostmaster_v8_72 get 1 random replacement from the 3 new hosts

### Persona Files Required (14 files)

**Hosts (3 characters × 4 domains = 12 files):**
```
domains/battle/personas/groucho_marx.ts
domains/battle/personas/mad_hatter.ts
domains/battle/personas/betty_boop.ts
domains/confessional/personas/groucho_marx.ts
domains/confessional/personas/mad_hatter.ts
domains/confessional/personas/betty_boop.ts
domains/performance/personas/groucho_marx.ts
domains/performance/personas/mad_hatter.ts
domains/performance/personas/betty_boop.ts
domains/kitchenTable/personas/groucho_marx.ts
domains/kitchenTable/personas/mad_hatter.ts
domains/kitchenTable/personas/betty_boop.ts
```

**Trainers (2 characters × 1 domain = 2 files):**
```
domains/training/personas/athena.ts
domains/training/personas/popeye.ts
```

---

## 3. Experience & Bonus Model

### Global vs Team-Specific Progression

| What | Scope | Explanation |
|------|-------|-------------|
| Contestant stats/levels | **GLOBAL** | XP and levels follow the contestant regardless of team |
| System char field experience | **TEAM-SPECIFIC** | Judge on Team A with 50 battles ≠ same judge on Team B |
| Mascot bonuses | **TEAM-SPECIFIC** | Mascot builds synergy with specific team over time |
| Memories & relationships | **TEAM-SPECIFIC** | Formed through direct participation on that team |
| Tenure bonuses | **TEAM-SPECIFIC** | Time together as THIS team |

### System Character Experience Tiers

System characters gain field experience ONLY for the team they're actively participating with:

| Tier | Events | Bonus Multiplier | Example |
|------|--------|------------------|---------|
| Rookie | 0-10 | 1.0x (base) | +2% crit |
| Experienced | 11-50 | 1.5x | +5% crit |
| Veteran | 51-100 | 2.0x | +8% crit |
| Legend | 100+ | 2.5x + special perk | +12% crit + unique ability |

### Active vs Bench Experience

| Status | Contestants | System Characters |
|--------|-------------|-------------------|
| Active (fielded) | Full XP, stats, direct memories | Full field experience, relationship growth |
| Bench | Passive team success bonus (reduced XP) | Morale/chemistry boost only, no relationship growth |

---

## 4. Tenure & Chemistry System

### Tenure Metrics (tracked per team)

| Metric | Description |
|--------|-------------|
| days_together | Calendar days since team formation |
| battles_fought | Total battles as a team |
| battles_won | Victories together |
| challenges_completed | Reality show challenges |
| dramas_survived | Conflicts resolved together |
| training_sessions | Joint training events |
| social_activities | Kitchen table, lounge, etc. |

### Chemistry Score Evolution

Current `team_relationships.chemistry_score` (0-100, starts at 50) will be enhanced:

| Chemistry Level | Score | Effects |
|-----------------|-------|---------|
| Toxic | 0-20 | Penalties to coordination, morale |
| Strained | 21-40 | Minor penalties |
| Neutral | 41-60 | No modifiers |
| Bonded | 61-80 | Minor coordination bonuses |
| Legendary | 81-100 | Major bonuses, special team moves |

### What Affects Chemistry
- **Positive**: Shared victories, resolved conflicts, social activities, training together
- **Negative**: Losses, unresolved conflicts, player injuries, roster changes

---

## 5. Bonus Types

### Categories (all types available, varies by source)

| Category | Examples | Sources |
|----------|----------|---------|
| Stat Bonuses | +attack, +crit, +defense | Mascot, system chars, tenure |
| Battle Modifiers | Healing %, damage reduction, extra turns | Mascot, veteran bonuses |
| Economy Bonuses | Shop discounts, earnings multiplier | Host, real_estate_agent |
| Training/XP | Faster leveling, skill acquisition | Trainer, mascot |
| Morale/Psychology | Confidence, stress reduction | Therapist, mascot |

### Bonus Stacking Rules
- Same-category bonuses from different sources: ADD together
- Same-category bonuses from same source: Take highest only
- No cap - bonuses stack without maximum

---

## 6. Database Schema Changes

### Strategy: Extend `teams` Table + Add Supporting Tables

Rather than creating a separate `team_roster` table, we'll add columns directly to the existing `teams` table. This keeps backwards compatibility with the 129 existing teams.

### Migration 1 (303): Add System Character Slots to Teams

```sql
BEGIN;

-- Add active system character slots (5 new columns)
ALTER TABLE teams
    ADD COLUMN judge_active UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN therapist_active UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN trainer_active UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN host_active UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN real_estate_agent_active UUID REFERENCES user_characters(id) ON DELETE SET NULL;

-- Add backup system character slots (5 new columns)
ALTER TABLE teams
    ADD COLUMN judge_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN therapist_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN trainer_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN host_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN real_estate_agent_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL;

-- Add backup contestant slots (3 new columns)
ALTER TABLE teams
    ADD COLUMN character_slot_4 UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN character_slot_5 UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN character_slot_6 UUID REFERENCES user_characters(id) ON DELETE SET NULL;

-- Add mascot slots (2 new columns)
ALTER TABLE teams
    ADD COLUMN mascot_active UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN mascot_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (303, '303_add_system_char_slots_to_teams')
ON CONFLICT (version) DO NOTHING;
```

### Migration 2 (304): Team Member Experience Tracking (Per-Team Bonuses)

```sql
BEGIN;

-- Track system character/mascot experience PER TEAM
CREATE TABLE team_member_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_character_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,

    -- Generic event counter
    events_participated INTEGER DEFAULT 0,

    -- Role-specific counters (null for non-applicable roles)
    battles_judged INTEGER DEFAULT 0,
    therapy_sessions INTEGER DEFAULT 0,
    training_sessions_led INTEGER DEFAULT 0,
    shows_hosted INTEGER DEFAULT 0,
    properties_managed INTEGER DEFAULT 0,
    mascot_events INTEGER DEFAULT 0,

    -- Calculated tier
    experience_tier TEXT DEFAULT 'rookie'
        CHECK (experience_tier IN ('rookie', 'experienced', 'veteran', 'legend')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_char_per_team UNIQUE (team_id, user_character_id)
);

CREATE INDEX idx_tme_team_id ON team_member_experience(team_id);
CREATE INDEX idx_tme_user_character ON team_member_experience(user_character_id);
CREATE INDEX idx_tme_experience_tier ON team_member_experience(experience_tier);

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (304, '304_team_member_experience')
ON CONFLICT (version) DO NOTHING;
```

### Migration 3 (305): Enhance Team Relationships (Already Exists, Just Add Columns)

```sql
BEGIN;

-- Add tenure tracking columns to existing team_relationships table
ALTER TABLE team_relationships
    ADD COLUMN IF NOT EXISTS days_together INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS challenges_completed INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dramas_survived INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS training_sessions_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS social_activities_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS roster_changes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS chemistry_level TEXT DEFAULT 'neutral'
        CHECK (chemistry_level IN ('toxic', 'strained', 'neutral', 'bonded', 'legendary')),
    ADD COLUMN IF NOT EXISTS formed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (305, '305_enhance_team_relationships')
ON CONFLICT (version) DO NOTHING;
```

### Migration 4 (306): Add Disease Damage System

```sql
BEGIN;

-- Add 'biological' to allowed damage type categories
ALTER TABLE damage_type_reference DROP CONSTRAINT damage_type_reference_category_check;
ALTER TABLE damage_type_reference ADD CONSTRAINT damage_type_reference_category_check
    CHECK (category = ANY (ARRAY['physical', 'magical', 'elemental', 'biological']));

-- New damage type
INSERT INTO damage_type_reference (id, name, category, description, resistance_stat, icon)
VALUES ('disease', 'Disease', 'biological', 'Infectious damage from pathogens', 'disease_resistance', '🦠');

-- New DoT effect
INSERT INTO status_effect_types (id, name, category, description, damage_type, icon, stackable)
VALUES ('infection', 'Infected', 'dot', 'Disease damage each turn', 'disease', '🦠', true);

-- Base stat column (nullable for non-contestants, like other stats)
ALTER TABLE characters ADD COLUMN disease_resistance INTEGER;
-- NOTE: Requires UPDATE for each CONTESTANT character with appropriate base values
-- Non-contestants (mascots, judges, etc.) don't need this stat

-- Archetype modifiers for disease_resistance
-- NOTE: Requires INSERT for each archetype with appropriate modifier values
-- Example: INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier) VALUES ('warrior', 'disease_resistance', 5);

-- Species modifiers for disease_resistance
-- NOTE: Requires INSERT for each species with appropriate modifier values
-- Example: INSERT INTO species_attribute_modifiers (species, attribute_name, modifier) VALUES ('undead', 'disease_resistance', 20);

-- Signature modifiers for disease_resistance (per-character unique tweaks)
-- NOTE: Requires INSERT for characters with unique disease resistance
-- Example: INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier) VALUES ('streptococcus_a', 'disease_resistance', 50);

-- Calculated current value on user_characters
ALTER TABLE user_characters ADD COLUMN current_disease_resistance INTEGER;
-- NOTE: Value calculated from base + archetype + species + signature modifiers

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (306, '306_add_disease_damage_system')
ON CONFLICT (version) DO NOTHING;
```

### Migration 5 (307): Create Mascots Table, Make Stats Optional for Non-Contestants, Add System Character FKs

```sql
BEGIN;

-- =====================================================
-- 1. CREATE MASCOTS TABLE (bonus data for mascot characters)
-- =====================================================

CREATE TABLE mascots (
    id TEXT PRIMARY KEY,  -- matches characters.id for mascot characters
    name VARCHAR(100) NOT NULL,  -- kept for readability
    quality_tier TEXT NOT NULL CHECK (quality_tier IN ('great', 'good', 'decent', 'meh', 'thoughts_and_prayers')),
    base_stats JSONB NOT NULL DEFAULT '{}',  -- {"attack": 6, "confidence": 8}
    team_buff JSONB,  -- {"rage_proc": 5} or null
    enemy_debuff JSONB,  -- {"fear": 5} or null
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. MAKE COMBAT STAT COLUMNS NULLABLE ON CHARACTERS TABLE
-- (System characters like mascots, judges, therapists don't fight)
-- =====================================================

-- Combat stats
ALTER TABLE characters ALTER COLUMN max_health DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN attack DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN defense DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN speed DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN magic_attack DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN magic_defense DROP NOT NULL;

-- Attribute stats
ALTER TABLE characters ALTER COLUMN strength DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN dexterity DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN max_energy DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN intelligence DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN wisdom DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN charisma DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN spirit DROP NOT NULL;

-- Combat modifiers
ALTER TABLE characters ALTER COLUMN critical_chance DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN critical_damage DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN accuracy DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN evasion DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN max_mana DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN energy_regen DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN endurance DROP NOT NULL;

-- Battle images (non-combatants don't need these)
ALTER TABLE characters ALTER COLUMN battle_image_name DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN battle_image_variants DROP NOT NULL;

-- =====================================================
-- 3. ADD CHECK CONSTRAINT: STATS REQUIRED ONLY FOR CONTESTANTS
-- =====================================================

ALTER TABLE characters
ADD CONSTRAINT chk_contestant_combat_stats
CHECK (
    role != 'contestant' OR (
        max_health IS NOT NULL AND
        attack IS NOT NULL AND
        defense IS NOT NULL AND
        speed IS NOT NULL AND
        magic_attack IS NOT NULL AND
        magic_defense IS NOT NULL AND
        strength IS NOT NULL AND
        dexterity IS NOT NULL AND
        max_energy IS NOT NULL AND
        intelligence IS NOT NULL AND
        wisdom IS NOT NULL AND
        charisma IS NOT NULL AND
        spirit IS NOT NULL AND
        critical_chance IS NOT NULL AND
        critical_damage IS NOT NULL AND
        accuracy IS NOT NULL AND
        evasion IS NOT NULL AND
        max_mana IS NOT NULL AND
        energy_regen IS NOT NULL AND
        endurance IS NOT NULL AND
        disease_resistance IS NOT NULL AND
        battle_image_name IS NOT NULL AND
        battle_image_variants IS NOT NULL
    )
);

-- =====================================================
-- 4. ADD SYSTEM CHARACTER FK COLUMNS TO USER_CHARACTERS
-- (For direct bonus lookups without joining through characters table)
-- Only ONE of these will be populated per row, based on role
-- =====================================================

ALTER TABLE user_characters
    ADD COLUMN mascot_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    ADD COLUMN judge_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    ADD COLUMN therapist_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    ADD COLUMN trainer_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    ADD COLUMN host_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    ADD COLUMN real_estate_agent_id TEXT REFERENCES characters(id) ON DELETE SET NULL;

-- Partial indexes for efficient FK lookups
CREATE INDEX idx_uc_mascot_id ON user_characters(mascot_id) WHERE mascot_id IS NOT NULL;
CREATE INDEX idx_uc_judge_id ON user_characters(judge_id) WHERE judge_id IS NOT NULL;
CREATE INDEX idx_uc_therapist_id ON user_characters(therapist_id) WHERE therapist_id IS NOT NULL;
CREATE INDEX idx_uc_trainer_id ON user_characters(trainer_id) WHERE trainer_id IS NOT NULL;
CREATE INDEX idx_uc_host_id ON user_characters(host_id) WHERE host_id IS NOT NULL;
CREATE INDEX idx_uc_real_estate_agent_id ON user_characters(real_estate_agent_id) WHERE real_estate_agent_id IS NOT NULL;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (307, '307_mascots_table_and_system_char_fks')
ON CONFLICT (version) DO NOTHING;
```

### Migration 6 (308): Seed Initial Mascots

```sql
BEGIN;

-- Step 1: Insert into mascots table (bonus data)
INSERT INTO mascots (id, name, quality_tier, base_stats, team_buff, enemy_debuff) VALUES
    -- Great Tier
    ('honey_badger', 'Honey Badger', 'great',
     '{"attack": 6, "confidence": 8}', '{"rage_proc": 5}', '{"fear": 5}'),
    ('sphinx', 'Sphinx', 'great',
     '{"wisdom": 6, "intelligence": 6, "accuracy": 4}', null, '{"confusion": 4}'),
    ('orca', 'Orca', 'great',
     '{"attack": 5, "team_player": 7, "speed": 4}', '{"haste_on_kill": 6}', '{"bleed": 8}'),

    -- Good Tier
    ('platypus', 'Platypus', 'good',
     '{"toxic_resistance": 8, "dexterity": 4, "evasion": 3}', null, '{"poison": 6}'),
    ('locusts', 'Locusts', 'good',
     '{"speed": 8, "attack": 4}', '{"feeding_frenzy": true}', '{"armor_break": 7}'),
    ('streptococcus_a', 'Streptococcus-A', 'good',
     '{"critical_chance": 4, "disease_resistance": 4}', '{"crit_spreads_damage": true}', '{"infection": 10, "grievous_wound": 5}'),
    ('wraith', 'Wraith', 'good',
     '{"evasion": 8, "magic_attack": 4, "critical_damage": 4}', null, '{"fear": 6, "armor_break": 6}'),

    -- Decent Tier
    ('porcupine', 'Porcupine', 'decent',
     '{"defense": 6, "endurance": 4}', '{"shield_on_low_hp": 8}', '{"bleed_retaliation": 12}'),
    ('phoenix', 'Phoenix', 'decent',
     '{"max_health": 8, "morale": 5, "spirit": 3}', '{"regeneration": 10}', null),
    ('elephant', 'Elephant', 'decent',
     '{"strength": 6, "defense": 5, "bond_level": 4}', '{"bond_level_gain": true}', '{"armor_break": 6}'),

    -- Meh Tier
    ('goldfish', 'Goldfish', 'meh',
     '{"charisma": 4, "stress": -4}', '{"charm_resist": 5}', '{"confusion": 8}'),
    ('emu', 'Emu', 'meh',
     '{"evasion": 6, "endurance": 5, "ego": 3}', '{"cc_resist": 5}', '{"fear": 3}'),

    -- Thoughts and Prayers Tier
    ('cupcake', 'Cupcake', 'thoughts_and_prayers',
     '{"morale": 2, "charisma": 2, "max_health": 2}', '{"regeneration": 2}', '{"charm": 3}');

-- Step 2: Insert into characters table (identity/personality)
-- No stats required - non-contestant roles are exempt from stat constraints
INSERT INTO characters (id, name, role, backstory, personality_traits, species, scene_image_slug) VALUES
    ('honey_badger', 'Honey Badger', 'mascot', 'Fearless and relentless', '["fearless", "aggressive", "unstoppable"]', 'honey_badger', 'mascot_honey_badger'),
    ('sphinx', 'Sphinx', 'mascot', 'Ancient keeper of riddles', '["mysterious", "wise", "cryptic"]', 'sphinx', 'mascot_sphinx'),
    ('orca', 'Orca', 'mascot', 'Apex pod hunter', '["coordinated", "ruthless", "intelligent"]', 'orca', 'mascot_orca'),
    ('platypus', 'Platypus', 'mascot', 'Venomous oddity', '["weird", "venomous", "adaptable"]', 'platypus', 'mascot_platypus'),
    ('locusts', 'Locusts', 'mascot', 'Devouring swarm', '["hungry", "relentless", "overwhelming"]', 'locust_swarm', 'mascot_locusts'),
    ('streptococcus_a', 'Streptococcus-A', 'mascot', 'Flesh-eating bacteria', '["infectious", "persistent", "deadly"]', 'bacteria', 'mascot_streptococcus'),
    ('wraith', 'Wraith', 'mascot', 'Ghostly terror', '["ethereal", "haunting", "deadly"]', 'ghost', 'mascot_wraith'),
    ('porcupine', 'Porcupine', 'mascot', 'Spiky defender', '["defensive", "prickly", "patient"]', 'porcupine', 'mascot_porcupine'),
    ('phoenix', 'Phoenix', 'mascot', 'Reborn from ashes', '["resilient", "fiery", "reborn"]', 'phoenix', 'mascot_phoenix'),
    ('elephant', 'Elephant', 'mascot', 'Never forgets', '["loyal", "powerful", "wise"]', 'elephant', 'mascot_elephant'),
    ('goldfish', 'Goldfish', 'mascot', 'Blissfully simple', '["calm", "simple", "pretty"]', 'goldfish', 'mascot_goldfish'),
    ('emu', 'Emu', 'mascot', 'War survivor', '["stubborn", "survivalist", "proud"]', 'emu', 'mascot_emu'),
    ('cupcake', 'Cupcake', 'mascot', 'Adorably useless', '["sweet", "cute", "delicious"]', 'pastry', 'mascot_cupcake');

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (308, '308_seed_mascots')
ON CONFLICT (version) DO NOTHING;
```

### Migration 7 (309): Add New Hosts and Trainers, Replace Hostmaster

```sql
BEGIN;

-- Step 1: Insert new host characters (no stats needed - non-contestant role)
INSERT INTO characters (id, name, role, backstory, personality_traits, species, scene_image_slug, comedian_name, comedy_style) VALUES
    ('groucho_marx', 'Groucho Marx', 'host', '1928 vaudeville comedian and wit', '["witty", "sarcastic", "comedic"]', 'human', 'host_groucho', 'Groucho Marx', 'Rapid-fire wordplay, eyebrow waggling, fourth-wall breaking asides'),
    ('mad_hatter', 'Mad Hatter', 'host', '1865 Wonderland tea party host', '["chaotic", "whimsical", "unpredictable"]', 'human_magical', 'host_hatter', 'Andy Kaufman', 'Surreal non-sequiturs, committed absurdism, uncomfortable silence'),
    ('betty_boop', 'Betty Boop', 'host', '1930 cartoon performer and entertainer', '["playful", "flirty", "performer"]', 'cartoon', 'host_betty', 'Mae West', 'Flirty one-liners, musical asides, knowing winks');

-- Step 2: Insert new trainer characters (no stats needed - non-contestant role)
INSERT INTO characters (id, name, role, backstory, personality_traits, species, scene_image_slug, comedian_name, comedy_style) VALUES
    ('athena', 'Athena', 'trainer', 'Greek goddess of wisdom and strategic warfare', '["strategic", "wise", "disciplined"]', 'deity', 'trainer_athena', 'Tina Fey', 'Smart observations, strategic wit, mentorship humor'),
    ('popeye', 'Popeye', 'trainer', '1929 sailor with spinach-powered strength', '["scrappy", "determined", "encouraging"]', 'cartoon', 'trainer_popeye', 'Robin Williams', 'Physical comedy, rapid character shifts, heartfelt encouragement');

-- Step 3: Migrate existing hostmaster user_characters to random new hosts
-- Randomly assign each user's hostmaster to one of the 3 new hosts
-- Also set the host_id FK for direct bonus lookups
WITH new_assignments AS (
    SELECT
        id,
        CASE (floor(random() * 3)::int)
            WHEN 0 THEN 'groucho_marx'
            WHEN 1 THEN 'mad_hatter'
            ELSE 'betty_boop'
        END AS new_host_id
    FROM user_characters
    WHERE character_id = 'hostmaster_v8_72'
)
UPDATE user_characters uc
SET
    character_id = na.new_host_id,
    host_id = na.new_host_id
FROM new_assignments na
WHERE uc.id = na.id;

-- Step 4: Delete hostmaster from characters table
DELETE FROM characters WHERE id = 'hostmaster_v8_72';

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (309, '309_new_hosts_trainers_replace_hostmaster')
ON CONFLICT (version) DO NOTHING;
```

### Migration 8 (310): Backfill System Character FKs on Existing user_characters

```sql
BEGIN;

-- Backfill the new FK columns based on existing role
-- Each system character gets its corresponding FK set to character_id

UPDATE user_characters uc
SET judge_id = uc.character_id
FROM characters c
WHERE uc.character_id = c.id AND c.role = 'judge';

UPDATE user_characters uc
SET therapist_id = uc.character_id
FROM characters c
WHERE uc.character_id = c.id AND c.role = 'therapist';

UPDATE user_characters uc
SET trainer_id = uc.character_id
FROM characters c
WHERE uc.character_id = c.id AND c.role = 'trainer';

UPDATE user_characters uc
SET host_id = uc.character_id
FROM characters c
WHERE uc.character_id = c.id AND c.role = 'host';

UPDATE user_characters uc
SET real_estate_agent_id = uc.character_id
FROM characters c
WHERE uc.character_id = c.id AND c.role = 'real_estate_agent';

-- Note: mascot_id backfill handled in Migration 9

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (310, '310_backfill_system_char_fks')
ON CONFLICT (version) DO NOTHING;
```

### Migration 9 (311): Create user_characters for New System Characters

```sql
BEGIN;

-- Create user_characters entries for new trainers (athena, popeye) for all existing users
-- Pattern from migration 212
INSERT INTO user_characters (
    id, user_id, character_id, nickname, level, experience, bond_level,
    current_health, current_max_health, equipment, is_injured,
    total_battles, total_wins, current_stress, current_mental_health,
    current_training, current_team_player, current_ego, current_communication,
    acquired_at, role, trainer_id
)
SELECT
    gen_random_uuid() AS id,
    u.id AS user_id,
    c.id AS character_id,
    c.name AS nickname,
    1 AS level,
    0 AS experience,
    0 AS bond_level,
    100 AS current_health,
    100 AS current_max_health,
    '[]' AS equipment,
    false AS is_injured,
    0 AS total_battles,
    0 AS total_wins,
    0 AS current_stress,
    80 AS current_mental_health,
    75 AS current_training,
    70 AS current_team_player,
    60 AS current_ego,
    80 AS current_communication,
    NOW() AS acquired_at,
    c.role AS role,
    c.id AS trainer_id
FROM users u
CROSS JOIN characters c
WHERE c.id IN ('athena', 'popeye')
AND NOT EXISTS (
    SELECT 1 FROM user_characters uc
    WHERE uc.user_id = u.id AND uc.character_id = c.id
);

-- Create user_characters entries for mascots for all existing users
-- Each user gets one random mascot (different per user)
INSERT INTO user_characters (
    id, user_id, character_id, nickname, level, experience, bond_level,
    current_health, current_max_health, equipment, is_injured,
    total_battles, total_wins, current_stress, current_mental_health,
    current_training, current_team_player, current_ego, current_communication,
    acquired_at, role, mascot_id
)
SELECT
    gen_random_uuid() AS id,
    u.id AS user_id,
    m.id AS character_id,
    m.name AS nickname,
    1 AS level,
    0 AS experience,
    0 AS bond_level,
    100 AS current_health,
    100 AS current_max_health,
    '[]' AS equipment,
    false AS is_injured,
    0 AS total_battles,
    0 AS total_wins,
    0 AS current_stress,
    80 AS current_mental_health,
    75 AS current_training,
    70 AS current_team_player,
    60 AS current_ego,
    80 AS current_communication,
    NOW() AS acquired_at,
    'mascot' AS role,
    m.id AS mascot_id
FROM users u
CROSS JOIN LATERAL (
    -- Each user gets a different random mascot
    SELECT id, name FROM characters WHERE role = 'mascot' ORDER BY random() LIMIT 1
) m
WHERE NOT EXISTS (
    SELECT 1 FROM user_characters uc
    WHERE uc.user_id = u.id AND uc.role = 'mascot'
);

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (311, '311_create_user_chars_for_new_system_chars')
ON CONFLICT (version) DO NOTHING;
```

---

## 7. UI Changes

### Teams Tab Restructure

```
Teams Tab
├── Active Team Summary (current team at a glance)
├── Team Roster Section
│   ├── Mascot (1 active, 1 backup slot)
│   ├── Contestants (3 active, 3 backup slots)
│   └── Staff & Officials
│       ├── Judge (active + backup)
│       ├── Therapist (active + backup)
│       ├── Trainer (active + backup)
│       ├── Host (active + backup)
│       └── Real Estate Agent (active + backup)
├── Team Chemistry & Tenure Stats
│   ├── Chemistry score with visual indicator
│   ├── Tenure metrics (battles, time together, etc.)
│   └── Active bonuses breakdown
└── Team Management
    ├── Create New Team (if user has enough characters)
    ├── Switch Active Team
    └── Team History/Stats
```

### Character Selection Modal
- Filter by role (contestant, judge, therapist, etc.)
- Show character's current team assignments
- Display experience tier for system characters
- Warning if swapping would affect other teams

---

## 8. Implementation Phases

### Phase 1: Foundation
- [ ] Add system character + mascot + backup slots to teams table
- [ ] Create mascots table for mascot bonus data
- [ ] Add system character FK columns to user_characters (mascot_id, judge_id, therapist_id, trainer_id, host_id, real_estate_agent_id)
- [ ] Create team_member_experience table
- [ ] Add new columns to team_relationships
- [ ] Add disease_resistance stat and infection DoT

### Phase 2: Backend Logic
- [ ] Team roster CRUD endpoints
- [ ] Experience tracking service (increment on events)
- [ ] Tier calculation logic
- [ ] Bonus calculation service
- [ ] Chemistry score update logic

### Phase 3: Mascot System
- [ ] Seed 13 mascots to mascots table (bonus data)
- [ ] Seed 13 mascot characters to characters table (identity/personality)
- [ ] Create mascot prompt domain structure (index.ts, scene.ts, roles/mascot.ts)
- [ ] Write 13 mascot persona files
- [ ] Mascot chat/interaction capability

### Phase 3b: New System Characters
- [ ] Add 3 new hosts to `characters` table (groucho_marx, mad_hatter, betty_boop)
- [ ] Add 2 new trainers to `characters` table (athena, popeye)
- [ ] Run Migration 309 to migrate hostmaster user_characters to random new hosts
- [ ] Remove hostmaster_v8_72 from `characters` table
- [ ] Backfill system character FKs on existing user_characters (Migration 310)
- [ ] Create user_characters for new trainers + mascots for all users (Migration 311)
- [ ] Write 12 host persona files (3 hosts × 4 domains)
- [ ] Write 2 trainer persona files (2 trainers × 1 domain)

### Phase 4: Frontend UI
- [ ] Redesigned Teams tab with roster sections
- [ ] Staff & Officials selection UI
- [ ] Mascot selection UI
- [ ] Chemistry/tenure display
- [ ] Bonus breakdown display

### Phase 5: Integration
- [ ] Wire bonuses into battle system
- [ ] Wire bonuses into training system
- [ ] Wire bonuses into economy system
- [ ] Event hooks to update experience/tenure

---

## 9. Resolved Design Decisions

1. **Mascot multiples**: Yes, users CAN have multiple instances of the same mascot type (different user_character ids from different packs), developed at different paces on different teams. Echo system handles exact duplicate trade-ins for bonuses.

2. **Roster = Team Identity**: The 18-slot roster IS the team. Changing roster members = new team. Backups are part of the fixed roster, not a rotating door.

3. **Roster changes**: Team roster can only be adjusted in the team tab, not mid-battle. Backups cannot be promoted during active combat.

4. **Cross-team**: Only ONE team active at a time, but any character/mascot can serve on multiple teams. Bonuses are team-specific (same mascot on 2 teams has different experience levels per team).

5. **Mascot trading**: Yes, tradeable like other cards. No mechanism yet, planned for NFT secondary market.

---

## 10. Success Metrics

- Users creating multiple teams (engagement)
- Team tenure distribution (are people keeping teams together?)
- Bonus utilization (are bonuses meaningful?)
- Mascot variety (are different mascots being chosen?)
- Chemistry score distribution (are teams building bonds?)

---

*Blueprint drafted: 2026-01-02*
*Collaboratively designed with user*
