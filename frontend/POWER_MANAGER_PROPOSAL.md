# Power Manager Component - Detailed Proposal

## Component Naming
**Recommendation: Rename to `PowerManager.tsx`**

**Rationale:**
- Backend uses "powers" terminology consistently (`/api/powers`, `power_definitions`, `character_powers`)
- Database tables: `power_definitions`, `character_powers`
- More accurate: The system includes passive effects, active abilities, and stat modifiers
- "Abilities" is too narrow - doesn't capture skills, species traits, and signature powers
- Matches existing `EquipmentManager.tsx` naming pattern

## Component Architecture

### File Structure
```
frontend/src/components/
├── PowerManager.tsx          (Main component - replaces AbilityManager.tsx)
├── PowerCard.tsx             (Individual power display)
├── PowerPointsDisplay.tsx    (4-tier point pools)
└── PowerRebellionMeter.tsx   (Adherence indicator)
```

### API Integration
```typescript
// New API service
frontend/src/services/powerAPI.ts

async function getCharacterPowers(characterId: string) {
  return fetch(`/api/powers/character/${characterId}`);
}

async function unlockPower(characterId: string, powerId: string) {
  return fetch(`/api/powers/unlock`, {
    method: 'POST',
    body: JSON.stringify({ characterId, powerId })
  });
}

async function rankUpPower(characterId: string, powerId: string) {
  return fetch(`/api/powers/rank-up`, {
    method: 'POST',
    body: JSON.stringify({ characterId, powerId })
  });
}
```

## UI Layout & Design

### Top Section: Point Pools Display
```
┌─────────────────────────────────────────────────────┐
│  💪 POWER POINTS                                    │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │  ⚔️ SKILL   │ │  🛡️ ARCHETYPE│ │  🧬 SPECIES │  │
│  │     10      │ │      1       │ │      1      │  │
│  │  Universal  │ │   Warrior    │ │    Human    │  │
│  └─────────────┘ └─────────────┘ └─────────────┘  │
│                                                      │
│  ┌─────────────┐                                    │
│  │  ⭐ SIGNATURE│                                    │
│  │      2      │                                    │
│  │   Achilles  │                                    │
│  └─────────────┘                                    │
└─────────────────────────────────────────────────────┘
```

**Design Details:**
- 4 cards with gradient backgrounds matching tier colors:
  - Skill: Blue gradient (`from-blue-500/20 to-blue-600/30`)
  - Archetype: Purple gradient (`from-purple-500/20 to-purple-600/30`)
  - Species: Green gradient (`from-green-500/20 to-green-600/30`)
  - Signature: Gold gradient (`from-yellow-500/20 to-orange-600/30`)
- Large point number in center
- Icon and tier name
- Subtle pulse animation when points available

### Middle Section: Rebellion Meter
```
┌─────────────────────────────────────────────────────┐
│  ⚖️ COACH CONTROL METER                             │
├─────────────────────────────────────────────────────┤
│  Adherence: 85/100                                  │
│  ████████████████░░░░ [85%]                         │
│                                                      │
│  ✅ High Adherence - Coach has control              │
│  💡 When adherence < 70: Character may rebel        │
└─────────────────────────────────────────────────────┘
```

**States:**
- **High (>70)**: Green bar, checkmark icon, "Coach has control"
- **Medium (50-70)**: Yellow bar, warning icon, "Character getting restless"
- **Low (<50)**: Red bar, fire icon, "Rebellion likely!"

**Purpose:**
- Shows user when rebellion will occur
- Explains power auto-spend mechanic
- Increases tension/drama

### Bottom Section: Powers Grid

#### Tab Filters
```
┌─────────────────────────────────────────────────────┐
│  [All Tiers] [⚔️ Skills] [🛡️ Abilities] [🧬 Species] [⭐ Signature]
│
│  [✓ Show Locked] [Sort: Tier ▼]
└─────────────────────────────────────────────────────┘
```

#### Power Cards Layout
```
┌──────────────────────────────────────────────────┐
│  ⚔️ TIER 1: SKILL POWERS (10 points available)  │
├──────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │ 🤝 Coach Bond   │  │ 🛡️ Defensive    │       │
│  │ Rank 4/10       │  │ Tactics         │       │
│  │ ✅ UNLOCKED     │  │ Rank 4/10       │       │
│  │                 │  │ ✅ UNLOCKED     │       │
│  │ [Rank Up] 1pt  │  │ [Rank Up] 1pt  │       │
│  │                 │  │                 │       │
│  │ 🏆 By Coach     │  │ 🏆 By Coach     │       │
│  └─────────────────┘  └─────────────────┘       │
│                                                   │
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │ ⚔️ Swordsman-   │  │ 👑 Leadership   │       │
│  │ ship            │  │ Rank 3/10       │       │
│  │ Rank 3/10       │  │ ✅ UNLOCKED     │       │
│  │ ✅ UNLOCKED     │  │                 │       │
│  │ [Rank Up] 1pt  │  │ [Rank Up] 1pt  │       │
│  │                 │  │                 │       │
│  │ 🔥 Rebelled     │  │ 🔥 Rebelled     │       │
│  └─────────────────┘  └─────────────────┘       │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  🛡️ TIER 2: ARCHETYPE POWERS (1 point)          │
├──────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │ 🛡️✨ Iron Skin  │  │ 🛡️💥 Shield    │       │
│  │ Rank 2/3        │  │ Bash            │       │
│  │ ✅ UNLOCKED     │  │ Rank 2/3        │       │
│  │                 │  │ ✅ UNLOCKED     │       │
│  │ [Rank Up] 1pt  │  │ [Rank Up] 1pt  │       │
│  │                 │  │                 │       │
│  │ 🏆 By Coach     │  │ 🔥 Rebelled     │       │
│  └─────────────────┘  └─────────────────┘       │
│                                                   │
│  ┌─────────────────┐                             │
│  │ ⚔️✨ Heroic     │                             │
│  │ Strike          │                             │
│  │ Rank 3/3 MAX    │                             │
│  │ ✅ UNLOCKED     │                             │
│  │ ⭐ MAX RANK     │                             │
│  │                 │                             │
│  │ 🔥 Rebelled     │                             │
│  └─────────────────┘                             │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  🧬 TIER 3: SPECIES POWERS (1 point)            │
├──────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │ 🌟 Adaptability │  │ 💪 Determination│       │
│  │ Rank 1/1 MAX    │  │ Rank 2/3        │       │
│  │ ✅ UNLOCKED     │  │ ✅ UNLOCKED     │       │
│  │ ⭐ MAX RANK     │  │                 │       │
│  │                 │  │ 🔒 Need 2 pts   │       │
│  │                 │  │                 │       │
│  │ 🔥 Rebelled     │  │ 🔥 Rebelled     │       │
│  └─────────────────┘  └─────────────────┘       │
│                                                   │
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │ ❤️‍🩹 Survival   │  │ 🔥 Human Spirit │       │
│  │ Instinct        │  │                 │       │
│  │ 🔒 LOCKED       │  │ 🔒 LOCKED       │       │
│  │                 │  │                 │       │
│  │ Req: Level 12   │  │ Req: Level 15   │       │
│  │ Cost: 3 pts     │  │ Cost: 3 pts     │       │
│  └─────────────────┘  └─────────────────┘       │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  ⭐ TIER 4: SIGNATURE POWERS (2 points)         │
├──────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │ 🦶💀 Achilles'  │  │ ⚔️🔥 Wrath of   │       │
│  │ Heel            │  │ Achilles        │       │
│  │ 🔒 LOCKED       │  │ 🔒 LOCKED       │       │
│  │ ⚠️ CURSE        │  │ 💀 ULTIMATE     │       │
│  │ Req: Level 1    │  │ Req: Level 10   │       │
│  │ 🔒 Need 5 pts   │  │ 🔒 Need 5 pts   │       │
│  │ Cost: 5 pts     │  │ Cost: 5 pts     │       │
│  └─────────────────┘  └─────────────────┘       │
│                                                   │
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │ 🛡️✨ Invulner- │  │ ⚔️🤺 Hero's    │       │
│  │ ability         │  │ Challenge       │       │
│  │ 🔒 LOCKED       │  │ 🔒 LOCKED       │       │
│  │                 │  │                 │       │
│  │ Req: Level 15   │  │ Req: Level 18   │       │
│  │ Challenge: Take │  │ Challenge: Win  │       │
│  │ 1000 damage     │  │ 25 1v1 duels    │       │
│  │ Cost: 5 pts     │  │ Cost: 5 pts     │       │
│  └─────────────────┘  └─────────────────┘       │
│                                                   │
│  ┌─────────────────┐                             │
│  │ 👻⚔️ Legend     │                             │
│  │ Never Dies      │                             │
│  │ 🔒 LOCKED       │                             │
│  │                 │                             │
│  │ Req: Level 20   │                             │
│  │ Challenge: Die  │                             │
│  │ then win 10     │                             │
│  │ Cost: 5 pts     │                             │
│  └─────────────────┘                             │
└──────────────────────────────────────────────────┘
```

## Power Card States

### Unlocked Power Card
```
┌─────────────────────────────┐
│ 🛡️✨ Iron Skin              │ ← Icon + Name
│ Rank 2/3                     │ ← Current/Max Rank
│ ✅ UNLOCKED                  │ ← Status badge
│                              │
│ Harden body to resist damage │ ← Description
│                              │
│ Effects:                     │ ← Effect list
│ • +5% damage reduction       │
│ • Rank 3: +9% total          │ ← Next rank preview
│                              │
│ [Rank Up ⬆️] 1 point         │ ← Action button
│                              │
│ 🏆 Unlocked by Coach         │ ← Source indicator
│ 📅 Oct 24, 2025              │ ← Unlock date
└─────────────────────────────┘
```

**Visual States:**
- Border color matches tier
- Unlocked by coach: Gold border with 🏆 badge
- Unlocked by rebellion: Red border with 🔥 badge
- Max rank: Rainbow gradient border with ⭐ badge

### Locked Power Card
```
┌─────────────────────────────┐
│ 🔒 ⚔️🔥 Wrath of Achilles   │ ← Lock icon + Name
│ 💀 ULTIMATE ABILITY          │ ← Category badge
│                              │
│ Channel legendary fury...    │ ← Description (dimmed)
│                              │
│ Requirements:                │ ← Lock reasons
│ ❌ Level 10 (you're 10) ✓   │
│ ❌ 5 Signature Points        │
│    (you have 2)              │
│                              │
│ [🔒 Locked] 5 points         │ ← Disabled button
│                              │
│ Unlock at: Level 10          │
└─────────────────────────────┘
```

**Can't Afford State:**
```
┌─────────────────────────────┐
│ 💪 Determination             │
│ Rank 2/3                     │
│ ✅ UNLOCKED                  │
│                              │
│ [🔒 Need 2 pts] You have 1   │ ← Disabled, shows deficit
│                              │
│ 🔥 Unlocked by Rebellion     │
└─────────────────────────────┘
```

## Color Coding System

### Tier Colors
```typescript
const TIER_COLORS = {
  skill: {
    border: 'border-blue-500',
    bg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/30',
    text: 'text-blue-400',
    badge: 'bg-blue-500/30',
    icon: '⚔️'
  },
  ability: {
    border: 'border-purple-500',
    bg: 'bg-gradient-to-br from-purple-500/20 to-purple-600/30',
    text: 'text-purple-400',
    badge: 'bg-purple-500/30',
    icon: '🛡️'
  },
  species: {
    border: 'border-green-500',
    bg: 'bg-gradient-to-br from-green-500/20 to-green-600/30',
    text: 'text-green-400',
    badge: 'bg-green-500/30',
    icon: '🧬'
  },
  signature: {
    border: 'border-yellow-500',
    bg: 'bg-gradient-to-br from-yellow-500/20 to-orange-600/30',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/30',
    icon: '⭐'
  }
};
```

### Source Indicators
```typescript
const SOURCE_BADGES = {
  coach_suggestion: {
    icon: '🏆',
    text: 'Unlocked by Coach',
    color: 'text-yellow-400',
    border: 'border-yellow-500/50'
  },
  character_rebellion: {
    icon: '🔥',
    text: 'Rebelled and took this',
    color: 'text-red-400',
    border: 'border-red-500/50'
  }
};
```

## Interactive Features

### 1. Power Details Modal
Click any power card to open detailed view:

```
┌─────────────────────────────────────────┐
│  🛡️✨ Iron Skin - Detailed View         │
├─────────────────────────────────────────┤
│  Current Rank: 2/3                      │
│  Type: Passive - Defensive              │
│  Tier: Archetype (Warrior)              │
│                                          │
│  Description:                            │
│  Harden your body to resist damage.     │
│  The body is a fortress, if trained     │
│  properly.                               │
│                                          │
│  Current Effects (Rank 2):              │
│  ✓ +5% damage reduction                 │
│  ✓ +3% damage reduction (Rank bonus)    │
│  = 8% total damage reduction             │
│                                          │
│  Next Rank (Rank 3):                    │
│  ✓ +5% damage reduction                 │
│  ✓ +4% damage reduction (Rank bonus)    │
│  = 9% total damage reduction             │
│                                          │
│  Cost to Rank Up: 1 Archetype Point     │
│  You have: 1 point available             │
│                                          │
│  History:                                │
│  🏆 Oct 24, 2025 - Unlocked by Coach    │
│  📈 Oct 24, 2025 - Ranked to 2 by Coach │
│                                          │
│  [Rank Up Now] [Close]                  │
└─────────────────────────────────────────┘
```

### 2. Unlock Confirmation
When clicking unlock button:

```
┌─────────────────────────────────────────┐
│  ⚠️ Unlock Power?                       │
├─────────────────────────────────────────┤
│  ⚔️🔥 Wrath of Achilles                 │
│                                          │
│  Cost: 5 Signature Points                │
│  You have: 5 points                      │
│                                          │
│  ⚠️ This is PERMANENT                   │
│  Points cannot be refunded               │
│                                          │
│  Current Adherence: 85/100               │
│  ✅ High - You have control              │
│                                          │
│  [Confirm Unlock] [Cancel]              │
└─────────────────────────────────────────┘
```

### 3. Rank Up Confirmation
Similar modal for ranking up powers.

### 4. Rebellion Warning
When adherence is low:

```
┌─────────────────────────────────────────┐
│  ⚠️ REBELLION RISK HIGH                 │
├─────────────────────────────────────────┤
│  Adherence: 30/100 🔥                   │
│                                          │
│  Your character may rebel and           │
│  automatically spend points on powers   │
│  they choose based on their             │
│  personality!                            │
│                                          │
│  Personality: Honorable, Wrathful,      │
│  Courageous, Prideful                    │
│                                          │
│  They may prioritize:                   │
│  • Combat abilities                      │
│  • Honor-based powers                    │
│  • Aggressive options                    │
│                                          │
│  [OK, I Understand]                      │
└─────────────────────────────────────────┘
```

## Mobile Responsive Design

### Mobile Layout Changes:
1. **Point Pools**: Stack vertically instead of grid
2. **Power Cards**: Single column, full width
3. **Tabs**: Horizontal scroll with snap
4. **Detail Modal**: Full screen overlay
5. **Buttons**: Larger touch targets (min 44px)

### Mobile-Specific Features:
- Swipe between tiers
- Pull-to-refresh power data
- Sticky header with point totals
- Collapsible sections for locked powers

## Data Flow

### Component State
```typescript
interface PowerManagerState {
  characterId: string;
  characterLevel: number;
  points: {
    skill: number;
    archetype: number;
    species: number;
    signature: number;
  };
  powers: Power[];
  adherence: number;
  bondLevel: number;
  selectedTier: 'all' | 'skill' | 'ability' | 'species' | 'signature';
  showLocked: boolean;
  sortBy: 'tier' | 'name' | 'rank' | 'cost';
  selectedPower: Power | null;
  loading: boolean;
  error: string | null;
}

interface Power {
  id: string;
  name: string;
  tier: 'skill' | 'ability' | 'species' | 'signature';
  category: string;
  description: string;
  flavor_text: string;
  icon: string;
  max_rank: number;
  rank_bonuses: Array<{rank: number; improvements: string[]}>;
  unlock_level: number;
  unlock_challenge: string | null;
  unlock_cost: number;
  rank_up_cost: number;
  prerequisite_power_id: string | null;
  power_type: 'active' | 'passive';
  effects: PowerEffect[];
  cooldown: number;
  energy_cost: number;
  // Character-specific data
  is_unlocked: boolean;
  current_rank?: number;
  experience?: number;
  times_used?: number;
  unlocked_at?: string;
  unlocked_by?: 'coach_suggestion' | 'character_rebellion';
  can_unlock: {can: boolean; reason?: string};
  can_rank_up: {can: boolean; reason?: string};
}
```

### API Calls
```typescript
// On component mount
useEffect(() => {
  loadPowerData(characterId);
}, [characterId]);

async function loadPowerData(characterId: string) {
  setLoading(true);
  try {
    const data = await powerAPI.getCharacterPowers(characterId);
    setPoints(data.character.points);
    setPowers(data.powers);
    setAdherence(data.character.adherence);
    setBondLevel(data.character.bondLevel);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
}

// Unlock power
async function handleUnlock(powerId: string) {
  try {
    await powerAPI.unlockPower(characterId, powerId);
    await loadPowerData(characterId); // Refresh
    showSuccessToast('Power unlocked!');
  } catch (error) {
    showErrorToast(error.message);
  }
}

// Rank up power
async function handleRankUp(powerId: string) {
  try {
    await powerAPI.rankUpPower(characterId, powerId);
    await loadPowerData(characterId); // Refresh
    showSuccessToast('Power ranked up!');
  } catch (error) {
    showErrorToast(error.message);
  }
}
```

## Error Handling

### Error States:
1. **Network Error**: Show retry button with "Failed to load powers"
2. **Insufficient Points**: Disable button, show "Need X more points"
3. **Level Requirement**: Show "Requires Level X (you're Level Y)"
4. **Challenge Required**: Show "Complete challenge: [description]"
5. **Prerequisite Missing**: Show "Unlock [prerequisite] first"
6. **Already Max Rank**: Show gold badge "MAX RANK ⭐"

### Loading States:
- Initial load: Skeleton cards with pulse animation
- Action in progress: Spinner on button, disable interactions
- Refresh: Subtle spinner in corner

## Accessibility

### Keyboard Navigation:
- Tab through power cards
- Enter to open details
- Arrow keys to navigate tiers
- Esc to close modals

### Screen Reader:
- ARIA labels for all interactive elements
- Live region for status updates ("Power unlocked!")
- Descriptive button text ("Unlock Wrath of Achilles for 5 points")

### Color Blindness:
- Icons in addition to colors
- Text labels for all states
- High contrast mode support

## Performance Optimizations

1. **Virtual Scrolling**: Only render visible power cards
2. **Memoization**: Memo power cards, prevent re-renders
3. **Image Lazy Loading**: Load power icons on demand
4. **Debounced Search**: Wait 300ms before filtering
5. **Cached Data**: Store power data in React Query cache

## Testing Requirements

### Unit Tests:
- Power card rendering with all states
- Point calculation logic
- Filter and sort functions
- API error handling

### Integration Tests:
- Full unlock flow
- Rank up flow
- Rebellion warning display
- Mobile responsive behavior

### E2E Tests:
- User unlocks a power
- User ranks up a power
- User with low adherence sees warning
- Points are correctly deducted

## Migration Plan

### Phase 1: Build New Component (Week 1)
1. Create PowerManager.tsx with basic structure
2. Implement API integration
3. Build PowerCard component
4. Add point pools display

### Phase 2: Add Features (Week 2)
5. Implement filters and sorting
6. Add detail modal
7. Build rebellion meter
8. Add confirmation dialogs

### Phase 3: Polish & Test (Week 3)
9. Mobile responsive design
10. Accessibility improvements
11. Error handling and loading states
12. Write tests

### Phase 4: Deploy (Week 4)
13. Replace AbilityManager in MainTabSystem
14. Update routing
15. Monitor for errors
16. Gather user feedback

## Open Questions

1. **Should we show XP/experience system for powers?** (Backend has experience field but not currently used)
2. **Should rebellion meter be always visible or only when adherence < 70?**
3. **Should we add power usage history/statistics?** (times_used field exists)
4. **Should locked powers be collapsed by default on mobile?**
5. **Should we add animations for unlock/rank-up (particles, flash, etc.)?**
6. **Should we add tooltips explaining tier system for new users?**

## Summary

This proposal creates a comprehensive, production-ready Power Manager that:
- ✅ Connects to real backend API
- ✅ Displays all 4 tiers correctly
- ✅ Shows source (coach vs rebellion)
- ✅ Handles adherence/rebellion system
- ✅ Matches existing UI patterns (Equipment Manager)
- ✅ Mobile responsive
- ✅ Accessible
- ✅ Performant

The component is a complete replacement for the current AbilityManager with full integration to the power system backend.
