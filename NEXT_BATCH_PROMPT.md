# Next TypeScript Error Batch - For Web Claude

## Current Status (as of 2025-11-16)

**Branch:** `main` (updated with all fixes)
**Total Errors:** 743 (down from 1,448)
**Progress:** 48.7% reduction ✅

## Already Fixed ✅
- ✅ TS2551: 387 errors (snake_case property fixes)
- ✅ TS2353: 23 errors (interface properties)
- ✅ TS2339: ~170 errors (missing interface properties)
- ✅ TS2322: ~34 errors (cherry-picked fixes)

## Error Breakdown (743 remaining)

```
334 TS2339  Property does not exist
 92 TS2322  Type assignment mismatch
 71 TS2345  Argument type mismatch
 38 TS2304  Cannot find name
 21 TS2307  Cannot find module
 18 TS2554  Expected X arguments, but got Y
 18 TS2448  Block-scoped variable used before declaration
 18 TS18004 No value exists in scope for shorthand property
[+20 more error types]
```

## Recommended Next Batch: TS2322 (Type Assignment Errors)

**Target:** 92 TS2322 errors
**Why this batch:** Continuation of previous successful fixes

### Instructions

1. **Pull latest from main:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create a new branch:**
   ```bash
   git checkout -b fix/ts2322-batch-2
   ```

3. **Get the error list:**
   ```bash
   cd frontend
   npx tsc --noEmit 2>&1 | grep "error TS2322" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/" > ts2322_errors.txt
   ```

4. **Fix systematically:**
   - Work through errors one file at a time
   - Common TS2322 patterns to fix:
     - Enum value mismatches (wrong string literal)
     - Union type handling (extract `.text` from objects)
     - Interface property type mismatches
     - Return type mismatches

5. **CRITICAL - Avoid snake_case conflicts:**
   - ⚠️ The codebase uses **snake_case** for interface properties
   - ⚠️ DO NOT convert to camelCase
   - ⚠️ Check interface definitions before changing property access
   - Example: If interface has `team_metrics`, use `obj.team_metrics`, NOT `obj.teamMetrics`

6. **Test frequently:**
   ```bash
   npx tsc --noEmit 2>&1 | grep "error TS2322" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/" | wc -l
   ```

7. **Commit pattern:**
   ```
   fix: resolve TS2322 in [filename] - [brief description]

   - Fixed [specific issue]
   - Progress: X → Y TS2322 errors
   ```

8. **When done:**
   - Push branch to origin
   - Create PR to main
   - Save chat log to `new_chat_logs/`

## Alternative Batch: TS2345 (Argument Type Mismatch)

If TS2322 becomes difficult, switch to **TS2345 (71 errors)**:
- Usually function call argument type mismatches
- Often enum values or string literal types
- Check function signatures vs what's being passed

## What NOT to do

❌ DO NOT merge other branches without checking
❌ DO NOT change snake_case to camelCase
❌ DO NOT modify interface definitions without checking all usage
❌ DO NOT work on TS2339 errors (need different approach)
❌ DO NOT force push to main

## Success Criteria

- Reduce TS2322 from 92 to <50 errors
- All changes follow snake_case convention
- No new errors introduced
- Clean commit history
- PR ready for review

---

**When finished, save your chat log to:** `new_chat_logs/cc_[date]_[time]_ts2322_batch2.md`
