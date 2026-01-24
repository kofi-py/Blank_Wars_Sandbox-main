# Character Preference System Blueprint

**Created:** 2025-11-29
**Purpose:** Define architecture for character preferences that modify adherence checks and inform AI dialogue
**Related:** BATTLE_SYSTEM_BLUEPRINT.md, BATTLE_SYSTEM_IMPLEMENTATION_CHECKLIST.md

---

## Executive Summary

Characters have individual preferences for equipment, powers, spells, and attributes. These preferences:
1. Modify adherence checks when coach recommends something the character likes/dislikes
2. Inform AI dialogue so characters can express opinions about choices
3. Create emergent personality through gameplay

---

## Core Principles

### Principle 1: DB is Source of Truth
- All preference data stored in database junction tables
- No frontend calculations
- No hardcoded preference values

### Principle 2: Minimal Data Transfer
- Never load all preferences at once
- Adherence calculation: query ONE preference (the recommended item)
- AI prompts: query ONLY preferences for available choices
- Keep compute and token usage low

### Principle 3: Preferences Evolve
- Initial preferences seeded by AI based on character personality
- Preferences can change based on gameplay events
- System supports preference updates over time

---

## Database Schema

### New Junction Tables

```sql
-- ============================================
-- EQUIPMENT PREFERENCES
-- ============================================
CREATE TABLE character_equipment_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  preference_score INTEGER NOT NULL DEFAULT 0 CHECK (preference_score BETWEEN -100 AND 100),
  reason TEXT, -- AI-generated: "Reminds me of my father's armor"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, equipment_id)
);

CREATE INDEX idx_char_equip_pref_char ON character_equipment_preferences(character_id);
CREATE INDEX idx_char_equip_pref_equip ON character_equipment_preferences(equipment_id);

-- ============================================
-- POWER PREFERENCES
-- ============================================
CREATE TABLE character_power_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  power_id UUID NOT NULL REFERENCES powers(id) ON DELETE CASCADE,
  preference_score INTEGER NOT NULL DEFAULT 0 CHECK (preference_score BETWEEN -100 AND 100),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, power_id)
);

CREATE INDEX idx_char_power_pref_char ON character_power_preferences(character_id);
CREATE INDEX idx_char_power_pref_power ON character_power_preferences(power_id);

-- ============================================
-- SPELL PREFERENCES
-- ============================================
CREATE TABLE character_spell_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  spell_id UUID NOT NULL REFERENCES spells(id) ON DELETE CASCADE,
  preference_score INTEGER NOT NULL DEFAULT 0 CHECK (preference_score BETWEEN -100 AND 100),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, spell_id)
);

CREATE INDEX idx_char_spell_pref_char ON character_spell_preferences(character_id);
CREATE INDEX idx_char_spell_pref_spell ON character_spell_preferences(spell_id);

-- ============================================
-- ATTRIBUTE PREFERENCES
-- ============================================
CREATE TABLE character_attribute_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  attribute_name VARCHAR(50) NOT NULL, -- 'strength', 'dexterity', 'intelligence', etc.
  preference_score INTEGER NOT NULL DEFAULT 0 CHECK (preference_score BETWEEN -100 AND 100),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, attribute_name)
);

CREATE INDEX idx_char_attr_pref_char ON character_attribute_preferences(character_id);

-- Valid attribute names (enforce via application or check constraint)
-- strength, dexterity, intelligence, wisdom, charisma, defense, speed, spirit
```

### Preference Score Scale

| Score Range | Meaning | Adherence Modifier |
|-------------|---------|-------------------|
| +76 to +100 | Strongly Favored | +12 to +15 |
| +51 to +75 | Favored | +8 to +11 |
| +26 to +50 | Slightly Favored | +4 to +7 |
| +1 to +25 | Mild Preference | +1 to +3 |
| 0 | Neutral | 0 |
| -1 to -25 | Mild Dislike | -1 to -3 |
| -26 to -50 | Disliked | -4 to -7 |
| -51 to -75 | Strongly Disliked | -8 to -11 |
| -76 to -100 | Hated | -12 to -15 |

**Formula:** `adherence_modifier = Math.round(preference_score * 0.15)`

---

## Backend Architecture

### File Structure

```
backend/src/services/
├── preferenceService.ts          # Core preference CRUD operations
├── preferenceAdherenceService.ts # Adherence modifier calculations
└── preferencePromptBuilder.ts    # AI prompt context generation

backend/src/routes/
└── preferenceRoutes.ts           # API endpoints (admin/debug only)
```

### preferenceService.ts

```typescript
/**
 * Preference Service
 *
 * Core CRUD operations for character preferences.
 * All preference data flows through this service.
 */

import { query } from '../database';

export type PreferenceDomain = 'equipment' | 'power' | 'spell' | 'attribute';

interface PreferenceRecord {
  character_id: string;
  item_id: string; // equipment_id, power_id, spell_id, or attribute_name
  preference_score: number;
  reason: string | null;
}

/**
 * Get preference for a SINGLE item (used for adherence calculation)
 */
export async function getPreference(
  character_id: string,
  domain: PreferenceDomain,
  item_id: string
): Promise<{ preference_score: number; reason: string | null } | null> {
  const table = `character_${domain}_preferences`;
  const id_column = domain === 'attribute' ? 'attribute_name' : `${domain}_id`;

  const result = await query(
    `SELECT preference_score, reason FROM ${table}
     WHERE character_id = $1 AND ${id_column} = $2`,
    [character_id, item_id]
  );

  return result.rows[0] || null;
}

/**
 * Get preferences for MULTIPLE items (used for AI prompt building)
 * Only queries the specific items provided - never loads all preferences
 */
export async function getPreferencesForItems(
  character_id: string,
  domain: PreferenceDomain,
  item_ids: string[]
): Promise<PreferenceRecord[]> {
  if (item_ids.length === 0) return [];

  const table = `character_${domain}_preferences`;
  const id_column = domain === 'attribute' ? 'attribute_name' : `${domain}_id`;

  const result = await query(
    `SELECT ${id_column} as item_id, preference_score, reason
     FROM ${table}
     WHERE character_id = $1 AND ${id_column} = ANY($2)`,
    [character_id, item_ids]
  );

  return result.rows.map(row => ({
    character_id,
    item_id: row.item_id,
    preference_score: row.preference_score,
    reason: row.reason
  }));
}

/**
 * Set or update a preference
 */
export async function setPreference(
  character_id: string,
  domain: PreferenceDomain,
  item_id: string,
  preference_score: number,
  reason?: string
): Promise<void> {
  const table = `character_${domain}_preferences`;
  const id_column = domain === 'attribute' ? 'attribute_name' : `${domain}_id`;

  // Clamp score to valid range
  const clamped_score = Math.max(-100, Math.min(100, preference_score));

  await query(
    `INSERT INTO ${table} (character_id, ${id_column}, preference_score, reason)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (character_id, ${id_column})
     DO UPDATE SET preference_score = $3, reason = $4, updated_at = NOW()`,
    [character_id, item_id, clamped_score, reason || null]
  );
}

/**
 * Adjust a preference by delta (for emergent preference changes)
 */
export async function adjustPreference(
  character_id: string,
  domain: PreferenceDomain,
  item_id: string,
  delta: number,
  new_reason?: string
): Promise<number> {
  const table = `character_${domain}_preferences`;
  const id_column = domain === 'attribute' ? 'attribute_name' : `${domain}_id`;

  const result = await query(
    `INSERT INTO ${table} (character_id, ${id_column}, preference_score, reason)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (character_id, ${id_column})
     DO UPDATE SET
       preference_score = GREATEST(-100, LEAST(100, ${table}.preference_score + $3)),
       reason = COALESCE($4, ${table}.reason),
       updated_at = NOW()
     RETURNING preference_score`,
    [character_id, item_id, delta, new_reason || null]
  );

  return result.rows[0].preference_score;
}
```

### preferenceAdherenceService.ts

```typescript
/**
 * Preference Adherence Service
 *
 * Calculates adherence modifiers based on character preferences.
 * Used for non-battle adherence checks (equipment, powers, spells, attributes).
 */

import { query } from '../database';
import { getPreference, PreferenceDomain } from './preferenceService';

export interface NonBattleAdherenceResult {
  roll: number;
  base_adherence: number;
  preference_modifier: number;
  effective_threshold: number;
  passed: boolean;
  preference_score: number | null;
  preference_reason: string | null;
}

/**
 * Perform adherence check for non-battle contexts.
 *
 * Architecture:
 * 1. Get gameplan_adherence from DB (already includes all psych stats via generated column)
 * 2. Get preference for the SPECIFIC recommended item (single query)
 * 3. Apply preference modifier: preference_score * 0.15
 * 4. Roll d100 vs effective threshold
 *
 * @param character_id - The character making the decision
 * @param domain - 'equipment' | 'power' | 'spell' | 'attribute'
 * @param recommended_item_id - The item the coach is recommending
 */
export async function performNonBattleAdherenceCheck(
  character_id: string,
  domain: PreferenceDomain,
  recommended_item_id: string
): Promise<NonBattleAdherenceResult> {
  // 1. Get base adherence from DB
  const char_result = await query(
    'SELECT gameplan_adherence FROM user_characters WHERE id = $1',
    [character_id]
  );

  if (char_result.rows.length === 0) {
    throw new Error(`Character not found: ${character_id}`);
  }

  const base_adherence = char_result.rows[0].gameplan_adherence;

  if (base_adherence === null || base_adherence === undefined) {
    throw new Error(`gameplan_adherence is null for character ${character_id}`);
  }

  // 2. Get preference for this specific item
  const preference = await getPreference(character_id, domain, recommended_item_id);
  const preference_score = preference?.preference_score ?? 0;
  const preference_reason = preference?.reason ?? null;

  // 3. Calculate modifier (scale: -15 to +15)
  const preference_modifier = Math.round(preference_score * 0.15);

  // 4. Calculate effective threshold
  const effective_threshold = Math.max(0, Math.min(100, base_adherence + preference_modifier));

  // 5. Roll d100
  const roll = Math.floor(Math.random() * 100) + 1;

  // 6. Determine result
  const passed = roll <= effective_threshold;

  return {
    roll,
    base_adherence,
    preference_modifier,
    effective_threshold,
    passed,
    preference_score,
    preference_reason
  };
}
```

### preferencePromptBuilder.ts

```typescript
/**
 * Preference Prompt Builder
 *
 * Builds compact preference context for AI prompts.
 * Only includes preferences for AVAILABLE choices - never all preferences.
 */

import { getPreferencesForItems, PreferenceDomain } from './preferenceService';

interface ChoiceWithName {
  id: string;
  name: string;
}

/**
 * Build preference context for AI prompt.
 *
 * @param character_id - The character
 * @param domain - The domain being decided
 * @param available_choices - Array of {id, name} for available options
 * @param coach_recommendation_id - Which choice the coach recommended
 * @returns Formatted string for inclusion in AI prompt
 */
export async function buildPreferencePromptContext(
  character_id: string,
  domain: PreferenceDomain,
  available_choices: ChoiceWithName[],
  coach_recommendation_id: string
): Promise<string> {
  if (available_choices.length === 0) {
    return '';
  }

  // Get preferences ONLY for available choices
  const item_ids = available_choices.map(c => c.id);
  const preferences = await getPreferencesForItems(character_id, domain, item_ids);

  // Build lookup map
  const pref_map = new Map(preferences.map(p => [p.item_id, p]));

  // Build table rows
  const rows = available_choices.map(choice => {
    const pref = pref_map.get(choice.id);
    const score = pref?.preference_score ?? 0;
    const reason = pref?.reason ?? '(no strong feelings)';
    const is_recommended = choice.id === coach_recommendation_id ? ' [COACH PICK]' : '';

    return `| ${choice.name}${is_recommended} | ${score > 0 ? '+' : ''}${score} | ${reason} |`;
  });

  return `
## YOUR PREFERENCES FOR AVAILABLE ${domain.toUpperCase()} OPTIONS

| Option | Your Preference (-100 to +100) | Why You Feel This Way |
|--------|-------------------------------|----------------------|
${rows.join('\n')}

INSTRUCTIONS:
- Positive scores = you want this option
- Negative scores = you dislike this option
- If coach recommends something you like: express enthusiasm
- If coach recommends something you dislike: express reluctance or lobby for alternatives
- You may advocate for your preferred choice even if following coach orders
- Use the "Why You Feel This Way" to inform your dialogue
`;
}
```

---

## Integration Points

### 1. Equipment Selection (autonomousDecisionService.ts)

```typescript
import { performNonBattleAdherenceCheck } from './preferenceAdherenceService';
import { buildPreferencePromptContext } from './preferencePromptBuilder';

// In check_adherence_and_equip():

// Adherence check with preference modifier
const adherence_result = await performNonBattleAdherenceCheck(
  character_id,
  'equipment',
  coach_equipment_choice
);

console.log(`[ADHERENCE] Rolled ${adherence_result.roll} vs ${adherence_result.effective_threshold} ` +
  `(base: ${adherence_result.base_adherence}, pref modifier: ${adherence_result.preference_modifier})`);

if (adherence_result.passed) {
  // Follow coach
} else {
  // Rebel - build AI prompt with preference context
  const pref_context = await buildPreferencePromptContext(
    character_id,
    'equipment',
    available_choices,
    coach_equipment_choice
  );

  // Include pref_context in AI decision prompt
}
```

### 2. Power/Spell Upgrades (loadoutAdherenceService.ts)

Same pattern - use `performNonBattleAdherenceCheck()` and `buildPreferencePromptContext()`.

### 3. Attribute Allocation (attributeService.ts)

Same pattern with `domain = 'attribute'`.

---

## Preference Population Strategies

### Strategy 1: AI-Seeded on Character Acquisition

When a character is acquired (card pack opening, purchase, etc.):

```typescript
async function seedCharacterPreferences(character_id: string) {
  // Get character personality data
  const char = await getCharacterWithPersonality(character_id);

  // Get all available items in each domain
  const equipment = await getAllEquipment();
  const powers = await getAllPowers();
  const spells = await getAllSpells();
  const attributes = ['strength', 'dexterity', 'intelligence', 'wisdom', 'charisma', 'defense', 'speed', 'spirit'];

  // AI generates preferences based on personality
  const preferences = await generatePreferencesFromPersonality({
    character: char,
    equipment,
    powers,
    spells,
    attributes
  });

  // Store all preferences
  for (const pref of preferences) {
    await setPreference(character_id, pref.domain, pref.item_id, pref.score, pref.reason);
  }
}
```

### Strategy 2: Archetype-Based Defaults

```typescript
const ARCHETYPE_ATTRIBUTE_PREFERENCES = {
  warrior: { strength: 60, defense: 40, dexterity: 20, intelligence: -20, wisdom: 0 },
  mage: { intelligence: 60, wisdom: 40, spirit: 30, strength: -30, defense: -20 },
  trickster: { dexterity: 60, charisma: 40, speed: 30, wisdom: -10, strength: -20 },
  // ... etc
};

async function seedArchetypeDefaults(character_id: string, archetype: string) {
  const prefs = ARCHETYPE_ATTRIBUTE_PREFERENCES[archetype];
  if (!prefs) return;

  for (const [attr, score] of Object.entries(prefs)) {
    await setPreference(character_id, 'attribute', attr, score, `Natural ${archetype} inclination`);
  }
}
```

### Strategy 3: Emergent from Gameplay

```typescript
// When character rebels and chooses something
async function onRebellionChoice(character_id: string, domain: PreferenceDomain, chosen_id: string) {
  await adjustPreference(character_id, domain, chosen_id, +10, 'Chose this when given freedom');
}

// When character is forced to use something they rebelled against
async function onForcedChoice(character_id: string, domain: PreferenceDomain, forced_id: string) {
  await adjustPreference(character_id, domain, forced_id, -5, 'Was forced to use this');
}

// When character succeeds with an item (battle victory, etc.)
async function onSuccessWithItem(character_id: string, domain: PreferenceDomain, item_id: string) {
  await adjustPreference(character_id, domain, item_id, +3, 'Had success with this');
}
```

---

## DB Adherence Formula Update

Add wisdom to the gameplan_adherence generated column:

```sql
-- Migration: XXX_add_wisdom_to_adherence_formula.sql

ALTER TABLE user_characters
DROP COLUMN gameplan_adherence;

ALTER TABLE user_characters
ADD COLUMN gameplan_adherence INTEGER GENERATED ALWAYS AS (
  GREATEST(0, LEAST(100, ROUND(
    current_training * 0.30 +
    current_mental_health * 0.25 +
    current_team_player * 0.15 +
    (100 - current_ego) * 0.10 +
    current_communication * 0.10 +
    current_wisdom * 0.10  -- NEW: wisdom contributes to adherence
  )))
) STORED;

COMMENT ON COLUMN user_characters.gameplan_adherence IS
  'Auto-calculated adherence score. Formula: training*0.30 + mental_health*0.25 + team_player*0.15 + (100-ego)*0.10 + communication*0.10 + wisdom*0.10';
```

---

## Complete Adherence Check Flow

### Non-Battle Context (Equipment/Powers/Spells/Attributes)

```
┌─────────────────────────────────────────────────────────────────┐
│                     COACH MAKES RECOMMENDATION                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. GET gameplan_adherence FROM DB                               │
│     (Generated column: training, mental_health, team_player,     │
│      ego, communication, wisdom already factored in)             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. GET preference_score FOR RECOMMENDED ITEM                    │
│     (Single query to junction table)                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. CALCULATE effective_threshold                                │
│     = gameplan_adherence + (preference_score * 0.15)             │
│     Clamped to 0-100                                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. ROLL d100 (1-100)                                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. COMPARE: roll <= effective_threshold ?                       │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
            ┌───────────────┐           ┌───────────────┐
            │     PASS      │           │     FAIL      │
            │ Follow Coach  │           │    Rebel      │
            └───────────────┘           └───────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────────┐
                                │ Build AI prompt with:          │
                                │ - Available choices            │
                                │ - Preference scores for each   │
                                │ - Preference reasons           │
                                │ (Minimal data - only choices)  │
                                └───────────────────────────────┘
```

### Battle Context (Uses Existing System)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. GET gameplan_adherence FROM DB                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. APPLY BATTLE-STATE MODIFIERS (BE adherenceCalculationService)│
│     - HP% (near death: -50, critical: -30, wounded: -15)         │
│     - Team losing: -10                                           │
│     - Teammates down: up to -20                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. ROLL d100 vs modified threshold                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    PASS → Execute Coach Orders
                    FAIL → Rebellion Flow (Situation Analyst → AI → Judge)
```

---

## Implementation Checklist

### Phase 1: Database Setup
- [ ] Create migration for `character_equipment_preferences` table
- [ ] Create migration for `character_power_preferences` table
- [ ] Create migration for `character_spell_preferences` table
- [ ] Create migration for `character_attribute_preferences` table
- [ ] Create migration to add wisdom to `gameplan_adherence` formula
- [ ] Run migrations, verify tables exist

### Phase 2: Backend Services
- [ ] Create `preferenceService.ts` with CRUD operations
- [ ] Create `preferenceAdherenceService.ts` with adherence calculation
- [ ] Create `preferencePromptBuilder.ts` for AI context
- [ ] Write unit tests for each service

### Phase 3: Integration
- [ ] Update `autonomousDecisionService.ts` to use new adherence service
- [ ] Update `loadoutAdherenceService.ts` to use new adherence service
- [ ] Update `attributeService.ts` to use new adherence service
- [ ] Update AI prompt templates to include preference context

### Phase 4: Preference Population
- [ ] Implement archetype-based default preferences
- [ ] Implement AI-seeded preferences on character acquisition
- [ ] Implement emergent preference adjustments from gameplay

### Phase 5: Testing & Verification
- [ ] Test adherence checks with positive preferences
- [ ] Test adherence checks with negative preferences
- [ ] Test adherence checks with neutral (no preference)
- [ ] Test AI dialogue reflects preferences correctly
- [ ] Test preference evolution from gameplay events

---

## API Reference (Debug/Admin Only)

```
GET  /api/preferences/:character_id/:domain
     Returns all preferences for character in domain

GET  /api/preferences/:character_id/:domain/:item_id
     Returns single preference

POST /api/preferences/:character_id/:domain/:item_id
     Body: { preference_score: number, reason?: string }
     Sets or updates a preference

PATCH /api/preferences/:character_id/:domain/:item_id
      Body: { delta: number, reason?: string }
      Adjusts preference by delta
```

---

## Future Enhancements

1. **Preference Decay** - Unused preferences slowly drift toward neutral
2. **Relationship-Based Preferences** - Preferences influenced by mentor/rival relationships
3. **Event-Based Preferences** - Major story events can dramatically shift preferences
4. **Preference Conflicts** - Characters with opposing preferences create team drama
5. **Preference Discovery** - Coach can "discover" character preferences through interactions
