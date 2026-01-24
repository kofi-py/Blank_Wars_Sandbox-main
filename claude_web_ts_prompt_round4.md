# TypeScript Error Fixing - Round 4 - Import/Export Errors
## EXCELLENT WORK ON ROUNDS 2 & 3!
Your recent commits have been clean and followed protocol perfectly. You fixed 11 errors total with NO fallbacks. Outstanding work!

## Current Status
- **Current Error Count**: 199 errors (excluding archives and .next)
- **Goal**: Reduce to 196 errors by fixing 3 specific import/export mismatches
- **Your Assignment**: Fix ONLY the 3 TS2305 errors listed below

## YOUR ASSIGNMENT - DO NOT EXCEED THIS SCOPE
You are assigned to fix **EXACTLY 3 errors** - no more, no less:

### Error 1: generateRoomImage not exported
**File**: `src/components/TeamHeadquarters.tsx:52`
**Error**: Module '"../services/roomService"' has no exported member 'generateRoomImage'
**Current Import**: `import { generateRoomImage } from '../services/roomService'`

### Error 2: Personality not exported
**File**: `src/services/ConflictDatabaseService.ts:5`
**Error**: Module '"../data/characters"' has no exported member 'Personality'
**Current Import**: `import { Personality } from '../data/characters'`

### Error 3: Equipment not exported
**File**: `src/services/optimizedDataService.ts:9`
**Error**: Module '"@/data/items"' has no exported member 'Equipment'
**Current Import**: `import { Equipment } from '@/data/items'`

---

## CRITICAL RULES - ABSOLUTE ZERO TOLERANCE

### Rule 1: NO FALLBACKS - EVER
**FORBIDDEN PATTERNS** (will result in immediate rejection):
```typescript
// ❌ NEVER DO THIS:
const value = data.field || 0
const name = character.name || 'Unknown'
const items = inventory?.items || []
const stats = char.stats ?? defaultStats
```

**Why this is forbidden**: Missing data must be fixed at the source (database/API), not hidden with fallbacks.

### Rule 2: STAY WITHIN YOUR ASSIGNMENT SCOPE
**YOU ARE ASSIGNED 3 SPECIFIC ERRORS - FIX ONLY THOSE 3**

Do NOT:
- Fix other errors you notice
- Refactor code beyond the specific fix
- Add new features or improvements
- Touch files not mentioned in your assignment
- Make "while I'm here" changes

**Why this is critical**: Breaking out of scope causes conflicts with other agents and makes changes impossible to review.

### Rule 3: NO BATCHING
Execute ONE fix at a time following the 6-Step Protocol (see below). Each fix should be:
1. Researched individually
2. Fixed individually
3. Tested individually
4. Committed individually

### Rule 4: NO CHAINING
Do NOT chain commands with `&&`:
```bash
# ❌ WRONG:
git add file.ts && git commit -m "fix" && npm run build

# ✅ CORRECT:
git add file.ts
git commit -m "fix"
npm run build
```

**Why**: Chaining obscures which step failed and makes debugging impossible.

---

## THE 6-STEP PROTOCOL - MANDATORY FOR EACH FIX

### Step 1: FIND & RESEARCH
**For import/export errors specifically:**

1. Identify what's being imported and where from
2. Check what IS actually exported from that module:
   ```bash
   grep -n "^export" path/to/module.ts
   ```
3. Search for where the type/function is actually defined:
   ```bash
   grep -rn "interface Personality\|type Personality\|export.*Personality" src/
   ```
4. Determine the correct fix:
   - Is it in a different module? → Change import path
   - Is it not exported? → Add export statement
   - Does it not exist? → Check if it's dead code or needs to be created

**Report Format:**
```
STEP 1: FIND - [Error Name]
- Pattern: [What's wrong]
- Current import: [Show the import line]
- Module checked: [What you searched]
- Finding: [What you discovered]
- Correct location: [Where it actually is, or "does not exist"]
- Fix approach: [What you'll do]
```

### Step 2: CONVERT
Make the necessary change:
- If changing import path: Update only the import statement
- If adding export: Add export keyword to the source
- If removing dead import: Remove the import and check for usage

**Report Format:**
```
STEP 2: CONVERT
- File modified: [file path]
- Change: [describe what you changed]
- Before: [show old code]
- After: [show new code]
```

### Step 3: VERIFY
Confirm the fix:
```bash
# Check the import is correct
grep -n "import.*[TypeName]" path/to/file.ts

# Check it's exported from source
grep -n "export.*[TypeName]" path/to/source.ts
```

**Report Format:**
```
STEP 3: VERIFY
- Import check: [result]
- Export check: [result]
- Status: ✅ Verified
```

### Step 4: TEST
Run TypeScript compiler and count errors:
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/|\.next/" | wc -l
```

**Report Format:**
```
STEP 4: TEST
- Before: [previous error count]
- After: [new error count]
- Reduction: [difference]
- Status: ✅ Passed / ❌ Failed
```

**CRITICAL**: If error count goes UP or doesn't decrease by 1, you made a mistake. Investigate and fix before proceeding.

### Step 5: COMMIT
Only commit if the test passed:
```bash
git add [file]
git commit -m "fix: [clear description of what was fixed] (1 TS2305 error)"
```

**Report Format:**
```
STEP 5: COMMIT
- Files committed: [list]
- Commit message: [the message you used]
- Commit hash: [the hash returned]
```

### Step 6: REPORT
Summarize the completed fix:

**Report Format:**
```
✅ Fix Complete: [Error Name]
- Pattern: [What was fixed]
- Files modified: [list]
- Error reduction: -1 ([before] → [after])
- Commit: [hash]
- Status: ✅ Committed
```

---

## COMMON IMPORT/EXPORT FIXES - EXAMPLES

### Example 1: Type is in a different module
```typescript
// ❌ BEFORE (wrong module):
import { Character } from '@/data/items'  // Character is not in items

// ✅ AFTER (correct module):
import { Character } from '@/data/characters'
```

### Example 2: Type exists but isn't exported
```typescript
// ❌ BEFORE (not exported):
interface UserProfile {
  name: string;
}

// ✅ AFTER (exported):
export interface UserProfile {
  name: string;
}
```

### Example 3: Import is dead code (nothing uses it)
```typescript
// ❌ BEFORE:
import { UnusedType } from '@/data/old'  // Error: doesn't exist
const data = fetchData();  // UnusedType never used

// ✅ AFTER (removed dead import):
const data = fetchData();
```

---

## YOUR EXECUTION PLAN

1. **Fix Error 1** (generateRoomImage)
   - Research where generateRoomImage is defined
   - Follow 6-Step Protocol
   - Commit with message: "fix: correct generateRoomImage import path (1 TS2305 error)"

2. **Fix Error 2** (Personality)
   - Research where Personality type is defined
   - Follow 6-Step Protocol
   - Commit with message: "fix: correct Personality import path (1 TS2305 error)"

3. **Fix Error 3** (Equipment)
   - Research where Equipment type is defined
   - Follow 6-Step Protocol
   - Commit with message: "fix: correct Equipment import path (1 TS2305 error)"

---

## SUCCESS CRITERIA

### You are DONE when:
✅ All 3 TS2305 errors are fixed
✅ Error count reduced from 199 to 196
✅ 3 commits created (one per fix)
✅ NO fallbacks added (|| operators, ?? operators, || '', || 0, etc.)
✅ NO files modified outside your assignment
✅ All commits follow the 6-Step Protocol

### How to verify you're done:
```bash
# Final error count should be 196
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/|\.next/" | wc -l

# Should show 196

# Check for NO fallbacks in your changes
git diff origin/main | grep -E "^\+.*\|\|.*[0-9]|^\+.*\?\?.*[0-9]|^\+.*\|\| '|^\+.*\?\? '"

# Should return nothing (empty)
```

---

## FINAL CHECKLIST - COMPLETE BEFORE REPORTING

Before you say "I'm done", verify:

- [ ] Fixed exactly 3 errors (no more, no less)
- [ ] Error count is 196 (reduced by 3 from 199)
- [ ] Created exactly 3 commits
- [ ] Each commit follows naming convention: "fix: [description] (1 TS2305 error)"
- [ ] NO fallbacks added (checked with grep command above)
- [ ] NO files modified outside the 3 assigned files
- [ ] Each fix followed the complete 6-Step Protocol
- [ ] All commits are on the current branch and ready to push

---

## WHAT TO DO IF YOU GET STUCK

### If you can't find where a type is defined:
1. Search the entire src directory:
   ```bash
   grep -rn "interface TypeName\|type TypeName\|export.*TypeName" src/ --include="*.ts" --include="*.tsx"
   ```
2. If it doesn't exist anywhere, it might be dead code - report your findings

### If fixing one error creates new errors:
1. You likely changed the wrong thing
2. Revert your change: `git checkout -- [file]`
3. Re-research the problem more carefully
4. Ask for guidance if truly stuck

### If you're unsure about the correct fix:
**STOP and document your uncertainty:**
- What you found in your research
- What the options are
- Why you're unsure
- Ask for guidance instead of guessing

---

## VIOLATION CONSEQUENCES

**Your previous work was rejected because:**
- Earlier commits added fallbacks (spendingStyle || 'moderate', wallet_cents || 0)
- These violations caused 200+ extra errors
- Only your later clean commits were accepted

**For this round:**
- Any fallback will result in immediate rejection of ALL commits
- Breaking scope will result in immediate rejection of ALL commits
- Skipping protocol steps will result in immediate rejection of ALL commits

**We will cherry-pick only clean commits.** Make them all clean.

---

## ENCOURAGEMENT

You've proven you can do excellent work when you follow the protocol. Your last 11 commits were perfect. This assignment is straightforward - just 3 import path corrections. Follow the 6-Step Protocol for each one, stay within scope, and you'll succeed.

Good luck! 🚀
