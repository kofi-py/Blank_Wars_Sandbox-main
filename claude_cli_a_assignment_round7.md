# CLI Claude A Assignment - Round 7: Complete Coach/Contestant Refactor & Battle Types

## Current Status: 119 errors (down from 175!)

**Your Focus**: Complete the coach/contestant refactor and fix core battle system type consistency.

## CRITICAL: Case Convention Rules (NON-NEGOTIABLE)

**Same rules as always**:
- Variables/Parameters: `snake_case`
- Functions: `camelCase`
- Custom Component Props: `snake_case`
- Standard React/HTML Props: `camelCase`
- **NO FALLBACKS**: Never add `||`, `??`, `?.` to silence errors
- **NO PLACEHOLDERS**: Fix missing data at the source

## Priority 1: Complete Coach/Contestant Refactor (~8 errors)

### ProgressionDashboard.tsx line 204
**Error**: `Argument of type '(prev: { id: number; sender: "contestant" | "coach"; ...}) => ...' is not assignable to parameter of type 'SetStateAction<...>'`

**Context**: We've refactored all chat systems from 'player'/'character' to 'coach'/'contestant'. ProgressionDashboard needs the same update.

**Action**:
1. Read ProgressionDashboard.tsx around line 204
2. Check the message type definition
3. Ensure setState callback signature matches exactly
4. Look for any other 'user'/'assistant' references that should be 'coach'/'contestant'

---

### therapyChatService.ts - Character object creation
**Lines**: 250, 318, 679, 925, 1246, 1267
**Errors**: Multiple "Type is missing properties from type 'Character'" errors

**Issue**: Therapy service creates incomplete Character objects.

**Strategy**:
1. **Option A** (Preferred): Create a proper `TherapyCharacter` type that only requires the fields therapy actually needs
2. **Option B**: Add all missing Character properties (but only if they're actually needed)

**Action**:
1. Read therapyChatService.ts at each error line
2. Determine what fields are actually used by therapy
3. Create TherapyCharacter interface in appropriate types file
4. Update therapy service to use TherapyCharacter instead of Character

---

## Priority 2: Battle System - BattleCharacter Type Consistency (~15 errors)

### BattleCharacter missing properties
**Files**:
- `src/data/battleFlow.ts:602` - Missing max_mana, position, buffs, debuffs, etc.
- `src/components/battle/HexBattleArena.tsx:1736` - Missing position, physical_damage_dealt, etc.

**Root Issue**: BattleCharacter objects are created without all required properties.

**Action**:
1. Read BattleCharacter interface definition
2. Create a helper function `createBattleCharacter()` that ensures all properties are initialized
3. Update battleFlow.ts and HexBattleArena.tsx to use the helper
4. Initialize missing properties with sensible defaults (0 for numbers, [] for arrays, etc.)

---

### MentalState missing properties
**File**: `src/components/battle/HexBattleArena.tsx:991`
**Error**: Missing confidence, battle_focus, strategy_deviation_risk

**Action**:
1. Read MentalState interface
2. Find where mental_state is created (line 991)
3. Add the three missing properties with appropriate values:
   - confidence: 50-100 based on character stats
   - battle_focus: 80 (default focused state)
   - strategy_deviation_risk: 0.1 (low risk initially)

---

### CharacterArchetype type mismatch
**File**: `src/components/battle/HexBattleArena.tsx:984`
**Error**: Type includes archetypes not in CharacterArchetype union

**Issue**: Code includes archetypes like "detective", "alien", "monster", "mercenary", "cowboy", "biker" that aren't in the official CharacterArchetype type.

**Action**:
1. Read the CharacterArchetype type definition
2. Check if these archetypes should be added or if test data is using wrong values
3. Either add missing archetypes to type definition OR fix test data to use valid archetypes

---

### BattleCharacter type conversions
**Files**:
- `src/components/battle/HexBattleArena.tsx:1039, 1061` - Conversion errors
- `src/hooks/useBattleState.ts:271, 298, 310` - TeamCharacter conversion errors

**Issue**: Type assertions failing because objects don't have all required properties.

**Action**:
1. Use the `createBattleCharacter()` helper from earlier task
2. Replace type assertions with proper object construction
3. Never use `as BattleCharacter` - ensure objects actually match the type

---

## Priority 3: BattleTeam Missing Properties (~6 errors)

### BattleTeam structure incomplete
**Files**:
- `src/hooks/useBattleEngineLogic.ts:150` - CoachingData missing properties
- `src/hooks/useBattleFinancialIntegration.ts:198, 213` - Missing team_chemistry, current_morale, coaching_credits, status_effects
- `src/test/testAdherenceSystem.ts:120, 125` - Same properties

**Missing Properties**:
- team_chemistry: number
- current_morale: number
- coaching_credits: number
- status_effects: StatusEffect[]

**Action**:
1. Find all locations creating BattleTeam objects
2. Add missing properties with sensible defaults:
   - team_chemistry: 50
   - current_morale: 100
   - coaching_credits: 3
   - status_effects: []

---

## Priority 4: Event System - MoraleEvent & DeviationEvent (~4 errors)

### MoraleEvent missing cascade_effects
**Files**: `src/hooks/useBattleFinancialIntegration.ts:224, 234`

**Action**:
1. Read MoraleEvent interface
2. Add cascade_effects property to event objects:
   ```typescript
   cascade_effects: []  // or actual cascade effects if appropriate
   ```

---

### DeviationEvent structure wrong
**Files**:
- `src/components/battle/HexBattleArena.tsx:729`
- `src/hooks/usePsychologySystem.ts:356`
- `src/systems/physicalBattleEngine.ts:242`

**Action**:
1. Read DeviationEvent interface to see required structure
2. Update all three locations to match the correct structure
3. Ensure all required fields are present

---

## Workflow

1. Start with Priority 1 (coach/contestant refactor) - commit when done
2. Move to Priority 2 (BattleCharacter) - commit after creating helper function
3. Priority 3 (BattleTeam) - commit when complete
4. Priority 4 (Event system) - final commit

## Success Criteria

- ~33 errors fixed
- Coach/contestant refactor 100% complete
- Battle character creation uses consistent helper function
- All BattleTeam objects have required properties
- Event structures match interfaces

## Notes

- You're CLI Claude A - working in parallel with CLI Claude B
- Coordinate through the user if you have questions about shared files
- Test after each priority group to ensure no new errors

Good luck!
