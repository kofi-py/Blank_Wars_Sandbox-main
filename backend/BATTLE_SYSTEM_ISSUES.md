# Battle System Issues - Dec 9, 2025

## 🔴 CRITICAL ISSUES

### Issue #1: Migration 208 Paradox (CRITICAL!)
- **Severity**: CRITICAL - Blocking all character abilities
- **Status**: Migration 208 marked as "Applied" but didn't actually execute
- **Evidence**:
  - `migration_log` shows version 20251209 applied on 2025-12-09 06:00:38
  - BUT `auto_unlock_starters()` trigger still has bug: `s.spell_id` instead of `s.id`
  - Function definition in production database still contains the broken code
- **Impact**:
  - ALL characters have 0 powers and 0 spells unlocked
  - New character creation fails to unlock starter abilities
  - Registration may fail or create broken characters
- **Root Cause**: Migration was logged but function wasn't replaced
- **Fix Required**: Manually apply migration 208 or re-run it

### Issue #2: ALL Characters Have Zero Abilities
- **Severity**: CRITICAL - Game-breaking
- **Status**: Confirmed across entire database
- **Details**:
  - 968 character_powers records exist BUT all have `unlocked = false`
  - 938 character_spells records exist BUT all have `unlocked = false`
  - Sample of 5 characters: ALL have 0 unlocked powers, 0 unlocked spells
- **Test Results**:
  - Frankenstein's Monster: 0 powers, 0 spells
  - Quetzalcoatl: 0 powers, 0 spells
  - Crumbsworth: 0 powers, 0 spells
  - Kali: 0 powers, 0 spells
  - Archangel Michael: 0 powers, 0 spells
- **Starter Definitions**: Only 1 starter power and 1 starter spell defined (very limited)
- **Root Cause**: auto_unlock_starters trigger has bug, doesn't run correctly
- **Impact**: Characters can't use abilities in battle

### Issue #3: Missing "light" Attack Type
- **Severity**: HIGH - Brother reported missing during battle testing
- **Status**: Confirmed missing
- **Current State**: Database only has `jab`, `strike`, `heavy` (3 total)
- **Expected**: Should have `light`, `jab`, `strike`, `heavy` (4 total)
- **Impact**: Unknown - brother said it should exist but couldn't test without it
- **Action**: Clarify with brother what "light" attack type should be

## ⚠️ HIGH PRIORITY ISSUES

### Issue #4: Attack Types Value Discrepancy
- **Severity**: MEDIUM - Documentation/consistency issue
- **Status**: Database is source of truth, migration needs updating
- **Details**: Migration 200 doesn't match production database values

| Attack Type | Migration 200 | Production DB | Status |
|-------------|---------------|---------------|---------|
| jab (name)  | "Jab" | "Quick Attack" | ❌ MISMATCH |
| jab (damage)| 0.50x damage | 0.75x damage | ❌ MISMATCH |
| jab (accuracy) | +10 accuracy | -10 accuracy | ❌ MISMATCH |
| strike      | 1.00x damage | 1.00x damage | ✅ MATCH |
| heavy       | 1.75x damage | 2.50x damage | ❌ MISMATCH |

- **Decision**: Use database values as source of truth
- **Action Required**: Update migration 200 to match database (when ready)

### Issue #5: Character Stats Corruption/Anomalies
- **Severity**: MEDIUM - Data integrity issue
- **Status**: Multiple characters with impossible stats
- **Examples**:
  - Crumbsworth: ATK -15, DEF -5, SPD 30, HP 125 (negative combat stats)
  - LMB-3000 "Lady MacBeth": ATK 1280, DEF 1330, SPD -2430, HP 1410 (extreme stats)
  - Zxk14bW^7: ATK 1910, DEF -2405, SPD 60, HP 2010 (negative defense!)
  - Hostmaster v8.72: ATK 1340, DEF 1340, SPD -2380, HP 1390
  - Rilak Trelkar: ATK 25, DEF -5, SPD 45, HP 120
- **Impact**:
  - Could cause battle calculation errors
  - Negative defense makes damage calculations weird
  - May be test data or database corruption
- **Action**: Investigate if these are intentional or need cleanup

### Issue #6: Zero Battle Actions Recorded
- **Severity**: LOW - Monitoring/data issue
- **Status**: 2 active battles but 0 battle actions
- **Details**:
  - battles table: 2 records (both status='active', 0 completed)
  - battle_actions table: 0 records
  - Most recent battle: test_battle_1765347437006 (our test)
- **Impact**: Battle history/replay might be broken
- **Possible Causes**:
  - Battles created but never progressed
  - Battle actions not being recorded
  - Test battles that were cleaned up

## ✅ WORKING CORRECTLY

### Attack Type Efficiency Analysis
Tested damage efficiency (damage per AP spent):

| Attack Type | Multiplier | AP Cost | Efficiency (dmg/AP) | Best For |
|-------------|------------|---------|---------------------|----------|
| Heavy Attack | 2.50x | 3 | 0.83 | High burst damage |
| Jab (Quick) | 0.75x | 1 | 0.75 | AP conservation |
| Strike | 1.00x | 2 | 0.50 | Balanced (least efficient!) |

**Surprising Finding**: Strike is LEAST efficient, not most efficient!
- Heavy Attack: Best damage per AP (0.83)
- Jab: Second best (0.75)
- Strike: Worst (0.50) - costs 2 AP but only does 1x damage

**Damage Test Results** (82 ATK vs 88 DEF):
- Jab (0.75x): 17 damage, 1 AP = 17.0 dmg/AP (effective)
- Strike (1.00x): 38 damage, 2 AP = 19.0 dmg/AP (middling)
- Heavy (2.50x): 161 damage, 3 AP = 53.7 dmg/AP (devastating!)

### Battle Creation & Database Operations
- ✅ Can create battles successfully
- ✅ Battle records persist in database
- ✅ Damage calculations work correctly
- ✅ Attack type system functional
- ✅ Database connections stable

### Pack System
- ✅ 4 pack templates exist in card_packs table:
  - standard_starter (1 pack)
  - standard (1 pack)
  - premium (1 pack)
  - premium_starter (1 pack)
- ✅ Won't block registration (templates exist)

### Database Health
- ✅ All core tables exist and populated:
  - 95 users
  - 44 base characters
  - 1,079 user characters
  - 3 attack types
  - 395 power definitions
  - 334 spell definitions
  - 968 character_powers (all locked)
  - 938 character_spells (all locked)
- ✅ Avg 21.2 characters per user (good engagement)

## 📊 Test Files Created

### Test Suites
1. **test-battle-logic-standalone.ts** - Safe read-only battle logic tests
   - Tests attack types
   - Tests damage calculations
   - Tests database schema
   - No memory overhead, no DB writes

2. **test-full-battle.ts** - Full battle integration test
   - Creates real battles (with cleanup)
   - Tests battle creation
   - Simulates combat rounds
   - Validates battle persistence

3. **test-comprehensive.ts** - Comprehensive system test suite
   - Tests all major systems
   - Database structure validation
   - Character abilities system
   - Attack types deep dive
   - Battle system status
   - Pack system check
   - Character stats validation
   - Migration system check
   - User & team statistics

## 🔄 Migration Status

### Applied Migrations (Latest 5)
1. 20251209: add_attack_type_id_to_battle_actions.sql - 12/9/2025
2. 158: (unnamed) - 12/7/2025
3. 182: (unnamed) - 12/7/2025
4. 181: (unnamed) - 12/7/2025
5. 180: (unnamed) - 12/7/2025

### Migration 208 Status
- ✅ Shows as "Applied" in migration_log (version 20251209)
- ❌ Function code NOT updated (still has bug)
- **This is the critical issue!**

## 🎯 Priority Action Items

1. **URGENT**: Fix migration 208 - Manually apply auto_unlock_starters fix
2. **URGENT**: Unlock abilities for existing characters (backfill)
3. **HIGH**: Clarify "light" attack type with brother
4. **MEDIUM**: Update migration 200 to match database values
5. **MEDIUM**: Investigate/clean up characters with corrupted stats
6. **LOW**: Check why battle_actions table is empty

## 📈 Next Testing Steps

1. Test character creation flow end-to-end
2. Test registration with pack claiming
3. Test actual battle execution (not just creation)
4. Test character progression/leveling
5. Test power/spell unlock mechanisms
6. Stress test with multiple concurrent battles
