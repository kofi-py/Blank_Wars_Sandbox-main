# Character Personality System Documentation

**Blank Wars 2026 - AI Personality Architecture**
*For Catalyst Reviewers*

---

## Table of Contents

1. [Personality Foundation](#1-personality-foundation)
2. [Dynamic Prompt Assembly](#2-dynamic-prompt-assembly)
3. [Persistent Data Per Scene](#3-persistent-data-per-scene)
4. [Psychology & State Fields](#4-psychology--state-fields)
5. [Relationships & Social Memory](#5-relationships--social-memory)
6. [Conflict Generation](#6-conflict-generation)
7. [Vintage Memories System](#7-vintage-memories-system)
8. [Comedy Style Deep Dive](#8-comedy-style-deep-dive)
9. [Scene-Specific Engineering](#9-scene-specific-engineering)
10. [Key Files Reference](#10-key-files-reference)

---

## 1. Personality Foundation

### 1.1 Archetypes

Characters are built on a foundation of archetypes that determine base behavioral patterns and adherence tendencies.

**Available Archetypes:**
| Archetype | Base Adherence | Behavior Pattern |
|-----------|----------------|------------------|
| warrior | 15 | Direct, combat-focused |
| tank | 15 | Protective, steadfast |
| leader | 20 | Commanding, strategic |
| scholar | 10 | Analytical, knowledge-seeking |
| mage | 5 | Mystical, unpredictable |
| mystic | 0 | Enigmatic, spiritual |
| trickster | -10 | Deceptive, chaotic |
| beast | -15 | Instinctual, wild |
| assassin | 5 | Calculating, precise |
| system | 25 | Rule-following, structured |

**Database Field:** `characters.archetype`
**Location:** `src/config/gameConstants.ts:51-62`

### 1.2 Species System

Species determines innate relationship modifiers and behavioral tendencies.

**Available Species:**
- human, deity, undead, monster, demon, angel, automaton, construct, beast, spirit

**Species Relationship Modifiers (Examples):**
| Species Pair | Modifier | Description |
|--------------|----------|-------------|
| vampire-werewolf | -30 | Blood feud |
| vampire-vampire | +20 | Kindred spirits |
| angel-demon | -40 | Cosmic opposition |
| angel-vampire | -20 | Holy vs unholy |

**Database Field:** `characters.species`
**Location:** `src/config/gameConstants.ts:79-90`

### 1.3 Rarity System

Rarity affects character power scaling and adherence modifiers.

**Rarity Tiers:**
| Rarity | Adherence Modifier |
|--------|-------------------|
| common | -5 |
| uncommon | 0 |
| rare | +5 |
| epic | +10 |
| legendary | +15 |
| mythic | +20 |

**Database Field:** `characters.rarity`
**Location:** `src/config/gameConstants.ts:67-74`

### 1.4 Individual Personality Traits

Each character has unique personality traits stored as an array that influence dialogue generation and behavioral responses.

**Database Fields:**
```sql
-- From user_characters table
personality_traits: text[]      -- Array of trait strings
conversation_style: text        -- From base characters table
backstory: text                 -- Character history
conversation_topics: text       -- Preferred discussion subjects
avatar_emoji: text              -- Visual representation
```

### 1.5 Personality Misalignment Scenarios

When a character's current psychological state conflicts with their archetype:

**Example:** A `leader` archetype with low confidence (< 30) experiences:
- Reduced adherence score
- Internal conflict in dialogue
- Potential rebellion against coach decisions

**Adherence Threshold:** 70
- `>= 70`: Character follows coach decisions
- `< 70`: Character may rebel or make autonomous choices

---

## 2. Dynamic Prompt Assembly

### 2.1 Core Assembly Service

**Primary File:** `src/services/promptAssemblyService.ts`

The prompt assembly system dynamically constructs character prompts by combining:
1. Base personality template
2. Current psychological state
3. Financial situation
4. Relationship context
5. Scene-specific instructions
6. Memory/history injection

### 2.2 Universal Prompt Components

```
universalPrompt     - Base template with character role, voice guidelines
contextInjection    - Roommate context, financial data, battle history
sceneContext        - Scene-specific instructions and tone
DuplicateDetection  - Prevents repetitive responses
```

### 2.3 Data Fields Injected Per Scene

| Field | Source | Purpose |
|-------|--------|---------|
| `wallet_balance` | user_characters | Financial mood scaling |
| `current_debt` | user_characters | Stress indicator |
| `stress_level` | user_characters | Emotional state |
| `current_hp` | user_characters | Physical state awareness |
| `coach_trust_level` | user_characters | Relationship with coach |
| `battle_record` | computed | Win/loss context |
| `roommates` | team data | Social context |
| `recent_events` | game_events | Situational awareness |
| `relationship_summaries` | character_relationships | Social dynamics |

### 2.4 Live Database State Effects

**Financial Mood Scaling:**
```javascript
// From promptAssemblyService.ts
Wallet Balance → Character Mood:
$0-500:      "desperate, stressed about money"
$500-5000:   "concerned about finances"
$5000-50k:   "comfortable, stable"
$50k-500k:   "confident, financially secure"
$500k+:      "wealthy, financially dominant"
```

**HP-Based Adherence Modifiers:**
```javascript
HP <= 10%:  -50 adherence (HP_CRITICAL)
HP <= 25%:  -30 adherence (HP_LOW)
HP <= 50%:  -15 adherence (HP_WOUNDED)
```

**Stress Effects:**
```javascript
Stress > 70: -20 adherence (STRESS_HIGH)
```

### 2.5 Character-Specific Prompt Builders

| Function | Character | Location |
|----------|-----------|----------|
| `buildHolmesPatientPrompt()` | Sherlock Holmes | lines 165-236 |
| `buildMerlinPatientPrompt()` | Merlin | lines 242-315 |
| `buildAchillesPatientPrompt()` | Achilles | lines 321-394 |
| `buildCarlJungTherapistPrompt()` | Carl Jung | lines 400-480 |
| `buildZxk14bw7Prompt()` | Alien Therapist | lines 486+ |

---

## 3. Persistent Data Per Scene

### 3.1 What Gets SAVED After Each Interaction

**Psychology Stats Updated:**
```sql
current_mental_health  -- Therapy breakthroughs or conflicts
stress_level           -- Financial decisions, battles, conflicts
confidence_level       -- Wins/losses, bond changes
morale                 -- Team chemistry, recent events
gameplan_adherence     -- Follow-through or rebellion
coach_trust_level      -- Coaching session outcomes
financial_stress       -- Financial decisions and earnings
fatigue_level          -- Training and battle wear
```

### 3.2 Memory Creation & Storage

**Character Memory Table:**
```sql
CREATE TABLE character_memories (
    id SERIAL PRIMARY KEY,
    character_id VARCHAR(255),
    event_id INTEGER,

    -- Core Memory Data
    content TEXT,
    intensity INTEGER (1-10),
    valence VARCHAR(20),        -- positive/negative/neutral
    importance INTEGER (1-10),
    decay_rate DECIMAL,

    -- Recall Tracking
    created_at TIMESTAMP,
    last_recalled TIMESTAMP,
    recall_count INTEGER,

    -- Categorization
    tags TEXT[],
    associated_characters TEXT[],

    -- Rich Metadata (JSON)
    chat_context JSONB,
    cross_reference_data JSONB,
    financial_metadata JSONB,
    therapy_metadata JSONB,
    confessional_metadata JSONB
);
```

### 3.3 Bond/Trust Changes From Interactions

**Bond Increase Triggers:**
- Successful therapy sessions
- Positive social interactions
- Shared battle victories
- Conflict resolution
- Gift giving / financial support

**Bond Decrease Triggers:**
- Conflict escalation
- Betrayal events
- Neglect (no interaction over time)
- Failed coaching decisions
- Financial disputes

**Tracking Field:** `conversation_memory` in user_characters contains:
```typescript
interface ChatMemory {
  user_message: string;
  character_response: string;
  timestamp: Date;
  context?: any;
  bond_increase?: boolean;  // Tracks if interaction improved bond
}
```

---

## 4. Psychology & State Fields

### 4.1 Complete Psychology Field List

| Field | Range | Default | Description |
|-------|-------|---------|-------------|
| `current_ego` | 0-100 | 50 | Self-importance, pride level |
| `current_mental_health` | 0-100 | 80 | Psychological stability |
| `current_training` | 0-100 | 75 | Training effectiveness |
| `current_team_player` | 0-100 | 70 | Cooperative tendency |
| `current_communication` | 0-100 | 50 | Openness in dialogue |
| `stress_level` | 0-100 | 25 | Current anxiety/pressure |
| `morale` | 0-100 | 80 | Overall spirit/motivation |
| `fatigue_level` | 0-100 | 0 | Physical/mental exhaustion |
| `confidence_level` | 0-100 | 50 | Self-assurance (derived) |
| `gameplan_adherence` | 0-100 | varies | Willingness to follow orders |
| `financial_stress` | 0-100 | varies | Money-related anxiety |
| `coach_trust_level` | 0-100 | 50 | Trust in coach decisions |

### 4.2 How Each Field Affects Behavior

**High Ego (> 70):**
- More dramatic dialogue
- Resistant to criticism
- Demands attention in group scenes
- May clash with other high-ego characters

**Low Mental Health (< 40):**
- Erratic responses
- More vulnerable in therapy
- Increased conflict likelihood
- May require intervention events

**High Stress (> 70):**
- Reduced adherence (-20)
- Shorter, more tense responses
- Increased conflict triggers
- Financial decisions more desperate

**Low Confidence (< 30):**
- Reduced adherence (-15)
- Self-deprecating dialogue
- Hesitant in battle scenarios
- More receptive to encouragement

### 4.3 Coach Trust Calculation

Coach trust is affected by:
```
+ Successful battle outcomes following coach strategy
+ Positive coaching session interactions
+ Financial improvements under guidance
- Battle losses when following coach orders
- Ignored advice that would have helped
- Perceived unfair treatment
```

### 4.4 Team Player Score Effects

| Score | Behavior |
|-------|----------|
| 90-100 | Actively supports teammates, sacrifices for team |
| 70-89 | Cooperative, follows team decisions |
| 50-69 | Neutral, self-interested but not disruptive |
| 30-49 | Selfish tendencies, may cause friction |
| 0-29 | Actively undermines team, solo player |

---

## 5. Relationships & Social Memory

### 5.1 Character-to-Character Relationship Tracking

**Database Table:** `character_relationships`

```sql
CREATE TABLE character_relationships (
    id SERIAL PRIMARY KEY,
    character1_id VARCHAR(255),
    character2_id VARCHAR(255),

    -- PRE-EXISTING MODIFIERS
    species_modifier INT,           -- From species_relationships lookup
    archetype_modifier INT,         -- From archetype_relationships lookup
    personal_vendetta BOOLEAN,
    vendetta_description TEXT,
    base_disposition INT,

    -- DYNAMIC STATE (-100 to +100)
    current_trust INT,
    current_respect INT,
    current_affection INT,
    current_rivalry INT,            -- 0-100

    -- COMPUTED STATUS
    relationship_status VARCHAR(50), -- enemy, rival, neutral, friend, ally
    trajectory VARCHAR(20),          -- improving, declining, stable, volatile
    progress_score INT,

    -- EVENT TRACKING
    shared_battles INT,
    conflicts_resolved INT,
    therapy_sessions_together INT,
    positive_interactions INT,
    negative_interactions INT,
    shared_experiences TEXT[],

    last_interaction TIMESTAMP,

    UNIQUE(character1_id, character2_id)
);
```

### 5.2 Rivalry System

**Rivalry Levels (0-100):**
| Level | Status | Behavior |
|-------|--------|----------|
| 0-20 | No rivalry | Normal interactions |
| 21-50 | Mild rivalry | Competitive comments |
| 51-75 | Active rivalry | Antagonistic dialogue |
| 76-100 | Intense rivalry | Open hostility, trash talk |

**Rivalry Triggers:**
- Competing for same resources
- Battle defeats against each other
- Conflicting archetypes (warrior vs trickster)
- Species animosity (vampire vs werewolf)
- Personal vendettas from backstory

### 5.3 How Past Interactions Influence Future Behavior

The `EventContextService` builds memory context by:

1. **Retrieving Recent Events:**
   - Last 10 interactions with specific character
   - Shared battle experiences
   - Conflict history

2. **Calculating Relationship Summary:**
   ```typescript
   // Injected into prompts
   relationship_summary: {
     allies: ["Character A", "Character B"],
     rivals: ["Character C"],
     neutral: ["Character D", "Character E"],
     recent_conflict_with: "Character C",
     trust_trajectory: "improving"
   }
   ```

3. **Emotional State Aggregation:**
   - Combines stress, confidence, morale
   - Informs dialogue tone and receptiveness

### 5.4 Social Message Autonomy (Trash Talk System)

Characters can autonomously generate social messages based on:
- Rivalry level with target
- Recent battle outcomes
- Current ego and confidence
- Comedy style assignment

**Autonomous Decision Service:** `src/services/autonomousDecisionService.ts`

---

## 6. Conflict Generation

### 6.1 Scene Calculation Service

**File:** `src/services/sceneCalculationService.ts`

### 6.2 Scene Type Calculation

```typescript
calculateSceneType(team_id): 'mundane' | 'conflict' | 'chaos'
```

**Base Weights:**
```javascript
{
  mundane: 60,   // Default household situations
  conflict: 30,  // Arguments and disagreements
  chaos: 10      // Emergencies and crises
}
```

### 6.3 Conflict Modifiers

**Floor Sleeper Impact:**
```javascript
> 2 floor sleepers:
  - conflict: +20
  - chaos: +10
  - mundane: -30

1 floor sleeper:
  - conflict: +10
  - mundane: -10
```

**Recent Crisis Events:**
```javascript
If recent battle_defeat OR financial_crisis OR drama_escalation:
  - chaos: +30
  - conflict: +10
  - mundane: -40
```

### 6.4 Conflict Types

| Type | Trigger | Location |
|------|---------|----------|
| kitchen_argument | Resource competition | Kitchen table scene |
| bathroom_conflict | Morning routines | Household |
| bedroom_dispute | Sleep arrangements | Household |
| cleaning_conflict | Chore disputes | Household |
| noise_complaint | Disturbance issues | Household |
| alliance_broken | Betrayal event | Any social scene |

### 6.5 How Conflicts Affect Stats

**During Conflict:**
- `stress_level`: +10 to +30
- `morale`: -5 to -20
- `relationship.current_trust`: -5 to -25

**After Resolution:**
- `stress_level`: -5 to -15 (relief)
- `conflicts_resolved`: +1
- `relationship.progress_score`: +5 to +15

### 6.6 Resolution Mechanics

Conflicts resolve through:
1. **Therapy Sessions** - Mediator intervention
2. **Natural Decay** - Time reduces tension
3. **Positive Events** - Shared victories override conflicts
4. **Coach Intervention** - Direct mediation
5. **Character Choice** - Autonomous apology/reconciliation

---

## 7. Vintage Memories System

### 7.1 Memory Architecture

The memory system uses the **GameEventBus** (`src/services/gameEventBus.ts`) as a centralized event and memory management system.

### 7.2 Memory Selection for Preservation

Memories are preserved based on:

**Importance Score (1-10):**
```javascript
importance >= 7: Always preserved
importance 4-6:  Preserved if frequently recalled
importance 1-3:  Subject to decay
```

**Preservation Triggers:**
- High emotional intensity (intensity >= 8)
- Relationship-defining moments
- Battle milestones (first win, first loss)
- Financial turning points
- Therapy breakthroughs

### 7.3 Memory Decay Mechanism

```sql
decay_rate DECIMAL  -- Rate at which memory fades
last_recalled TIMESTAMP
recall_count INTEGER
```

**Decay Formula:**
```
effective_importance = importance * (1 - decay_rate * days_since_recall)
```

**Recall Boost:**
- Each recall increases `recall_count`
- High recall_count reduces effective decay
- Memories referenced in conversation get recalled

### 7.4 What Makes a Memory "Vintage"

A memory becomes vintage when:
1. **Age:** Created > 30 game-days ago
2. **Importance:** importance >= 6
3. **Recall History:** recall_count >= 3
4. **Emotional Weight:** intensity >= 5

**Vintage Memory Effects:**
- Referenced in "remember when..." dialogue
- Used for comedy callbacks
- Influences long-term relationship calculations
- May trigger nostalgia-based events

### 7.5 Memory Influence on Personality

Cross-reference data stored with memories:
```json
{
  "embarrassment_level": 7,
  "contradiction_potential": 8,
  "quotability": 6,
  "secret_level": 3,
  "comedy_potential": 9,
  "comedy_tags": ["embarrassing", "hypocritical"]
}
```

This data allows characters to:
- Reference past contradictions
- Recall embarrassing moments at opportune times
- Build running jokes from shared history

---

## 8. Comedy Style Deep Dive

### 8.1 Comedy Style Database

**Table:** `comedian_styles`
```sql
CREATE TABLE comedian_styles (
    id INTEGER PRIMARY KEY,
    category VARCHAR(20),        -- 'public_domain' | 'inspired'
    comedian_name VARCHAR(100),
    birth_year INTEGER,
    death_year INTEGER,
    era VARCHAR(50),
    comedy_style TEXT,           -- Detailed style description
    example_material TEXT,
    notes TEXT
);
```

### 8.2 Available Comedy Styles

| Style ID | Style Type | Characteristics |
|----------|------------|-----------------|
| deadpan_014 | Deadpan | Flat delivery, dry wit |
| magician_051 | Mystical Deadpan | Ancient wisdom meets dry humor |
| warrior_humor | Physical/Boastful | Epic exaggeration, battle metaphors |
| analytical | Intellectual | Psychology-based observations |
| cosmic_alien | Absurdist | Otherworldly perspective, non-sequiturs |

### 8.3 Comedy Style Injection

Comedy style is injected via `promptAssemblyService.ts`:

```typescript
// Example from Holmes prompt builder
const comedyStylePrompt = `
Your humor style: ${comedianStyle.comedy_style}
Example material: ${comedianStyle.example_material}
Apply this comedic sensibility to your responses while staying in character.
`;
```

### 8.4 Same Situation, Different Comedy Styles

**Scenario:** Character discovers they're broke

**Deadpan (Holmes):**
> "Fascinating. My wallet appears to have achieved a state of perfect emptiness. A void, if you will."

**Warrior Humor (Achilles):**
> "This is an OUTRAGE! My treasury lies in ruins! Surely some villain has robbed me of my glory!"

**Mystical (Merlin):**
> "Ah, the eternal cycle. Gold flows like rivers, and rivers run dry. I foresaw this... eventually."

**Analytical (Jung):**
> "Interesting. The shadow self emerges when confronting financial lack. What does money represent to you?"

### 8.5 Comedy Template Service

**File:** `src/services/comedyTemplateService.ts`

**Template Categories:**
| Category | Purpose |
|----------|---------|
| Contradiction | Catching hypocrisy in past vs present |
| Embarrassing | Recalling awkward moments |
| Ironic | Pointing out situational irony |
| Callback | Referencing patterns and history |

**Template Variables:**
```typescript
{
  chat_system: string,      // kitchen, therapy, training
  time_reference: string,   // just now, earlier today, yesterday
  topic: string,            // bathroom, money, training, battle
  action: string,           // arguing, complaining, bragging
  emotional_event: string,  // meltdown, breakdown, moment
  character_name: string,
  past_behavior: string,    // got all worked up, opened up
  severity: string          // dramatic, emotional, upset
}
```

**Example Template:**
```
"Funny, because in {chat_system} {time_reference} you were {action} about {topic}..."
```

### 8.6 Comedy Style Realignment

When comedy style doesn't fit the character's current state:

**Mismatch Detection:**
- High stress + deadpan style = forced humor
- Low ego + boastful style = awkward delivery
- Recent trauma + any comedy = reduced humor attempts

**Realignment Behavior:**
- Comedy attempts decrease when mental_health < 40
- Style may shift temporarily during crisis
- Authentic emotional moments override comedy injection

---

## 9. Scene-Specific Engineering

### 9.1 All Scene Types

**Living/Household Scenes:**
| Scene | Context | Tone |
|-------|---------|------|
| kitchen_table | Casual living space | Relaxed, domestic |
| kitchen_argument | Resource disputes | Tense, competitive |
| bathroom_conflict | Morning routines | Frustrated, rushed |
| bedroom_dispute | Sleep/space issues | Irritated, tired |
| meal_sharing | Communal eating | Social, bonding |
| cleaning_conflict | Chore disputes | Accusatory |
| late_night_conversation | After hours | Intimate, vulnerable |

**Therapy Scenes:**
| Scene | Context | Tone |
|-------|---------|------|
| therapy_session | Individual therapy | Probing, supportive |
| group_therapy | Multiple characters | Complex dynamics |
| therapy_breakthrough | Emotional revelation | Intense, cathartic |
| therapy_resistance | Defensive patient | Guarded, deflecting |
| confessional_booth | Private confession | Secretive, guilty |

**Battle/Training Scenes:**
| Scene | Context | Tone |
|-------|---------|------|
| battle_arena | Combat discussion | Strategic, intense |
| training_grounds | Skill development | Focused, physical |
| battle_briefing | Pre-fight planning | Tactical, serious |
| equipment_room | Gear consultation | Technical, advisory |

**Social/Administrative Scenes:**
| Scene | Context | Tone |
|-------|---------|------|
| social_lounge | Casual bonding | Friendly, relaxed |
| clubhouse | Team meetings | Official, collective |
| message_board | Announcements | Informational |
| drama_board | Gossip/manipulation | Scheming, social |
| real_estate_office | Housing upgrades | Business, aspirational |
| financial_advisory | Money decisions | Serious, analytical |

### 9.2 Scene Context Modification

Each scene injects specific context via `EventContextService`:

**Therapy Scene Injection:**
```typescript
{
  therapeutic_intensity: 'soft' | 'medium' | 'hard',
  patient_vulnerabilities: [...],
  breakthrough_potential: number,
  defense_mechanisms: [...],
  therapist_approach: string
}
```

**Battle Scene Injection:**
```typescript
{
  opponent_analysis: {...},
  battle_record: { wins, losses },
  team_morale: number,
  strategy_adherence: number,
  injury_status: {...}
}
```

**Kitchen Table Injection:**
```typescript
{
  present_characters: [...],
  current_conflicts: [...],
  resource_scarcity: boolean,
  time_of_day: string,
  recent_household_events: [...]
}
```

### 9.3 Tone Shifting Based on Scene

**Tone Modifiers by Scene:**
```javascript
const sceneToneModifiers = {
  therapy: {
    formality: -20,      // More casual/vulnerable
    humor: -30,          // More serious
    emotional_depth: +40 // More introspective
  },
  battle: {
    formality: +10,
    aggression: +30,
    focus: +40
  },
  kitchen_table: {
    formality: -30,
    humor: +20,
    social: +30
  },
  confessional: {
    formality: -10,
    guilt: +40,
    secrecy: +50
  }
}
```

### 9.4 Context Variables Per Scene

| Scene | Primary Variables |
|-------|-------------------|
| therapy | intensity, vulnerabilities, defense_mechanisms |
| confessional | guilt_level, secrets, confession_history |
| kitchen_table | roommates, conflicts, resources, time_of_day |
| battle_briefing | opponent, strategy, team_composition, stakes |
| training | skill_focus, fatigue, trainer_relationship |
| social_lounge | present_characters, gossip, alliances |
| financial_advisory | wallet, debt, investment_options |
| equipment_room | current_gear, upgrade_options, budget |

### 9.5 Time of Day Calculation

**File:** `src/services/sceneCalculationService.ts`

```typescript
calculateTimeOfDay(user_id): 'morning' | 'afternoon' | 'evening' | 'night'

// Time Ranges:
5-12:  morning
12-18: afternoon
18-22: evening
22-5:  night
```

**Time Effects on Scenes:**
- Morning: Higher conflict potential (bathroom, breakfast)
- Afternoon: Training/battle focused
- Evening: Social bonding scenes
- Night: Vulnerable/intimate conversations

---

## 10. Key Files Reference

### Core Configuration
| File | Purpose |
|------|---------|
| `src/config/gameConstants.ts` | Archetypes, species, rarity, adherence modifiers |
| `src/types/index.ts` | TypeScript type definitions |

### Services
| File | Purpose |
|------|---------|
| `src/services/promptAssemblyService.ts` | Dynamic prompt generation |
| `src/services/adherenceCalculationService.ts` | Adherence score calculation |
| `src/services/autonomousDecisionService.ts` | Character rebellion & choices |
| `src/services/gameEventBus.ts` | Centralized event & memory system |
| `src/services/eventContextService.ts` | Smart context compression |
| `src/services/comedyTemplateService.ts` | Cross-reference humor generation |
| `src/services/sceneCalculationService.ts` | Scene type & time calculation |
| `src/services/memoryService.ts` | Character memory persistence |
| `src/services/bondTrackingService.ts` | Relationship & bond tracking |
| `src/services/databaseAdapter.ts` | Character data access layer |

### Routes
| File | Purpose |
|------|---------|
| `src/routes/characterRoutes.ts` | Character CRUD endpoints |
| `src/routes/coachingRoutes.ts` | Coaching session endpoints |
| `src/routes/ai.ts` | AI chat and response endpoints |

### Database
| File | Purpose |
|------|---------|
| `migrations/001_baseline_schema.sql` | Core schema definitions |
| `migrations/072_add_character_relationship_system.sql` | Relationship tables |

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHARACTER INTERACTION FLOW                   │
└─────────────────────────────────────────────────────────────────┘

1. CHARACTER SETUP
   ├── Load base character (archetype, species, rarity)
   ├── Load user_character instance (psychology stats, wallet)
   └── Load comedian_style assignment

2. CONTEXT BUILDING
   ├── EventContextService.buildMemoryContext()
   ├── ComedyTemplateService.findCrossReferences()
   ├── SceneCalculationService.calculateSceneType()
   └── DatabaseAdapter.loadRelationships()

3. PROMPT ASSEMBLY
   ├── Universal template (role, financial, voice)
   ├── Context injection (roommates, battles, relationships)
   ├── Scene-specific instructions (tone, intensity)
   └── Duplicate detection layer

4. AI GENERATION
   ├── OpenAI API call (temperature: 0.8)
   └── Response parsing (JSON or text)

5. PERSISTENT UPDATES
   ├── Psychology stat modifications
   ├── Memory storage with metadata
   ├── Event publication to game_events
   ├── Relationship state updates
   └── Bond level adjustment
```

---

*Document generated for Project Catalyst review - Blank Wars 2026*
