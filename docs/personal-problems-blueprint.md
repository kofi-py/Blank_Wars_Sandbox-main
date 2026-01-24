# Personal Problems Gamification Blueprint
## Blank Wars 2026

---

## 1. System Overview

Personal Problems is a **choose-your-own-adventure narrative system** where coaches guide characters through multi-session story arcs about specific problems generated from the character's actual situation.

**Core Principles:**
- Problems are specific and contextual (generated from real character data)
- Story arcs unfold over multiple sessions with time-gated decision points
- Coach can engage via conversation OR quick-action buttons (both map to same outcomes)
- Different problem categories have different arc templates
- Resolution rewards/penalties are tied to the specific ending reached

**Key Differences from Therapy:**
| Therapy | Personal Problems |
|---------|-------------------|
| Generic mental health sessions | Specific problem arcs |
| AI evaluates character's responses | Coach's choices shape story direction |
| Round-based A-E grading | Branching narrative with designed endings |
| Same structure every time | Different templates per problem category |

---

## 2. Problem Categories

From the existing `personalProblemGeneratorService.ts`, problems fall into these categories:

### Relationship Problems
- `relationship_conflict` - Active rivalry/tension with specific character
- `trust_issues` - Broken trust with someone they've fought alongside
- `coach_trust_issues` - Low trust in the coach specifically

### Financial Problems
- `financial_crisis` - Severe debt, can't pay bills
- `financial_pressure` - Moderate money stress

### Psychological Problems
- `mental_health_struggle` - Low mental health stat
- `overwhelming_stress` - High stress affecting function
- `lost_hope` - Low morale, giving up
- `ego_crisis` - Inflated ego causing problems
- `self_worth_crisis` - Crushed confidence
- `burnout` - Exhaustion affecting everything

### Living Situation Problems
- `living_conditions` - Poor HQ tier, floor sleeping
- `no_privacy` - Couch sleeping, no personal space
- `overcrowding` - Too many roommates

### Performance Problems
- `performance_crisis` - Losing streak, poor win rate
- `pre_battle_anxiety` - Haven't fought yet, nervous

### Default
- `existential_reflection` - No active crisis, general life contemplation

---

## 3. Arc Structure

Each problem arc consists of:

```
┌──────────────────────────────────────────────────────┐
│                    PROBLEM ARC                        │
├──────────────────────────────────────────────────────┤
│  Phase 1: SURFACING                                  │
│  - Problem introduced in conversation                │
│  - Character's initial reaction established          │
│  - Decision Point 1                                  │
│  - Cooldown: [defined per template]                  │
├──────────────────────────────────────────────────────┤
│  Phase 2: EXPLORATION                                │
│  - Deeper dive into the problem                      │
│  - Stakes become clearer                             │
│  - Decision Point 2                                  │
│  - Cooldown: [defined per template]                  │
├──────────────────────────────────────────────────────┤
│  Phase 3: CRISIS                                     │
│  - Problem comes to a head                           │
│  - Major choice point                                │
│  - Decision Point 3                                  │
│  - Cooldown: [shorter - urgency]                     │
├──────────────────────────────────────────────────────┤
│  Phase 4: RESOLUTION                                 │
│  - Outcome plays out                                 │
│  - Stats applied                                     │
│  - Arc closes                                        │
└──────────────────────────────────────────────────────┘
```

**Phase Count by Severity:**
- Minor problems: 3 phases
- Moderate problems: 4-5 phases
- Severe problems: 5-7 phases

---

## 4. Decision Point Interface

At each decision point, the coach sees:

```
┌─────────────────────────────────────────────────────────┐
│  ═══ TURNING POINT ═══                                  │
│                                                         │
│  [Character] has opened up about their conflict with    │
│  [Rival]. They seem defensive but listening.            │
│                                                         │
│  How do you want to approach this?                      │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  💬  Talk it through                              │  │
│  │  (Have a conversation - your approach will be     │  │
│  │   interpreted from what you say)                  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ─── OR choose a direction ───                          │
│                                                         │
│  [ Push them to confront it directly ]                  │
│                                                         │
│  [ Help them see the other perspective ]                │
│                                                         │
│  [ Suggest they step back for now ]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**If coach clicks a button:** That branch is taken immediately.

**If coach chooses "Talk it through":**
1. Free-form conversation happens
2. When coach is ready (or after N messages), system presents:
   ```
   Based on your conversation, your approach seems closest to:
   [ Push them to confront it directly ] ← (highlighted as detected)

   Is this right?  [Confirm]  [Choose differently]
   ```
3. Coach confirms or overrides
4. That branch is taken

---

## 5. Template Structure

Each problem category has an arc template:

```typescript
interface ArcTemplate {
  category: PersonalProblemCategory;
  severity_phases: {
    minor: number;    // e.g., 3
    moderate: number; // e.g., 5
    severe: number;   // e.g., 7
  };

  phases: PhaseTemplate[];

  // Variables populated from problem context
  variables: string[];  // e.g., ['rival_name', 'rivalry_score', 'shared_battles']

  // Possible endings and their stat outcomes
  endings: EndingTemplate[];
}

interface PhaseTemplate {
  phase_id: string;
  phase_name: string;

  // Context shown to coach
  context_template: string;  // Uses {{variables}}

  // Available choices
  choices: ChoiceTemplate[];

  // Cooldown before next phase (can vary by which choice was made)
  default_cooldown_hours: number;
}

interface ChoiceTemplate {
  choice_id: string;
  button_label: string;

  // Keywords/intents that map conversation to this choice
  conversation_signals: string[];

  // Where this choice leads
  leads_to: string;  // phase_id or ending_id

  // Optional override cooldown
  cooldown_hours?: number;
  cooldown_narrative?: string;

  // Immediate stat nudges (small, before resolution)
  immediate_effects?: StatEffect[];
}

interface EndingTemplate {
  ending_id: string;
  ending_type: 'breakthrough' | 'managed' | 'avoidance' | 'festering' | 'exploded';

  // Narrative shown to player
  resolution_narrative: string;

  // Final stat changes
  stat_outcomes: StatEffect[];

  // For relationship problems: changes to specific relationship
  relationship_effects?: RelationshipEffect[];
}

interface StatEffect {
  stat: string;
  change: number;  // positive or negative
}

interface RelationshipEffect {
  target: 'rival' | 'ally' | 'coach';  // populated from problem context
  trust_change?: number;
  respect_change?: number;
  affection_change?: number;
  rivalry_change?: number;
}
```

---

## 6. Example: Relationship Conflict Template

```typescript
const relationship_conflict_template: ArcTemplate = {
  category: 'relationship_conflict',
  severity_phases: { minor: 3, moderate: 5, severe: 6 },

  variables: [
    'rival_name',
    'rival_id',
    'rivalry_score',
    'affection_score',
    'shared_battles',
    'specific_grievance'  // generated from context
  ],

  phases: [
    {
      phase_id: 'surfacing',
      phase_name: 'The Problem Surfaces',
      context_template: `{{character_name}} has been having issues with {{rival_name}}.
        Their rivalry score is {{rivalry_score}}, and there's clear tension.
        They seem {{initial_stance}} about discussing it.`,

      choices: [
        {
          choice_id: 'probe_directly',
          button_label: 'Ask them directly what happened',
          conversation_signals: ['what happened', 'tell me about', 'explain', 'between you'],
          leads_to: 'exploration_open',
          cooldown_hours: 2,
          cooldown_narrative: 'They need time to gather their thoughts'
        },
        {
          choice_id: 'probe_gently',
          button_label: 'Approach it gently, let them lead',
          conversation_signals: ['whenever ready', 'no pressure', 'take your time', 'if you want'],
          leads_to: 'exploration_guarded',
          cooldown_hours: 4,
          cooldown_narrative: 'Give them space to open up naturally'
        },
        {
          choice_id: 'dismiss',
          button_label: 'Suggest it\'s not worth worrying about',
          conversation_signals: ['not a big deal', 'forget about', 'move on', 'doesn\'t matter'],
          leads_to: 'avoidance_path',
          cooldown_hours: 6,
          immediate_effects: [{ stat: 'coach_trust_level', change: -2 }]
        }
      ],

      default_cooldown_hours: 3
    },

    {
      phase_id: 'exploration_open',
      phase_name: 'Opening Up',
      context_template: `{{character_name}} is being more open about the conflict with {{rival_name}}.
        They've shared that {{specific_grievance}}.
        They seem to want guidance but are still hurt.`,

      choices: [
        {
          choice_id: 'validate_then_challenge',
          button_label: 'Validate their feelings, then challenge their assumptions',
          conversation_signals: ['understand but', 'see your point however', 'valid but consider'],
          leads_to: 'crisis_confrontation',
          cooldown_hours: 3
        },
        {
          choice_id: 'full_validation',
          button_label: 'Fully take their side',
          conversation_signals: ['you\'re right', 'their fault', 'justified', 'wrong of them'],
          leads_to: 'crisis_emboldened',
          cooldown_hours: 2,
          immediate_effects: [{ stat: 'current_ego', change: 3 }]
        },
        {
          choice_id: 'push_perspective',
          button_label: 'Push them to see {{rival_name}}\'s perspective',
          conversation_signals: ['their side', 'perspective', 'why they might', 'understand them'],
          leads_to: 'crisis_reflection',
          cooldown_hours: 4
        }
      ],

      default_cooldown_hours: 3
    },

    // ... more phases ...

    {
      phase_id: 'crisis_confrontation',
      phase_name: 'The Confrontation',
      context_template: `{{character_name}} has decided to confront {{rival_name}} directly.
        The conversation is happening soon. They're nervous but determined.
        This could go well or blow up.`,

      choices: [
        {
          choice_id: 'coach_presence',
          button_label: 'Offer to be there when they talk',
          conversation_signals: ['be there', 'support you', 'come with', 'back you up'],
          leads_to: 'resolution_mediated',
          cooldown_hours: 1,
          cooldown_narrative: 'The conversation is happening now'
        },
        {
          choice_id: 'prep_and_release',
          button_label: 'Help them prepare, then let them handle it alone',
          conversation_signals: ['you got this', 'prepared', 'on your own', 'believe in you'],
          leads_to: 'resolution_solo_attempt',
          cooldown_hours: 1
        },
        {
          choice_id: 'abort',
          button_label: 'Suggest maybe now isn\'t the right time',
          conversation_signals: ['wait', 'not ready', 'hold off', 'bad timing'],
          leads_to: 'avoidance_late',
          cooldown_hours: 6,
          immediate_effects: [{ stat: 'current_confidence', change: -3 }]
        }
      ],

      default_cooldown_hours: 1
    }
  ],

  endings: [
    {
      ending_id: 'resolution_reconciliation',
      ending_type: 'breakthrough',
      resolution_narrative: `{{character_name}} and {{rival_name}} have worked through their conflict.
        It wasn't easy, but there's genuine understanding now.`,
      stat_outcomes: [
        { stat: 'current_mental_health', change: 8 },
        { stat: 'current_stress', change: -10 },
        { stat: 'current_morale', change: 10 },
        { stat: 'coach_trust_level', change: 5 },
        { stat: 'current_team_player', change: 5 }
      ],
      relationship_effects: [
        { target: 'rival', trust_change: 15, rivalry_change: -20, affection_change: 10 }
      ]
    },

    {
      ending_id: 'resolution_managed',
      ending_type: 'managed',
      resolution_narrative: `{{character_name}} and {{rival_name}} haven't become friends,
        but they've established boundaries. They can work together now.`,
      stat_outcomes: [
        { stat: 'current_stress', change: -5 },
        { stat: 'current_morale', change: 5 },
        { stat: 'coach_trust_level', change: 3 }
      ],
      relationship_effects: [
        { target: 'rival', trust_change: 5, rivalry_change: -10 }
      ]
    },

    {
      ending_id: 'resolution_festering',
      ending_type: 'festering',
      resolution_narrative: `The conflict with {{rival_name}} was never really addressed.
        It's still there, simmering beneath the surface.`,
      stat_outcomes: [
        { stat: 'current_stress', change: 5 },
        { stat: 'current_morale', change: -3 },
        { stat: 'coach_trust_level', change: -3 }
      ],
      relationship_effects: [
        { target: 'rival', rivalry_change: 5 }
      ]
    },

    {
      ending_id: 'resolution_exploded',
      ending_type: 'exploded',
      resolution_narrative: `The confrontation with {{rival_name}} went badly.
        What was tension is now open hostility.`,
      stat_outcomes: [
        { stat: 'current_mental_health', change: -5 },
        { stat: 'current_stress', change: 10 },
        { stat: 'current_morale', change: -8 },
        { stat: 'current_team_player', change: -5 }
      ],
      relationship_effects: [
        { target: 'rival', trust_change: -10, rivalry_change: 15, affection_change: -10 }
      ]
    }
  ]
};
```

---

## 7. Database Schema

### Core Tables

```sql
-- Active and historical problem arcs
personal_problem_arcs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_character_id     uuid NOT NULL REFERENCES user_characters(id),

  -- Problem definition (from generator)
  problem_category      text NOT NULL,
  problem_source        text NOT NULL,
  severity              text NOT NULL,  -- 'minor', 'moderate', 'severe'
  problem_variables     jsonb NOT NULL, -- populated template variables

  -- For relationship problems
  related_character_id  uuid REFERENCES user_characters(id),

  -- Arc state
  template_id           text NOT NULL,  -- which template is being used
  current_phase_id      text NOT NULL,
  character_stance      text DEFAULT 'guarded',

  -- Pacing
  next_decision_available_at  timestamptz,
  cooldown_narrative    text,

  -- Status
  status                text NOT NULL DEFAULT 'active',
                        -- 'active', 'awaiting_decision', 'in_cooldown', 'resolved'

  -- History
  path_taken            jsonb DEFAULT '[]',  -- [{phase_id, choice_id, timestamp}, ...]

  -- Resolution
  ending_id             text,
  stat_changes_applied  jsonb,
  resolved_at           timestamptz,

  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Decision point history
arc_decisions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_id            uuid NOT NULL REFERENCES personal_problem_arcs(id),

  phase_id          text NOT NULL,
  choice_id         text NOT NULL,

  -- How was the choice made?
  input_method      text NOT NULL,  -- 'button' or 'conversation'
  conversation_log  jsonb,          -- if conversation, the messages
  ai_detected_choice text,          -- if conversation, what AI thought
  coach_confirmed   boolean,        -- did coach confirm AI detection?

  -- Effects applied
  immediate_effects_applied jsonb,

  created_at        timestamptz DEFAULT now()
);

-- Conversation messages during "talk it through" mode
arc_conversations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_id            uuid NOT NULL REFERENCES personal_problem_arcs(id),
  phase_id          text NOT NULL,

  speaker           text NOT NULL,  -- 'coach' or 'character'
  message           text NOT NULL,

  created_at        timestamptz DEFAULT now()
);
```

### Template Storage (could be code or DB)

```sql
-- Optional: store templates in DB for easier iteration
arc_templates (
  id                text PRIMARY KEY,
  category          text NOT NULL,
  version           integer DEFAULT 1,
  template_data     jsonb NOT NULL,  -- the full ArcTemplate structure
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
```

---

## 8. Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PersonalProblemsService                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  startArc(userCharacterId, problemContext)                  │
│    → Creates new arc from problem generator output          │
│    → Selects appropriate template                           │
│    → Populates variables                                    │
│    → Returns initial phase context                          │
│                                                             │
│  getArcState(arcId)                                         │
│    → Returns current phase, choices, cooldown status        │
│                                                             │
│  submitDecision(arcId, choiceId, inputMethod, conversation?)│
│    → Validates choice is valid for current phase            │
│    → Applies immediate effects                              │
│    → Advances arc to next phase or ending                   │
│    → Sets cooldown                                          │
│    → If ending reached, applies final stat changes          │
│                                                             │
│  classifyConversation(arcId, messages)                      │
│    → AI analyzes conversation                               │
│    → Returns detected choice + confidence                   │
│                                                             │
│  getActiveArcs(userCharacterId)                             │
│    → Returns all active problem arcs for character          │
│                                                             │
│  checkCooldowns(userCharacterId)                            │
│    → Returns arcs that are ready for next decision          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Conversation Classification

When coach chooses "Talk it through", we need to map their conversation to one of the available choices.

**Approach:**

```typescript
async function classifyConversation(
  arcId: string,
  messages: ConversationMessage[],
  availableChoices: ChoiceTemplate[]
): Promise<{ choice_id: string; confidence: number; reasoning: string }> {

  const choiceDescriptions = availableChoices.map(c => ({
    id: c.choice_id,
    label: c.button_label,
    signals: c.conversation_signals
  }));

  const prompt = `
You are analyzing a coaching conversation to determine which approach the coach is taking.

CONVERSATION:
${messages.map(m => `${m.speaker}: ${m.message}`).join('\n')}

AVAILABLE APPROACHES:
${choiceDescriptions.map(c => `- ${c.id}: "${c.label}" (signals: ${c.signals.join(', ')})`).join('\n')}

Which approach best matches the coach's conversation? Consider:
- The overall tone and direction
- Specific phrases that match the signals
- The coach's apparent intent

Respond in JSON:
{
  "choice_id": "the_matching_choice",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}
`;

  // Call AI, parse response
  const result = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(result.choices[0].message.content);
}
```

**Confirmation Flow:**

If confidence > 0.8: Show detected choice, ask for quick confirm
If confidence 0.5-0.8: Show detected choice with "Is this right?" + alternatives
If confidence < 0.5: Show all choices, ask coach to pick

---

## 10. Reward/Penalty Stat Pools by Problem Category

Each problem category affects a different mix of stats:

| Category | Primary Stats | Secondary Stats | Relationship Stats |
|----------|--------------|-----------------|-------------------|
| relationship_conflict | team_player, communication | stress, morale | trust, rivalry, affection (with specific character) |
| trust_issues | coach_trust, team_player | mental_health, morale | trust (specific) |
| financial_crisis | financial_stress | stress, morale, confidence | - |
| mental_health_struggle | mental_health | stress, morale, battle_focus | - |
| overwhelming_stress | stress | fatigue, mental_health, morale | - |
| lost_hope | morale, confidence | mental_health, ego | coach_trust |
| ego_crisis | ego | team_player, communication | relationships broadly |
| self_worth_crisis | confidence, ego | mental_health, morale | - |
| burnout | fatigue | stress, mental_health, morale | - |
| living_conditions | stress, morale | financial_stress | roommate relationships |
| performance_crisis | confidence, battle_focus | stress, morale | coach_trust |

---

## 11. Open Questions

1. **Template authoring**: Who writes these templates? How many do we need before launch?

2. **Arc limits**: Can a character have multiple active arcs? Or one at a time?

3. **Arc generation timing**: When does a new arc start? Automatic when conditions met? Coach-initiated?

4. **Failure states**: If coach ignores an arc too long, does it auto-resolve badly?

5. **UI integration**: Where does this live in the frontend? New dedicated view? Integrated into existing personal problems chat?

6. **Notification system**: How does coach know a cooldown ended and decision is available?

---

## 12. Next Steps

1. Review and iterate on this blueprint
2. Pick one problem category to fully design (all phases, all branches)
3. Build database schema
4. Implement PersonalProblemsService core methods
5. Build conversation classification
6. Create frontend decision point UI
7. Write first set of templates
8. Playtest and tune cooldowns/stat values
