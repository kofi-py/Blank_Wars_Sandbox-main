# Power/Spell System Research Report

## Two Separate Concepts Confirmed:

### 1. **UNLOCK** (Adherence Check Happens Here)
- **When:** A power/spell is purchased/unlocked using character points
- **Adherence Check:** YES - happens in `loadoutAdherenceService.ts`
  - `check_adherence_and_unlock_power()` at unlock time
  - `check_adherence_and_unlock_spell()` at unlock time
- **Routes:**
  - `/api/powers/unlock` → calls `check_adherence_and_unlock_power()`
  - `/api/spells/unlock` → calls `check_adherence_and_unlock_spell()` 
- **Database:** Stores in `character_powers` and `character_spells` with `unlocked=true`

### 2. **LOADOUT** (Equipping for Battle)
- **When:** An already-unlocked power/spell is equipped to a battle slot
- **Adherence Check:** ALSO YES - happens when equipping to loadout
  - See: "Equip an unlocked power to a loadout slot with adherence check" (powers.ts:335)
- **Routes:**
  - `/api/powers/loadout/:character_id` → gets equipped powers
  - `/api/spells/loadout/:character_id` → gets equipped spells
- **Database Tables:**
  - `character_power_loadout` (migration 062)
  - `character_spell_loadout` (migration 037)

## The Current Error:

**Location:** `backend/src/services/databaseAdapter.ts` lines 684-692

**Problem:** Code tries to query:
```sql
SELECT power_id FROM power_loadout WHERE character_id = $1
SELECT spell_id FROM spell_loadout WHERE character_id = $1
```

**Reality:**
- Tables are named `character_power_loadout` and `character_spell_loadout`
- Column is `user_character_id` not `character_id`

**Fix Required:**
```sql
SELECT power_id FROM character_power_loadout WHERE user_character_id = $1
SELECT spell_id FROM character_spell_loadout WHERE user_character_id = $1
```

## The `is_equipped` Flag

The code is populating `is_equipped` for the frontend to show which powers/spells are equipped to battle slots vs just unlocked. This is **NOT** about unlocking - it's about battle loadouts.

## User's Concern

The user mentioned "adherence check is supposed to occur at the unlock event NOT at the 'loadout' event" but the research shows adherence checks happen at BOTH places (which may be intentional game design - check adherence when unlocking AND when equipping).
