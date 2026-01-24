# CLI Claude B Assignment - Round 7: Import Conflicts & Service Architecture

## Current Status: 119 errors (down from 175!)

**Your Focus**: Resolve import conflicts, fix service architecture issues, and add missing properties.

## CRITICAL: Case Convention Rules (NON-NEGOTIABLE)

**Same rules as always**:
- Variables/Parameters: `snake_case`
- Functions: `camelCase`
- Custom Component Props: `snake_case`
- Standard React/HTML Props: `camelCase`
- **NO FALLBACKS**: Never add `||`, `??`, `?.` to silence errors
- **NO PLACEHOLDERS**: Fix missing data at the source

## Priority 1: Character Import Conflicts (~4 errors)

### Two Different Character Types
**Files**:
- `src/components/PostRegistrationFlow.tsx:43`
- `src/components/TeamRosterWrapper.tsx:52`
- `src/services/ConflictDatabaseService.ts:157`
- `src/components/TrainingGrounds_v_?.tsx:234`

**Issue**: Project has two Character type definitions:
1. `import { Character } from '@/services/apiClient'` - API response type
2. `import { Character } from '@/data/characters'` - Game data type

**Root Cause Analysis Needed**:
1. Read both Character type definitions
2. Determine if they should be:
   - **Merged** into one canonical type
   - **Aliased** (e.g., ApiCharacter vs GameCharacter)
   - **Converted** (create conversion functions)

**Recommended Strategy**:
1. Check if the types are actually identical or have differences
2. If identical: Consolidate to single source in `@/types/character.ts`
3. If different: Create type aliases and conversion utilities
4. Update all imports to use the correct type

**Action**:
1. Investigate both Character definitions
2. Propose solution to user before implementing
3. Once approved, update all four files

---

## Priority 2: TherapySession Type Duplication (~5 errors)

### Two Unrelated TherapySession Types
**Files**:
- `src/components/TherapyModule.tsx:553, 563, 691, 795, 1116`

**Error**: "Two different types with this name exist, but they are unrelated"

**Issue**: Multiple TherapySession type definitions exist and are incompatible.

**Action**:
1. Find all TherapySession type definitions in the codebase
2. Compare their structures
3. Consolidate into single canonical TherapySession type
4. Create a shared types file if needed: `@/types/therapy.ts`
5. Update all imports to use the canonical type
6. Add conversion functions if different structures are needed

---

## Priority 3: Service Architecture Issues (~4 errors)

### EventContextService constructor is private
**File**: `src/services/confessionalService.ts:273`
**Error**: "Constructor of class 'EventContextService' is private"

**Issue**: Trying to use `new EventContextService()` but it's a singleton.

**Action**:
1. Read EventContextService to confirm singleton pattern
2. Replace `new EventContextService()` with `EventContextService.getInstance()`
3. Check for other files with same issue

---

### TherapistPromptStyle wrong import
**Files**:
- `src/data/therapyChatService.ts:2`
- `src/components/TherapyModule.tsx:12`

**Error**: "Did you mean to use 'import TherapistPromptStyle from' instead?"

**Action**:
1. Check how TherapistPromptStyle is exported in ConflictDatabaseService
2. Fix import to match export type (named vs default)

---

## Priority 4: Missing Properties - Equipment & Stats (~3 errors)

### Equipment missing description
**File**: `src/app/test-battle-hex/page.tsx:142`

**Action**:
1. Find the equipment object creation at line 142
2. Add description property (check similar equipment for format)
3. Ensure description is meaningful for test equipment

---

### TraditionalStats missing wisdom
**File**: `src/services/pveAPI.ts:61`

**Action**:
1. Find TraditionalStats object creation at line 61
2. Add `wisdom: 0` (or appropriate value based on context)

---

### StatusEffect type mismatch
**File**: `src/utils/battleCharacterUtils.ts:48`

**Action**:
1. Read StatusEffect interface definition
2. Check what properties are missing or incorrect at line 48
3. Fix the StatusEffect array to match interface exactly

---

## Priority 5: Complex System Issues (~8 errors)

### AIJudgeContext missing properties
**File**: `src/hooks/useBattleEngineLogic.ts:143`
**Missing**: battle_narrative, character_personalities, current_tensions, previous_rulings, judging_style

**Action**:
1. Read AIJudgeContext interface
2. Add all missing properties with appropriate placeholder values:
   - battle_narrative: "Battle in progress"
   - character_personalities: []
   - current_tensions: []
   - previous_rulings: []
   - judging_style: "balanced"

---

### ExecutedAction missing narrative_description
**Files**: `src/systems/physicalBattleEngine.ts:493, 502, 511`

**Action**:
1. Read ExecutedAction interface
2. Add narrative_description to all three action objects
3. Generate appropriate descriptions:
   - Basic attack: "${character.name} attacks ${target.name}"
   - Defend: "${character.name} takes a defensive stance"

---

### PostBattleAnalysis CharacterEvaluation mismatch
**File**: `src/systems/postBattleAnalysis.ts:185`

**Action**:
1. Read CharacterEvaluation interface
2. Check what properties are missing or mismatched at line 185
3. Fix the evaluation objects to match interface

---

### CoachingSystem empty objects
**Files**:
- `src/systems/coachingSystem.ts:585` - Empty object for team analysis
- `src/systems/coachingSystem.ts:595` - Empty object for coaching recommendation

**Issue**: Empty `{}` objects assigned to complex types.

**Action**:
1. Read the required type for line 585 (team analysis structure)
2. Populate with all required properties
3. Read the required type for line 595 (coaching recommendation)
4. Populate with all required properties
5. No shortcuts - fill in real placeholder values

---

## Priority 6: Misc Type Fixes (~4 errors)

### EquipmentStats structure
**File**: `src/utils/battleCharacterUtils.ts:82`

**Action**:
1. Read EquipmentStats interface
2. Check what's wrong with the current structure
3. Fix to match required properties

---

### TeamCharacter missing properties
**File**: `src/utils/characterConversion.ts:82`
**Missing**: current_mana, max_mana, current_energy, max_energy, and 5 more

**Action**:
1. Read TeamCharacter interface
2. Add all missing properties to character conversion
3. Calculate appropriate default values

---

### CharacterPersonality missing properties
**File**: `src/test/testAdherenceSystem.ts:28`
**Missing**: speech_style, relationships

**Action**:
1. Add speech_style: "casual"
2. Add relationships: []

---

### CharacterExperience type mismatch
**File**: `src/test/testAdherenceSystem.ts:36`
**Error**: "Type 'number' is not assignable to type 'CharacterExperience'"

**Action**:
1. Read CharacterExperience type definition
2. Fix line 36 to match the expected structure

---

## Workflow

1. **Priority 1** (Character imports) - CRITICAL - coordinate with user before implementing
2. **Priority 2** (TherapySession) - commit when done
3. **Priority 3** (Service architecture) - commit when done
4. **Priority 4** (Missing properties) - commit when done
5. **Priority 5** (Complex systems) - commit when done
6. **Priority 6** (Misc fixes) - final commit

## Success Criteria

- ~30 errors fixed
- Import conflicts resolved cleanly
- All service singletons used correctly
- All missing properties added
- Complex system objects properly initialized

## Notes

- You're CLI Claude B - working in parallel with CLI Claude A
- **Priority 1 is critical** - discuss approach with user before implementing
- Test after each priority group

Good luck!
