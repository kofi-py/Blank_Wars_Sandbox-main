# TypeScript Error Fixing - Round 2 - STRICT NO-FALLBACK PROTOCOL

## CRITICAL FEEDBACK FROM LAST SESSION

**YOU VIOLATED THE NO FALLBACKS RULE IN YOUR PREVIOUS SESSION.**

Your commits were rejected because you added these FORBIDDEN patterns:
```typescript
// ❌ VIOLATIONS FROM YOUR LAST SESSION:
avatar: dbCharacter.avatar_emoji || '⚔️',
level: dbCharacter.level || 1,
experience: dbCharacter.experience || 0,
training: dbCharacter.training_level || 50,
training: { base: character.psych_stats?.training || 0 }
```

**These are FALLBACKS and are ABSOLUTELY FORBIDDEN.**

## Current Status
- **Current Error Count**: 213 errors (excluding archives and .next)
- **Your Assignment**: Fix ONLY the 6 TS2561 CSS property errors listed below
- **Expected Result**: Reduce errors by exactly 6 (213 → 207)

## Your Exact Assignment (DO NOT EXCEED THIS SCOPE)

Fix these 6 TS2561 errors where CSS properties are using snake_case but should use camelCase:

1. `src/components/ChatTheater3D.tsx:431` - `border_radius` → `borderRadius`
2. `src/components/ChatTheater3D.tsx:435` - `margin_bottom` → `marginBottom`
3. `src/components/PackOpening.tsx:352` - `box_shadow` → `boxShadow`
4. `src/components/PackOpening.tsx:398` - `box_shadow` → `boxShadow`
5. `src/components/PackOpening.tsx:486` - `transform_style` → `transformStyle`
6. `src/test/testAdherenceSystem.ts:67` - `debuffs_done` → Check interface - is it `buffs_done` or should interface have `debuffs_done`?

**IMPORTANT**: These are CSS/React style properties (except #6). CSS properties in React MUST use camelCase, not snake_case.

## ABSOLUTE RULES (VIOLATION = IMMEDIATE REJECTION)

### 1. NO FALLBACKS - ZERO TOLERANCE
```typescript
// ❌ FORBIDDEN PATTERNS (DO NOT USE THESE EVER):
value || 0
value || ''
value || []
value || 'default'
value || {}
value ?? 0
value ?? 'default'
Math.max(value, 0)
value ? value : 0

// ✅ ACCEPTABLE (when data truly doesn't exist initially):
const ref = useRef<Type | null>(null)  // React ref initialization
const [state, setState] = useState<Type | null>(null)  // State initialization
```

**If data is missing from database/API:**
- DO NOT add fallbacks
- REPORT the issue
- Let the error surface so it can be fixed at the source

### 2. STAY IN SCOPE
- Fix ONLY the 6 errors listed above
- DO NOT touch any other files
- DO NOT fix other error types
- DO NOT refactor unrelated code
- DO NOT add new features

### 3. FOLLOW THE PROTOCOL

For EACH of the 6 errors, execute this protocol:

#### Pattern Fix Protocol (For Each Error):

**STEP 1 - VERIFY:**
- Read the file at the line number
- Confirm the exact property name causing the error
- Determine the correct fix (check TypeScript suggestion)

**STEP 2 - FIX:**
- Change ONLY that one property name
- For CSS properties: snake_case → camelCase
- For #6 (debuffs_done): Check BattlePerformance interface first

**STEP 3 - TEST:**
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/|\.next/" | wc -l
```
Error count must decrease by 1.

**STEP 4 - COMMIT:**
```bash
git add <file>
git commit -m "fix: convert <property> to <correct_name> (1 TS2561 error)

- File: <filename>
- Line: <line_number>
- Changed: <old_name> → <new_name>
- Error count: <before> → <after> (-1)

🤖 Generated with Claude Code"
```

## Special Case: Error #6 (debuffs_done)

This is NOT a CSS property. Before fixing:

1. Read `src/test/testAdherenceSystem.ts` line 67
2. Find the BattlePerformance interface definition
3. Check what properties BattlePerformance actually has
4. Determine if:
   - A) `debuffs_done` is a typo for `buffs_done` → fix the property name
   - B) BattlePerformance is missing `debuffs_done` → add it to the interface
   - C) Both `buffs_done` AND `debuffs_done` should exist → check which is missing

**DO NOT GUESS. READ THE INTERFACE FIRST.**

## Testing Protocol

After ALL 6 fixes, run final verification:

```bash
# Must show EXACTLY 207 errors (down from 213)
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/|\.next/" | wc -l
```

**If count is NOT 207:**
- You broke something
- Revert your changes
- Identify what went wrong
- Fix correctly

## Final Checklist (Complete Before Reporting Done)

- [ ] Fixed exactly 6 errors (no more, no less)
- [ ] Error count reduced from 213 to 207 (-6)
- [ ] NO `||` or `??` operators added anywhere
- [ ] NO hardcoded default values
- [ ] NO files modified outside the assignment scope
- [ ] All 6 commits follow the commit message format
- [ ] CSS properties use camelCase (borderRadius, NOT border_radius)
- [ ] Checked BattlePerformance interface before fixing debuffs_done

## What Success Looks Like

```
✅ 6 files modified
✅ 6 commits created
✅ Error count: 213 → 207 (-6)
✅ No fallbacks added
✅ No scope creep
✅ CSS properties in camelCase
✅ debuffs_done fixed based on interface definition
```

## What Failure Looks Like (DO NOT DO THIS)

```
❌ Added || 0 or ?? 'default' anywhere
❌ Modified files not in the assignment
❌ Fixed other error types
❌ Error count didn't decrease by exactly 6
❌ Guessed at debuffs_done fix without reading interface
❌ Used snake_case for CSS properties
```

---

**FINAL WARNING**: If you add ANY fallbacks (`||`, `??`, hardcoded defaults), your entire branch will be rejected and we'll have to cherry-pick individual commits again. Follow the rules precisely.

Good luck. Fix exactly 6 errors. No fallbacks. Stay in scope.
