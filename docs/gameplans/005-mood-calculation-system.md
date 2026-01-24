# Game Plan 005: Mood Calculation System (REVISED)

**Created:** 2025-12-08
**Revised:** 2025-12-08
**Status:** Ready for Implementation
**Priority:** Medium
**Delegated:** Yes - separate from prompt system refactor

---

## Overview

Implement a composite mood system where each character's current mood is calculated from:
1. A formula applied to current psychological/financial/health/performance stats
2. A static character mood modifier (personality baseline - scaled to match existing modifiers)
3. Dynamic gameplay mood modifiers (accumulated from events, with decay/expiration)

---

## Formula

```
current_mood = formula(current_stats) + character.mood_modifier + SUM(gameplay_modifiers.current_value)
```

Clamped to 0-100 range.

---

## Schema Changes

### Migration 1: Create `mood_event_types` lookup table

This centralizes event/conflict definitions so handlers don't hardcode values.

```sql
CREATE TABLE mood_event_types (
  id TEXT PRIMARY KEY,                           -- e.g., 'battle_win', 'teammate_death'
  category TEXT NOT NULL,                        -- 'battle', 'social', 'financial', 'living', 'rivalry', 'therapy'
  base_value INTEGER NOT NULL,                   -- mood impact (-20 to +15 typical range)
  default_decay_rate INTEGER,                    -- points per day toward 0 (NULL = no decay)
  default_expires_in_days INTEGER,               -- NULL = permanent until removed
  default_removable_by TEXT[],                   -- array: ['therapy', 'revenge', 'paying_debt']
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE mood_event_types IS
'Lookup table for mood event definitions. Handlers reference this to apply mood modifiers consistently.';
```

### Migration 2: Add `mood_modifier` to `characters` table

```sql
ALTER TABLE characters ADD COLUMN mood_modifier INTEGER DEFAULT 0;

COMMENT ON COLUMN characters.mood_modifier IS
'Static mood baseline for personality. Range: -40 to +40. Scaled to match existing signature modifiers.';
```

### Migration 3: Add `gameplay_mood_modifiers` to `user_characters` table

```sql
ALTER TABLE user_characters ADD COLUMN gameplay_mood_modifiers JSONB DEFAULT '{"modifiers": []}'::jsonb;

COMMENT ON COLUMN user_characters.gameplay_mood_modifiers IS
'Tracked mood modifiers from gameplay events. Each modifier references mood_event_types.id as source.';

CREATE INDEX idx_user_characters_mood_modifiers ON user_characters USING gin (gameplay_mood_modifiers);
```

### JSONB Structure

```json
{
  "modifiers": [
    {
      "source": "championship_win",
      "value": 15,
      "current_value": 15,
      "applied_at": "2025-12-01T00:00:00Z",
      "expires_at": "2025-12-31T00:00:00Z",
      "decay_rate": null,
      "removable_by": null
    },
    {
      "source": "teammate_death",
      "value": -20,
      "current_value": -16,
      "applied_at": "2025-12-05T00:00:00Z",
      "expires_at": null,
      "decay_rate": 2,
      "removable_by": ["therapy"]
    }
  ]
}
```

**Modifier fields:**
- `source`: References `mood_event_types.id`
- `value`: Original modifier value (from mood_event_types.base_value)
- `current_value`: Current value after decay (recalculated on read)
- `applied_at`: When the modifier was added
- `expires_at`: When the modifier auto-removes (null = permanent until removed)
- `decay_rate`: Points per day the modifier decays toward 0 (null = no decay)
- `removable_by`: Array of removal triggers (therapy, revenge, paying_debt, etc.)

---

## Mood Formula Components

### Primary psychological stats (weight: 0.70 total):

| Stat | Weight | Direction | Notes |
|------|--------|-----------|-------|
| current_mental_health | 0.15 | + | Core emotional stability |
| current_morale | 0.12 | + | Battle spirit and motivation |
| current_stress | 0.10 | - | Inverted: high stress = worse mood |
| current_fatigue | 0.08 | - | Inverted: exhaustion = worse mood |
| current_confidence | 0.08 | + | Self-belief affects outlook |
| financial_stress | 0.05 | - | Inverted: debt worry = worse mood |
| coach_trust_level | 0.04 | + | Relationship security |
| bond_level | 0.04 | + | Social connection |
| current_team_player | 0.04 | + | Team harmony |

### Performance stats (weight: 0.15 total):

| Stat | Weight | Direction | Notes |
|------|--------|-----------|-------|
| health_ratio | 0.05 | + | current_health / current_max_health * 100 |
| win_percentage | 0.04 | + | Success breeds happiness |
| gameplan_adherence | 0.03 | + | Discipline satisfaction |
| current_win_streak | 0.03 | + | Momentum boost (capped at 10 for calc) |

### Resource stats (weight: 0.10 total):

| Stat | Weight | Direction | Notes |
|------|--------|-----------|-------|
| energy_ratio | 0.05 | + | current_energy / current_max_energy * 100 |
| mana_ratio | 0.03 | + | current_mana / current_max_mana * 100 |
| wallet_health | 0.02 | + | wallet / (debt_principal + 100) * 100 capped |

### Living situation adjustments (flat modifiers, not weighted):

| Condition | Modifier | Notes |
|-----------|----------|-------|
| sleeps_on_floor | -5 | From character_living_context |
| sleeps_on_couch | -2 | From character_living_context |
| master_bed | +2 | From character_living_context |

### Stat mood formula (produces 0-100 base):

```sql
stat_mood = (
  -- Primary psychological (0.70)
  (current_mental_health * 0.15) +
  (current_morale * 0.12) +
  ((100 - current_stress) * 0.10) +
  ((100 - current_fatigue) * 0.08) +
  (current_confidence * 0.08) +
  ((100 - financial_stress) * 0.05) +
  (coach_trust_level * 0.04) +
  (bond_level * 0.04) +
  (current_team_player * 0.04) +

  -- Performance (0.15)
  ((current_health::numeric / NULLIF(current_max_health, 0) * 100) * 0.05) +
  (win_percentage * 0.04) +
  (gameplan_adherence * 0.03) +
  (LEAST(current_win_streak, 10) * 10 * 0.03) +

  -- Resources (0.10)
  ((current_energy::numeric / NULLIF(current_max_energy, 0) * 100) * 0.05) +
  ((current_mana::numeric / NULLIF(current_max_mana, 0) * 100) * 0.03) +
  (LEAST(wallet::numeric / NULLIF(debt_principal + 100, 0) * 100, 100) * 0.02)
)
-- Add living situation flat modifiers after
```

---

## Database Functions

### Main calculation function:

```sql
CREATE OR REPLACE FUNCTION calculate_current_mood(
  p_userchar_id TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_uc RECORD;
  v_char RECORD;
  v_living RECORD;
  v_stat_mood NUMERIC;
  v_living_modifier INTEGER := 0;
  v_gameplay_modifier INTEGER;
  v_final_mood INTEGER;
BEGIN
  -- Fetch user character stats
  SELECT * INTO v_uc FROM user_characters WHERE id = p_userchar_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User character % not found', p_userchar_id;
  END IF;

  -- Fetch base character mood modifier
  SELECT mood_modifier INTO v_char FROM characters WHERE id = v_uc.character_id;

  -- Fetch living context for sleeping situation
  SELECT * INTO v_living FROM character_living_context WHERE user_character_id = p_userchar_id;

  -- Calculate stat-based mood (0.95 total weight, leaves room for living modifiers)
  v_stat_mood := (
    -- Primary psychological (0.70)
    (COALESCE(v_uc.current_mental_health, 50) * 0.15) +
    (COALESCE(v_uc.current_morale, 50) * 0.12) +
    ((100 - COALESCE(v_uc.current_stress, 50)) * 0.10) +
    ((100 - COALESCE(v_uc.current_fatigue, 50)) * 0.08) +
    (COALESCE(v_uc.current_confidence, 50) * 0.08) +
    ((100 - COALESCE(v_uc.financial_stress, 50)) * 0.05) +
    (COALESCE(v_uc.coach_trust_level, 50) * 0.04) +
    (COALESCE(v_uc.bond_level, 50) * 0.04) +
    (COALESCE(v_uc.current_team_player, 50) * 0.04) +

    -- Performance (0.15)
    (COALESCE(v_uc.current_health::numeric / NULLIF(v_uc.current_max_health, 0), 1) * 100 * 0.05) +
    (COALESCE(v_uc.win_percentage, 50) * 0.04) +
    (COALESCE(v_uc.gameplan_adherence, 50) * 0.03) +
    (LEAST(COALESCE(v_uc.current_win_streak, 0), 10) * 10 * 0.03) +

    -- Resources (0.10)
    (COALESCE(v_uc.current_energy::numeric / NULLIF(v_uc.current_max_energy, 0), 1) * 100 * 0.05) +
    (COALESCE(v_uc.current_mana::numeric / NULLIF(v_uc.current_max_mana, 0), 1) * 100 * 0.03) +
    (LEAST(COALESCE(v_uc.wallet, 0)::numeric / NULLIF(COALESCE(v_uc.debt_principal, 0) + 100, 0) * 100, 100) * 0.02)
  );

  -- Living situation modifiers
  IF v_living IS NOT NULL THEN
    IF v_living.sleeps_on_floor = true THEN
      v_living_modifier := -5;
    ELSIF v_living.sleeping_arrangement = 'couch' THEN
      v_living_modifier := -2;
    ELSIF v_living.sleeping_arrangement = 'master_bed' THEN
      v_living_modifier := 2;
    END IF;
  END IF;

  -- Sum gameplay modifiers (applying decay and expiration)
  SELECT COALESCE(SUM(
    CASE
      -- Expired modifiers contribute 0
      WHEN (m->>'expires_at') IS NOT NULL AND (m->>'expires_at')::timestamptz < NOW() THEN 0
      -- Decaying modifiers: calculate current value based on days elapsed
      WHEN (m->>'decay_rate') IS NOT NULL AND (m->>'decay_rate')::int > 0 THEN
        CASE
          WHEN (m->>'value')::int > 0 THEN
            GREATEST(0, (m->>'value')::int -
              ((m->>'decay_rate')::int * EXTRACT(DAY FROM NOW() - (m->>'applied_at')::timestamptz)::int))
          ELSE
            LEAST(0, (m->>'value')::int +
              ((m->>'decay_rate')::int * EXTRACT(DAY FROM NOW() - (m->>'applied_at')::timestamptz)::int))
        END
      -- Non-decaying: use current_value or value
      ELSE COALESCE((m->>'current_value')::int, (m->>'value')::int, 0)
    END
  ), 0)
  INTO v_gameplay_modifier
  FROM jsonb_array_elements(v_uc.gameplay_mood_modifiers->'modifiers') AS m;

  -- Combine all components and clamp to 0-100
  v_final_mood := GREATEST(0, LEAST(100,
    v_stat_mood + COALESCE(v_char.mood_modifier, 0) + v_living_modifier + v_gameplay_modifier
  ));

  RETURN v_final_mood;
END;
$$ LANGUAGE plpgsql;
```

### Helper function to add mood modifiers:

```sql
CREATE OR REPLACE FUNCTION add_mood_modifier(
  p_userchar_id TEXT,
  p_event_type TEXT,
  p_override_value INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_event RECORD;
  v_new_modifier JSONB;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Look up the event type
  SELECT * INTO v_event FROM mood_event_types WHERE id = p_event_type;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown mood event type: %', p_event_type;
  END IF;

  -- Calculate expiration
  IF v_event.default_expires_in_days IS NOT NULL THEN
    v_expires_at := NOW() + (v_event.default_expires_in_days || ' days')::interval;
  END IF;

  -- Build the modifier entry
  v_new_modifier := jsonb_build_object(
    'source', p_event_type,
    'value', COALESCE(p_override_value, v_event.base_value),
    'current_value', COALESCE(p_override_value, v_event.base_value),
    'applied_at', NOW(),
    'expires_at', v_expires_at,
    'decay_rate', v_event.default_decay_rate,
    'removable_by', v_event.default_removable_by
  );

  -- Append to the user_character's modifiers array
  UPDATE user_characters
  SET gameplay_mood_modifiers = jsonb_set(
    gameplay_mood_modifiers,
    '{modifiers}',
    COALESCE(gameplay_mood_modifiers->'modifiers', '[]'::jsonb) || v_new_modifier
  )
  WHERE id = p_userchar_id;
END;
$$ LANGUAGE plpgsql;
```

### Helper function to remove mood modifiers:

```sql
CREATE OR REPLACE FUNCTION remove_mood_modifier(
  p_userchar_id TEXT,
  p_removal_trigger TEXT  -- 'therapy', 'revenge', 'paying_debt', etc.
) RETURNS INTEGER AS $$
DECLARE
  v_removed_count INTEGER;
BEGIN
  -- Remove modifiers that list this trigger in removable_by
  WITH removed AS (
    UPDATE user_characters
    SET gameplay_mood_modifiers = jsonb_set(
      gameplay_mood_modifiers,
      '{modifiers}',
      (
        SELECT COALESCE(jsonb_agg(m), '[]'::jsonb)
        FROM jsonb_array_elements(gameplay_mood_modifiers->'modifiers') AS m
        WHERE NOT (
          m->'removable_by' IS NOT NULL AND
          m->'removable_by' @> to_jsonb(p_removal_trigger)
        )
      )
    )
    WHERE id = p_userchar_id
    RETURNING (
      SELECT COUNT(*)
      FROM jsonb_array_elements(gameplay_mood_modifiers->'modifiers') AS m
      WHERE m->'removable_by' IS NOT NULL AND m->'removable_by' @> to_jsonb(p_removal_trigger)
    ) as cnt
  )
  SELECT COALESCE(SUM(cnt), 0) INTO v_removed_count FROM removed;

  RETURN v_removed_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Character Mood Modifiers (Base Values)

**SCALE NOTE:** These values are calibrated to match existing modifier scales in the game:
- Signature modifiers range: -60 to +80
- Species modifiers range: -30 to +50
- Mood modifier range: **-40 to +40** (appropriate for a 0-100 final mood scale)

### Archetype mood tendencies (reference only - not directly used):

| Archetype | Tendency | Notes |
|-----------|----------|-------|
| trickster | +15 to +25 | Playful, mischievous disposition |
| leader | +5 to +15 | Confident, composed |
| warrior | -5 to +10 | Stoic, focused |
| beast | -5 to +10 | Primal, instinctual |
| beastmaster | +5 to +15 | Bonded with nature |
| mystic | -10 to +10 | Enigmatic, contemplative |
| mage | -15 to +5 | Intellectual, sometimes isolated |
| scholar | -20 to -5 | Overthinking, brooding |
| detective | -15 to -5 | Melancholic, obsessive |
| assassin | -20 to -10 | Cold, detached |
| tank | -15 to -5 | Burdened, heavy |
| magical_appliance | +5 to +15 | Quirky, cheerful helper |

### Species mood tendencies (reference only - not directly used):

| Species | Tendency | Notes |
|---------|----------|-------|
| angel | +20 to +30 | Divine serenity |
| unicorn | +20 to +30 | Pure-hearted |
| deity | +10 to +20 | Transcendent |
| fairy | +10 to +20 | Whimsical |
| human_magical | 0 to +10 | Touched by wonder |
| human | -5 to +5 | Baseline variability |
| kangaroo | +5 to +15 | Spirited, bouncy |
| cyborg | -15 to -5 | Existential conflict |
| robot | -20 to -10 | Limited emotional range |
| golem | -25 to -15 | Existential heaviness |
| vampire | -25 to -15 | Brooding immortal |
| dire_wolf | -15 to -5 | Caged instinct |
| dinosaur | -15 to -5 | Primal, ancient |
| zeta_reticulan_grey | -15 to -5 | Clinical detachment |
| magical_toaster | +5 to +15 | Cheery appliance |

### All 33 Playable Characters - Final mood_modifier Values:

| Character | mood_modifier | Rationale |
|-----------|---------------|-----------|
| achilles | +8 | Proud warrior, thrives in glory |
| agent_x | -12 | Cold operative, emotional suppression |
| aleister_crowley | -25 | Dark occultist, tormented genius |
| archangel_michael | +30 | Divine warrior, righteous joy |
| billy_the_kid | +12 | Cocky outlaw, lives for thrill |
| cleopatra | +5 | Regal composure, measured confidence |
| crumbsworth | +5 | Quirky magical toaster, cheerful |
| don_quixote | +40 | Eternal optimist, unshakeable idealism |
| dracula | -25 | Brooding immortal, eternal loneliness |
| fenrir | -20 | Chained beast, suppressed rage |
| frankenstein_monster | -30 | Existential suffering, rejected |
| genghis_khan | +10 | Conquering confidence |
| holmes | -15 | Melancholic between cases |
| jack_the_ripper | -40 | Darkest disposition, malevolent |
| joan | +5 | Devout focus, inner peace through faith |
| kali | -15 | Destruction aspect, fierce intensity |
| kangaroo | +15 | Spirited boxer, bouncy energy |
| karna | +5 | Noble warrior, dignified calm |
| little_bo_peep | +25 | Cheerful shepherd, innocent joy |
| mami_wata | +18 | Water spirit, fluid serenity |
| merlin | +12 | Wise trickster, amused detachment |
| napoleon_bonaparte | -5 | Ambitious drive, underlying insecurity |
| quetzalcoatl | +15 | Feathered serpent god, creative joy |
| ramses_ii | -8 | Pharaonic weight of legacy |
| rilak_trelkar | -12 | Alien detachment, clinical observer |
| robin_hood | +15 | Jovial outlaw, merry disposition |
| sammy_slugger | +8 | Competitive athlete, game-day energy |
| shaka_zulu | +10 | Warrior king, disciplined pride |
| space_cyborg | -15 | Existential machine conflict |
| sun_wukong | +30 | Mischievous trickster, boundless energy |
| tesla | -10 | Obsessive genius, isolation |
| unicorn | +30 | Pure-hearted, innocent wonder |
| velociraptor | -12 | Primal hunter, no emotional warmth |

---

## Mood Event Types (Seed Data)

The `mood_event_types` table centralizes all event definitions. Values scaled to be meaningful on the 0-100 mood scale.

### Battle Events:

| id | category | base_value | decay_rate | expires_days | removable_by | description |
|----|----------|------------|------------|--------------|--------------|-------------|
| battle_win | battle | +3 | 1 | 7 | - | Standard battle victory |
| battle_loss | battle | -4 | 1 | 7 | - | Standard battle defeat |
| championship_win | battle | +15 | - | 30 | - | Won a championship/tournament |
| humiliating_defeat | battle | -10 | 1 | 10 | therapy | Badly outclassed loss |
| near_death | battle | -15 | 2 | 14 | therapy | Health dropped below 10% |
| critical_injury | battle | -10 | 1 | 14 | therapy | Health dropped below 20% |
| won_while_injured | battle | +5 | 1 | 7 | - | Won despite low health (grit bonus) |
| win_streak_3 | battle | +5 | 1 | 7 | - | 3+ win streak momentum |
| loss_streak_3 | battle | -5 | 1 | 7 | - | 3+ loss streak slump |

### Social/Team Events:

| id | category | base_value | decay_rate | expires_days | removable_by | description |
|----|----------|------------|------------|--------------|--------------|-------------|
| teammate_death | social | -20 | 2 | - | therapy | Ally died in battle |
| teammate_praised | social | +4 | 1 | 5 | - | Received praise from teammate |
| bond_milestone | social | +6 | - | 14 | - | Hit bond level milestone |
| public_humiliation | social | -8 | 1 | 7 | - | Heckled or mocked publicly |
| betrayal_by_ally | social | -15 | - | - | therapy, revenge | Betrayed by trusted ally |
| betrayal_revenge | social | +8 | - | 14 | - | Got revenge on betrayer |

### Rivalry Events:

| id | category | base_value | decay_rate | expires_days | removable_by | description |
|----|----------|------------|------------|--------------|--------------|-------------|
| rivalry_dominance | rivalry | +10 | 1 | 14 | - | Beat personal rival |
| rivalry_humiliation | rivalry | -12 | 1 | 14 | therapy, revenge | Lost to personal rival |

### Financial Events:

| id | category | base_value | decay_rate | expires_days | removable_by | description |
|----|----------|------------|------------|--------------|--------------|-------------|
| went_into_debt | financial | -8 | - | - | paying_debt | Entered debt state |
| paid_off_debt | financial | +8 | 1 | 30 | - | Cleared all debt |
| payday_windfall | financial | +5 | 1 | 14 | - | Big earnings or windfall |

### Living Situation Events:

| id | category | base_value | decay_rate | expires_days | removable_by | description |
|----|----------|------------|------------|--------------|--------------|-------------|
| living_conflict | living | -5 | 1 | 5 | - | Drama with housemates |
| moved_to_master_bed | living | +4 | - | 7 | - | Upgraded sleeping situation |
| evicted_from_bed | living | -6 | 1 | 7 | - | Lost good sleeping spot |

### Therapy Events:

| id | category | base_value | decay_rate | expires_days | removable_by | description |
|----|----------|------------|------------|--------------|--------------|-------------|
| therapy_basic | therapy | +5 | - | 14 | - | Completed therapy session |
| therapy_intensive | therapy | +10 | - | 21 | - | Completed intensive therapy |
| therapy_breakthrough | therapy | +15 | - | 30 | - | Major therapeutic breakthrough |

### Other Events:

| id | category | base_value | decay_rate | expires_days | removable_by | description |
|----|----------|------------|------------|--------------|--------------|-------------|
| failed_rebellion | other | -10 | 1 | 14 | - | Rebellion attempt failed |
| successful_rebellion | other | +12 | - | 21 | - | Rebellion succeeded |
| award_recognition | other | +8 | 1 | 30 | - | Received award/recognition |
| team_morale_boost | other | +3 | 1 | 3 | - | Team morale cascade (positive) |
| team_morale_drain | other | -3 | 1 | 3 | - | Team morale cascade (negative) |

---

## Integration with PSYCHOLOGICAL Package

Add `current_mood` as a calculated field in the get_full_character_data() function's PSYCHOLOGICAL package:

```sql
v_psychological := jsonb_build_object(
  -- existing fields...
  'current_mood', calculate_current_mood(p_userchar_id),
  -- rest of fields...
);
```

---

## Frontend Display

Mood can be shown as:
- Numeric: 72/100
- Label: "Content" (based on ranges)
- With breakdown: "Mood: 72 (Base: -10, Stats: +75, Events: +7)"

### Mood labels:
- 0-20: Despairing
- 21-40: Miserable
- 41-55: Downcast
- 56-70: Neutral
- 71-85: Content
- 86-95: Happy
- 96-100: Elated

---

## Sleeping Arrangement System (Prerequisite)

The mood formula includes sleeping situation modifiers. The sleeping system was partially built but broken.

### Problem Found

1. `room_beds` table migration failed (UUID/TEXT type mismatch) - table doesn't exist
2. `character_living_context` table is dead - never populated, never used
3. `masterBedConflictService.ts` reads dead table, never called
4. `user_characters.sleeping_arrangement` exists but is never updated (stuck at default 'bunk_bed')
5. `BED_HIERARCHY` is hardcoded in `headquartersService.ts` instead of DB

### Solution

#### Table 1: `sleeping_spot_types` (NEW - lookup table)

```sql
CREATE TABLE sleeping_spot_types (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    mood_modifier INTEGER NOT NULL,
    comfort_tier INTEGER NOT NULL  -- 1=best, 5=worst (for assignment priority)
);

INSERT INTO sleeping_spot_types VALUES
('master_bed', 'Master Bed', 10, 1),
('bunk_bed', 'Bunk Bed', 2, 2),
('coffin', 'Coffin', 0, 2),
('couch', 'Couch', -2, 3),
('air_mattress', 'Air Mattress', -5, 4),
('floor', 'Floor', -10, 5);
```

#### Table 2: `room_beds` (FIX - migration 117 had type mismatch)

```sql
CREATE TABLE room_beds (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    room_id TEXT NOT NULL REFERENCES headquarters_rooms(id) ON DELETE CASCADE,
    bed_id TEXT NOT NULL,
    bed_type TEXT NOT NULL REFERENCES sleeping_spot_types(id),
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 1,
    comfort_bonus INTEGER DEFAULT 0,
    character_id TEXT REFERENCES user_characters(id) ON DELETE SET NULL,
    stat_modifier_type TEXT DEFAULT 'morale',
    stat_modifier_value INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Trigger: Sync `room_beds.character_id` → `user_characters.sleeping_arrangement`

```sql
CREATE OR REPLACE FUNCTION sync_sleeping_arrangement()
RETURNS TRIGGER AS $$
BEGIN
    -- When character assigned to bed, update their sleeping_arrangement
    IF NEW.character_id IS NOT NULL THEN
        UPDATE user_characters
        SET sleeping_arrangement = NEW.bed_type
        WHERE id = NEW.character_id;
    END IF;
    -- When character removed from bed, set them to floor
    IF OLD.character_id IS NOT NULL AND (NEW.character_id IS NULL OR OLD.character_id != NEW.character_id) THEN
        UPDATE user_characters
        SET sleeping_arrangement = 'floor'
        WHERE id = OLD.character_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_sleeping_arrangement
AFTER INSERT OR UPDATE ON room_beds
FOR EACH ROW EXECUTE FUNCTION sync_sleeping_arrangement();
```

#### Initial Assignment on Character Creation

```typescript
async function assignSleepingSpot(user_char_id: string, hq_id: string): Promise<string> {
  const spot = await query(`
    SELECT rb.id, rb.bed_type
    FROM room_beds rb
    JOIN headquarters_rooms hr ON rb.room_id = hr.id
    JOIN sleeping_spot_types sst ON rb.bed_type = sst.id
    WHERE hr.headquarters_id = $1
      AND rb.character_id IS NULL
    ORDER BY sst.comfort_tier ASC
    LIMIT 1
  `, [hq_id]);

  if (spot.rows.length > 0) {
    await query('UPDATE room_beds SET character_id = $1 WHERE id = $2',
      [user_char_id, spot.rows[0].id]);
    return spot.rows[0].bed_type;  // Trigger handles user_characters update
  } else {
    await query('UPDATE user_characters SET sleeping_arrangement = $1 WHERE id = $2',
      ['floor', user_char_id]);
    return 'floor';
  }
}
```

### Cleanup Required

| Item | Action |
|------|--------|
| `character_living_context` table | DELETE - dead, never populated |
| `masterBedConflictService.ts` | DELETE - reads dead table, never called |
| `team_context.master_bed_character_id` | DELETE - redundant, sleeping_spot_types handles this |
| `BED_HIERARCHY` in headquartersService.ts | DELETE - replaced by sleeping_spot_types table |

---

## Implementation Tasks (Ordered)

### Phase 0: Sleeping System Fix (prerequisite for mood)

1. [ ] **Migration: Create `sleeping_spot_types` table** - bed type definitions with mood modifiers
2. [ ] **Migration: Create `room_beds` table** - fix type mismatch from migration 117
3. [ ] **Migration: Create sync trigger** - room_beds.character_id → user_characters.sleeping_arrangement
4. [ ] **Migration: Delete `character_living_context` table** - dead table cleanup
5. [ ] **Migration: Delete `team_context.master_bed_character_id`** - redundant column
6. [ ] **Delete `masterBedConflictService.ts`** - orphaned service
7. [ ] **Update `headquartersService.ts`** - remove hardcoded BED_HIERARCHY, query sleeping_spot_types
8. [ ] **Add `assignSleepingSpot()` to character creation** - databaseAdapter.ts, auth.ts, InfluencerMintService.ts

### Phase 1: Mood Schema Setup

9. [ ] **Migration: Create `mood_event_types` table** - the lookup table for event definitions
10. [ ] **Migration: Add `mood_modifier` to `characters` table** - the static personality baseline
11. [ ] **Migration: Add `gameplay_mood_modifiers` JSONB to `user_characters`** - dynamic event modifiers

### Phase 2: Seed Data

12. [ ] **Seed `mood_event_types`** - populate all event types from the tables above
13. [ ] **Seed `characters.mood_modifier`** - set values for all 33 playable characters

### Phase 3: Functions

14. [ ] **Create `calculate_current_mood()` function** - the main mood calculation (joins sleeping_spot_types for modifier)
15. [ ] **Create `add_mood_modifier()` helper** - adds modifiers referencing mood_event_types
16. [ ] **Create `remove_mood_modifier()` helper** - removes modifiers by trigger type

### Phase 4: Integration

17. [ ] **Update `get_full_character_data()`** - add current_mood to PSYCHOLOGICAL package
18. [ ] **Update `psychologyService.ts`** - call `add_mood_modifier()` after battle events
19. [ ] **Update therapy system** - call `remove_mood_modifier('therapy')` and add therapy bonuses
20. [ ] **Update financial system** - trigger debt/payoff mood events

### Phase 5: Testing & Tuning

21. [ ] **Test mood calculation** - verify formula produces sensible 0-100 values
22. [ ] **Tune weights** - adjust formula weights based on gameplay feel
23. [ ] **Test decay** - verify modifiers decay correctly over time

---

## Research Completed

1. **Psychological stats exist** - confirmed: current_mental_health, current_morale, current_stress, current_fatigue, current_confidence, financial_stress, coach_trust_level, bond_level, current_team_player all exist on user_characters
2. **Performance stats exist** - confirmed: current_health, current_max_health, win_percentage, gameplan_adherence, current_win_streak exist
3. **Resource stats exist** - confirmed: current_energy, current_max_energy, current_mana, current_max_mana, wallet, debt_principal exist
4. **Sleeping arrangement** - `user_characters.sleeping_arrangement` exists (VARCHAR, default 'bunk_bed') but was never updated; will be synced via trigger from `room_beds`
5. **Existing modifier scales** - signature modifiers range -60 to +80, species -30 to +50; mood_modifier scaled to -40 to +40
6. **Sleeping system broken** - `room_beds` migration 117 failed (UUID/TEXT mismatch), `character_living_context` is dead, `masterBedConflictService.ts` orphaned

---

## Legacy Cleanup

The following will be **DELETED** as part of this implementation:

| Item | Reason |
|------|--------|
| `character_living_context` table | Dead - never populated, never used |
| `masterBedConflictService.ts` | Orphaned - reads dead table, never called |
| `team_context.master_bed_character_id` | Redundant - replaced by `room_beds` + `sleeping_spot_types` |
| `BED_HIERARCHY` in headquartersService.ts | Hardcoded - replaced by `sleeping_spot_types` DB table |
| `characters.default_mood` | Legacy string fallback - replaced by `calculate_current_mood()` |

---

## Notes

- Mood affects prompt responses - low mood characters should be less enthusiastic, more irritable
- Mood could affect rebellion chance as an additional factor
- Consider mood contagion - low mood teammates slightly affect others' moods (team_morale_boost/drain events)
- current_ego was excluded from formula - high ego doesn't necessarily mean good/bad mood, it's more about behavior style
- The `character_modifiers` table (migration 167) already handles psychology stat modifiers for morale/stress/fatigue/confidence - mood is a separate calculated value that incorporates those stats
