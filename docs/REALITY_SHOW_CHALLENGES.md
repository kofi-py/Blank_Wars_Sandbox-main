# Reality Show Challenge System

## Overview
A comprehensive mini-game system that parodies popular reality TV shows, allowing coaches and characters to compete for currency, equipment, special items, and battle bonuses.

## Database Schema

### Core Tables

#### `challenge_templates`
Reusable challenge definitions. Each template is a complete game design that can be instantiated multiple times.

**Challenge Types:**
- `physical` - Endurance, strength, agility
- `mental` - Puzzles, memory, strategy
- `social` - Persuasion, alliances, voting
- `cooking` - Kitchen challenges (Top Chef parody)
- `talent` - Performance-based (The Voice parody)
- `survival` - Resource management, wilderness
- `creative` - Art, design, performance
- `team` - Requires multiple participants
- `individual` - Solo challenges
- `hybrid` - Mix of multiple types

**Example Parodies Included:**
1. **Tribal Showdown** (Survivor) - Vote off opponents, form alliances
2. **Kitchen Arena** (Top Chef) - Cook under pressure with mystery ingredients
3. **Race Against Time** (Amazing Race) - Choose between brains or brawn tasks
4. **Battle of Talents** (The Voice) - Showcase talents in head-to-head matchups

#### `challenge_rewards`
Links challenges to specific rewards. Each challenge can have multiple reward types.

**Reward Types:**
- `currency` - In-game money
- `equipment` - Specific equipment items
- `battle_boost` - Temporary stat buffs (e.g., +20% strength for 3 battles)
- `special_item` - Unique challenge-exclusive items
- `training_bonus` - XP multipliers
- `healing_discount` - Reduced healing costs
- `unlock` - New features/areas
- `immunity` - Protection from elimination/penalties
- `advantage` - Game mechanic advantages

**Placement Requirements:**
- `winner` - Only 1st place
- `top_3` - Top 3 finishers
- `participant` - Everyone who enters
- `loser` - Bottom placements (for "punishment" rewards)

#### `active_challenges`
Running instances of challenges.

**Status Flow:**
1. `registration` - Accepting sign-ups
2. `ready` - All participants registered
3. `in_progress` - Challenge active
4. `voting` - Social challenges may have voting phase
5. `completed` - Finished
6. `cancelled` - Cancelled before completion

#### `challenge_participants`
Tracks who's competing in each challenge instance.

Features:
- Performance metrics (challenge-specific scoring)
- Team assignments (for team challenges)
- Elimination tracking
- Final placement

#### `challenge_results`
Historical record of all completed challenges.

Stores:
- Top 3 winners
- Total participants
- Completion time
- Full rankings and scores
- Highlight moments (dramatic events)
- Rewards distributed summary

#### `distributed_challenge_rewards`
Individual reward tracking.

Features:
- Links to specific challenge results
- Tracks claimed/unclaimed status
- Expiration for temporary boosts
- References to equipment/items given

#### `challenge_leaderboard`
Overall statistics and rankings.

Tracks:
- Total challenges entered/won
- Wins by challenge type
- Top 3 finishes
- Win streaks (current and best)
- Total currency/items earned
- ELO rating for competitive ranking

#### `challenge_alliances`
Social dynamics for Survivor-style challenges.

Features:
- Alliance formation/dissolution
- Leader tracking
- Member roster
- Challenge-specific

## Reward Examples

### Currency Rewards
```json
{
  "reward_type": "currency",
  "reward_config": {
    "amount": 5000,
    "bonus_multiplier": 1.5
  },
  "placement_required": "winner"
}
```

### Battle Boost Rewards
```json
{
  "reward_type": "battle_boost",
  "reward_config": {
    "stat": "strength",
    "bonus_percent": 20,
    "duration_battles": 3
  },
  "placement_required": "top_3"
}
```

### Equipment Rewards
```json
{
  "reward_type": "equipment",
  "reward_config": {
    "equipment_tier": "rare",
    "equipment_slot": "weapon",
    "specific_item_id": "uuid-here" // Optional
  },
  "placement_required": "winner"
}
```

### Special Item Example
```json
{
  "reward_type": "special_item",
  "reward_config": {
    "item_name": "Immunity Idol",
    "description": "Protect yourself from one elimination",
    "uses": 1,
    "challenge_exclusive": true
  }
}
```

## Integration Points

### Existing Systems

**1. User Characters** (`user_characters` table)
- Characters compete in challenges
- Stats may affect performance (e.g., strength for physical challenges)
- XP/progression may factor into difficulty

**2. Equipment** (`equipment` table)
- Can be awarded as prizes
- May provide advantages in specific challenge types

**3. User Items** (`user_items` table)
- Special challenge items stored here
- Immunity idols, advantage tokens, etc.

**4. Economy**
- Currency rewards integrate with existing wallet
- Can be spent on usual purchases

**5. Battle System**
- Battle boosts apply temporary buffs
- Challenge wins may unlock battle features

### New Services Needed

**Backend Services:**
- `challengeService.ts` - Core challenge logic
- `challengeRewardService.ts` - Reward distribution
- `challengeScoringService.ts` - Score calculation per challenge type
- `allianceService.ts` - Social dynamics for Survivor-style

**Frontend Components:**
- `ChallengeHub.tsx` - Browse/join challenges
- `ActiveChallenge.tsx` - In-progress challenge UI
- `ChallengeResults.tsx` - Results screen with rewards
- `Leaderboard.tsx` - Overall rankings

**Routes:**
- `GET /api/challenges/available` - List open challenges
- `POST /api/challenges/:id/register` - Register character
- `POST /api/challenges/:id/submit` - Submit performance
- `GET /api/challenges/leaderboard` - Rankings
- `GET /api/challenges/history/:characterId` - Past results

## Game Design Notes

### Balancing
- **Difficulty scaling** - Harder challenges = better rewards
- **Participation rewards** - Even losers get something
- **Diminishing returns** - Prevent farming by limiting frequency
- **Variety bonus** - Encourage trying different challenge types

### Social Mechanics
- **Alliances** - Form temporary teams for votes
- **Betrayal** - Breaking alliances has consequences
- **Reputation** - Track alliance loyalty over time
- **Voting strategy** - Eliminate threats vs. keep allies

### Engagement Hooks
- **Daily challenges** - Rotating available challenges
- **Weekly tournaments** - Special high-stakes events
- **Seasonal rankings** - Reset leaderboards periodically
- **Unique rewards** - Challenge-exclusive equipment/items

## Sample Challenge Mechanics

### Survivor Tribal Council
```json
{
  "voting_rounds": 3,
  "immunity_idol": true,
  "alliance_bonus": 1.2,
  "betrayal_penalty": 0.5,
  "scoring": {
    "alliances_formed": 100,
    "votes_survived": 200,
    "idols_found": 300,
    "betrayals_executed": -150
  }
}
```

### Top Chef Quickfire
```json
{
  "time_limit_seconds": 600,
  "mystery_ingredient": true,
  "judge_scoring": ["taste", "presentation", "creativity"],
  "pressure_penalty": 0.1,
  "scoring": {
    "base_score": 100,
    "time_bonus": 50,
    "creativity_multiplier": 1.5,
    "judges_consensus_bonus": 100
  }
}
```

### Amazing Race Detour
```json
{
  "task_options": ["puzzle", "physical"],
  "team_size": 2,
  "checkpoint_bonuses": true,
  "time_penalties": [30, 60, 120],
  "scoring": {
    "completion_speed": 200,
    "checkpoint_hit": 50,
    "team_coordination": 100,
    "penalties": -100
  }
}
```

## Future Expansion Ideas

1. **Challenge Creator** - Let users design custom challenges
2. **Seasonal Events** - Holiday-themed challenges
3. **PvP Challenges** - Direct head-to-head mini-games
4. **Story Challenges** - Narrative-driven multi-stage events
5. **Guild Challenges** - Team-based competitions
6. **Betting System** - Spectators wager on outcomes
7. **Replay System** - Watch past challenges
8. **Challenge Achievements** - Special titles/badges

## Migration Instructions

Run the migration:
```bash
npm run migrate
```

The migration includes:
- All 8 core tables
- Sample reality show parodies
- Triggers for automatic leaderboard updates
- Indexes for performance

## Next Steps

1. **Run migration** - Create the tables
2. **Build services** - Implement backend logic
3. **Design UI** - Frontend components
4. **Test challenges** - Run sample competitions
5. **Balance rewards** - Tune difficulty/rewards
6. **Launch alpha** - Limited release to test
