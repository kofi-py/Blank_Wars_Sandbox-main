# Prompt System Architecture Flowchart

## High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CALLER                                          │
│                    (Routes / Services / WebSocket Handlers)                  │
│                                                                             │
│  1. Gets conversation_history from:                                         │
│     • Request body (recent messages from frontend)                          │
│     • DB query (chat_sessions, team_chat_logs, lounge_messages)            │
│                                                                             │
│  2. Gets participant IDs from session/request                               │
│                                                                             │
│  3. Determines domain (therapy, battle, training, etc.)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DOMAIN HANDLER                                         │
│                  domains/{domain}/index.ts                                   │
│                                                                             │
│  • assembleTherapyPrompt()                                                  │
│  • assembleBattlePrompt()                                                   │
│  • assembleTrainingPrompt()                                                 │
│  • etc.                                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│  UNIVERSAL TEMPLATE  │  │  SCENE CONTEXT   │  │  ROLE CONTEXT        │
│  universalTemplate.ts│  │  (from domain)   │  │  {role}Context.ts    │
│                      │  │                  │  │                      │
│  getFullCharacterData│  │  • Setting       │  │  • patientContext    │
│  (character_id)      │  │  • Situation     │  │  • therapistContext  │
│                      │  │  • Other chars   │  │  • combatantContext  │
│  Queries 21+ tables  │  │  • Battle state  │  │  • traineeContext    │
│  Returns complete    │  │  • Session info  │  │  • etc.              │
│  character profile   │  │                  │  │                      │
└──────────────────────┘  └──────────────────┘  └──────────────────────┘
                    │                │                │
                    └────────────────┼────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ASSEMBLED PROMPT                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SYSTEM PROMPT                                                        │   │
│  │ ├── Field Interpretation Guide (how to use your data)               │   │
│  │ ├── Character Identity (name, title, species, archetype)            │   │
│  │ ├── Personality (backstory, traits, conversation_style, comedian)   │   │
│  │ ├── Current State (health, wallet, psych stats)                     │   │
│  │ ├── Relationships (trust, respect, affection, rivalry per char)     │   │
│  │ ├── Abilities (powers, spells, equipment)                           │   │
│  │ ├── Memories (recent_memories with emotion/intensity)               │   │
│  │ ├── Scene Context (domain-specific: battle state, therapy setting)  │   │
│  │ └── Role Instructions (what this character should do in this scene) │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CONVERSATION HISTORY                                                 │   │
│  │ └── Recent messages from chat session                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OPENAI API                                      │
│                         (GPT-4 / GPT-4-turbo)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI RESPONSE                                        │
│                    (Character dialogue / actions)                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Domain Structure

```
backend/src/services/prompts/
│
├── universalTemplate.ts          ◄── Shared by ALL domains
│   ├── getFullCharacterData()        Queries 21+ DB tables
│   ├── formatCharacterData()         Clean formatting
│   └── buildFieldInterpretationGuide()
│
├── domainHandler.ts              ◄── Routes to correct domain
│
└── domains/
    │
    ├── therapy/                  ◄── Individual & Group therapy
    │   ├── index.ts                  assembleTherapyPrompt()
    │   ├── groupIndex.ts             assembleGroupTherapyPrompt()
    │   ├── patientContext.ts         buildPatientContext()
    │   ├── therapistContext.ts       buildTherapistContext()
    │   └── judgeContext.ts           buildTherapyJudgeContext()
    │
    ├── battle/                   ◄── Combat with rebellion system
    │   ├── index.ts                  assembleBattlePrompt()
    │   ├── combatantContext.ts       buildCombatantContext()
    │   ├── judgeContext.ts           buildBattleJudgeContext()
    │   └── rulingLogic.ts            interpretRebellionAction()
    │
    ├── training/                 ◄── Individual & Group training
    │   ├── index.ts                  assembleTrainingPrompt()
    │   ├── groupIndex.ts             assembleGroupTrainingPrompt()
    │   ├── traineeContext.ts         buildTraineeContext()
    │   └── trainerContext.ts         buildTrainerContext()
    │
    ├── confessional/             ◄── Private camera confessions
    │   ├── index.ts                  assembleConfessionalPrompt()
    │   ├── contestantContext.ts      buildContestantContext()
    │   └── hostmasterContext.ts      buildHostmasterContext()
    │
    ├── hostmaster/               ◄── Game show host interactions
    │   ├── index.ts                  assembleHostmasterPrompt()
    │   └── hostmasterContext.ts      buildHostmasterContext()
    │
    ├── financial/                ◄── Money management advice
    │   ├── index.ts                  assembleFinancialPrompt()
    │   └── advisorContext.ts         buildFinancialAdvisorContext()
    │
    ├── equipment/                ◄── Gear and loadout advice
    │   ├── index.ts                  assembleEquipmentPrompt()
    │   └── advisorContext.ts         buildEquipmentAdvisorContext()
    │
    ├── kitchenTable/             ◄── Casual social chat
    │   ├── index.ts                  assembleKitchenTablePrompt()
    │   └── socialContext.ts          buildKitchenTableContext()
    │
    ├── abilities/                ◄── Parent: Powers + Spells coaching
    │   ├── index.ts                  assembleAbilitiesPrompt()
    │   ├── mentorContext.ts          buildAbilitiesMentorContext()
    │   ├── powers/                   SUBDOMAIN (standalone capable)
    │   │   ├── index.ts              assemblePowersPrompt()
    │   │   └── coachContext.ts       buildPowersCoachContext()
    │   └── spells/                   SUBDOMAIN (standalone capable)
    │       ├── index.ts              assembleSpellsPrompt()
    │       └── mentorContext.ts      buildSpellsMentorContext()
    │
    └── [12 more domains...]
```

---

## Data Tables Queried by Universal Template

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHARACTER DATA (21 tables)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  IDENTITY & PERSONALITY                   PROGRESSION & STATE               │
│  ┌─────────────────────────┐              ┌─────────────────────────┐       │
│  │ characters              │              │ user_characters          │       │
│  │ • name, title           │              │ • level, experience      │       │
│  │ • backstory             │              │ • wallet, debt           │       │
│  │ • personality_traits    │              │ • current_* psych stats  │       │
│  │ • conversation_style    │              │ • gameplan_adherence     │       │
│  │ • combat stats          │              │ • sleeping_arrangement   │       │
│  │ • comedian_style_id     │              └─────────────────────────┘       │
│  └─────────────────────────┘                                                │
│  ┌─────────────────────────┐              ABILITIES                         │
│  │ comedian_styles         │              ┌─────────────────────────┐       │
│  │ • comedian_name         │              │ character_powers         │       │
│  │ • comedy_style          │              │ character_spells         │       │
│  └─────────────────────────┘              │ character_equipment      │       │
│                                           │ character_items          │       │
│  RELATIONSHIPS                            │ character_abilities      │       │
│  ┌─────────────────────────┐              │ character_power_loadout  │       │
│  │ character_relationships │              │ character_spell_loadout  │       │
│  │ • trust                 │              └─────────────────────────┘       │
│  │ • respect               │                                                │
│  │ • affection             │              HISTORY                           │
│  │ • rivalry               │              ┌─────────────────────────┐       │
│  │ • shared_battles        │              │ character_memories       │       │
│  │ • shared_therapy        │              │ character_decisions      │       │
│  └─────────────────────────┘              │ character_healing_sessions│      │
│                                           │ character_experience_log │       │
│  LIVING SITUATION                         └─────────────────────────┘       │
│  ┌─────────────────────────┐                                                │
│  │ character_living_context│                                                │
│  │ • HQ tier               │                                                │
│  │ • room assignment       │                                                │
│  └─────────────────────────┘                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Role-Based Data Visibility

```
                           THERAPY DOMAIN
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  PATIENT sees:              THERAPIST sees:         JUDGE sees:          │
│  ┌──────────────────┐       ┌──────────────────┐    ┌──────────────────┐ │
│  │ Self: FULL DATA  │       │ Self: FULL DATA  │    │ Self: FULL DATA  │ │
│  │                  │       │                  │    │                  │ │
│  │ Therapist:       │       │ Patient:         │    │ Patient:         │ │
│  │ • name           │       │ • FULL DATA      │    │ • FULL DATA      │ │
│  │ • style          │       │                  │    │                  │ │
│  │ • intensity      │       │                  │    │ Therapist:       │ │
│  └──────────────────┘       └──────────────────┘    │ • name, style    │ │
│                                                      │                  │ │
│                                                      │ Transcript:      │ │
│                                                      │ • full session   │ │
│                                                      └──────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘

                            BATTLE DOMAIN
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  COMBATANT sees:                      JUDGE sees:                        │
│  ┌────────────────────────────┐       ┌────────────────────────────────┐ │
│  │ Self: FULL DATA            │       │ Self: FULL DATA                │ │
│  │                            │       │                                │ │
│  │ Teammates:                 │       │ Rebel:                         │ │
│  │ • name, HP, position       │       │ • FULL DATA + psych state      │ │
│  │ • relationship             │       │                                │ │
│  │                            │       │ Intended Target:               │ │
│  │ Opponents:                 │       │ • summary                      │ │
│  │ • name, HP, position       │       │                                │ │
│  │ • relationship             │       │ Actual Target:                 │ │
│  │                            │       │ • summary + relationship       │ │
│  │ Battle State:              │       │                                │ │
│  │ • turn order               │       │ Coach Order:                   │ │
│  │ • hex grid positions       │       │ • what coach commanded         │ │
│  │ • active effects           │       │                                │ │
│  └────────────────────────────┘       │ Battle State:                  │ │
│                                       │ • full context                 │ │
│                                       └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Prompt Assembly Sequence

```
┌─────┐    ┌──────────┐    ┌───────────────────┐    ┌─────────────┐    ┌────────┐
│Route│    │ Domain   │    │ Universal         │    │ Role        │    │ OpenAI │
│     │    │ Handler  │    │ Template          │    │ Context     │    │ API    │
└──┬──┘    └────┬─────┘    └────────┬──────────┘    └──────┬──────┘    └───┬────┘
   │            │                   │                      │               │
   │ 1. Request │                   │                      │               │
   │───────────>│                   │                      │               │
   │            │                   │                      │               │
   │            │ 2. getFullCharacterData(id)              │               │
   │            │──────────────────>│                      │               │
   │            │                   │                      │               │
   │            │                   │ 3. Query 21+ tables  │               │
   │            │                   │ ◄──────────────────► │               │
   │            │                   │      (Database)      │               │
   │            │                   │                      │               │
   │            │ 4. FullCharacterData                     │               │
   │            │<──────────────────│                      │               │
   │            │                   │                      │               │
   │            │ 5. buildRoleContext(data, scene)         │               │
   │            │─────────────────────────────────────────>│               │
   │            │                   │                      │               │
   │            │ 6. Role-specific prompt section          │               │
   │            │<─────────────────────────────────────────│               │
   │            │                   │                      │               │
   │            │ 7. Assemble final prompt                 │               │
   │            │ (Field Guide + Data + Scene + Role + History)            │
   │            │                   │                      │               │
   │ 8. Final prompt                │                      │               │
   │<───────────│                   │                      │               │
   │            │                   │                      │               │
   │ 9. Send to API                 │                      │               │
   │───────────────────────────────────────────────────────────────────────>│
   │            │                   │                      │               │
   │ 10. AI Response                │                      │               │
   │<──────────────────────────────────────────────────────────────────────│
   │            │                   │                      │               │
```

---

## 17 Active Domains

| Domain | Type | Description |
|--------|------|-------------|
| therapy | Individual/Group | Mental health sessions with AI therapists |
| battle | Combat | Turn-based battles with rebellion mechanic |
| training | Individual/Group | Stat improvement sessions |
| confessional | Solo | Private camera confessions (reality TV style) |
| hostmaster | System | Game show host interactions |
| financial | Advisory | Money management guidance |
| performance | Advisory | Combat performance coaching |
| personalProblems | Advisory | Life advice and counseling |
| groupActivities | Group | Team bonding activities |
| equipment | Advisory | Gear and loadout recommendations |
| kitchenTable | Social | Casual conversation in common areas |
| realEstate | Advisory | HQ and housing decisions |
| socialLounge | Social | Public social interactions |
| messageBoard | Social | Posts, drama, social media style |
| progression | Advisory | Level up and milestone guidance |
| attributes | Advisory | Base stat development |
| abilities | Parent | Unified powers + spells (with subdomains) |

---

*Generated: 2025-12-07*
