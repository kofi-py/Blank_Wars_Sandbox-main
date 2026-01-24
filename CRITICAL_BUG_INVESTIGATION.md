# CRITICAL BUG: Production Backend 500 Errors - spell_type Column Issue

**Status:** UNRESOLVED
**Severity:** CRITICAL - Production is completely broken
**Date Started:** 2025-11-21
**Last Updated:** 2025-11-22 01:18 UTC

---

## Problem Summary

The production backend at `https://api.blankwars.com` is returning 500 errors for `/api/user/characters` endpoint, preventing all users from loading their characters. The application is **completely non-functional**.

### Error Message
```
error: column sd.spell_type does not exist
Location: /app/dist/services/databaseAdapter.js:430:43
SQL Error Code: 42703 (undefined column)
```

### Failing Query (from production logs)
```sql
SELECT cs.id, cs.spell_id, cs.current_rank, cs.experience, cs.unlocked,
  cs.times_cast AS times_used,
  cs.last_cast_at AS last_used_at,
  cs.on_cooldown,
  cs.cooldown_expires_at,
  cs.total_damage_dealt,
  cs.total_healing_done,
  cs.unlocked_at, cs.unlocked_by,
  sd.name, sd.description, sd.tier, sd.spell_type, sd.mana_cost,  ← ERROR HERE
  sd.cooldown_turns, sd.effects, sd.icon, sd.unlock_cost, sd.rank_up_cost
FROM character_spells cs
JOIN spell_definitions sd ON cs.spell_id = sd.id
WHERE cs.character_id = $1
ORDER BY sd.tier, sd.name
```

---

## The Mystery

### What We Know
1. ✅ **Source code is CLEAN** - No references to `spell_type` exist in current TypeScript source
2. ✅ **Database schema is CORRECT** - `spell_definitions` table has `category` column, NOT `spell_type`
3. ✅ **Git history is CLEAN** - No commits reference `spell_type` in backend code
4. ❌ **Production is STILL broken** - Even after redeployment, same error persists
5. ❌ **Line numbers DON'T MATCH** - Error shows line 430, but source code structure is different

### What This Means
The production server is deploying CODE THAT DOESN'T EXIST IN THE REPOSITORY. There are several possibilities:

1. **Railway is deploying from a different branch** (not `main`)
2. **There's a cached build layer** that's not being cleared
3. **There's generated code** somewhere that creates this query
4. **A dependency or imported package** contains this query
5. **Database migration created incorrect code** somehow

---

## Investigation Done So Far

### ✅ Checked Source Code
- Searched entire codebase for `spell_type` - **NOT FOUND**
- Checked `backend/src/services/databaseAdapter.ts` - **CLEAN**
- Checked `backend/src/services/battleCharacterLoader.ts` - **CLEAN**
- Checked `backend/src/services/spellService.ts` - **CLEAN**
- Checked all routes - **CLEAN**

### ✅ Checked Database Schema
- `spell_definitions` table has `category` column (correct)
- No `spell_type` column exists (correct)
- Migration files show correct schema (migration 037, 060)

### ✅ Checked Git History
- Latest commit: `26a087a0 Standardize mail terminology from user/player to coach`
- No recent changes to spell queries
- Massive refactoring in past (camelCase → snake_case)

### ✅ Checked Build Process
- Dockerfile looks correct (runs TypeScript build)
- `package.json` build script: `sh scripts/prebuild.sh && tsc --noEmitOnError false --skipLibCheck`
- No local `dist/` folder in repo (correct - it's gitignored)

### ❌ Attempted Fix: Redeployment
- Created empty commit to force Railway rebuild
- Pushed to main branch
- Railway redeployed
- **SAME ERROR PERSISTS** - No change whatsoever

---

## Critical Files to Check

### Backend Source Files
- `/backend/src/services/databaseAdapter.ts` (line 410-591 - `find_by_user_id` function)
- `/backend/src/services/battleCharacterLoader.ts`
- `/backend/src/services/spellService.ts`
- `/backend/src/routes/userRoutes.ts` (line 222-266 - the endpoint)

### Database Schema
- `/backend/migrations/037_create_spell_system.sql` (original schema)
- `/backend/migrations/060_fix_spell_system_schema.sql` (schema fixes)
- `/backend/migrations/065_fix_spell_schema_consistency.sql`

### Build Configuration
- `/backend/Dockerfile`
- `/backend/package.json`
- `/backend/tsconfig.json`
- `/backend/scripts/prebuild.sh`

---

## Next Steps for Investigation

### 1. Check Railway Deployment Configuration
- [ ] Verify which branch Railway is deploying from
- [ ] Check Railway environment variables
- [ ] Check Railway build logs for what's actually being compiled
- [ ] Verify Railway isn't using cached Docker layers

### 2. Search for Generated Code
- [ ] Check if there's any code generation happening during build
- [ ] Search node_modules for `spell_type` (might be in a dependency)
- [ ] Check if TypeScript is generating different output than expected

### 3. Check for Alternative Code Paths
- [ ] The error is at line 430, but source shows different code there
- [ ] This suggests the deployed code structure is completely different
- [ ] Check if there's a DIFFERENT version of databaseAdapter somewhere

### 4. Database Migration Issue
- [ ] Check if there's a migration that accidentally CREATES this query
- [ ] Check if spellService or another service dynamically generates queries

### 5. Railway-Specific Investigation
```bash
# Commands to run:
# 1. Check Railway deployment logs
railway logs --service backend

# 2. Check what commit Railway deployed
railway variables --service backend | grep COMMIT

# 3. Force clear Railway cache
railway up --service backend --detach
```

---

## Quick Reference

### Database Connection (Production)
```
DATABASE_URL=postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway
```

### Correct Database Schema
```sql
CREATE TABLE spell_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  tier TEXT NOT NULL,
  category TEXT,  ← THIS IS THE CORRECT COLUMN (not spell_type)
  ...
);
```

### Frontend Error (Consequence)
```javascript
TypeError: null is not an object (evaluating 'x.id')
  at PowersSpellsPanel (components-759055072c4c7026.js:1:923756)
```
Characters array is empty/null because backend returns 500 error.

---

## Temporary Workaround Options

### Option 1: Add spell_type Column to Database (HACK)
```sql
ALTER TABLE spell_definitions ADD COLUMN spell_type TEXT;
UPDATE spell_definitions SET spell_type = category;
```
**Pros:** Would fix production immediately
**Cons:** Doesn't solve the root cause, creates schema inconsistency

### Option 2: Find and Remove Spell Loading from Character Fetch
- Modify `databaseAdapter.find_by_user_id` to NOT load spells
- Return characters without spell data
- Load spells separately on frontend

### Option 3: Deploy from Clean State
- Create new Railway service
- Deploy from scratch
- Ensure no cached layers

---

## Important Context

### Previous Issues
- User reported "it was working the other day"
- No `.env` file in backend directory (was a red herring)
- Initial investigation wrongly assumed missing environment file

### System Information
- **Production Backend:** Railway deployment
- **Production URL:** https://api.blankwars.com
- **Frontend:** https://www.blankwars.com
- **Database:** PostgreSQL on Railway
- **Build System:** Docker (Node 20 Alpine)

---

## Questions for the User

1. **Do you have access to Railway dashboard?** Can you check:
   - Which branch is being deployed?
   - What the actual build logs show?
   - Are there any environment variables set that might affect the build?

2. **When did this break?**
   - What was the last known working deployment?
   - What commit was that?

3. **Are there any OTHER backend services running?**
   - Could there be a load balancer pointing to an old server?
   - Are there multiple Railway services?

---

## FOR THE NEXT AI: START HERE

1. **First Priority:** Determine WHERE the `spell_type` reference is coming from:
   - Check Railway deployment source (which branch/commit)
   - Search ALL node_modules for `spell_type`
   - Check if any services are code-generating this query

2. **Second Priority:** Fix line number mismatch:
   - Production error says line 430 in databaseAdapter.js
   - Source code line 430 is NOT the spell query
   - This suggests production code is STRUCTURALLY DIFFERENT from source

3. **Third Priority:** Quick fix if needed:
   - If you can't find the source, add `spell_type` column to database as temporary fix
   - Then investigate properly why deployed code doesn't match source

## Good Luck! 🍀
This is a weird one. The code that's breaking production literally doesn't exist in the codebase.
