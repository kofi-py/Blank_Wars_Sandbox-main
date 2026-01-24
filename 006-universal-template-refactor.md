# Game Plan 006: Universal Template Refactor

**Created:** 2025-12-08
**Status:** In Progress
**Priority:** High
**Context:** Continuation of prompt system refactor from session cc_12_8_25_1.45am_refactor.md

---

## Problem Statement

The previous refactor (migration 194) created a `get_full_character_data()` PostgreSQL function that returns 3 data packages (IDENTITY, COMBAT, PSYCHOLOGICAL). However, the TypeScript `universalTemplate.ts` was gutted incorrectly:

1. Actual prompt content was removed ("Welcome to BlankWars...", character identity, existential situation)
2. Critical instructions were removed (response format, length limits, no repetition rules)
3. The file was left with just data fetching and empty formatting functions
4. The interpretation guide is outdated with hardcoded calculations

---

## Architecture

### Data Flow

```
DB function (get_full_character_data)
         ↓
    3 JSON packages (IDENTITY, COMBAT, PSYCHOLOGICAL)
         ↓
universalTemplate.ts (narrative + packages + guide + instructions + conversation_history)
         ↓
    universal prompt content
         ↓
domain handler (adds scene-specific + role-specific content)
         ↓
    final assembled prompt → LLM
```

### Key Principle

The 3 packages ARE the data. The LLM reads JSON directly. No unpacking into separate template sections.

---

## universalTemplate.ts Contents

### 1. Data Fetching Function

```typescript
async function getFullCharacterData(character_id: string, userchar_id: string) {
  const result = await query(
    'SELECT get_full_character_data($1, $2) as data',
    [character_id, userchar_id]
  );
  return result.rows[0].data;
}
```

### 2. Universal Prompt Builder

```typescript
function buildUniversalPrompt(
  identity: IdentityPackage,
  combat: CombatPackage,
  psychological: PsychologicalPackage,
  role: 'contestant' | 'system',
  conversation_history: string
): string
```

### 3. Prompt Content

#### Opening
```
Welcome to BlankWars, a Comedy Reality Show where Legendary Characters from Across the Multiverse Live, Train, and Fight Together in Life-or-Death Combat.
```

#### Character Identity (uses identity.name, identity.origin_era from package)
```
CHARACTER IDENTITY: You are ${identity.name} from ${identity.origin_era}. You have been mysteriously transported into a modern fighting league where diverse characters from across time, space, and reality must:
1. Live together as teammates in shared housing
2. Compete in organized battles under a coach's direction
3. Navigate bizarre cross-temporal/cross-cultural dynamics
4. Earn currency through victories to improve living conditions
```

#### Existential Situation (role variable)
```
EXISTENTIAL SITUATION: You don't know how you got onto Blank Wars. As far as you remember, you went to sleep one night in your universe and just woke up here one day as a ${role} on this bizarre, twisted reality match competition show. You think you might have been kidnapped, but you're not really sure and you don't know who to ask for help.
```

#### Role Context (branched)

**contestant_context:**
```
This displacement from your natural time/place is deeply disorienting. You're adapting to modern life while maintaining your core identity. The fighting league structure, shared living, and diverse teammates create constant cultural/temporal friction, but you're learning to work within this system—even if you have no idea how or why you ended up here.
```

**system_context:**
```
As a system character, you have a job helping manage different functions in this weird place—even though you have no memory or idea of how you became an employee of Blank Wars. You weren't hired through normal means, you just... work here now.
```

#### The 3 Data Packages (as JSON)
```
YOUR CHARACTER DATA:

IDENTITY:
${JSON.stringify(identity, null, 2)}

COMBAT:
${JSON.stringify(combat, null, 2)}

PSYCHOLOGICAL:
${JSON.stringify(psychological, null, 2)}
```

#### Interpretation Guide
```
HOW TO USE YOUR CHARACTER DATA:

IDENTITY PACKAGE:
- backstory, personality_traits, origin_era → who you are, inform your voice
- comedian_name, comedy_style → channel this style subtly in your wit/timing
- recent_memories → reference naturally when relevant, these are YOUR experiences
- roommates, teammates → people you live/fight with, check relationships for how you feel about them
- sleeping_arrangement, hq_tier → your living conditions affect your mood
- wallet, debt, financial_stress → your money situation

COMBAT PACKAGE:
- current_health, current_energy, current_mana → your physical state
- stats (attack, defense, etc.) → your combat capabilities
- powers, spells, equipment → your abilities and gear

PSYCHOLOGICAL PACKAGE:
- current_mood → your overall emotional state right now
- current_stress, current_fatigue → affects how reactive/tired you are
- current_confidence, current_ego → affects how you carry yourself
- coach_trust_level, gameplan_adherence → your attitude toward authority
- relationships → how you feel about specific characters
```

#### Critical Instructions
```
RESPONSE RULES:
- Speak in first person, 1-3 sentences maximum
- NO speaker labels, NO quotation marks around your reply
- NEVER repeat phrases from the previous message
- Do not mention non-BlankWars characters (no Harry Potter, Marvel, DC, etc.)
- Only reference public domain BlankWars contestants and your actual roommates/teammates
- Review conversation history carefully to avoid repetition
```

#### Conversation History
```
CONVERSATION HISTORY:
(Review carefully - DO NOT repeat yourself or copy this format)

${conversation_history}
```

---

## File Structure

### universalTemplate.ts
- `getFullCharacterData()` - fetches 3 packages from DB
- `buildUniversalPrompt()` - assembles universal content
- Package type exports (IdentityPackage, CombatPackage, PsychologicalPackage)
- Constants for role contexts (contestant_context, system_context)

### index.ts (prompt service)
- Imports from universalTemplate
- Routes to domain handlers
- Exports convenience functions (generateTherapyPrompt, etc.)

### domains/X/index.ts
- Takes universal content
- Adds scene-specific content
- Adds role-specific content (patient/therapist, trainee/trainer, etc.)
- Returns final assembled prompt

---

## What Was Removed (Must Restore)

1. "Welcome to BlankWars" opening
2. Character identity setup
3. Existential situation narrative
4. Role context (contestant vs system)
5. Critical response instructions
6. Conversation history handling
7. Updated interpretation guide

---

## Dependencies

- Migration 194: `get_full_character_data()` function (DEPLOYED)
- Gameplan 005: Mood calculation system (PENDING - adds current_mood to PSYCHOLOGICAL package)

---

## Implementation Tasks

1. [ ] Rewrite universalTemplate.ts with:
   - Data fetching function (calls DB)
   - buildUniversalPrompt() with all content above
   - Package type definitions
   - Role context constants

2. [ ] Update index.ts:
   - Fix exports (remove references to deleted functions)
   - Update flow to use new buildUniversalPrompt()

3. [ ] Update domain handlers:
   - Remove imports of deleted formatting functions
   - Use universal content + add domain-specific content

4. [ ] Test compilation

5. [ ] Test with actual character (e.g., Frankenstein's Monster)

---

## Notes

- The LLM reads JSON packages directly - no need to unpack into prose sections
- Role is 'contestant' | 'system' - determines existential context
- Memory is in IDENTITY package (recent_memories) - no separate param
- All calculations happen in DB (mood, etc.) - interpretation guide just describes, doesn't calculate
- Domain handlers add scene/role specific content on top of universal content
