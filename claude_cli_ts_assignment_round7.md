# CLI Claude Assignment - Round 7: System Architecture & Type Consistency

## Current Status: 119 errors (down from 175!)

**My assignment**: Complex type system issues, architecture problems, and completing the coach/contestant refactor.

## Priority 1: Complete Coach/Contestant Refactor (20 errors)

### ProgressionDashboard.tsx line 204
**Error**: `Argument of type '(prev: { id: number; sender: "contestant" | "coach"; ...}) => ...' is not assignable to parameter of type 'SetStateAction<...>'`

**Issue**: Type mismatch in setState callback.
**Fix**: Ensure the setState signature matches the state type exactly.

---

### therapyChatService.ts lines 250, 318, 679, 925, 1246, 1267
**Multiple errors**: Character object type mismatches

**Issue**: Therapy service is creating incomplete Character objects.
**Fix**: Either create complete Character objects or use a TherapyCharacter interface.

---

## Priority 2: Battle System Type Consistency (25 errors)

### BattleCharacter vs Character type conflicts
**Files affected**:
- `src/data/battleFlow.ts:602` - Missing BattleCharacter properties
- `src/components/battle/HexBattleArena.tsx:984` - CharacterArchetype mismatch
- `src/components/battle/HexBattleArena.tsx:991` - MentalState missing properties
- `src/components/battle/HexBattleArena.tsx:1039, 1061, 1736` - BattleCharacter type conversion
- `src/hooks/useBattleState.ts:271, 298, 310` - TeamCharacter type conversion

**Root cause**: Inconsistent character types across battle system.
**Strategy**:
1. Define clear conversion utilities
2. Ensure all battle characters have required BattleCharacter properties
3. Fix mental_state structure to include confidence, battle_focus, strategy_deviation_risk

---

### BattleTeam missing properties
**Files affected**:
- `src/hooks/useBattleEngineLogic.ts:150` - CoachingData missing properties
- `src/hooks/useBattleFinancialIntegration.ts:198, 213` - BattleTeam missing team_chemistry, current_morale, coaching_credits, status_effects
- `src/test/testAdherenceSystem.ts:120, 125` - Same BattleTeam properties

**Fix**: Add all required BattleTeam properties when creating team objects.

---

### MoraleEvent & DeviationEvent structure
**Files affected**:
- `src/hooks/useBattleFinancialIntegration.ts:224, 234` - Missing cascade_effects
- `src/components/battle/HexBattleArena.tsx:729` - DeviationEvent type mismatch
- `src/hooks/usePsychologySystem.ts:356` - DeviationEvent wrong structure
- `src/systems/physicalBattleEngine.ts:242` - DeviationEvent type mismatch

**Fix**: Add cascade_effects to MoraleEvent, fix DeviationEvent structure.

---

## Priority 3: Service & Import Issues (15 errors)

### Character import conflicts
**Files affected**:
- `src/components/PostRegistrationFlow.tsx:43` - Two different Character types
- `src/components/TeamRosterWrapper.tsx:52` - apiClient.Character vs data/characters.Character
- `src/services/ConflictDatabaseService.ts:157` - Same import conflict
- `src/components/TrainingGrounds_v_?.tsx:234` - Character type mismatch

**Root cause**: Two Character type definitions (apiClient vs data/characters)
**Fix**: Consolidate to single Character type source or create proper type aliases.

---

### TherapySession type duplication
**Files affected**:
- `src/components/TherapyModule.tsx:553, 563, 691, 795, 1116` - Two unrelated TherapySession types

**Fix**: Consolidate TherapySession types into single source of truth.

---

### EventContext & ConflictDatabaseService
**Files affected**:
- `src/services/confessionalService.ts:273` - EventContextService constructor is private
- `src/data/therapyChatService.ts:2, src/components/TherapyModule.tsx:12` - TherapistPromptStyle import wrong

**Fix**: Use singleton getInstance() pattern, fix imports.

---

## Priority 4: Equipment & Stats Missing Properties (10 errors)

### Equipment missing description
**Files affected**:
- `src/app/test-battle-hex/page.tsx:142` - Equipment missing description property

**Fix**: Add description to equipment objects.

---

### TraditionalStats missing wisdom
**Files affected**:
- `src/services/pveAPI.ts:61` - Missing wisdom property

**Fix**: Add wisdom: 0 to TraditionalStats initialization.

---

### StatusEffect type mismatch
**Files affected**:
- `src/utils/battleCharacterUtils.ts:48` - StatusEffect array type mismatch

**Fix**: Ensure StatusEffect objects match interface exactly.

---

## Priority 5: Complex System Issues (15 errors)

### AIJudgeContext missing properties
**Files affected**:
- `src/hooks/useBattleEngineLogic.ts:143` - Missing battle_narrative, character_personalities, current_tensions, previous_rulings, judging_style

**Fix**: Add all required AIJudgeContext properties.

---

### ExecutedAction missing narrative_description
**Files affected**:
- `src/systems/physicalBattleEngine.ts:493, 502, 511` - Missing narrative_description

**Fix**: Add narrative_description to all ExecutedAction objects.

---

### PostBattleAnalysis CharacterEvaluation
**Files affected**:
- `src/systems/postBattleAnalysis.ts:185` - CharacterEvaluation array type mismatch

**Fix**: Match CharacterEvaluation interface exactly.

---

### CoachingSystem empty objects
**Files affected**:
- `src/systems/coachingSystem.ts:585, 595` - Empty objects assigned to complex types

**Fix**: Populate all required properties instead of using `{}`.

---

## My Workflow

1. **Start with Priority 1** - Complete coach/contestant refactor
2. **Move to Priority 2** - Fix battle system type consistency
3. **Priority 3** - Resolve import conflicts
4. **Priority 4** - Add missing properties
5. **Priority 5** - Complex system fixes

## Success Criteria

- All assigned errors resolved
- No new errors introduced
- Coach/contestant refactor 100% complete
- Battle system types consistent
- All services use proper import paths

Let's get these errors down to double digits!
