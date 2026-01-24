# Lost & Found Wars - Gameplan Adherence System Integration

## Overview

Lost & Found Wars integrates Blank Wars' existing **Gameplan Adherence System** to create authentic coaching tension. Instead of the player directly bidding, the **coach sets strategy parameters**, and the **character executes** based on their adherence level.

This mirrors the existing Equipment and Power rebellion systems but applies to real-time auction bidding.

---

## Core Mechanic: Coach Strategy vs Character Execution

### The Coaching Phase (Pre-Auction)

Before each locker auction, the coach sets bidding parameters:

```
┌─────────────────────────────────────────┐
│   SET BIDDING STRATEGY - LOCKER #237   │
├─────────────────────────────────────────┤
│                                         │
│  Character: Achilles                    │
│  Adherence: 75/100 ⚠️                   │
│  Bond Level: 60/100                     │
│                                         │
│  ════════════════════════════════════   │
│                                         │
│  VISIBLE IN LOCKER:                     │
│  • Leather briefcase                    │
│  • Designer suit                        │
│  • Box labeled "Electronics"            │
│                                         │
│  ════════════════════════════════════   │
│                                         │
│  COACH'S BIDDING STRATEGY:              │
│                                         │
│  Target Range: [$____ - $____]          │
│  Maximum Cap:  $____                    │
│                                         │
│  [Set Conservative] [Set Moderate]      │
│  [Set Aggressive]   [Custom]            │
│                                         │
│  ════════════════════════════════════   │
│                                         │
│  🎯 ADHERENCE FORECAST:                 │
│                                         │
│  With 75% adherence, Achilles has a:    │
│  • 75% chance to follow your strategy   │
│  • 25% chance to go rogue               │
│                                         │
│  If he goes rogue, he'll make his       │
│  own bidding decisions based on his     │
│  personality and instincts.             │
│                                         │
│  [START AUCTION]                        │
└─────────────────────────────────────────┘
```

**Preset Strategies:**

1. **Conservative**
   - Target Range: $50-$100
   - Max Cap: $150
   - Philosophy: Don't overpay, minimize risk

2. **Moderate**
   - Target Range: $100-$200
   - Max Cap: $300
   - Philosophy: Balanced risk/reward

3. **Aggressive**
   - Target Range: $200-$400
   - Max Cap: $600
   - Philosophy: Go for the win, high stakes

4. **Custom**
   - Set your own range and cap

---

## Bidding Execution System

### Adherence Check Per Bid

Each time a bid opportunity arises, the system rolls for adherence:

```typescript
interface BiddingMoment {
  currentBid: number;
  competitors: AIBidder[];
  coachStrategy: {
    minTarget: number;
    maxTarget: number;
    absoluteCap: number;
  };
  characterAdherence: number;
}

async function processBiddingMoment(moment: BiddingMoment) {
  // Roll for adherence (0-100)
  const adherenceRoll = Math.random() * 100;

  if (adherenceRoll <= moment.characterAdherence) {
    // ✅ PASS: Character follows coach's strategy
    return executeDeterministicBid(moment.coachStrategy, moment.currentBid);
  } else {
    // ❌ FAIL: Character goes rogue
    return executeRogueBid(moment);
  }
}
```

---

## When Adherence Check PASSES

**Deterministic Formula Execution** (No AI involved)

The character follows the coach's strategy using a simple algorithm:

```typescript
function executeDeterministicBid(
  strategy: CoachStrategy,
  currentBid: number
): BidAction {

  // If current bid is already above our cap, drop out
  if (currentBid >= strategy.absoluteCap) {
    return { action: 'drop_out', reason: 'Exceeded coach maximum' };
  }

  // If we're below target range, bid to get into range
  if (currentBid < strategy.minTarget) {
    const nextBid = Math.min(
      currentBid + 25, // Standard increment
      strategy.minTarget
    );
    return {
      action: 'bid',
      amount: nextBid,
      reason: 'Following coach strategy - entering target range'
    };
  }

  // If we're in target range, decide based on position
  if (currentBid >= strategy.minTarget && currentBid < strategy.maxTarget) {
    // Simple strategy: bid up to mid-point of target range
    const midpoint = (strategy.minTarget + strategy.maxTarget) / 2;

    if (currentBid < midpoint) {
      return {
        action: 'bid',
        amount: currentBid + 25,
        reason: 'Following coach strategy - staying competitive'
      };
    } else {
      // Getting expensive, 50/50 chance to continue
      if (Math.random() < 0.5) {
        return {
          action: 'bid',
          amount: currentBid + 25,
          reason: 'Following coach strategy - final push'
        };
      } else {
        return {
          action: 'drop_out',
          reason: 'Following coach strategy - target range exceeded'
        };
      }
    }
  }

  // Above target range but below cap - be cautious
  if (currentBid >= strategy.maxTarget && currentBid < strategy.absoluteCap) {
    // Only bid if really close to cap
    const remainingRoom = strategy.absoluteCap - currentBid;
    if (remainingRoom > 50) {
      return {
        action: 'bid',
        amount: currentBid + 25,
        reason: 'Following coach strategy - using remaining cap'
      };
    } else {
      return {
        action: 'drop_out',
        reason: 'Following coach strategy - approaching cap'
      };
    }
  }

  // Default: drop out
  return { action: 'drop_out', reason: 'Following coach strategy' };
}
```

**UI Display When Following Strategy:**

```
═══════════════════════════════════════════
AUCTION IN PROGRESS - LOCKER #237

Current Bid: $125
Your Status: ACTIVE

Achilles is FOLLOWING YOUR STRATEGY ✅
- Target Range: $100-$200
- Maximum Cap: $300
- Adherence: 75%

[Automatic bidding in progress...]

Bid History:
$50  → You (Achilles)
$75  → Tesla
$100 → You (Achilles) ✅ Following strategy
$125 → Sherlock
$150 → You (Achilles) ✅ Following strategy

Waiting for next bid...
═══════════════════════════════════════════
```

---

## When Adherence Check FAILS

**AI-Driven Rogue Behavior** (Character makes own decisions)

The character ignores the coach's strategy and the AI presents options:

### Step 1: Adherence Failure Notification

```
═══════════════════════════════════════════
⚠️  ADHERENCE CHECK FAILED! ⚠️

Achilles has gone ROGUE!

Current Bid: $125
Coach Strategy: Bid to $150 (target range)

Achilles' Adherence: 75%
Roll Result: 82 ❌ FAILED

Achilles is now making his own decisions...
═══════════════════════════════════════════
```

### Step 2: AI Generates Multiple Choice Options

The system calls OpenAI to generate personality-driven options:

```typescript
async function executeRogueBid(params: {
  characterName: string;
  characterId: string;
  currentBid: number;
  coachStrategy: CoachStrategy;
  personality: PersonalityTraits;
  wallet: number;
  adherenceScore: number;
  bondLevel: number;
  visibleItems: string[];
}): Promise<{ choice: string; reasoning: string }> {

  const prompt = `AUCTION BIDDING - CHARACTER REBELLION

SITUATION:
You are ${params.characterName}, currently in an auction for a storage locker.
Your coach wanted you to follow this strategy:
- Target Range: $${params.coachStrategy.minTarget}-$${params.coachStrategy.maxTarget}
- Maximum Cap: $${params.coachStrategy.absoluteCap}

However, you don't fully trust their judgment right now:
- Your bond with coach: ${params.bondLevel}/100
- Your adherence: ${params.adherenceScore}/100

Current auction status:
- Current Bid: $${params.currentBid}
- Your Available Funds: $${params.wallet}
- Visible Items: ${params.visibleItems.join(', ')}

ABOUT YOU:
- Archetype: ${params.personality.archetype}
- Personality Traits: ${params.personality.traits.join(', ')}
- Fighting Style: ${params.personality.conversationStyle}

You're IGNORING the coach's strategy and making your own call.

BIDDING OPTIONS:

A) Bid Conservatively - Raise to $${params.currentBid + 25}
   Play it safe, small increment

B) Bid Aggressively - Raise to $${params.currentBid + 100}
   Show dominance, jump the bid significantly

C) Bid All-In - Raise to $${Math.min(params.wallet, params.currentBid + 300)}
   Go for broke, scare off competition

D) Drop Out - Stop bidding
   Walk away, not worth it

E) Follow Coach After All - Bid to $${params.coachStrategy.maxTarget}
   Second thoughts, maybe coach knows best

TASK: Pick your bidding action and tell your coach why in 1-2 sentences.

RESPOND IN JSON:
{
  "choice": "A",
  "dialogue": "Natural, conversational explanation"
}

Requirements:
- Speak naturally to your coach
- Don't introduce yourself (you're already in conversation)
- Match your personality: ${params.personality.archetype}
- Be direct and conversational`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a character making autonomous decisions in an auction.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content);

  // Map choice letter to action
  const choiceMap = {
    'A': { action: 'bid_conservative', amount: params.currentBid + 25 },
    'B': { action: 'bid_aggressive', amount: params.currentBid + 100 },
    'C': { action: 'bid_all_in', amount: Math.min(params.wallet, params.currentBid + 300) },
    'D': { action: 'drop_out', amount: 0 },
    'E': { action: 'follow_coach', amount: params.coachStrategy.maxTarget }
  };

  return {
    choice: result.choice,
    action: choiceMap[result.choice],
    reasoning: result.dialogue
  };
}
```

### Step 3: Display AI's Rogue Choice

```
═══════════════════════════════════════════
⚠️  ACHILLES HAS GONE ROGUE! ⚠️

Your Strategy: Bid conservatively to $150

ACHILLES' DECISION:
"Nah coach, I can see quality items in there.
I'm going all-in at $450. Trust me on this."

Action: BID AGGRESSIVELY → $450

[Achilles bids $450]

⚠️ This exceeds your recommended cap of $300!
═══════════════════════════════════════════
```

---

## Character-Specific Rogue Behaviors

Different characters make different rogue decisions:

### Achilles (Warrior, Honorable/Wrathful/Courageous/Prideful)
**Rogue Behavior Patterns:**
- Tends to bid aggressively (honor demands winning)
- Rarely drops out (sees it as cowardice)
- Might follow coach after all if coach has earned respect

**Example Dialogue:**
- "Coach, I see quality in there. I'm going for the win."
- "I won't back down now. Bidding $400."
- "This is worth fighting for. Trust my instincts."

### Sherlock Holmes (Scholar, Analytical/Observant/Eccentric/Logical)
**Rogue Behavior Patterns:**
- Calculates own value estimates
- Drops out if math doesn't work
- Rarely goes all-in (too logical)

**Example Dialogue:**
- "Elementary. The items are worth more than you think. Bidding $350."
- "Your math is flawed, coach. I'm dropping out."
- "I've deduced the optimal bid is $275, not your suggestion."

### Sun Wukong (Trickster, Mischievous/Rebellious/Loyal/Proud)
**Rogue Behavior Patterns:**
- Completely random (chaos monkey)
- Might bid way too high for fun
- Might drop out just to mess with coach

**Example Dialogue:**
- "Hehe, let's shake things up! Bidding $600!"
- "This is boring. I'm out."
- "You know what? Let's go ALL IN and see what happens!"

### Tesla (Scholar, Brilliant/Eccentric/Visionary/Obsessive)
**Rogue Behavior Patterns:**
- Flavor text about "detecting technology" (cosmetic only!)
- Obsessive about perceived quality
- Drops out if not convinced

**Example Dialogue:**
- "I sense electromagnetic fields. Bidding $400." (flavor only - sees same items as everyone)
- "No innovation of value here. I'm withdrawing."
- "That technology is worth more than you realize. Increasing bid."

### Dracula (Mystic, Aristocratic/Cunning/Predatory/Charismatic)
**Rogue Behavior Patterns:**
- Elegant but cunning bidding
- Values "aristocratic" items (flavor text only)
- Predatory approach to competition

**Example Dialogue:**
- "This locker reeks of nobility. I shall claim it for $500."
- "Mortals and their petty possessions. I withdraw."
- "The night favors the bold. Bidding aggressively."

### Fenrir (Beast, Savage/Loyal/Vengeful/Primal)
**Rogue Behavior Patterns:**
- Instinct-driven, savage approach
- Pack loyalty might override logic
- Primal aggression in bidding

**Example Dialogue:**
- *growls* "The hunt demands this prize. $600!"
- "Weak prey. Not worth the chase."
- "My instincts say BID. I trust the wolf within."

---

## Adherence Consequences

### Adherence Drops When Rogue Behavior Occurs

```typescript
async function handleRogueBidding(
  characterId: string,
  rogueAction: BidAction,
  coachStrategy: CoachStrategy
): Promise<void> {

  // Calculate adherence penalty
  let adherencePenalty = 5; // Base penalty for going rogue

  // Additional penalty based on how far off strategy
  if (rogueAction.action === 'bid_all_in') {
    adherencePenalty += 10; // Severe rebellion
  }

  if (rogueAction.amount > coachStrategy.absoluteCap) {
    adherencePenalty += 10; // Exceeded hard limit
  }

  // Update adherence
  const currentAdherence = await getCharacterAdherence(characterId);
  const newAdherence = Math.max(0, currentAdherence - adherencePenalty);

  await updateCharacterAdherence(characterId, newAdherence);

  // Log the rebellion
  await logRebellionEvent({
    characterId,
    context: 'lost_and_found_auction',
    adherenceBefore: currentAdherence,
    adherenceAfter: newAdherence,
    coachChoice: JSON.stringify(coachStrategy),
    characterChoice: JSON.stringify(rogueAction),
    timestamp: new Date()
  });
}
```

### Adherence Increases When Strategy Works

```typescript
async function handleSuccessfulStrategy(
  characterId: string,
  profit: number
): Promise<void> {

  let adherenceBonus = 2; // Base bonus for following strategy

  // Bonus based on profit
  if (profit > 1000) {
    adherenceBonus += 5; // Strategy paid off big
  } else if (profit > 500) {
    adherenceBonus += 3; // Decent profit
  } else if (profit > 0) {
    adherenceBonus += 1; // Small win
  }
  // No bonus for losses (but no penalty either if followed strategy)

  const currentAdherence = await getCharacterAdherence(characterId);
  const newAdherence = Math.min(100, currentAdherence + adherenceBonus);

  await updateCharacterAdherence(characterId, newAdherence);
}
```

---

## UI/UX Flow

### Full Auction Experience

**Pre-Auction:**
```
1. Coach reviews visible items in locker
2. Coach sets bidding strategy (range + cap)
3. System shows adherence forecast
4. Auction begins
```

**During Auction (Adherence Passing):**
```
┌────────────────────────────────────┐
│ AUCTION - Locker #237              │
│ Current Bid: $175                  │
│                                    │
│ Achilles: FOLLOWING STRATEGY ✅    │
│                                    │
│ $50  → You (following plan)        │
│ $75  → Tesla                       │
│ $100 → You (following plan)        │
│ $125 → Sherlock                    │
│ $150 → You (following plan)        │
│ $175 → Cleopatra                   │
│                                    │
│ Next bid incoming...               │
│ [Achilles is calculating...]       │
└────────────────────────────────────┘
```

**During Auction (Adherence Failing):**
```
┌────────────────────────────────────┐
│ ⚠️ ACHILLES WENT ROGUE! ⚠️         │
│                                    │
│ Current Bid: $175                  │
│ Your Strategy: Stop at $200        │
│                                    │
│ Achilles' Decision:                │
│ "I can win this. Going to $450!"  │
│                                    │
│ [Achilles bids $450]               │
│                                    │
│ ❌ EXCEEDED YOUR $200 CAP!         │
│                                    │
│ Adherence: 75% → 65% ⬇️            │
└────────────────────────────────────┘
```

**Post-Auction Win (Followed Strategy):**
```
┌────────────────────────────────────┐
│ 🎉 WON LOCKER #237! 🎉             │
│                                    │
│ Final Bid: $175                    │
│ Total Value: $850                  │
│ Profit: $675                       │
│                                    │
│ ✅ Achilles followed your strategy │
│                                    │
│ Adherence: 75% → 80% ⬆️            │
│                                    │
│ "Good call, coach. I trusted you   │
│  and it paid off."                 │
│                                    │
│ [REVEAL ITEMS]                     │
└────────────────────────────────────┘
```

**Post-Auction Win (Went Rogue):**
```
┌────────────────────────────────────┐
│ 🎉 WON LOCKER #237! 🎉             │
│                                    │
│ Final Bid: $450 (Achilles' call)   │
│ Total Value: $1,200                │
│ Profit: $750                       │
│                                    │
│ ⚠️ Achilles ignored your strategy  │
│ BUT it worked out!                 │
│                                    │
│ Adherence: 75% → 70% ⬇️            │
│ (Still penalty for going rogue)    │
│                                    │
│ "See? I told you I knew what I was │
│  doing. Sometimes you gotta trust  │
│  the warrior's instinct."          │
│                                    │
│ [REVEAL ITEMS]                     │
└────────────────────────────────────┘
```

**Post-Auction Loss (Went Rogue):**
```
┌────────────────────────────────────┐
│ ❌ LOST AUCTION - Outbid!          │
│                                    │
│ Your Last Bid: $450 (Achilles)     │
│ Winning Bid: $500 (Sherlock)       │
│                                    │
│ ⚠️ Achilles went rogue AND lost    │
│                                    │
│ Adherence: 75% → 60% ⬇️⬇️          │
│ (Big penalty for failed rebellion) │
│                                    │
│ "Damn... maybe you were right      │
│  about being conservative."        │
│                                    │
│ [NEXT LOCKER] [EXIT]               │
└────────────────────────────────────┘
```

---

## Database Integration

### New Tables

```sql
-- Lost & Found auction sessions
CREATE TABLE lost_and_found_auctions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  character_id UUID REFERENCES user_characters(id),
  location VARCHAR(50),
  locker_number INTEGER,

  -- Coach's strategy
  coach_target_min INTEGER,
  coach_target_max INTEGER,
  coach_absolute_cap INTEGER,

  -- Execution tracking
  followed_strategy BOOLEAN,
  went_rogue_at_bid INTEGER, -- Which bid number rebellion occurred
  final_bid INTEGER,
  won_auction BOOLEAN,

  -- Results
  investment INTEGER,
  total_value INTEGER,
  net_profit INTEGER,

  -- Adherence tracking
  adherence_before INTEGER,
  adherence_after INTEGER,
  adherence_change INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Bid history for each auction
CREATE TABLE auction_bid_history (
  id UUID PRIMARY KEY,
  auction_id UUID REFERENCES lost_and_found_auctions(id),
  bid_number INTEGER,
  bidder VARCHAR(100), -- Character name or AI competitor
  bid_amount INTEGER,

  -- If player's character
  adherence_roll INTEGER, -- 0-100
  adherence_passed BOOLEAN,
  was_rogue_bid BOOLEAN,
  rogue_reasoning TEXT,

  timestamp TIMESTAMP DEFAULT NOW()
);

-- Rogue decision log (for analytics)
CREATE TABLE rogue_bidding_decisions (
  id UUID PRIMARY KEY,
  auction_id UUID REFERENCES lost_and_found_auctions(id),
  character_id UUID REFERENCES user_characters(id),

  -- Context
  current_bid INTEGER,
  coach_recommendation VARCHAR(50),

  -- AI Decision
  ai_choice VARCHAR(50),
  ai_reasoning TEXT,

  -- Outcome
  action_taken VARCHAR(50),
  amount_bid INTEGER,

  timestamp TIMESTAMP DEFAULT NOW()
);
```

### Integration with Existing adherence System

```sql
-- User characters already have gameplan_adherence_level
-- No schema changes needed, just use existing column

-- Update adherence after each auction
UPDATE user_characters
SET gameplan_adherence_level = gameplan_adherence_level + $1
WHERE id = $2;

-- Log adherence changes
INSERT INTO adherence_history (
  character_id,
  context,
  adherence_before,
  adherence_after,
  change_amount,
  reason
) VALUES ($1, 'lost_and_found_auction', $2, $3, $4, $5);
```

---

## API Endpoints

```typescript
// Set coach strategy for upcoming auction
POST /api/lost-and-found/set-strategy
Body: {
  characterId: string;
  targetMin: number;
  targetMax: number;
  absoluteCap: number;
}

// Start auction with strategy set
POST /api/lost-and-found/start-auction
Body: {
  characterId: string;
  lockerId: string;
}

// Process each bidding moment (called automatically during auction)
POST /api/lost-and-found/process-bid
Body: {
  auctionId: string;
  currentBid: number;
  competitors: AIBidder[];
}
Response: {
  adhered: boolean;
  action: 'bid' | 'drop_out';
  amount?: number;
  reasoning: string;
  rogueBehavior?: {
    choice: string;
    dialogue: string;
  }
}

// Get adherence forecast before auction
GET /api/lost-and-found/adherence-forecast/:characterId
Response: {
  currentAdherence: number;
  passChance: number;
  rogueChance: number;
  recentRebellions: number;
}
```

---

## Coaching Strategy Tips

The system can provide coaching advice based on adherence:

```
╔═══════════════════════════════════════════╗
║       COACHING TIP - LOW ADHERENCE        ║
╚═══════════════════════════════════════════╝

⚠️ Achilles' Adherence: 45% (LOW)

With adherence this low, Achilles is likely to
go rogue during the auction.

RECOMMENDATIONS:
• Set wider target ranges (give him flexibility)
• Avoid aggressive strategies (he'll overdo it)
• Build adherence through therapy/activities
• Consider using a high-adherence character

Or... embrace the chaos and see what happens! 🎲
```

---

## Summary

The Gameplan Adherence System transforms Lost & Found Wars from a simple bidding game into a **coaching simulation** where:

1. **Coach plans strategy** (target range, max cap)
2. **Character executes** (with adherence rolls)
3. **High adherence** = Character follows plan (deterministic)
4. **Low adherence** = Character goes rogue (AI makes choices)
5. **Results affect adherence** (success builds trust, rebellion damages it)

This creates:
- **Narrative tension** (will they listen or rebel?)
- **Character personality** (different rogue behaviors)
- **Coaching progression** (build trust over time)
- **Risk/reward decisions** (risky with low adherence characters)
- **Authentic Storage Wars feel** (partners don't always agree!)

The system seamlessly integrates with existing Equipment and Power rebellion mechanics, using the same adherence scores and AI decision-making patterns.

---

**Document Version:** 1.0
**Last Updated:** October 24, 2025
**Status:** Design Addendum to Main Proposal
