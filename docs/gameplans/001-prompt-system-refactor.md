# Game Plan 001: Prompt System Refactor

**Created:** 2025-12-06
**Updated:** 2025-12-08
**Status:** SUPERSEDED BY GAMEPLAN 006
**Priority:** N/A

> **NOTE:** This gameplan has been superseded by [Game Plan 006: Universal Template Refactor](./006-universal-template-refactor.md). The architecture below is outdated. Refer to gameplan 006 for the current design with centralized assembly and corrected domain/role structure.

---

## CRITICAL: Backup Before Starting

**BEFORE ANY CODE CHANGES:**
```bash
cp backend/src/services/promptAssemblyService.ts backend/src/services/_archive/promptAssemblyService.ts.backup_$(date +%Y%m%d)
```

This file is ~50k+ tokens and is the heart of character behavior. Archive it first.

---

## Overview

Refactor the prompt assembly system from a monolithic `promptAssemblyService.ts` (~50k+ tokens) into a clean, modular architecture with:
- Universal template that fetches ALL character data from DB
- Domain-specific handlers that add scene context
- Role-specific context files for each character role within a domain

### Why This Matters
- Current system only fetches ~5% of available character data
- Characters will feel more alive and persistent with full data
- Cross-domain context (therapy memories in battle) adds psychological depth
- Business model validated: full data approach is sustainable

---

## Architecture

### File Structure - Corrected Domain List

```
backend/src/services/prompts/
├── universalTemplate.ts              # Fetches ALL data from DB
│   ├── getFullCharacterData()        # Main query function
│   ├── formatCharacterData()         # Clean/format for prompts
│   └── buildFieldInterpretationGuide() # How to use data fields
│
└── domains/
    ├── therapy/
    │   ├── index.ts                  # assembleTherapyPrompt() - individual
    │   ├── groupIndex.ts             # assembleGroupTherapyPrompt()
    │   ├── patientContext.ts         # buildPatientContext()
    │   ├── therapistContext.ts       # buildTherapistContext()
    │   └── judgeContext.ts           # buildTherapyJudgeContext()
    │
    ├── battle/
    │   ├── index.ts                  # assembleBattlePrompt()
    │   ├── combatantContext.ts       # buildCombatantContext()
    │   ├── judgeContext.ts           # buildBattleJudgeContext()
    │   └── rulingLogic.ts            # interpretRebellionAction()
    │
    ├── training/
    │   ├── index.ts                  # assembleTrainingPrompt() - individual
    │   ├── groupIndex.ts             # assembleGroupTrainingPrompt()
    │   ├── traineeContext.ts         # buildTraineeContext()
    │   └── trainerContext.ts         # buildTrainerContext()
    │
    ├── confessional/
    │   ├── index.ts                  # assembleConfessionalPrompt()
    │   ├── contestantContext.ts      # buildContestantContext()
    │   └── hostmasterContext.ts      # buildHostmasterContext()
    │
    ├── hostmaster/
    │   ├── index.ts                  # assembleHostmasterPrompt()
    │   └── hostmasterContext.ts      # buildHostmasterContext()
    │
    ├── financial/
    │   ├── index.ts                  # assembleFinancialPrompt()
    │   └── advisorContext.ts         # buildFinancialAdvisorContext()
    │
    ├── performance/
    │   ├── index.ts                  # assemblePerformancePrompt()
    │   └── coachContext.ts           # buildPerformanceCoachContext()
    │
    ├── personalProblems/
    │   ├── index.ts                  # assemblePersonalProblemsPrompt()
    │   └── counselorContext.ts       # buildCounselorContext()
    │
    ├── groupActivities/
    │   ├── index.ts                  # assembleGroupActivitiesPrompt()
    │   └── participantContext.ts     # buildParticipantContext()
    │
    ├── equipment/
    │   ├── index.ts                  # assembleEquipmentPrompt()
    │   └── advisorContext.ts         # buildEquipmentAdvisorContext()
    │
    ├── kitchenTable/
    │   ├── index.ts                  # assembleKitchenTablePrompt()
    │   └── socialContext.ts          # buildKitchenTableContext()
    │
    ├── realEstate/
    │   ├── index.ts                  # assembleRealEstatePrompt()
    │   └── agentContext.ts           # buildRealEstateAgentContext()
    │
    ├── socialLounge/
    │   ├── index.ts                  # assembleSocialLoungePrompt()
    │   └── socialContext.ts          # buildSocialLoungeContext()
    │
    ├── messageBoard/                 # MERGED: includes drama content
    │   ├── index.ts                  # assembleMessageBoardPrompt()
    │   ├── posterContext.ts          # buildMessageBoardContext()
    │   └── dramaContext.ts           # buildDramaContext() - drama-specific formatting
    │
    ├── progression/
    │   ├── index.ts                  # assembleProgressionPrompt()
    │   └── advisorContext.ts         # buildProgressionAdvisorContext()
    │
    ├── attributes/                   # SEPARATE: core stat development
    │   ├── index.ts                  # assembleAttributesPrompt()
    │   └── coachContext.ts           # buildAttributesCoachContext()
    │
    └── abilities/                    # UNIFIED: powers + spells coaching
        ├── index.ts                  # assembleAbilitiesPrompt() - combined interface
        ├── mentorContext.ts          # buildAbilitiesMentorContext()
        ├── powers/                   # SUBDOMAIN: can be called standalone
        │   ├── index.ts              # assemblePowersPrompt()
        │   └── coachContext.ts       # buildPowersCoachContext()
        └── spells/                   # SUBDOMAIN: can be called standalone
            ├── index.ts              # assembleSpellsPrompt()
            └── mentorContext.ts      # buildSpellsMentorContext()
```

**Total: 17 active domains (down from 23 after consolidation)**

### LEGACY Domains (to be archived, not implemented in new system)
- `skills/` - DEPRECATED: functionality absorbed by abilities and training domains
- `dramaBoard/` - MERGED: consolidated into messageBoard domain

### Domain Hierarchy Notes
| Domain | Type | Notes |
|--------|------|-------|
| abilities/ | Parent | Unified powers+spells coaching with rebellion mechanic |
| abilities/powers/ | Subdomain | Can be invoked standalone OR through abilities |
| abilities/spells/ | Subdomain | Can be invoked standalone OR through abilities |
| attributes/ | Standalone | Separate from abilities - handles base stats |
| messageBoard/ | Merged | Now handles all social posts including drama content |

---

## Data Flow

### Where Conversation History Comes From

**Two sources:**
1. **Frontend → Backend route** - Recent messages in current session (ephemeral)
2. **Database tables** - Persisted conversation history

**Database tables for conversation history:**
- `chat_messages` - General chat messages
- `chat_sessions` - Session metadata
- `team_chat_logs` - Team-specific chat history
- `lounge_messages` - Social lounge chat
- `character_memories` - Important memories extracted from conversations

**Flow:**
```
┌─────────────────────────────────────────────────────────────────┐
│ CALLER (routes, services)                                       │
│                                                                 │
│ 1. Gets conversation_history from:                              │
│    - Request body (recent messages from frontend)               │
│    - DB query (chat_sessions, team_chat_logs, etc.)             │
│                                                                 │
│ 2. Gets participant IDs from session/request                    │
│                                                                 │
│ 3. Calls domain assembler with both                             │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ universalTemplate.getFullCharacterData(character_id)            │
│ - Queries ALL character tables                                  │
│ - Returns clean, formatted FullCharacterData object             │
│ - DOES NOT fetch conversation history (that's caller's job)     │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ domains/{domain}/index.ts                                       │
│                                                                 │
│ 1. Receives character data from universalTemplate               │
│ 2. Adds scene context (setting, situation)                      │
│ 3. Fetches OTHER participants' data as needed                   │
│ 4. Calls appropriate role context builder                       │
│ 5. Appends conversation_history (from caller's context param)   │
│ 6. Returns FINAL assembled prompt string                        │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ CALLER receives final prompt → sends to OpenAI                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Complete Database Tables (123 total)

### Character Data Tables (for Universal Template)
| Table | Data for Prompts |
|-------|------------------|
| `characters` | backstory, personality_traits, conversation_style, conversation_topics, combat stats, psych baselines, comedian_style_id |
| `comedian_styles` | comedian_name, comedy_style |
| `user_characters` | level, experience, bond_level, W/L record, wallet, debt, current_* psych states, sleeping_arrangement, gameplan_adherence |
| `character_powers` | unlocked powers, current_rank |
| `character_spells` | unlocked spells, current_rank |
| `character_equipment` | equipped items |
| `character_relationships` | trust, respect, affection, rivalry per pair |
| `character_memories` | recent memories, emotion, intensity, tags |
| `character_abilities` | unlocked abilities |
| `character_skills` | learned skills |
| `character_items` | inventory items |
| `character_progression` | progression milestones |
| `character_modifiers` | active modifiers/buffs |
| `character_temporary_buffs` | temporary effects |
| `character_living_context` | HQ tier, room assignment |
| `character_power_loadout` | equipped power loadout |
| `character_spell_loadout` | equipped spell loadout |
| `character_category_preferences` | personality preferences |
| `character_decisions` | past decisions made |
| `character_healing_sessions` | therapy history |
| `character_experience_log` | XP gain history |

### Team Data Tables
| Table | Data |
|-------|------|
| `teams` | team_id, name, member_ids, coach_id |
| `team_chat_logs` | team conversation history |
| `team_context` | team situational context |
| `team_relationships` | inter-team dynamics |
| `team_events` | team event history |
| `team_equipment_pool` | shared equipment |

### Battle Data Tables
| Table | Data |
|-------|------|
| `battles` | battle state, participants |
| `battle_queue` | pending battles |
| `judge_rulings` | past judge rulings on rebellions |
| `damage_type_reference` | damage type definitions |
| `status_effect_types` | status effect definitions |

### Conversation/Social Tables
| Table | Data |
|-------|------|
| `chat_messages` | general chat |
| `chat_sessions` | session metadata |
| `lounge_messages` | social lounge |
| `lounge_presence` | who's in lounge |
| `social_messages` | social posts |
| `social_message_reactions` | reactions |
| `social_message_replies` | replies |

### Reference Tables (not for prompts, but needed for JOINs)
| Table | Purpose |
|-------|---------|
| `archetypes` | archetype definitions |
| `power_definitions` | power stats/effects |
| `spell_definitions` | spell stats/effects |
| `equipment` | equipment definitions |
| `items` | item definitions |

---

## Field Interpretation Instructions

The universal template should include guidance for how characters should interpret their data fields:

```typescript
function buildFieldInterpretationGuide(): string {
  return `
## HOW TO INTERPRET YOUR CHARACTER DATA

### Psychology State (current_* fields)
These reflect your CURRENT emotional/mental state. Use them to inform your behavior:
- current_stress (0-100): Higher = more reactive, irritable, prone to outbursts
- current_mental_health (0-100): Lower = more erratic, vulnerable, defensive
- current_morale (0-100): Lower = more pessimistic, reluctant, passive
- current_fatigue (0-100): Higher = slower responses, less enthusiasm, want rest
- current_confidence (0-100): Lower = second-guess yourself, seek validation
- current_ego (0-100): Higher = more arrogant, dismissive of others
- current_team_player (0-100): Lower = more selfish, less cooperative
- team_trust (0-100): Lower = suspicious of teammates, reluctant to rely on them
- gameplan_adherence: Your likelihood to follow coach's orders vs rebel

### Relationships
Your relationship with each character affects how you treat them:
- trust: Do you believe what they say?
- respect: Do you value their opinion?
- affection: Do you like them?
- rivalry: Do you see them as competition?
High rivalry + low trust = hostile interactions
High affection + high trust = supportive interactions

### Battle Record (W/L)
- Winning streak = confident, maybe cocky
- Losing streak = frustrated, desperate to prove yourself
- win_percentage affects confidence in battle situations

### Financial State
- wallet: Available spending money
- debt: Obligations owed
- High debt + low wallet = financial stress affecting mood

### Living Situation
- sleeping_arrangement: Affects rest quality, mood
- roommates: Daily interactions, potential conflicts or friendships

### Memories
Reference your recent_memories naturally in conversation when relevant.
These are things you ACTUALLY EXPERIENCED - use them authentically.

### Comedy Style
Channel your assigned comedian's style subtly in your responses.
Don't break character, but let their influence show in your wit/timing.
`;
}
```

---

## FullCharacterData Interface

```typescript
interface FullCharacterData {
  // Identity
  id: string;
  name: string;
  title: string;
  origin_era: string;
  species: string;
  archetype: string;

  // Personality
  backstory: string;
  personality_traits: string[];
  conversation_style: string;
  conversation_topics: string[];
  comedian_name: string;
  comedy_style: string;

  // Combat Stats
  max_health: number;
  attack: number;
  defense: number;
  speed: number;
  magic_attack: number;
  magic_defense: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  spirit: number;
  initiative: number;
  // Resistances
  physical_resistance: number;
  magical_resistance: number;
  elemental_resistance: number;

  // Current State (from user_characters)
  level: number;
  experience: number;
  bond_level: number;
  total_battles: number;
  total_wins: number;
  total_losses: number;
  win_percentage: number;
  current_health: number;
  wallet: number;
  debt: number;

  // Psych State
  current_mental_health: number;
  current_stress: number;
  current_morale: number;
  current_fatigue: number;
  current_confidence: number;
  current_ego: number;
  current_team_player: number;
  team_trust: number;
  gameplan_adherence: number;

  // Living Situation
  sleeping_arrangement: string;
  hq_tier: string;
  roommates: CharacterSummary[];  // Name + relationship
  teammates: CharacterSummary[];  // Name + relationship

  // Abilities
  powers: CharacterPower[];
  spells: CharacterSpell[];
  equipment: CharacterEquipment[];
  items: CharacterItem[];

  // Relationships
  relationships: CharacterRelationship[];

  // Memories
  recent_memories: CharacterMemory[];

  // Decisions
  recent_decisions: CharacterDecision[];
}

interface CharacterSummary {
  id: string;
  name: string;
  relationship: {
    trust: number;
    respect: number;
    affection: number;
    rivalry: number;
  };
}

interface CharacterPower {
  id: string;
  name: string;
  description: string;
  current_rank: number;
  cooldown_remaining: number;
}

interface CharacterSpell {
  id: string;
  name: string;
  description: string;
  current_rank: number;
  cooldown_remaining: number;
}

interface CharacterEquipment {
  slot: string;
  item_name: string;
  item_stats: Record<string, number>;
}

interface CharacterItem {
  id: string;
  name: string;
  quantity: number;
}

interface CharacterRelationship {
  character_id: string;
  character_name: string;
  trust: number;
  respect: number;
  affection: number;
  rivalry: number;
  shared_battles: number;
  shared_therapy_sessions: number;
}

interface CharacterMemory {
  content: string;
  emotion: string;
  intensity: number;
  created_at: string;
  tags: string[];
}

interface CharacterDecision {
  decision_type: string;
  choice_made: string;
  context: string;
  created_at: string;
}
```

---

## Data Formatting Rules

| Rule | Example |
|------|---------|
| Skip null/empty values | Don't include `backstory: ""` |
| Format currency | `wallet: 1500` → `"$1,500"` |
| Format percentages | `win_percentage: 0.65` → `"65%"` |
| Exclude technical IDs | Don't expose raw UUIDs in prompt text |
| Exclude deprecated fields | Skip `*_deprecated` columns |
| Exclude internal flags | Skip `starter_gear_given` etc. |
| Null roommates for system chars | System characters return empty array, not null |

---

## Participant Relationships

### Who Needs to Know About Whom

**THERAPY:**
| Role | Self | Others |
|------|------|--------|
| Patient | Full data | Therapist: name, style, intensity |
| Therapist | Full data | Patient: FULL data |
| Judge | Full data | Patient: full, Therapist: name+style, Transcript |

**BATTLE:**
| Role | Self | Others |
|------|------|--------|
| Combatant | Full data | Teammates: name, HP, position, relationship. Opponents: name, HP, position, relationship |
| Judge | Full data | Rebel: full + psych. Intended target: summary. Actual target: summary + relationship. Coach order. Battle state |

**TRAINING:**
| Role | Self | Others |
|------|------|--------|
| Trainee | Full data | Trainer: name, style. Other trainees: names |
| Trainer | Full data | All trainees: full data |

**CONFESSIONAL:**
| Role | Self | Others |
|------|------|--------|
| Contestant | Full data | Hostmaster: name, style |
| Hostmaster | Full data | Contestant: full data |

**FINANCIAL:**
| Role | Self | Others |
|------|------|--------|
| Contestant | Full data | Advisor: name, style |

**SOCIAL/LOUNGE:**
| Role | Self | Others |
|------|------|--------|
| Participant | Full data | Other participants: name, relationship |

---

## Implementation Tasks

### Task 0: Backup (REQUIRED FIRST)
**Acceptance Criteria:**
- [ ] Archive `promptAssemblyService.ts` to `_archive/` with date suffix
- [ ] Verify backup is complete and readable
- [ ] Document in commit message

### Task 1: Create universalTemplate.ts
**Acceptance Criteria:**
- [ ] Creates `backend/src/services/prompts/universalTemplate.ts`
- [ ] Implements `getFullCharacterData(character_id, userchar_id)` function
- [ ] Queries all required tables with proper JOINs
- [ ] Returns clean, formatted `FullCharacterData` object
- [ ] Handles null values gracefully (skip, don't include empty strings)
- [ ] Formats currency, percentages correctly
- [ ] Includes `buildFieldInterpretationGuide()` function
- [ ] Has TypeScript types exported
- [ ] Unit tests for formatting logic

### Task 2: Create therapy domain handler
**Acceptance Criteria:**
- [ ] Creates `backend/src/services/prompts/domains/therapy/index.ts`
- [ ] Implements `assembleTherapyPrompt(character_id, role, context)`
- [ ] Fetches character data via universalTemplate
- [ ] Fetches other participants based on role
- [ ] Calls appropriate role context builder
- [ ] Appends conversation_history from context
- [ ] Returns final assembled prompt string

### Task 3: Create therapy role context files
**Acceptance Criteria:**
- [ ] Creates `patientContext.ts` with `buildPatientContext()`
- [ ] Creates `therapistContext.ts` with `buildTherapistContext()`
- [ ] Creates `judgeContext.ts` with `buildTherapyJudgeContext()`
- [ ] Each includes role-specific instructions
- [ ] Each includes other participants' data as appropriate

### Task 4: Create battle domain handler
**Acceptance Criteria:**
- [ ] Creates `backend/src/services/prompts/domains/battle/index.ts`
- [ ] Implements `assembleBattlePrompt(character_id, role, context)`
- [ ] Handles combatant and judge roles
- [ ] Fetches opponent/teammate/target data as needed

### Task 5: Create battle role context files
**Acceptance Criteria:**
- [ ] Creates `combatantContext.ts` with `buildCombatantContext()`
- [ ] Creates `judgeContext.ts` with `buildBattleJudgeContext()`
- [ ] Judge context includes rebel, targets, coach order, battle state

### Task 6: Create remaining 15 domain handlers
**Acceptance Criteria:**
- [ ] Each domain from the corrected list has index.ts + role context files
- [ ] All follow same pattern as therapy/battle
- [ ] abilities/ domain includes powers/ and spells/ subdomains
- [ ] messageBoard/ domain handles both regular posts and drama content
- [ ] Each domain tested individually

**Domains to implement in Task 6:**
- training/ (with groupIndex.ts)
- confessional/
- hostmaster/
- financial/
- performance/
- personalProblems/
- groupActivities/
- equipment/
- kitchenTable/
- realEstate/
- socialLounge/
- messageBoard/ (merged - includes drama)
- progression/
- attributes/
- abilities/ (with powers/ and spells/ subdomains)

### Task 7: Migrate existing callers
**Acceptance Criteria:**
- [ ] Identify all files importing from promptAssemblyService.ts
- [ ] Update each caller to use new domain assemblers
- [ ] Maintain backwards compatibility during migration
- [ ] Test each migrated caller

### Task 8: Archive old promptAssemblyService.ts
**Acceptance Criteria:**
- [ ] Rename to `_archive/promptAssemblyService.ts.archived`
- [ ] All callers use new system
- [ ] No broken imports
- [ ] CI passes

---

## Migration Strategy

1. **BACKUP FIRST** - Archive promptAssemblyService.ts before any changes
2. **Build new system alongside old** - Don't break existing code
3. **Migrate one domain at a time** - Start with therapy (most complex)
4. **Test each migration** - Verify prompts are equivalent or better
5. **Archive old code last** - Only after all callers migrated

---

## Quality Control

- [ ] Each task reviewed by separate agent
- [ ] TypeScript strict mode - no `any` types
- [ ] All DB queries use parameterized queries (no SQL injection)
- [ ] Unit tests for formatting logic
- [ ] Integration tests for full prompt assembly
- [ ] Manual review of sample prompts for quality

---

## Dependencies

- Blocks: Battle Rebellion Flow (Game Plan 002)
- Blocked by: None

---

## Notes

- Full data approach validated for business model (~1.35 cents per battle)
- Ad-funded tickets make free users profitable
- Cross-domain context (therapy memories in battle) adds depth
- ~2000-2500 tokens per prompt is acceptable
- 123 total DB tables, 21 directly relevant to character data
- 17 active domains after consolidation (skills archived, dramaBoard merged into messageBoard)
- abilities/ has 2 subdomains (powers/, spells/) that can also be called standalone
