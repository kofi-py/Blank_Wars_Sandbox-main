# Domain Gamification System Design
## Blank Wars 2026

---

## Overview

Each of the 19 chat domains becomes a strategic resource with:
- **Ticket cost** (entry price)
- **XP rewards** (progression)
- **HYBRID mini-games** (both embedded in chat AND discrete game modes)
- **Currency stakes** (win/lose money)
- **Permanent stat bonuses** (team DNA building)
- **Temporary buffs** (tactical advantages)

The goal: Players must make meaningful choices about where to spend limited tickets, creating diverse team builds based on which domains they prioritize.

---

## Mini-Game Types (HYBRID SYSTEM)

### Type A: Embedded in Chat
AI proposes challenges during natural conversation. Outcomes resolved through dialogue choices.
- Better for: roleplay-heavy domains, social situations, psychological content
- Example: Therapy breakthrough, social negotiations, personal dilemmas

### Type B: Discrete Game Modes
Separate UI/mechanics triggered from within the domain. Actual gameplay elements.
- Better for: skill-based domains, gambling, physical challenges
- Example: Training mini-game UI, investment simulator, equipment crafting

### Type C: Hybrid (Both)
Domain supports BOTH conversation-based and discrete games depending on context.
- Example: Financial domain has conversation advice + discrete investment simulator

---

## Team DNA Paths

Different domain specializations create distinct team archetypes:

| Path | Primary Domains | Resulting Team DNA |
|------|----------------|-------------------|
| **Warrior Path** | battle, training, equipment | High attack/defense, physical dominance |
| **Mage Path** | abilities, attributes, progression | Magic stats, spell efficiency |
| **Tactician Path** | kitchenTable, groupActivities, performance | Team synergy, gameplan adherence |
| **Merchant Path** | financial, realEstate, resources | Wealth accumulation, economic advantage |
| **Diplomat Path** | socialLounge, messageBoard, confessional | Charisma, communication, influence |
| **Monk Path** | therapy, personalProblems, employeeLounge | Mental fortitude, stress resistance |

---

## Domain Specifications

### 1. BATTLE
**Theme:** Combat arena conversations during/between fights
**Ticket Cost:** 3 tickets
**Base XP:** 50 XP

**Mini-Game: Combat Wager**
- Before battle, AI proposes a side bet: "Bet $50 you can't finish this in 3 rounds"
- Win condition: Achieve the stated goal
- Lose condition: Fail to meet the challenge
- Stakes: 50-500 currency (scales with difficulty)

**Permanent Bonuses (rare drops):**
- +1 Attack (5% chance per session)
- +1 Defense (5% chance per session)

**Temporary Buffs:**
- "Battle Focus" (+10% damage, 3 battles)
- "Adrenaline Rush" (+5 initiative, 1 battle)

---

### 2. KITCHEN TABLE
**Theme:** Casual team bonding, strategy discussions
**Ticket Cost:** 1 ticket
**Base XP:** 20 XP

**Mini-Game: Team Trivia**
- AI quizzes player about their team members' stats/history
- Win: Answer correctly → gain trust bonus
- Lose: Wrong answer → minor team_trust penalty

**Permanent Bonuses:**
- +1 Team Player (10% chance)
- +1 Communication (10% chance)

**Temporary Buffs:**
- "Team Synergy" (+5% team-wide stats in group battles, 24h)

---

### 3. TUTORIAL
**Theme:** Learning game mechanics, new player guidance
**Ticket Cost:** FREE (0 tickets)
**Base XP:** 10 XP

**Mini-Game: Quiz Challenge**
- AI tests knowledge of game mechanics
- Win: Correct answers → bonus XP multiplier
- Lose: No penalty (it's tutorial)

**Permanent Bonuses:** None (it's for learning)

**Temporary Buffs:**
- "Quick Learner" (+25% XP gain, 1 hour)

---

### 4. REAL ESTATE
**Theme:** HQ upgrades, property management, living situations
**Ticket Cost:** 2 tickets
**Base XP:** 30 XP

**Mini-Game: Property Negotiation**
- AI presents property deals with hidden catch
- Win: Spot the bad deal OR close a good one → gain property value
- Lose: Accept a bad deal → lose deposit/face penalties

**Permanent Bonuses:**
- +1 Wisdom (8% chance)
- +$100 Monthly Earnings (3% chance, RARE)

**Temporary Buffs:**
- "Home Advantage" (+10% stats when fighting at home HQ, 48h)

---

### 5. MESSAGE BOARD
**Theme:** Community gossip, intel gathering, social networking
**Ticket Cost:** 1 ticket
**Base XP:** 15 XP

**Mini-Game: Rumor Mill**
- AI shares rumors, player must determine true/false
- Win: Correct assessment → intel on upcoming opponents
- Lose: Wrong call → spread misinformation (minor reputation hit)

**Permanent Bonuses:**
- +1 Charisma (8% chance)

**Temporary Buffs:**
- "Intel Report" (see opponent's strategy before next battle)
- "Social Butterfly" (+10% bond gain, 6h)

---

### 6. FINANCIAL
**Theme:** Money management, investments, debt decisions
**Ticket Cost:** 2 tickets
**Base XP:** 25 XP

**Mini-Game: Investment Gamble**
- AI presents investment opportunity with risk/reward tiers
- Conservative: 80% chance for +10% return
- Moderate: 50% chance for +50% return
- Aggressive: 20% chance for +200% return
- Loss outcomes result in losing the investment

**Permanent Bonuses:**
- +$50 Monthly Earnings (5% chance)
- -5% Debt Interest Rate (3% chance, stacking)

**Temporary Buffs:**
- "Market Insight" (next purchase 15% off, 24h)
- "Cash Flow" (+20% currency drops, 12h)

---

### 7. GROUP ACTIVITIES
**Theme:** Team coordination, group challenges, cooperative events
**Ticket Cost:** 2 tickets
**Base XP:** 35 XP

**Mini-Game: Coordination Challenge**
- AI describes team scenario requiring strategic choice
- Win: Good team decision → all participants gain buff
- Lose: Poor choice → team morale penalty

**Permanent Bonuses:**
- +1 Gameplan Adherence (10% chance)
- +1 Team Trust (8% chance)

**Temporary Buffs:**
- "United Front" (+15% team damage in next group battle)
- "Shared Strength" (lowest stat character gets +5 to that stat, 24h)

---

### 8. TRAINING
**Theme:** Physical conditioning, skill development, sparring
**Ticket Cost:** 3 tickets
**Base XP:** 45 XP

**Mini-Game: Training Montage**
- AI proposes workout intensity levels
- Light: Guaranteed small gains
- Moderate: 70% chance medium gains, 30% minor injury
- Intense: 40% chance big gains, 60% chance injury + small gains

**Permanent Bonuses:**
- +1 Strength (8% chance)
- +1 Dexterity (8% chance)
- +1 Speed (5% chance)

**Temporary Buffs:**
- "Pumped Up" (+10% attack, 5 battles)
- "Limber" (+5 speed, 3 battles)

---

### 9. RESOURCES
**Theme:** Gathering materials, managing supplies, crafting prep
**Ticket Cost:** 2 tickets
**Base XP:** 25 XP

**Mini-Game: Scavenger Hunt**
- AI describes area to search with time pressure
- Win: Find valuable resources before time runs out
- Lose: Wasted time, minimal returns

**Permanent Bonuses:**
- Random equipment drop (5% chance)
- +1 inventory slot (2% chance, RARE)

**Temporary Buffs:**
- "Resourceful" (crafting costs -20%, 24h)
- "Keen Eye" (+15% drop rates, 12h)

---

### 10. ABILITIES
**Theme:** Power development, spell learning, ability unlocks
**Ticket Cost:** 4 tickets (PREMIUM)
**Base XP:** 60 XP

**Mini-Game: Power Trial**
- AI presents ability challenge with skill check
- Win: Unlock ability tier faster, gain ability points
- Lose: Ability backfires, temporary debuff

**Permanent Bonuses:**
- +2 Ability Points (15% chance)
- +1 Intelligence (5% chance)
- +1 Spirit (5% chance)

**Temporary Buffs:**
- "Attuned" (+20% spell damage, 3 battles)
- "Mana Surge" (abilities cost -1 AP, 24h)

---

### 11. EMPLOYEE LOUNGE
**Theme:** Downtime, relaxation, casual workplace chat
**Ticket Cost:** 1 ticket
**Base XP:** 15 XP

**Mini-Game: Break Room Gossip**
- AI shares workplace drama, player picks sides
- Win: Build alliances, gain favors
- Lose: Make enemies, minor social penalty

**Permanent Bonuses:**
- +1 Mental Health restoration (10% chance)
- -5 Stress (guaranteed)

**Temporary Buffs:**
- "Well Rested" (+10% all stats first battle of day)
- "Zen Mode" (stress doesn't increase for 24h)

---

### 12. ATTRIBUTES
**Theme:** Direct stat allocation, character building discussions
**Ticket Cost:** 4 tickets (PREMIUM)
**Base XP:** 40 XP

**Mini-Game: Attribute Challenge**
- AI presents stat-check scenario
- Win: Bonus stat point in tested attribute
- Lose: Minor penalty in weak area exposed

**Permanent Bonuses:**
- +1 to ANY core attribute (choose, 8% chance)
- Attribute respec token (1% chance, ULTRA RARE)

**Temporary Buffs:**
- "Focused Growth" (+50% XP to one stat training, 24h)

---

### 13. SOCIAL LOUNGE
**Theme:** Networking, social events, character interactions
**Ticket Cost:** 2 tickets
**Base XP:** 30 XP

**Mini-Game: Social Chess**
- AI presents social scenario with influence stakes
- Win: Gain favor, reputation, connections
- Lose: Social faux pas, temporary reputation hit

**Permanent Bonuses:**
- +1 Charisma (10% chance)
- +1 Communication (8% chance)
- +1 Ego management (5% chance)

**Temporary Buffs:**
- "Charming" (+20% negotiation outcomes, 24h)
- "Connected" (unlock special shop items, 48h)

---

### 14. CONFESSIONAL
**Theme:** Private thoughts, deep conversations, secrets
**Ticket Cost:** 2 tickets
**Base XP:** 35 XP

**Mini-Game: Truth or Dare**
- AI presents dilemma: reveal secret for reward or keep hidden
- Reveal: High reward but potential consequences
- Hide: Safe but miss opportunity

**Permanent Bonuses:**
- Significant memory unlock (character development)
- +1 Wisdom (8% chance)
- Personality trait evolution (rare)

**Temporary Buffs:**
- "Clear Conscience" (+15% mental health recovery, 48h)
- "Unburdened" (-20% stress from all sources, 24h)

---

### 15. PROGRESSION
**Theme:** Level-up discussions, milestone reviews, growth tracking
**Ticket Cost:** 3 tickets
**Base XP:** 50 XP (+ multipliers)

**Mini-Game: Milestone Challenge**
- AI presents progression goal with deadline
- Win: Achieve milestone → XP multiplier for next session
- Lose: Miss deadline → no penalty, just no bonus

**Permanent Bonuses:**
- +5% base XP gain (stacking, 5% chance)
- Level-up acceleration (rare)

**Temporary Buffs:**
- "Growth Spurt" (+100% XP next 3 activities)
- "Momentum" (consecutive wins increase XP by 10% each)

---

### 16. THERAPY
**Theme:** Mental health support, psychological recovery, counseling
**Ticket Cost:** 2 tickets
**Base XP:** 25 XP

**Mini-Game: Breakthrough Session**
- AI guides through psychological challenge
- Win: Major mental stat improvement
- Lose: Setback (need more sessions)

**Permanent Bonuses:**
- +2 Mental Health (15% chance)
- +1 Battle Focus (10% chance)
- -10 base Stress level (8% chance)

**Temporary Buffs:**
- "Clarity" (immune to psychological debuffs, 48h)
- "Inner Peace" (+25% mental health recovery, 72h)

---

### 17. PERFORMANCE
**Theme:** Competition reviews, achievement tracking, rankings
**Ticket Cost:** 3 tickets
**Base XP:** 45 XP

**Mini-Game: Performance Review**
- AI analyzes recent battles, proposes improvement bet
- Win: Meet improvement target → currency + stat bonus
- Lose: Fall short → motivational penalty

**Permanent Bonuses:**
- +1 Battle Focus (8% chance)
- +1 Gameplan Adherence (8% chance)

**Temporary Buffs:**
- "Competitive Edge" (+10% all combat stats vs higher-ranked opponents)
- "Streak Bonus" (win streak rewards doubled, 24h)

---

### 18. PERSONAL PROBLEMS
**Theme:** Character-specific issues, backstory exploration, drama
**Ticket Cost:** 2 tickets
**Base XP:** 30 XP

**Mini-Game: Personal Quest**
- AI presents character-specific dilemma
- Win: Resolve issue → permanent character growth
- Lose: Issue worsens → needs follow-up sessions

**Permanent Bonuses:**
- Personality drift (controlled evolution)
- +1 to character's weakest stat (10% chance)
- Backstory unlock (lore reward)

**Temporary Buffs:**
- "Motivated" (+15% all stats when fighting for personal stakes)
- "Resolved" (+10% mental health, 48h)

---

### 19. EQUIPMENT
**Theme:** Gear management, loadout optimization, item discussions
**Ticket Cost:** 2 tickets
**Base XP:** 25 XP

**Mini-Game: Gear Gamble**
- AI presents equipment enhancement opportunity
- Win: Equipment upgrade succeeds
- Lose: Equipment damaged or downgraded

**Permanent Bonuses:**
- Equipment enhancement slot (5% chance)
- Random equipment drop (8% chance)

**Temporary Buffs:**
- "Well Equipped" (+5% stats from gear, 24h)
- "Lucky Find" (next equipment drop is +1 rarity)

---

## Cost/Reward Summary Table

| Domain | Cost | XP | Risk Level | Primary Path |
|--------|------|-----|------------|--------------|
| tutorial | 0 | 10 | None | Any |
| kitchenTable | 1 | 20 | Low | Tactician |
| messageBoard | 1 | 15 | Low | Diplomat |
| employeeLounge | 1 | 15 | Low | Monk |
| financial | 2 | 25 | High | Merchant |
| realEstate | 2 | 30 | Medium | Merchant |
| resources | 2 | 25 | Medium | Warrior |
| therapy | 2 | 25 | Low | Monk |
| confessional | 2 | 35 | Medium | Monk/Diplomat |
| personalProblems | 2 | 30 | Medium | Any |
| equipment | 2 | 25 | High | Warrior |
| socialLounge | 2 | 30 | Medium | Diplomat |
| groupActivities | 2 | 35 | Medium | Tactician |
| battle | 3 | 50 | High | Warrior |
| training | 3 | 45 | High | Warrior |
| progression | 3 | 50 | Low | Any |
| performance | 3 | 45 | Medium | Tactician |
| abilities | 4 | 60 | High | Mage |
| attributes | 4 | 40 | Medium | Mage |

---

## Strategic Considerations

### Ticket Budget Example (Free Tier: 18 tickets/day)

**Warrior Build Day:**
- 2x Battle (6 tickets) - Combat practice + wagers
- 2x Training (6 tickets) - Physical stat gains
- 2x Equipment (4 tickets) - Gear upgrades
- 1x kitchenTable (1 ticket) - Team bonding
- 1x employeeLounge (1 ticket) - Stress recovery
- **Total: 18 tickets, Focus: Physical dominance**

**Mage Build Day:**
- 2x Abilities (8 tickets) - Power development
- 1x Attributes (4 tickets) - Stat allocation
- 2x Progression (6 tickets) - XP multipliers
- **Total: 18 tickets, Focus: Magical power**

**Balanced Day:**
- 1x Battle (3) + 1x Training (3) + 1x Abilities (4)
- 1x Financial (2) + 1x Therapy (2)
- 2x kitchenTable (2) + 2x messageBoard (2)
- **Total: 18 tickets, Focus: Well-rounded**

---

## Implementation Notes

### New Database Tables Needed
- `domain_rewards` - Tracks rewards earned per domain
- `domain_minigame_state` - Active mini-game sessions
- `character_buffs` - Active temporary buffs
- `domain_visit_log` - Analytics on domain usage

### New Services Needed
- `DomainRewardService` - Calculate and apply rewards
- `MiniGameService` - Handle embedded game logic
- `BuffService` - Manage temporary buffs

### Prompt Additions
Each domain's scene builder needs:
- Mini-game trigger conditions
- Reward calculation hooks
- Buff application logic

---

## Next Steps

1. Review and iterate on domain designs
2. Finalize reward percentages and balance
3. Design mini-game conversation flows
4. Create database migrations
5. Implement backend services
6. Update domain scene builders
7. Build frontend UI for buff/reward display
