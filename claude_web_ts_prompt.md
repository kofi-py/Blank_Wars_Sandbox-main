# TypeScript Error Fixing - Strict Protocol for Claude Web App

## Current Status
- **Current Error Count**: 222 errors (excluding archived_components|_BACKUP|_ORIGINAL|test-3d|/archive/)
- **Goal**: Reduce errors systematically using the 6-Step Protocol below
- **Previous Session Note**: Your last session required cherry-picking because some commits added fallbacks which are STRICTLY FORBIDDEN

## Critical Rules (ABSOLUTE - NO EXCEPTIONS)

### 1. NO FALLBACKS - EVER
**NEVER** use any of these patterns:
- `|| 0`
- `|| []`
- `|| ''`
- `|| 'default'`
- `|| null`
- `|| undefined`
- `?? 0`
- `?? []`
- Any hardcoded default values when data is missing

**Example of FORBIDDEN code:**
```typescript
// ❌ WRONG - DO NOT DO THIS
const level = character.level || 1;
const avatar = dbCharacter.avatar_emoji || '⚔️';
const stats = character.psych_stats?.training || 0;
```

**Correct approach:**
- If data is missing, throw an error
- Fix the source (database/API) to provide the real data
- Never mask missing data with fallbacks

### 2. Case Convention Rules
- **Variables/Parameters/Custom Props**: `snake_case` (e.g., `user_id`, `current_round`, `stat_bonus`)
- **Functions**: `camelCase` (e.g., `setCurrentRound`, `calculateDamage`)
- **Standard React/HTML Props**: `camelCase` (e.g., `className`, `onClick`)
- **External/Library APIs**: Keep original casing (e.g., `toLowerCase`, `toISOString`)

### 3. The 6-Step Conversion Protocol

For EVERY pattern you fix, follow these steps:

#### Step 1: Find
```bash
grep -rn "oldPropertyName" src/ --include="*.tsx" --include="*.ts" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/" | wc -l
```
**Report**: Pattern name, Total instances found, Files affected

#### Step 2: Convert
Use editing tools to convert ALL instances of the pattern to snake_case.
**Detail**: List specific files modified and instances converted

#### Step 3: Verify
```bash
grep -rn "oldPropertyName" src/ --include="*.tsx" --include="*.ts" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/" | wc -l
```
**Report**: Old pattern count (must be 0), New pattern count (must match conversions)

#### Step 4: Test
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/" | wc -l
```
**Report**: Error count BEFORE vs AFTER (must decrease or stay same)

#### Step 5: Commit
```bash
git add -A
git commit -m "fix: convert <pattern> from camelCase to snake_case (<N> instances)"
```
**Report**: Commit hash

#### Step 6: Report
**Summary**: Pattern converted, Instances changed, Error reduction, Status (✅ Committed)

## What to Fix (Priority Order)

### Priority 1: snake_case Property Naming Errors (~30 instances)
These are TS2561 errors where camelCase properties need to be converted to snake_case.

**Common patterns to search for and fix:**
- `sequenceNumber` → `sequence_number`
- `borderRadius` → `border_radius`
- `backgroundColor` → `background_color`
- Any camelCase custom property names in component props

### Priority 2: Function Argument Errors (~25 instances)
TS2554, TS2345 - Wrong number/type of arguments

**How to fix:**
1. Read the function signature
2. Check the database schema for correct parameter types
3. Pass the correct arguments - NO defaults, NO fallbacks
4. If data is missing, fix the caller to provide it

### Priority 3: Import/Module Errors (~15 instances)
TS2307, TS2613 - Missing modules or wrong import syntax

**How to fix:**
1. For missing dependencies: Check if package needs to be installed
2. For wrong imports: Check if it should be default vs named export
3. DO NOT comment out broken imports - fix them properly

## Testing Protocol

After EVERY batch of changes:

1. **Run TypeScript check** with correct filter:
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/" | wc -l
```

2. **Verify error reduction**: The count MUST go down or stay the same. If it goes up, you broke something - revert immediately.

3. **Check for fallbacks**: Search your changes for any `||` or `??` operators:
```bash
git diff HEAD~1 | grep -E '\|\||??'
```
If you find any, you violated the rules - revert immediately.

## Example of a GOOD Fix Session

```
=== Fixing sequenceNumber → sequence_number ===

Step 1 - Find:
Pattern: sequenceNumber
Found: 8 instances across 3 files
Files: BattleLog.tsx, CombatHistory.tsx, TurnTracker.tsx

Step 2 - Convert:
- BattleLog.tsx: Changed 3 instances
- CombatHistory.tsx: Changed 4 instances
- TurnTracker.tsx: Changed 1 instance

Step 3 - Verify:
Old pattern (sequenceNumber): 0 instances ✅
New pattern (sequence_number): 8 instances ✅

Step 4 - Test:
Before: 222 errors
After: 217 errors (-5) ✅

Step 5 - Commit:
Commit: a1b2c3d4 "fix: convert sequenceNumber to snake_case (8 instances)"

Step 6 - Report:
✅ Pattern: sequenceNumber → sequence_number
✅ Instances: 8
✅ Error reduction: -5
✅ Status: Committed
```

## Mistakes from Last Session to AVOID

1. ❌ **Added fallbacks in CardPackOpening**: Used `|| 1`, `|| '⚔️'`, hardcoded `experience_to_next: 100`
   - ✅ **Do instead**: Fetch real data from database, throw errors if missing

2. ❌ **Inconsistent filtering**: Didn't use the correct archive exclusion pattern
   - ✅ **Do instead**: Always use `grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/"`

3. ❌ **Batch commits without testing**: Made multiple changes before checking error count
   - ✅ **Do instead**: Follow the 6-Step Protocol for EACH pattern, one at a time

## Final Checklist Before Each Commit

- [ ] No `||` or `??` fallback operators added
- [ ] No hardcoded default values
- [ ] All property names follow snake_case convention
- [ ] TypeScript error count decreased or stayed same
- [ ] Tested with correct filter excluding archives
- [ ] Commit message describes the specific pattern fixed

## Starting Point

Current error count: 222
Target for this session: Get below 200 errors
Focus on: snake_case property naming errors (TS2561) - highest frequency, cleanest wins

Good luck! Remember: NO FALLBACKS, follow the protocol, and test after every change.
