# TypeScript Error Fixing Session - Round 6
## Current Status: 149 errors remaining (down from 175)

**Great work on Round 5!** You fixed all 18 assigned errors. Here's your next batch.

## CRITICAL: Case Convention Rules (NON-NEGOTIABLE)

**Same rules as before** - Review Round 5 prompt for full details. Quick reminder:
- Variables/Parameters: `snake_case`
- Functions: `camelCase`
- Custom Component Props: `snake_case`
- Standard React/HTML Props: `camelCase`
- External/Library APIs: `camelCase`
- **NO FALLBACKS** (no `||`, `??`, `?.`, `if` checks on required props)

## Your Specific Assignment (Web Claude - Round 6)

**IMPORTANT: Desktop Claude is working on OTHER errors. You work on THESE ONLY.**

### Assigned Errors to Fix (in order):

#### Group 1: Lobby.tsx Lucide icon 'title' prop issues (3 errors)
```
Line 169 (2 occurrences): Lucide icons with 'title' prop not supported
Line 203: Same issue
```

**Analysis:**
Lucide icons don't accept a `title` prop. The `title` prop is being passed for accessibility tooltips.

**Action Steps:**
1. Check lines 169 and 203 - what Lucide icon components are being rendered?
2. Remove the `title` prop from the Lucide icons
3. If tooltips are needed, wrap the icon in a div/span with `title` attribute instead

**Example Fix:**
```typescript
// BEFORE (invalid)
<SomeIcon className="w-5 h-5" title="Some tooltip" />

// AFTER (valid)
<span title="Some tooltip">
  <SomeIcon className="w-5 h-5" />
</span>
```

**STOP and ask permission if:**
- The title is important for accessibility and needs a different solution
- You're unsure which wrapper element to use

---

#### Group 2: FinancialAdvisorChat.tsx errors (3 errors)
```
Line 1113: Type 'string' not assignable to category type
Line 1474: Expression is not callable
Line 1697: Expression is not callable
```

**Action Steps:**
1. Line 1113: Check what string value is being assigned - does it match the allowed category types?
2. Lines 1474, 1697: Check what's being called - is it a variable that should be a function?

**STOP and ask permission if:**
- The string value at line 1113 is a valid category that should be added to the type
- The "not callable" errors are functions that appear correct

---

#### Group 3: TeamBuilder.tsx remaining errors (3 errors)
```
Line 167: isLeader → is_leader (array assignment)
Line 504: isLeader → is_leader (array assignment)
Line 586: Property 'id' does not exist on type 'OwnedCharacter'
```

**Note:** You already fixed some isLeader issues, but these are in different locations.

**Action Steps:**
1. Lines 167, 504: Find the array assignments with `isLeader` and change to `is_leader`
2. Line 586: Check OwnedCharacter interface - does it have `character_id` instead of `id`?

**STOP and ask permission if:**
- OwnedCharacter interface is missing both `id` and `character_id`

---

#### Group 4: MainTabSystem.tsx remaining errors (2 errors)
```
Line 1674: Property 'category' does not exist (should be 'categories')
Line 2823: Type 'void' not assignable to ReactNode
```

**Note:** You already fixed event_types at line 1674, but there's still a `category` property.

**Action Steps:**
1. Line 1674: Change `category: 'financial'` to `categories: ['financial']`
2. Line 2823: Check if there's a `console.log()` in JSX - remove it

**STOP and ask permission if:**
- Line 2823 has something other than console.log causing void return

---

#### Group 5: TeamManagementCoaching.tsx CoachingChoice errors (2 errors)
```
Line 366: Property 'action' does not exist on type 'CoachingChoice'
Line 368: Property 'action' does not exist on type 'CoachingChoice'
```

**Action Steps:**
1. Find the CoachingChoice interface definition
2. Check what properties it actually has - maybe it's `choice_action` or `coaching_action`?
3. Update lines 366 and 368 to use the correct property name

**STOP and ask permission if:**
- CoachingChoice interface is missing the action/coaching action property entirely
- You need to add a new property to the interface

---

#### Group 6: Simple property name fixes (4 errors)
```
SpellLoadout.tsx line 134: Property 'gameplan_adherence' missing
TeamBuildingActivities.tsx line 263: Type 'string' to type 'never'
TeamBuildingActivities.tsx line 379: Type 'string' to type 'never'
ChatWithTickets.tsx line 110: No overload matches this call
```

**Action Steps:**
1. SpellLoadout line 134: Check if character object has `gameplan_adherence_level` instead
2. TeamBuildingActivities lines 263, 379: Check what array/object expects 'never' - likely needs proper type
3. ChatWithTickets line 110: Check what function is being called and what arguments it expects

**STOP and ask permission if:**
- The 'never' type suggests the array shouldn't accept any values
- ChatWithTickets is calling a function that doesn't exist

---

#### Group 7: CardPackOpening.tsx & TeamHeadquarters.tsx (2 errors)
```
CardPackOpening.tsx line 126: Missing properties on TeamCharacter type
TeamHeadquarters.tsx line 1982: Expected 1 argument, but got 4
```

**Action Steps:**
1. CardPackOpening line 126: Add the missing TeamCharacter properties from the error message
2. TeamHeadquarters line 1982: Check function signature - which arguments should be removed?

**STOP and ask permission if:**
- You need to know what real data to use for missing properties
- Unclear which of the 4 arguments is the correct one

---

## Work Protocol (MANDATORY)

**BEFORE EACH FIX:**
1. Explain what you're going to change
2. Show the exact before/after code
3. **Wait for user to say "ok" or "yes"**
4. Execute the change
5. Verify error count decreased
6. Commit with clear message

**NEVER:**
- Fix errors not in your assigned list
- Make assumptions about data structures
- Add fallbacks (`||`, `??`, `?.`, if checks on required props)
- Delete code without permission
- Batch multiple unrelated fixes

**Current Error Count: 149**
**Your Target: Fix ~19 errors from your assigned groups**

Start with Group 1 (Lobby.tsx). Fix one error at a time, get approval, then move to next.
