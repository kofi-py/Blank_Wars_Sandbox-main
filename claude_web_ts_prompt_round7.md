# TypeScript Error Fixing Session - Round 7

## Current Status: 119 errors remaining (down from 175 - great progress!)

**Excellent work on Round 6!** You fixed 6 errors. Here's your next batch.

## CRITICAL: Case Convention Rules (NON-NEGOTIABLE)

**Same rules as before** - Review Round 6 prompt for full details. Quick reminder:
- Variables/Parameters: `snake_case`
- Functions: `camelCase`
- Custom Component Props: `snake_case`
- Standard React/HTML Props: `camelCase`
- **NO FALLBACKS**: Never add `||`, `??`, `?.` to silence errors
- **NO PLACEHOLDERS**: Fix missing data at the source (database/API)

## Your Round 7 Assignment: 15 Errors

### 1. **FinancialAdvisorChat.tsx line 1113** - Invalid decision category
**Error**: `Type 'string' is not assignable to type '"luxury_purchase" | "real_estate" | "wildcard" | "other" | "investment" | "party"'`

The decision category is being set dynamically but doesn't match the allowed types. Check what valid categories should be used.

---

### 2. **SkillDevelopmentChat.tsx line 116** - Archetype comparison
**Error**: `This comparison appears to be unintentional because the types 'CharacterArchetype' and '"detective"' have no overlap`

Check if 'detective' is a valid archetype or if this comparison should use a different value.

---

### 3. **TeamBuildingActivities.tsx lines 263, 379** - String type mismatch
**Error**: `Type 'string' is not assignable to type 'never'`

Two locations where strings are being assigned to something that shouldn't accept them. Check the type definitions.

---

### 4. **TeamHeadquarters.tsx lines 1987, 1988, 1994** - Property 'name' missing
**Error**: `Property 'name' does not exist on type 'string'`

Three locations where code tries to access `.name` on a string value. The variable should be an object, not a string.

---

### 5. **TherapyModule.tsx line 12** - Wrong import syntax
**Error**: `Module '"@/services/ConflictDatabaseService"' has no exported member 'TherapistPromptStyle'. Did you mean to use 'import TherapistPromptStyle from "@/services/ConflictDatabaseService"' instead?`

Fix the import statement as suggested.

---

### 6. **TrainingInterface.tsx line 64** - Block-scoped variable used before declaration
**Error**: `Block-scoped variable 'handleCompleteTraining' used before its declaration`

Function is being used before it's defined. Move the definition higher or use function declaration instead of const.

---

### 7. **data/teamBuilding.ts line 497** - Invalid rarity type
**Error**: `Type '"uncommon"' is not assignable to type '"common" | "rare" | "epic" | "legendary"'. Did you mean '"common"'?`

Change "uncommon" to one of the valid rarity types.

---

### 8. **data/therapyChatService.ts line 597** - Invalid speaker type
**Error**: `Argument of type '"contestant"' is not assignable to parameter of type '"patient" | "therapist"'`

This is therapy chat - speakers should be "patient" or "therapist", not "contestant". Fix the speaker type.

---

### 9. **data/therapyChatService.ts line 1322** - Type comparison overlap
**Error**: `This comparison appears to be unintentional because the types '"response" | "intervention"' and '"therapist"' have no overlap`

Fix the comparison logic to use valid type values.

---

### 10. **data/therapyChatService.ts line 1686** - Private property access
**Error**: `Property 'characters' is private and only accessible within class 'ConflictDatabaseService'`

Use the public API method instead of accessing private property directly.

---

### 11. **hooks/useBattleAnnouncer.ts line 272** - Invalid announcement type
**Error**: `Type '"special" | "victory" | "defeat" | "action" | "round" | "intro"' is not assignable to type '"victory" | "defeat" | "action" | "round" | "intro"'`

Remove "special" or add it to the allowed types.

---

### 12. **services/battleFinancialService.ts lines 183, 641** - Event type comparison
**Error**: `Type '"near_death"' is not comparable to type '"victory" | "defeat" | "critical_hit" | "ally_down" | "comeback" | "betrayal" | "heroic_save"'`

'near_death' is not a valid morale event type. Use a valid event type or add 'near_death' to the type definition.

---

### 13. **services/eventSystemTest.ts line 124** - String vs array mismatch
**Error**: `Type 'string' is not assignable to type 'string[]'`

A string is being assigned where an array is expected. Wrap it in brackets: `[value]`

---

### 14. **services/therapyGameSystem.ts line 506** - Invalid event category
**Error**: `Type '"achievement"' is not assignable to type 'EventCategory'`

Change to a valid EventCategory or add 'achievement' to EventCategory type.

---

### 15. **test/testAdherenceSystem.ts line 147** - Wrong argument type
**Error**: `Argument of type 'string' is not assignable to parameter of type 'number'`

A string is being passed where a number is expected. Convert the string or fix the argument.

---

## Workflow

1. **Read the file** at each error location
2. **Understand the context** - what's the code trying to do?
3. **Fix properly** - no fallbacks, no shortcuts
4. **Test** - ensure the fix doesn't break anything
5. **Commit** after each logical fix (can group related fixes)

## Important Notes

- Some errors reference our recent 'contestant' changes - that's correct, keep that terminology
- The therapy chat uses different terminology ('patient'/'therapist') than regular chats ('coach'/'contestant')
- Check type definitions in shared files when types don't match

Good luck! You're doing great work.
