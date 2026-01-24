# Headquarters Assignment Bug Report
**Date**: 2025-12-21
**Severity**: CRITICAL - Blocks therapy module
**Affected User**: `2cfc94ed-2d27-42c6-bcc8-52b5cd2ccbb1`

---

## Executive Summary

**Issue**: Therapy module crashes with error "Patient has no roommates - this indicates broken game state"
**Root Cause**: Characters are not assigned to headquarters during registration
**Impact**: Therapy feature completely non-functional for affected users

---

## The 6 Affected Characters

| ID | Character | Archetype | HQ ID | Sleeping | Issue |
|----|-----------|-----------|-------|----------|-------|
| b78bf0fd... | Carl Jung | system | **NULL** | bunk_bed | No HQ |
| 29dabf84... | Count Dracula | mystic | **NULL** | floor | No HQ |
| 37228104... | Frankenstein's Monster | tank | **NULL** | floor | No HQ |
| cb5db512... | Seraphina | system | **NULL** | bunk_bed | No HQ |
| 6663f02a... | Velociraptor | beast | **NULL** | floor | No HQ |
| 0e88e0de... | Zxk14bW^7 | system | **NULL** | bunk_bed | No HQ |

**Note**: 3 are therapists (archetype: system) - unusual that user owns therapist characters

---

## Technical Analysis

### Database State

**user_headquarters table**:
```sql
SELECT * FROM user_headquarters WHERE user_id = '2cfc94ed...';
-- Result: 0 rows
```
User has NO headquarters created.

**user_characters.headquarters_id**:
```sql
SELECT headquarters_id FROM user_characters WHERE user_id = '2cfc94ed...';
-- Result: All 6 characters have NULL
```

### The Roommates Query Failure

From `get_full_character_data()` function (migration 256):
```sql
'roommates', (
  SELECT ... FROM user_characters uc2
  WHERE uc2.user_id = v_uc.user_id
    AND uc2.id != p_userchar_id
    AND uc2.headquarters_id = v_uc.headquarters_id  -- ❌ NULL = NULL → FALSE
)
```

**SQL Behavior**: In PostgreSQL, `NULL = NULL` evaluates to `FALSE`, not `TRUE`.
**Result**: Roommates query returns 0 results even though 5 other characters exist.

### The Therapy Crash

**Error Stack**:
```
Error: STRICT MODE: Patient has no roommates - this indicates broken game state
    at buildTherapistPersona (/app/backend/dist/services/prompts/domains/therapy/personas/buildTherapistPersona.js:12:15)
    at default_1 (/app/backend/dist/services/prompts/domains/therapy/personas/therapists/zxk14bw7.js:25:62)
    at handleTherapyRequest (/app/backend/dist/routes/ai.js:3554:31)
```

**Logic**: Therapy persona builder expects ALL characters to have roommates (reality show premise).
**Validation**: Code throws STRICT MODE error when roommates array is empty.
**Impact**: 500 error → therapy session fails to start.

---

## Root Cause Analysis

### Missing Registration Logic

**File**: `/backend/src/routes/auth.ts`
**Finding**: NO code to create `user_headquarters` or set `headquarters_id`

**Expected Registration Flow** (currently missing):
1. Create user account → ✅ Works
2. Create initial user_headquarters → ❌ **MISSING**
3. Create user_characters → ✅ Works
4. Assign characters to HQ by setting `headquarters_id` → ❌ **MISSING**

### Historical Context

**User stated**: "it was working previously and characters had roommates"
**Implication**: Registration code previously had this logic but was removed/broken

**Design Intent** (from user):
- Users can own MULTIPLE headquarters
- At character registration, assign to available room in available user HQ
- Users can manually move characters between rooms/facilities later

---

## Proposed Solutions

### Solution 1: Fix Registration Flow (RECOMMENDED)

**Approach**: Add headquarters creation to registration process

**Implementation**:
1. When new user registers:
   - Create default `user_headquarters` row (starter tier)
   - Create initial rooms in `headquarters_rooms`
   - Create beds in `room_beds`
2. When characters are created (during registration):
   - Find user's primary headquarters
   - Find first available bed
   - Set `user_characters.headquarters_id` to that HQ
   - Assign character to bed in `room_beds.character_id`

**Pros**:
- ✅ Fixes root cause
- ✅ Works for all new registrations going forward
- ✅ Matches original design intent
- ✅ No workarounds needed in queries

**Cons**:
- ❌ Doesn't fix existing users (need migration)
- ❌ Requires understanding full HQ initialization logic
- ❌ More complex implementation

**Effort**: Medium (2-3 hours)

---

### Solution 2: Backfill Missing Headquarters (Quick Fix)

**Approach**: Create headquarters for existing affected users

**Implementation**:
1. Create migration to:
   - Find all users with 0 rows in `user_headquarters`
   - Create default HQ for each
   - Assign all their characters to that HQ
   - Update `user_characters.headquarters_id`

**Pros**:
- ✅ Fixes existing users immediately
- ✅ Simple SQL migration
- ✅ Can be deployed quickly

**Cons**:
- ❌ Doesn't prevent future registrations from having same issue
- ❌ Still need to fix registration flow (Solution 1)
- ❌ Might create HQ with wrong tier/configuration

**Effort**: Low (30 minutes)

**Example Migration**:
```sql
-- For each user without HQ, create one and assign their characters
INSERT INTO user_headquarters (id, user_id, tier_id, balance, gems, unlocked_themes)
SELECT
  gen_random_uuid(),
  u.id,
  'starter_hq',
  1000,
  0,
  ARRAY['default']::text[]
FROM users u
LEFT JOIN user_headquarters uh ON u.id = uh.user_id
WHERE uh.id IS NULL;

-- Assign all characters to their user's HQ
UPDATE user_characters uc
SET headquarters_id = (
  SELECT id FROM user_headquarters WHERE user_id = uc.user_id LIMIT 1
)
WHERE headquarters_id IS NULL;
```

---

### Solution 3: Update Roommates Query (Workaround)

**Approach**: Fix query to handle NULL headquarters_id

**Implementation**:
```sql
WHERE uc2.user_id = v_uc.user_id
  AND uc2.id != p_userchar_id
  AND (
    (v_uc.headquarters_id IS NOT NULL AND uc2.headquarters_id = v_uc.headquarters_id)
    OR (v_uc.headquarters_id IS NULL AND uc2.headquarters_id IS NULL)
  )
```

**Pros**:
- ✅ Immediate fix for therapy crash
- ✅ Simple change to one function
- ✅ Works for all users (with or without HQ)

**Cons**:
- ❌ **BAND-AID** - doesn't fix the actual problem
- ❌ Treats NULL as "all in same default HQ" which isn't accurate
- ❌ Users still can't use HQ features properly
- ❌ Still need Solutions 1 & 2

**Effort**: Very Low (5 minutes)

---

### Solution 4: Remove STRICT MODE Check (NOT RECOMMENDED)

**Approach**: Remove the error throw in `buildTherapistPersona`

**Implementation**:
```typescript
// Before:
if (roommates.length === 0) {
  throw new Error('STRICT MODE: Patient has no roommates...');
}

// After:
if (roommates.length === 0) {
  console.warn('Patient has no roommates - HQ feature not configured');
  // Continue without roommates context
}
```

**Pros**:
- ✅ Therapy sessions work

**Cons**:
- ❌ **BAD PRACTICE** - hides the real issue
- ❌ Therapy conversations lack roommate context (degrades quality)
- ❌ Doesn't fix HQ functionality
- ❌ Violates "reality show" game design

**Effort**: Very Low (2 minutes)

---

## Recommended Action Plan

### Phase 1: Immediate Hotfix (Deploy Today)
1. **Solution 2**: Create migration to backfill headquarters for existing users
2. **Solution 3**: Update roommates query to handle NULL (safety net)
3. **Test**: Verify therapy works for affected user

### Phase 2: Permanent Fix (Next Sprint)
1. **Solution 1**: Add headquarters creation to registration flow
2. **Test**: Create new test account, verify HQ is created
3. **Verify**: Confirm therapists aren't being assigned to regular users

### Phase 3: Validation (Next Sprint)
1. **Audit**: Check why therapists (Carl Jung, Seraphina, Zxk14bW^7) are user_characters
2. **Verify**: Therapists should probably be separate from user roster
3. **Clean up**: Remove therapist characters from user_characters if incorrect

---

## Open Questions

1. **Why does this user have therapist characters?**
   - Carl Jung, Seraphina, and Zxk14bW^7 are archetype "system"
   - Are therapists supposed to be user-owned characters?
   - Or is this test data / bug in registration?

2. **What tier should default HQ be?**
   - Need to know correct initial tier_id for new users
   - Should match game economy/progression

3. **How many rooms/beds in default HQ?**
   - Need HQ template configuration for new users
   - Must accommodate initial character roster (3 characters?)

4. **When was this working?**
   - Git history check to find when registration logic changed
   - Might reveal what happened / how to restore

---

## Files Requiring Changes

### For Solution 1 (Registration Fix):
- `/backend/src/routes/auth.ts` - Add HQ creation logic
- `/backend/src/services/headquartersService.ts` - Add `createInitialHeadquarters()` method

### For Solution 2 (Backfill Migration):
- `/backend/migrations/258_backfill_headquarters.sql` (new file)

### For Solution 3 (Query Fix):
- `/backend/migrations/257_fix_roommates_query.sql` (already drafted, not deployed)

---

## Success Criteria

After fix is deployed:
1. ✅ User `2cfc94ed...` can start therapy session without errors
2. ✅ `get_full_character_data()` returns roommates array with 5 characters
3. ✅ New user registrations create headquarters automatically
4. ✅ All user_characters have non-NULL headquarters_id

---

## Next Steps

**WAITING FOR YOUR DECISION**:
- Which solution(s) should I implement?
- Should I check git history for when registration broke?
- Should I investigate the therapist character issue?
