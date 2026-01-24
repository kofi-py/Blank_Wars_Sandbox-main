# Game Plan 004: Preference Scoring System

**Created:** 2025-12-08
**Status:** Ready for Implementation
**Priority:** Medium (supports rebellion/adherence mechanics)

---

## Context

Characters have preferences that affect whether they rebel when the coach makes decisions on their behalf (equipping items, allocating points, etc.). Currently the preference system is inconsistent and lacks scoring.

---

## Current State (The Mess)

| Column | Type | Naming | Problem |
|--------|------|--------|---------|
| armor_proficiency | TEXT | singular | Should be ARRAY, plural |
| weapon_proficiencies | ARRAY | plural | OK |
| preferred_armor_type | TEXT | singular + "_type" | Should be JSONB with scores |
| preferred_weapons | ARRAY | plural | Should be JSONB with scores |

Four columns, four different conventions. No scoring - just lists or single values.

---

## Target State

### Proficiencies (what they CAN use) - All ARRAY, plural naming:
- armor_proficiencies
- weapon_proficiencies
- spell_proficiencies (new)
- power_proficiencies (new)

### Preferences (what they WANT, with scores) - All JSONB:
- preferred_armor
- preferred_weapons
- preferred_spells (new)
- preferred_powers (new)
- preferred_attributes (new)
- preferred_resources (new)

---

## Preference Score Structure

JSONB with item:score pairs, scores 0-100:

```json
{
  "sword": 85,
  "axe": 70,
  "bow": 30
}
```

**Score meanings and rebellion relationship:**
- 90-100: Loves it → minimal rebellion modifier
- 70-89: Likes it → low rebellion modifier
- 50-69: Neutral → moderate rebellion modifier
- 30-49: Dislikes → high rebellion modifier
- 0-29: Hates it → severe rebellion modifier

The lower the preference score, the higher the rebellion chance when coach chooses that option. A score of 20 for "bow" means forcing the character to use a bow significantly increases rebellion probability compared to a score of 85 for "sword".

**NO FALLBACKS:** Every character must have scores populated for every item they could potentially be assigned. Missing data should cause an error, not default to anything.

---

## Adherence Integration

Preferences add an additional modifier to the existing adherence system.

**IMPORTANT:** Research the existing adherence system before implementing:
- Read `backend/src/services/` for existing adherence/rebellion logic
- Read `docs/gameplans/002-battle-rebellion-flow.md`
- Ego and other psychological factors are ALREADY factored into adherence
- Always use `current_` stats, never base stats
- Do not duplicate existing logic

The preference score should integrate as an additional modifier, not replace what exists.

---

## What Preferences Cover

### Equipment Preferences
- preferred_armor: Which armor types/items they prefer
- preferred_weapons: Which weapons they prefer

### Ability Preferences
- preferred_spells: Which spell schools/types they prefer learning/using
- preferred_powers: Which power types they prefer developing

### Allocation Preferences
- preferred_attributes: Which stats they want points allocated to (attack, defense, speed, intelligence, etc.)
- preferred_resources: How they want resources allocated (health vs mana vs energy priority)

---

## Characters Requiring Preference Data (33 playable characters)

Each character needs logical preference scores based on their lore, archetype, species, and personality:

**Historical/Literary:**
achilles, agent_x, aleister_crowley, billy_the_kid, cleopatra, don_quixote, dracula, genghis_khan, holmes, jack_the_ripper, joan, little_bo_peep, merlin, napoleon_bonaparte, ramses_ii, robin_hood, sammy_slugger, shaka_zulu, tesla

**Mythological:**
archangel_michael, fenrir, kali, karna, mami_wata, quetzalcoatl, sun_wukong, unicorn

**Fictional/Original:**
crumbsworth, frankenstein_monster, kangaroo, rilak_trelkar, space_cyborg, velociraptor

---

## Implementation Tasks

### Task 1: Schema Migration
- Standardize existing proficiency columns to ARRAY with plural naming
- Convert existing preference columns to JSONB with scores
- Add new preference columns (spells, powers, attributes, resources)
- Add new proficiency columns (spells, powers)

### Task 2: Adherence Service
- Research existing adherence system thoroughly first
- Create preference adherence modifier that integrates with existing system
- Handle missing preferences (default to 50)

### Task 3: Data Population
- Review each character's backstory, archetype, species, personality
- Assign logical preference scores for all 6 preference categories
- Create migration to populate scores

### Task 4: Integration
- Update equipment domain to check preferences
- Update attribute/resource allocation to check preferences
- Update spell/power selection to check preferences

---

## Files to Research

- `backend/src/services/` - Find existing adherence/rebellion logic
- `docs/gameplans/002-battle-rebellion-flow.md` - Rebellion mechanics context
- `backend/src/services/prompts/domains/equipment/` - Current equipment preference usage
- `characters` table - Current preference column data

---

## Psychological Context

These preferences live in the PSYCHOLOGICAL package of character data (from the prompt system refactor). They sit alongside:
- current_mental_health, current_stress, current_morale, current_fatigue
- current_confidence, current_ego, current_team_player
- coach_trust_level, gameplan_adherence
- financial_stress, bond_level, relationships

Preferences are psychological - they reflect what the character WANTS, which interacts with their emotional state to determine rebellion.
