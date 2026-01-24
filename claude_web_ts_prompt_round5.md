# TypeScript Error Fixing Session - Round 5
## Current Status: 155 errors remaining (down from 175)

## CRITICAL: Case Convention Rules (NON-NEGOTIABLE)

### The Golden Rule
| Element Type | Convention | Examples | Exclusions |
|--------------|-----------|----------|------------|
| **Variables/Parameters** | `snake_case` | `current_round`, `user_id`, `challenge_id` | ALL variables including state vars, local vars, custom data props |
| **Functions (All Types)** | `camelCase` | `setCurrentRound`, `calculateDamage`, `handleClick` | ALL functions including React useState setters, custom callbacks |
| **Custom Component Props** | `snake_case` | `on_click`, `class_name`, `while_hover`, `is_open` | Props passed to OUR custom components |
| **Standard React/HTML Props** | `camelCase` | `className`, `onClick`, `htmlFor` | Props on native HTML elements (`<div>`, `<span>`) |
| **External/Library APIs** | `camelCase` | `toLowerCase`, `toISOString`, `timeStyle` | Built-in JS methods, Node.js methods, external library APIs (Framer Motion, Lucide icons, etc.) |

### Examples of Correct Usage
```typescript
// CORRECT: Custom component with snake_case props
<SafeMotion
  class_name="container"
  while_hover={{ scale: 1.05 }}
  on_click={handleClick}
>
  {/* CORRECT: Native HTML with camelCase props */}
  <div className="content" onClick={handleClick}>
    {/* CORRECT: External library with camelCase props */}
    <LucideIcon className="icon" />
  </div>
</SafeMotion>

// CORRECT: Variables are snake_case
const user_id = "123";
const current_round = 5;

// CORRECT: Functions are camelCase
function calculateTotalDamage(base_damage: number) {
  return base_damage * 2;
}

// CORRECT: Built-in APIs remain camelCase
const formatted = date.toLocaleTimeString([], { timeStyle: 'short' });
```

## CRITICAL: NO FALLBACKS RULE

### What are Fallbacks? (ALL PROHIBITED)
```typescript
// ❌ WRONG: Optional chaining
const value = obj?.property;
callback?.();

// ❌ WRONG: Nullish coalescing
const value = data ?? defaultValue;

// ❌ WRONG: Logical OR fallback
const value = data || defaultValue;

// ❌ WRONG: Ternary fallback
const value = data ? data : defaultValue;

// ❌ WRONG: Optional interface properties with if checks
interface Props {
  callback?: () => void;  // ❌ Optional
}
if (callback) {  // ❌ Fallback check
  callback();
}

// ✅ CORRECT: Required properties, no fallbacks
interface Props {
  callback: () => void;  // ✅ Required
}
callback();  // ✅ Direct call, no check
```

### Exception: Legitimate Conditionals
```typescript
// ✅ CORRECT: Choosing between two real values
const position = world_position ? world_position[1] : position[1];
// This is only OK if BOTH are real data sources

// ✅ CORRECT: Optional props that are truly optional (display features)
interface Props {
  tooltip_text?: string;  // OK - tooltip is optional feature
}
```

### Why No Fallbacks?
1. Fallbacks hide missing data problems
2. Real data should come from the database
3. If data doesn't exist, throw an error immediately
4. Never use hardcoded default values (0, '', [], null, undefined)

## Current Error Breakdown (155 total)

### Error Categories (from most to least frequent)
1. **TS2322** (52 errors) - Type assignment mismatches (often prop name issues)
2. **TS2345** (24 errors) - Argument type mismatches
3. **TS2739** (14 errors) - Missing properties in types
4. **TS2741** (9 errors) - Missing required properties
5. **TS2740** (9 errors) - Missing properties in objects
6. **TS2367** (9 errors) - Type comparisons with no overlap
7. **TS2352** (7 errors) - Invalid type conversions
8. Others - Various type errors

### Quick Win Patterns (Fix These First)

#### 1. Prop Name Mismatches
```bash
# Find these errors:
npx tsc --noEmit 2>&1 | grep "Did you mean"
```

Common patterns to fix:
- `onEquip` → `on_equip`
- `onUnequip` → `on_unequip`
- `onClose` → `on_close`
- `onConfirm` → `on_confirm`
- `whileHover` → `while_hover`
- `whileTap` → `while_tap`

#### 2. Interface Property Names
Look for interfaces with camelCase callbacks that should be snake_case:
```typescript
// ❌ WRONG
interface CustomComponentProps {
  onClose?: () => void;
  onConfirm?: () => void;
}

// ✅ CORRECT
interface CustomComponentProps {
  on_close: () => void;  // Required, not optional
  on_confirm: () => void;  // Required, not optional
}
```

#### 3. Object Property Shorthand
```typescript
// ❌ WRONG: Property name doesn't match variable
return {
  summary,
  fullStats  // ❌ Should be full_stats
};

// ✅ CORRECT
return {
  summary,
  full_stats: fullStats  // ✅ Explicit key name
};
```

## Workflow Protocol (MANDATORY)

### Before ANY Change:
1. **Explain** what you're going to change
2. **Provide Context** - why this change is needed
3. **Assess Risk** - what could go wrong
4. **Wait for Approval** - DO NOT proceed without explicit "yes" or "ok"

### When Fixing Errors:
1. **One Pattern at a Time** - Don't batch multiple unrelated fixes
2. **Search First** - Use grep to find ALL instances of the pattern
3. **Fix All Instances** - Don't leave partial conversions
4. **Verify** - Check error count before and after
5. **Commit** - Commit each logical change separately

### Making Callbacks Required:
When you see optional callbacks with fallback checks:
```typescript
// ❌ WRONG: Optional with fallback
interface Props {
  on_click?: () => void;
}
if (on_click) {  // Fallback check
  on_click();
}

// ✅ CORRECT: Required, no fallback
interface Props {
  on_click: () => void;
}
on_click();  // Direct call
```

Steps:
1. Remove `?` from interface property
2. Remove `if` check around callback
3. Remove `?.` optional chaining if present
4. Update all calling components to provide the callback

## Known Fixed Areas (Don't Touch)
- `useBattleState` - coach_skills system complete
- `BattleAnimationDisplay` - callbacks are `on_animation_complete`, `on_round_complete` (required)
- `TicketConfirmationModal` - callbacks are `on_close`, `on_confirm` (required)
- `Character3DModel` - props are `model_path`, `world_position` (required), `is_speaking`, `on_head_position_calculated` (required)
- `EquipmentManager` - callbacks are `on_equip`, `on_unequip` (required)
- `PowersSpellsPanel` - props are `current_ap`, `max_ap` (snake_case)

## Priority Error List (Fix in Order)

### High Priority (Quick Wins)
1. **Prop name mismatches** - Components passing camelCase to snake_case interfaces
   - Search: `npx tsc --noEmit 2>&1 | grep "Did you mean"`
   - Files likely affected: MainTabSystem, FacilitiesManager, EquipmentDetailsModal

2. **Object property shorthand mismatches**
   - Pattern: `{ propertyName }` where interface expects `property_name`
   - Fix: `{ property_name: propertyName }`

3. **Optional callbacks that should be required**
   - Search interfaces for `callback?: () => void`
   - Make required, remove fallback checks

### Medium Priority
4. **Import/Export naming** - Functions exported with wrong case
   - Search: `grep "error TS2724" in tsc output`
   - Pattern: `getTrainingMultipliers` → `get_training_multipliers`

5. **Type mismatches** - Wrong literal types
   - Example: `"personal_problems_session"` not in `EventType`
   - Check the actual type definition and use correct value

### Lower Priority
6. **Missing properties** - Objects missing required fields
7. **Type conversions** - Invalid `as` type assertions
8. **Module resolution** - Missing imports

## Commands Reference

```bash
# Count errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# Find prop name suggestions
npx tsc --noEmit 2>&1 | grep "Did you mean" | head -20

# Find errors by type
npx tsc --noEmit 2>&1 | grep "error TS2322" | head -20

# Find errors in specific file
npx tsc --noEmit 2>&1 | grep "ComponentName.tsx"

# Find all instances of a pattern
grep -rn "patternName" src --include="*.tsx" --include="*.ts"

# Commit changes
git add -A && git commit -m "Description of fix"
```

## Example Fix Session

```typescript
// 1. FIND THE ERROR
// npx tsc --noEmit shows:
// Property 'onPurchase' does not exist. Did you mean 'on_purchase'?

// 2. LOCATE THE INTERFACE
interface FacilityCardProps {
  onPurchase?: (id: string) => void;  // ❌ Wrong: camelCase and optional
}

// 3. FIX THE INTERFACE
interface FacilityCardProps {
  on_purchase: (id: string) => void;  // ✅ Correct: snake_case and required
}

// 4. UPDATE COMPONENT DESTRUCTURING
function FacilityCard({ on_purchase }: FacilityCardProps) {
  // 5. REMOVE FALLBACK CHECK
  // Before: if (on_purchase) { on_purchase(id); }
  // After:
  on_purchase(id);  // ✅ Direct call, no check
}

// 6. UPDATE ALL CALLERS
<FacilityCard
  on_purchase={handlePurchase}  // ✅ snake_case prop name
/>

// 7. VERIFY AND COMMIT
// Check error count decreased
// git commit with clear message
```

## What NOT to Do

❌ **Don't use React.FC** - It causes type issues, use regular function components
❌ **Don't use `as any`** - Fix the actual type issue
❌ **Don't batch unrelated fixes** - One pattern per commit
❌ **Don't skip verification** - Always check error count before/after
❌ **Don't make assumptions** - Search the codebase to verify patterns
❌ **Don't add optional properties** - Make them required unless truly optional
❌ **Don't add fallbacks** - Throw errors instead
❌ **Don't use Partial<Props>** unless absolutely necessary - Be explicit

## Your Specific Assignment (Web Claude)

**IMPORTANT: Desktop Claude is working on OTHER errors. You work on THESE ONLY.**

### Assigned Errors to Fix (in order):

#### Group 1: MainTabSystem.tsx prop naming (3 errors)
```
Line 1055: onEquip → on_equip, onUnequip → on_unequip
Line 1674: Fix 'category' property in EventFilter
Line 2823: Fix ReactNode type issue
```

**Action Steps:**
1. Line 1055: Change `onEquip={...}` to `on_equip={...}` and `onUnequip={...}` to `on_unequip={...}`
2. Line 1674: Check EventFilter interface - what properties does it accept? Fix 'category'
3. Line 2823: Identify what's returning void that should return ReactNode

**STOP and ask permission if:**
- EventFilter interface is unclear about what properties to use
- The ReactNode fix requires deleting code
- You're unsure about any change

#### Group 2: Import/Export naming mismatches (4 errors)
```
TrainingGrounds_v_?.tsx:26 - getTrainingMultipliers → get_training_multipliers
TrainingGrounds_v_?.tsx:26 - getDailyLimits → get_daily_limits
TrainingGrounds_v_?.tsx:27 - getLevelData → get_level_data
TrainingGrounds_v_?.tsx:29 - trainingChatService → TrainingChatService
```

**Action Steps:**
1. Check actual exports from `@/data/memberships` - are they snake_case?
2. Update imports to match actual export names
3. Check `@/services/trainingChatService` - is it exporting a class or instance?

**STOP and ask permission if:**
- The actual export names don't match what error suggests
- Multiple conflicting export names exist

#### Group 3: Simple property name fixes (5 errors)
```
TrainingInterface.tsx:135 - 'improvement' → 'improvements'
PersonalProblemsChat.tsx:506 - '"personal_problems_session"' → '"personal_problem_shared"'
chatAnalyticsService.ts (already fixed by Desktop Claude - skip)
TeamBuilder.tsx:504 - isLeader → is_leader
useBattleSimulation.ts:315 - player_rewards property missing
```

**Action Steps:**
1. TrainingInterface line 135: Change `improvement:` to `improvements:`
2. PersonalProblemsChat line 506: Change event type string
3. TeamBuilder line 504: Change `isLeader:` to `is_leader:`
4. useBattleSimulation line 315: Check return type - does it include player_rewards?

**STOP and ask permission if:**
- The interface doesn't accept 'improvements'
- Changing event type string might break event system
- player_rewards requires adding new data

#### Group 4: Lobby.tsx Lucide icon props (3 errors)
```
Lines 169 (2 errors), 203 - Lucide icons with 'title' prop
```

**Action Steps:**
1. Find the Lucide icon components at these lines
2. Check if 'title' prop is valid for Lucide - might need to be removed or changed
3. External library props must remain camelCase

**STOP and ask permission if:**
- Unclear whether to remove 'title' or rename it
- This affects accessibility

#### Group 5: MerchStore & PackOpening issues (3 errors)
```
MerchStore.tsx:267 - CartItem missing 'added_at' property
PackOpening.tsx:446 - Type '"h2"' not in SafeMotion 'as' prop
PackOpening.tsx:556 - Block-scoped variable 'character' used before declaration
```

**Action Steps:**
1. MerchStore line 267: Add `added_at: new Date()` to CartItem object
2. PackOpening line 446: Change `as="h2"` to valid type (probably `as="div"`)
3. PackOpening line 556: Move variable declaration above usage

**STOP and ask permission if:**
- added_at should be a different value than new Date()
- h2 is needed for semantic HTML
- Moving variable declaration breaks logic

### Work Protocol

**MANDATORY BEFORE EACH FIX:**
1. Explain what you're going to change
2. Show the exact before/after code
3. Wait for user to say "ok" or "yes"
4. Execute the change
5. Verify error count decreased
6. Commit with clear message

**NEVER:**
- Fix errors not in your assigned list
- Make assumptions about data structures
- Add fallbacks (||, ??, ?., if checks on required props)
- Delete code without permission
- Batch multiple unrelated fixes

**Current Error Count: 155**
**Your Target: Fix 18 errors from your assigned groups**

Start with Group 1 (MainTabSystem). Fix one error at a time, get approval, then move to next.
