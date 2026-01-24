# Lost & Found Wars - Implementation Proposal

## Executive Summary

**Lost & Found Wars** is a Storage Wars parody mini-game for Blank Wars where players bid on abandoned lockers/containers at various locations, then reveal their contents for profit, equipment, and progression rewards. The game features authentic Storage Wars mechanics (peek window, auction, dramatic reveal) with Blank Wars' signature humor and character integration.

**Development Time Estimate:** 3-4 weeks
**Complexity:** Medium
**Integration Points:** Currency system, Equipment system, XP/Progression, Character stats
**Monetization Potential:** Premium location access, special event lockers, cosmetic auctioneer skins

---

## Game Design Document

### Core Gameplay Loop

```
1. Location Selection (Weekly Rotation)
   ↓
2. Locker Peek (10 seconds view)
   ↓
3. Auction Phase (Bid against AI characters)
   ↓
4. Reveal Animation (Pull items, calculate value)
   ↓
5. Final Tally & Rewards
   ↓
6. Leaderboard Update
```

### Phase 1: Location Selection

**7 Rotating Locations (One per day of week):**

| Day | Location | Difficulty | Average Loot Value | Special Mechanic |
|-----|----------|-----------|-------------------|------------------|
| Monday | NYC Subway Lost & Found | Easy | $100-500 | Fast-paced, 5 mini-auctions |
| Tuesday | College Campus Bins | Easy | $50-300 | XP Bonus (2x training items) |
| Wednesday | Highway Rest Stop | Medium | $200-800 | Mystery Multiplier (random 2x-5x cash) |
| Thursday | Vegas Hotel Storage | Medium | $500-2000 | Double Cash Day |
| Friday | Police Evidence Room | Hard | $300-1500 | Equipment Focus (weapons/armor) |
| Saturday | Amusement Park L&F | Medium | $100-1000 | Chaos Mode (weird items, comedy) |
| Sunday | JFK Airport Warehouse | Hard | $1000-10000 | Marquee Event (best loot pool) |

**Location Selection Screen:**
- Calendar view showing current day's location
- Preview of location with atmosphere/music
- Today's special modifier displayed prominently
- Entry cost: Free for standard, $500 premium for bonus run

---

### Phase 2: The Peek Window

**Visual Design:**
```
┌─────────────────────────────────────────┐
│         LOCKER #237 - JFK AIRPORT       │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  │ ← Door (Closed)
│  └─────────────────────────────────┘  │
│                                         │
│  [ROLL UP DOOR] ← Click to peek        │
└─────────────────────────────────────────┘
```

**After Rolling Up (Peek View):**
```
┌─────────────────────────────────────────┐
│         LOCKER #237 - JFK AIRPORT       │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │                                 │  │ ← Door (Partially Open)
│  │─────────────────────────────────│  │
│  │  📦 🎒 ??? 💼 ??? 👔 ???      │  │ ← Visible Items
│  │  ??? ??? 📱 ??? ??? ??? ???   │  │   (Obscured/Partial)
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  │ ← Shadow/Hidden Area
│  └─────────────────────────────────┘  │
│                                         │
│  Time Remaining: ⏱️ 8s                 │
│                                         │
│  What you can see:                      │
│  • Leather briefcase (front)            │
│  • Business suit on hanger              │
│  • Box labeled "Electronics"            │
│  • Multiple obscured items in back      │
│                                         │
│  [START BIDDING]                        │
└─────────────────────────────────────────┘
```

**Peek Mechanics:**
- **Duration:** 10 seconds to observe
- **Visibility:** 20-30% of items visible
- **Item Hints:** Front items fully visible, back items are silhouettes/partial
- **Clues System:**
  - Box labels (might be accurate, might not)
  - Brand logos visible on bags/items
  - Size indicators (large furniture vs small electronics)
  - Condition hints (dusty = old, pristine = possibly valuable)

**Peek Algorithm:**
```typescript
interface LockerPeekData {
  visibleItems: Item[];        // 20-30% of total items
  hiddenItems: Item[];         // 70-80% mystery items
  hints: string[];             // Text clues
  clutter: 'organized' | 'messy' | 'chaotic';
  fullness: number;            // 0-100% how packed it is
}
```

---

### Phase 3: The Auction

**Auction UI:**
```
┌─────────────────────────────────────────────────────────┐
│  AUCTIONEER: "Alright folks, what'll you give me?"      │
│                                                          │
│  CURRENT BID: $150  ← Achilles                         │
│                                                          │
│  AI BIDDERS:                                            │
│  • Achilles 💪 - INTERESTED ⬆️                          │
│  • Sherlock 🔍 - VERY INTERESTED ⬆️⬆️                   │
│  • Tesla ⚡ - NOT INTERESTED ➡️                         │
│  • Cleopatra 👑 - BIDDING ACTIVE 🔥                     │
│                                                          │
│  YOUR MAX BID: [ $_____ ] [SUBMIT]                     │
│  (You'll auto-bid up to this amount)                    │
│                                                          │
│  Wallet: $2,500                                         │
└─────────────────────────────────────────────────────────┘
```

**Auction Rules:**
- **AI Competition:** 3-5 AI characters bid against you
- **Auto-Bidding:** Set your max, system auto-bids in $10-50 increments
- **Character Personalities:**
  - **Aggressive** (Genghis Khan, Achilles): Always drive prices up
  - **Analytical** (Sherlock, Tesla): Only bid when they detect value
  - **Chaotic** (Sun Wukong, Loki): Random unpredictable bids
  - **Frugal** (Scrooge, Ben Franklin): Drop out early on expensive lots
  - **Regal** (Cleopatra, Caesar): Won't bid on "common" lockers

**Auction Speed:**
- **Fast-paced:** 20-30 seconds total
- Auctioneer voice lines: "Going once... going twice... SOLD!"
- Sound effects: Gavel slam, crowd murmurs
- Visual feedback: Bids pop up as speech bubbles

**Winning:**
```
🎉 SOLD! 🎉
Locker #237 goes to [CHARACTER NAME] for $150!

[REVEAL CONTENTS]
```

**Losing:**
```
❌ OUTBID! ❌
Sherlock Holmes wins with $200!

[NEXT LOCKER] or [EXIT]
```

---

### Phase 4: The Big Reveal (★ Core Feature ★)

**Reveal Animation Sequence:**

**Step 1: Door Rolls Up Fully**
```
┌─────────────────────────────────────────┐
│         YOU WON LOCKER #237!            │
│              Investment: $150            │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │ [DOOR ROLLING UP ANIMATION]     │  │
│  │                                 │  │
│  │    🔓 UNLOCKING...              │  │
│  │                                 │  │
│  └─────────────────────────────────┘  │
│                                         │
│  [Click to start pulling items]         │
└─────────────────────────────────────────┘
```

**Step 2: Item-by-Item Reveal**

Each item gets pulled out individually with its own moment:

```
═══════════════════════════════════════════
ITEM 1 OF 8

[3D rotating item appears]
📦 Box of Old Books

Condition: Poor
Rarity: Common
Resale Value: $15

💰 +$15
───────────────────────────────────────────
Current Total: $15

[NEXT ITEM] →
═══════════════════════════════════════════
```

**Item Reveal Presentation:**
- **3D Item Model** rotates into view
- **Rarity Glow:**
  - Common: Gray glow
  - Decent: Blue glow
  - Valuable: Purple glow
  - Rare: Gold glow
  - Legendary: Rainbow sparkle effect
- **Sound Effects:**
  - Common: Soft "ding"
  - Decent: "Cha-ching!"
  - Valuable: Ascending chime
  - Rare: Trumpet fanfare
  - Legendary: Epic orchestral hit
- **Cash Counter:** Animated number tick-up with satisfying sound
- **Special Items:** Extra badge/icon appears (⚔️ Equipment, 📈 XP Boost, 🎁 Special)

**Example Reveal Sequence:**

```
ITEM 1: 📦 Old Books → $15
ITEM 2: 👔 Designer Suit → $180 ✨
ITEM 3: 📱 Broken Phone → $0 (Junk)
ITEM 4: 🎸 Gibson Guitar → $850 🌟 + Equipment Unlocked!
ITEM 5: 🧦 Single Sock → $0 (Comedy)
ITEM 6: 💎 Diamond Ring → $2,400 💫 JACKPOT!
ITEM 7: 📚 Rare First Edition → $600
ITEM 8: 🗝️ Mystery Key → $0 + Special Item!
```

**Step 3: Final Tally Screen**

```
╔═══════════════════════════════════════════════╗
║       LOCKER #237 - FINAL RESULTS             ║
╚═══════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 FINANCIAL BREAKDOWN

Investment:              -$150
Total Item Value:     +$4,045
───────────────────────────────
NET PROFIT:            $3,895 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 REWARDS EARNED

💵 Cash Deposited:        $3,895
⚔️  Equipment Unlocked:   Gibson Les Paul
                         (+10 Performance)
📊 XP Earned:            250 XP
🗝️  Special Items:        Mystery Key x1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 ACHIEVEMENTS

✅ High Roller - Profit 25x your investment
✅ Treasure Hunter - Found a rare item
✅ Equipment Master - Unlocked new gear

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 LEADERBOARD UPDATE

Daily Ranking:    #3 → #1 🥇
Best Profit:      $3,895 (New Record!)
Total Earnings:   $12,450

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[TRY ANOTHER LOCKER] [EXIT TO MAIN MENU]
```

---

## Item Generation System

### Item Database Schema

```typescript
interface LockerItem {
  id: string;
  name: string;
  category: 'clothing' | 'electronics' | 'collectibles' | 'junk' |
            'equipment' | 'furniture' | 'jewelry' | 'documents' |
            'sports' | 'musical' | 'mystery';

  // Visual
  icon: string;
  model3D?: string;
  description: string;

  // Value
  baseValue: number;        // Cash value
  rarity: 'junk' | 'common' | 'decent' | 'valuable' | 'rare' | 'legendary';
  condition: 'broken' | 'poor' | 'fair' | 'good' | 'excellent' | 'mint';

  // Special Properties
  isEquipment: boolean;
  equipmentStats?: EquipmentStats;
  grantXP?: number;
  specialEffect?: string;

  // Flavor
  backstory?: string;

  // Location weights
  locationWeights: {
    airport: number;
    subway: number;
    hotel: number;
    college: number;
    police: number;
    amusement: number;
    restStop: number;
  };
}
```

### Item Examples

```typescript
const ITEM_DATABASE = [
  {
    id: 'gibson_les_paul',
    name: 'Gibson Les Paul Guitar',
    category: 'musical',
    baseValue: 850,
    rarity: 'valuable',
    condition: 'good',
    isEquipment: true,
    equipmentStats: {
      performance: +10,
      charisma: +5
    },
    backstory: 'A classic rock guitar, slightly worn but still plays beautifully.',
    locationWeights: {
      airport: 0.3,
      subway: 0.8,
      hotel: 0.4,
      college: 0.9,
      police: 0.5,
      amusement: 0.2,
      restStop: 0.3
    }
  },

  {
    id: 'single_sock',
    name: 'Single Sock',
    category: 'junk',
    baseValue: 0,
    rarity: 'junk',
    condition: 'poor',
    description: 'Just one sock. Where did the other one go? One of life\'s great mysteries.',
    locationWeights: {
      airport: 0.5,
      subway: 0.9,
      hotel: 0.4,
      college: 0.8,
      police: 0.1,
      amusement: 0.3,
      restStop: 0.6
    }
  },

  {
    id: 'diamond_engagement_ring',
    name: 'Diamond Engagement Ring',
    category: 'jewelry',
    baseValue: 2400,
    rarity: 'rare',
    condition: 'excellent',
    backstory: 'A beautiful engagement ring. Someone\'s love story ended here.',
    locationWeights: {
      airport: 0.6,
      subway: 0.4,
      hotel: 0.9,
      college: 0.2,
      police: 0.8,
      amusement: 0.3,
      restStop: 0.1
    }
  },

  {
    id: 'mystery_key',
    name: 'Mysterious Key',
    category: 'mystery',
    baseValue: 0,
    rarity: 'rare',
    specialEffect: 'unlocks_special_locker',
    description: 'A strange key with cryptic engravings. What does it unlock?',
    locationWeights: {
      airport: 0.2,
      subway: 0.3,
      hotel: 0.4,
      college: 0.3,
      police: 0.5,
      amusement: 0.4,
      restStop: 0.3
    }
  }
];
```

### Locker Generation Algorithm

```typescript
function generateLocker(
  location: Location,
  difficulty: 'easy' | 'medium' | 'hard',
  price: number
): Locker {

  // Determine item count based on price
  const itemCount = Math.floor(price / 20) + random(3, 8);

  // Calculate target total value (with variance)
  const targetValue = price * random(0.5, 3.0);  // 50% loss to 200% profit potential

  // Rarity distribution based on difficulty
  const rarityWeights = {
    easy:   { junk: 0.4, common: 0.4, decent: 0.15, valuable: 0.04, rare: 0.01, legendary: 0 },
    medium: { junk: 0.3, common: 0.35, decent: 0.2, valuable: 0.1, rare: 0.04, legendary: 0.01 },
    hard:   { junk: 0.2, common: 0.3, decent: 0.25, valuable: 0.15, rare: 0.08, legendary: 0.02 }
  };

  const items: LockerItem[] = [];
  let currentValue = 0;

  // Generate items
  for (let i = 0; i < itemCount; i++) {
    const rarity = weightedRandomRarity(rarityWeights[difficulty]);
    const item = selectItemByLocationAndRarity(location, rarity);
    items.push(item);
    currentValue += item.baseValue;
  }

  // Adjust if too far from target
  if (currentValue < targetValue * 0.7) {
    // Add a valuable item to bring it up
    items.push(selectItemByLocationAndRarity(location, 'valuable'));
  }

  // Shuffle items (for reveal order)
  shuffle(items);

  // Determine what's visible in peek
  const visibleCount = Math.floor(items.length * 0.25);
  const visibleItems = items.slice(0, visibleCount);

  return {
    id: generateLockerId(),
    location,
    price,
    items,
    visibleItems,
    hints: generateHints(visibleItems, items.length),
    clutter: random(['organized', 'messy', 'chaotic']),
    fullness: random(40, 95)
  };
}
```

---

## Character Integration

### Character Differentiation Through Adherence & Personality

**IMPORTANT:** All characters are mechanically balanced. They see the same peek window, get the same item values, and have equal opportunities. The ONLY differences are:

1. **Base Adherence Level** (modified by archetype, personality, therapy, bonds)
2. **Rogue Behavior Personality** (how they act when adherence fails)
3. **Dialogue & Flavor Text** (cosmetic character voice)

This creates meaningful variety without power imbalances. The meta-game is building adherence through coaching, not picking "OP characters."

### Example Character Behaviors (From Your Database)

**Achilles** (Warrior, Base 75% adherence)
- **Adherence Modifiers:** +15% (warrior archetype), varies by HP/stress
- **When Following Strategy:** Reliable, methodical execution
- **When Going Rogue:** Bids aggressively, refuses to back down (honor!)
- **Dialogue Flavor:** "I won't yield in this auction, coach. Victory or nothing!"
- **Post-Auction:** References glory, battle honor in reactions

**Sherlock Holmes** (Scholar, Base 75% adherence)
- **Adherence Modifiers:** +10% (scholar archetype), analytical mind
- **When Following Strategy:** Precise, calculated bids
- **When Going Rogue:** Calculates own value estimates, drops out mathematically
- **Dialogue Flavor:** "Elementary - the contents are worth precisely $347, not your estimate."
- **Post-Auction:** Deduction-based commentary on items found

**Sun Wukong** (Trickster, Base 75% adherence)
- **Adherence Modifiers:** -10% (trickster archetype), mischievous
- **When Following Strategy:** Restless but compliant
- **When Going Rogue:** CHAOS - might bid $1000 for fun or drop out immediately
- **Dialogue Flavor:** "Hehe, let's see what happens if I bid ALL THE MONEY!"
- **Post-Auction:** Playful, irreverent reactions

**Tesla** (Scholar, Base 75% adherence)
- **Adherence Modifiers:** +10% (scholar), -10% (obsessive independence)
- **When Following Strategy:** Methodical approach
- **When Going Rogue:** "Detects electromagnetic signatures" (flavor only!)
- **Dialogue Flavor:** "I sense valuable technology in there - bidding higher."
- **Post-Auction:** Scientific analysis of items (cosmetic, same values as others)

**Dracula** (Mystic, Base 75% adherence)
- **Adherence Modifiers:** 0% (mystics follow own path)
- **When Following Strategy:** Aristocratic cooperation
- **When Going Rogue:** Elegant but cunning bids, values "aristocratic" items
- **Dialogue Flavor:** "This locker reeks of nobility. I shall claim it."
- **Post-Auction:** References darkness, immortality, refined tastes

**Fenrir** (Beast, Base 75% adherence)
- **Adherence Modifiers:** -15% (beast archetype), primal instincts
- **When Following Strategy:** Barely contained, low adherence
- **When Going Rogue:** Savage, instinct-driven bidding
- **Dialogue Flavor:** *growls* "The hunt calls. I take this prey!"
- **Post-Auction:** Primal, pack-oriented reactions

### Why This Works Better Than Power Bonuses

**With mechanical bonuses:**
- ❌ Tesla/Sherlock become must-picks (best inspection/value)
- ❌ Other characters are unplayable trash tier
- ❌ No reason to use variety
- ❌ Balance nightmare

**With adherence/personality system:**
- ✅ All characters equally viable
- ✅ Strategy is building trust through gameplay
- ✅ High adherence = reliable but less exciting
- ✅ Low adherence = risky but dramatic
- ✅ Personality creates replay value through different rogue behaviors
- ✅ Matches existing Blank Wars rebellion systems

### Equipment System Integration

Items found can become equippable gear:

```typescript
interface EquipmentDrop {
  name: string;
  slot: 'weapon' | 'armor' | 'accessory';
  stats: {
    strength?: number;
    intelligence?: number;
    charisma?: number;
    defense?: number;
    speed?: number;
  };
  specialAbility?: string;
}

// Example drops
const EQUIPMENT_DROPS = [
  {
    name: 'Airport Security Baton',
    slot: 'weapon',
    stats: { strength: +8, defense: +3 },
    found_at: 'airport'
  },
  {
    name: 'Designer Leather Jacket',
    slot: 'armor',
    stats: { defense: +12, charisma: +5 },
    found_at: 'hotel'
  },
  {
    name: 'Lucky Subway Token',
    slot: 'accessory',
    stats: { speed: +10 },
    specialAbility: 'Dodge chance +5%',
    found_at: 'subway'
  }
];
```

---

## Leaderboards & Competition

### Daily Leaderboard

```
╔════════════════════════════════════════════╗
║    LOST & FOUND WARS - DAILY RANKINGS     ║
║         (Monday - NYC Subway)              ║
╚════════════════════════════════════════════╝

🥇 #1  Sherlock Holmes      $15,420  (12 lockers)
🥈 #2  Achilles            $12,800  (8 lockers)
🥉 #3  Cleopatra           $11,950  (10 lockers)
   #4  Tesla                $9,200  (15 lockers)
   #5  Sun Wukong           $8,500  (6 lockers)

   #47 YOU                  $3,895  (3 lockers) ⬆️ +12

───────────────────────────────────────────────

📊 Your Stats Today:
   Total Invested:    $450
   Total Earned:      $4,345
   Net Profit:        $3,895
   Best Find:         Diamond Ring ($2,400)
   Biggest Loss:      Locker #204 (-$150)
   Win Rate:          66% (2 wins, 1 loss)
```

### Weekly Tournament

```
╔════════════════════════════════════════════╗
║       WEEKLY TOURNAMENT - SEASON 12        ║
║          Ends in: 2 days, 14 hours         ║
╚════════════════════════════════════════════╝

Prize Pool: $50,000 + Legendary Item

🏆 Top 10 Positions:

1. Sherlock Holmes     $145,200   [Trophy]
2. Tesla               $122,800   [Gold Badge]
3. Cleopatra           $98,500    [Silver Badge]
4. Achilles            $87,300    [Bronze Badge]
5. Genghis Khan        $76,100    [Premium Ticket]
...
34. YOU                $15,420    ⬆️ +8

Next Prize Tier: Top 25 ($1,000 bonus)
You need: $8,580 more to rank up!

[ENTER TODAY'S AUCTION]
```

### Achievement System

```typescript
const ACHIEVEMENTS = [
  {
    id: 'high_roller',
    name: 'High Roller',
    description: 'Profit 25x your investment in one locker',
    reward: 'Title: "The Professional Picker"',
    icon: '💎'
  },
  {
    id: 'junk_collector',
    name: 'Junk Collector',
    description: 'Buy 10 lockers that are pure trash',
    reward: 'Comedy Badge',
    icon: '🗑️'
  },
  {
    id: 'treasure_hunter',
    name: 'Treasure Hunter',
    description: 'Find 5 legendary items',
    reward: '+10% legendary drop rate',
    icon: '🏴‍☠️'
  },
  {
    id: 'auction_king',
    name: 'Auction King',
    description: 'Win 100 auctions',
    reward: 'Auctioneer Announcer Voice Pack',
    icon: '👑'
  },
  {
    id: 'gambler',
    name: 'The Gambler',
    description: 'Spend over $10,000 in one day',
    reward: 'High Roller Suite Access',
    icon: '🎰'
  }
];
```

---

## Technical Implementation

### Database Schema

```sql
-- New Tables

CREATE TABLE locker_templates (
  id UUID PRIMARY KEY,
  location VARCHAR(50),
  difficulty VARCHAR(20),
  min_price INTEGER,
  max_price INTEGER,
  item_count_min INTEGER,
  item_count_max INTEGER,
  rarity_weights JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE locker_items_master (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  category VARCHAR(50),
  base_value INTEGER,
  rarity VARCHAR(20),
  icon_path VARCHAR(255),
  model_3d_path VARCHAR(255),
  description TEXT,
  is_equipment BOOLEAN DEFAULT FALSE,
  equipment_stats JSONB,
  grant_xp INTEGER,
  special_effect VARCHAR(100),
  backstory TEXT,
  character_affinity JSONB,
  location_weights JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE active_locker_auctions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  location VARCHAR(50),
  locker_number INTEGER,
  price INTEGER,
  items JSONB,  -- Array of item IDs and their properties
  visible_items JSONB,
  hints TEXT[],
  status VARCHAR(20),  -- 'peeking', 'auction', 'won', 'lost', 'revealed'
  winning_bid INTEGER,
  winner_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE user_locker_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  character_id UUID REFERENCES user_characters(id),
  locker_id UUID,
  location VARCHAR(50),
  investment INTEGER,
  total_value INTEGER,
  net_profit INTEGER,
  items_found JSONB,
  equipment_gained JSONB,
  xp_earned INTEGER,
  achievements_unlocked TEXT[],
  completed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE locker_leaderboards (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  character_id UUID REFERENCES user_characters(id),
  period VARCHAR(20),  -- 'daily', 'weekly', 'season'
  period_start DATE,
  total_profit INTEGER,
  total_invested INTEGER,
  lockers_won INTEGER,
  best_find_value INTEGER,
  rank INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE locker_achievements (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  achievement_id VARCHAR(50),
  unlocked_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_locker_auctions_user ON active_locker_auctions(user_id);
CREATE INDEX idx_locker_auctions_status ON active_locker_auctions(status);
CREATE INDEX idx_locker_history_user ON user_locker_history(user_id);
CREATE INDEX idx_locker_history_character ON user_locker_history(character_id);
CREATE INDEX idx_leaderboards_period ON locker_leaderboards(period, period_start);
CREATE INDEX idx_leaderboards_rank ON locker_leaderboards(period, rank);
```

### Backend API Endpoints

```typescript
// Location & Auction Management
GET    /api/lost-and-found/locations              // Get today's location and calendar
GET    /api/lost-and-found/locations/:location    // Get location details
POST   /api/lost-and-found/generate-auction       // Generate new locker auction
GET    /api/lost-and-found/active-auctions        // Get user's active auctions

// Peek & Bidding
POST   /api/lost-and-found/peek/:auctionId        // Start peek phase (10s timer)
GET    /api/lost-and-found/peek/:auctionId        // Get peek data
POST   /api/lost-and-found/bid/:auctionId         // Submit bid
GET    /api/lost-and-found/auction-status/:id     // Check if won/lost

// Reveal & Rewards
POST   /api/lost-and-found/reveal/:auctionId      // Start reveal
GET    /api/lost-and-found/reveal-next-item/:id   // Get next item in sequence
POST   /api/lost-and-found/finalize/:auctionId    // Finalize and distribute rewards

// Leaderboards & Stats
GET    /api/lost-and-found/leaderboard/daily      // Daily rankings
GET    /api/lost-and-found/leaderboard/weekly     // Weekly tournament
GET    /api/lost-and-found/leaderboard/season     // Season rankings
GET    /api/lost-and-found/stats/:userId          // User's stats
GET    /api/lost-and-found/history/:userId        // User's locker history

// Achievements
GET    /api/lost-and-found/achievements           // All achievements
GET    /api/lost-and-found/achievements/:userId   // User's unlocked achievements
```

### Frontend Components

```typescript
// Component Structure

/LostAndFoundWars
  /LocationSelection         // Daily location picker
    - LocationCard.tsx
    - CalendarView.tsx

  /AuctionRoom              // Main game area
    - LockerPeekView.tsx    // Peek window UI
    - AuctionBidding.tsx    // Bidding interface
    - AIBidders.tsx         // AI competitor display
    - AuctioneerVoice.tsx   // Voice lines & animations

  /RevealSequence           // Item reveal
    - RevealAnimation.tsx   // Door rolling up
    - ItemDisplay.tsx       // 3D rotating item
    - ValueCounter.tsx      // Cash counter animation
    - FinalTally.tsx        // Summary screen

  /Leaderboards
    - DailyLeaderboard.tsx
    - WeeklyTournament.tsx
    - UserStats.tsx

  /AchievementToasts        // Pop-up notifications
```

### Services Layer

```typescript
// backend/src/services/lostAndFoundService.ts

export class LostAndFoundService {

  // Generate a new locker auction
  async generateLocker(
    location: string,
    difficulty: string
  ): Promise<Locker> {
    // Implementation from algorithm above
  }

  // Process bidding with AI competitors
  async processAuction(
    auctionId: string,
    playerBid: number,
    characterId: string
  ): Promise<AuctionResult> {
    // Get character bonuses
    const character = await this.getCharacter(characterId);
    const bonuses = this.getCharacterBonuses(character);

    // Generate AI bids based on visible items and AI personalities
    const aiBids = await this.generateAIBids(auctionId, bonuses);

    // Determine winner
    const winner = this.determineWinner(playerBid, aiBids);

    return {
      won: winner === 'player',
      finalPrice: Math.max(playerBid, ...aiBids),
      competitors: this.getCompetitors(aiBids)
    };
  }

  // Calculate item values (all characters get same value)
  async calculateItemValue(
    item: LockerItem,
    character: Character
  ): Promise<number> {
    // All characters get the same base value
    // No character-specific multipliers or bonuses
    return item.baseValue;
  }

  // Distribute rewards after reveal
  async distributeRewards(
    userId: string,
    characterId: string,
    items: LockerItem[],
    investment: number
  ): Promise<Rewards> {
    const character = await this.getCharacter(characterId);

    let totalCash = 0;
    const equipment: Equipment[] = [];
    let totalXP = 0;
    const specialItems: Item[] = [];

    for (const item of items) {
      // Calculate cash value
      const value = await this.calculateItemValue(item, character);
      totalCash += value;

      // Check for equipment
      if (item.isEquipment) {
        equipment.push(await this.createEquipment(item));
      }

      // Grant XP
      if (item.grantXP) {
        totalXP += item.grantXP;
      }

      // Special items
      if (item.specialEffect) {
        specialItems.push(await this.processSpecialItem(item));
      }
    }

    // Update user wallet
    await this.updateUserWallet(userId, totalCash - investment);

    // Add equipment to inventory
    await this.addEquipmentToInventory(characterId, equipment);

    // Grant XP
    await this.grantXP(characterId, totalXP);

    // Check achievements
    const achievements = await this.checkAchievements(
      userId,
      investment,
      totalCash,
      items
    );

    // Update leaderboards
    await this.updateLeaderboards(userId, characterId, {
      profit: totalCash - investment,
      investment,
      lockerWon: true
    });

    return {
      totalCash,
      netProfit: totalCash - investment,
      equipment,
      xpEarned: totalXP,
      specialItems,
      achievements
    };
  }
}
```

---

## Game Balance & Economy

### Pricing Strategy

**Locker Price Ranges by Location:**

| Location | Easy | Medium | Hard | Marquee |
|----------|------|--------|------|---------|
| Subway | $10-$30 | $30-$80 | $80-$150 | - |
| College | $20-$50 | $50-$100 | $100-$200 | - |
| Rest Stop | $30-$70 | $70-$150 | $150-$300 | - |
| Amusement | $40-$100 | $100-$200 | $200-$400 | - |
| Hotel | $100-$250 | $250-$500 | $500-$1000 | - |
| Police | $150-$300 | $300-$600 | $600-$1200 | - |
| Airport | $200-$500 | $500-$1000 | $1000-$2500 | $2500-$5000 |

**Expected Return Rates:**
- **Junk Lockers** (30%): -80% to -50% loss
- **Break-Even** (40%): -25% to +25%
- **Profitable** (25%): +50% to +200%
- **Jackpot** (5%): +300% to +1000%

**Daily Earning Caps:**
- Free players: 10 auctions/day
- Premium members: 25 auctions/day
- VIP members: Unlimited

### Monetization Options

**Premium Features:**
1. **Extra Auction Runs** - $2.99 for 5 more auctions
2. **Inspection Upgrades** - $4.99 for X-ray vision for one day
3. **VIP Access** - $9.99/month for unlimited auctions + bonuses
4. **Cosmetic Auctioneers** - $1.99 for celebrity auctioneer voices
5. **Location Fast-Travel** - $0.99 to access tomorrow's location today

**No Pay-to-Win:**
- Premium doesn't increase drop rates
- Premium doesn't guarantee wins
- Premium only grants more attempts and convenience

---

## Development Roadmap

### Phase 1: Core Systems (Week 1)
**Backend:**
- [ ] Database schema implementation
- [ ] Locker generation algorithm
- [ ] Item database (50 starter items)
- [ ] Character bonus system
- [ ] API endpoints (basic CRUD)

**Frontend:**
- [ ] Location selection screen
- [ ] Basic locker peek UI
- [ ] Auction bidding interface
- [ ] Simple item reveal (no animations yet)

**Target:** Functional prototype with 2 locations, basic items

---

### Phase 2: Polish & Animations (Week 2)
**Backend:**
- [ ] AI bidder personality system
- [ ] Reward distribution service
- [ ] Leaderboard calculation system
- [ ] Achievement tracking

**Frontend:**
- [ ] Reveal animations (3D item rotation)
- [ ] Cash counter animations
- [ ] Sound effects integration
- [ ] Final tally screen design
- [ ] AI bidder avatars & speech bubbles

**Target:** Smooth, satisfying reveal experience

---

### Phase 3: Integration & Balance (Week 3)
**Backend:**
- [ ] Equipment system integration
- [ ] XP/leveling integration
- [ ] Currency system integration
- [ ] Adherence-based rogue behavior implementation
- [ ] Full item database (200+ items)

**Frontend:**
- [ ] Equipment unlock animations
- [ ] Achievement toast notifications
- [ ] Leaderboard screens
- [ ] User stats dashboard
- [ ] Location-specific theming

**Target:** Full integration with Blank Wars ecosystem

---

### Phase 4: Content & Testing (Week 4)
**Backend:**
- [ ] All 7 locations active
- [ ] Weekly tournament system
- [ ] Season rankings
- [ ] Special event system
- [ ] Anti-cheat measures

**Frontend:**
- [ ] All location visuals complete
- [ ] Auctioneer voice lines recorded
- [ ] Mobile responsive design
- [ ] Tutorial/onboarding flow
- [ ] Settings & preferences

**Testing:**
- [ ] Balance testing (ensure fair odds)
- [ ] User testing (5-10 players)
- [ ] Bug fixes
- [ ] Performance optimization

**Target:** Production-ready feature

---

## Success Metrics

### Player Engagement
- **Daily Active Users:** Target 30% of Blank Wars players trying it daily
- **Session Length:** Target 10-15 minutes per session
- **Retention:** Target 60% return within 7 days
- **Completion Rate:** Target 80% finish at least one full auction

### Economic Health
- **Average Profit:** Target players make 50-100% profit on average
- **Bust Rate:** Target 30% of lockers result in loss (keeps it risky)
- **Jackpot Rate:** Target 5% hit big jackpots (keeps it exciting)
- **Currency Circulation:** Monitor impact on overall economy

### Monetization
- **Conversion Rate:** Target 10% try premium features
- **ARPU:** Target $2-5 per month from engaged players
- **Premium Retention:** Target 70% renew monthly subscription

---

## Risk Mitigation

### Potential Issues & Solutions

**1. Gambling Concerns**
- **Risk:** Players may see it as gambling
- **Mitigation:**
  - No real money for outcomes (only entry)
  - Can't convert winnings back to real money
  - Clear odds displayed
  - Not randomized (skill in bidding matters)

**2. Economic Inflation**
- **Risk:** Players generate too much currency
- **Mitigation:**
  - Daily caps on auctions
  - Balanced profit margins
  - Currency sinks (spend profits on training/equipment)
  - Monitor economy closely

**3. Repetitive Gameplay**
- **Risk:** Gets boring after initial novelty
- **Mitigation:**
  - 7 rotating locations
  - 200+ unique items
  - Adherence-based character behaviors
  - Weekly tournaments
  - Seasonal events

**4. AI Bidding Predictability**
- **Risk:** Players learn to game AI bidders
- **Mitigation:**
  - Randomized AI personalities each auction
  - Different bidding strategies
  - Occasional "wild card" behavior
  - Update AI patterns periodically

---

## Future Expansion Ideas

### Post-Launch Features (Months 2-6)

**1. Multiplayer Auctions**
- Real-time bidding against other players
- Scheduled "Live Auction Events"
- Chat/emotes during bidding

**2. Storage Unit Flipping**
- Buy items, hold them, resell at market price changes
- Simple stock market simulation
- Speculation gameplay

**3. Specialized Locations**
- Museum Storage (historical artifacts)
- Hollywood Props Warehouse (celebrity items)
- Military Surplus (tactical gear)
- Mansion Estate Sale (luxury goods)

**4. Collection Systems**
- Complete sets for massive bonuses
- "Collector's Corner" - trade with other players
- Museum display for rare finds

**5. Story Mode**
- Campaign following a "professional picker"
- Unlock character backstories through items
- Special narrative lockers with quests

**6. Custom Lockers**
- Players can create and share custom lockers
- Community voting on best creations
- Featured creator lockers with attribution

---

## Conclusion

Lost & Found Wars is a low-complexity, high-satisfaction mini-game that adds a casual, rewarding loop to Blank Wars. It leverages the universal appeal of Storage Wars' "mystery box" reveal mechanic while integrating seamlessly with existing progression systems.

**Key Strengths:**
- Simple, instantly understandable gameplay
- Satisfying reveal animations and progression
- Natural monetization opportunities
- Complements (doesn't compete with) core Blank Wars gameplay
- Expandable with new locations and items over time

**Recommended Priority:** High
- Relatively quick to implement (3-4 weeks)
- Broad appeal to casual and hardcore players
- Adds variety to daily play loop
- Strong retention mechanic (daily locations)

**Next Steps:**
1. Approve/revise proposal
2. Finalize item database (decide on item count and categories)
3. Create visual mockups for UI
4. Begin backend schema implementation
5. Prototype core loop for playtesting

---

**Document Version:** 1.0
**Last Updated:** October 24, 2025
**Status:** Proposal - Awaiting Approval
