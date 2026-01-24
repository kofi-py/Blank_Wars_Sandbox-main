# NEW CHARACTER CREATION BIBLE
## Complete Integration Guide for "Blank Wars" Character Development

**Version**: 1.0  
**Date**: July 20, 2025  
**Target Audience**: Character Development Team

---

## 📋 **OVERVIEW**

This comprehensive guide provides everything needed to create a new character that seamlessly integrates into the "Blank Wars" game system. Each character requires **73+ assets** across **multiple game systems**.

### **Quick Stats:**
- **Data Files to Update**: 10 core files
- **Image Assets Required**: 65+ images across 33+ contexts (naming conventions critical)
- **System Integrations**: 12+ game systems
- **Dialogue Prompt Templates**: 7+ conversation contexts with specific requirements
- **Image Prompt Templates**: 33+ specific visual contexts with detailed prompts

---

## 🎯 **CORE CHARACTER DATA STRUCTURE**

### **Character Interface Requirements**

Every character must implement the complete `Character` interface:

```typescript
{
  // BASIC IDENTITY
  id: string,                    // Format: template_timestamp_random
  name: string,                  // Display name (e.g., "Achilles")
  title?: string,               // Optional subtitle (e.g., "Hero of Troy")
  avatar: string,               // Single emoji for UI (will be replaced with images)
  archetype: CharacterArchetype, // See archetype guide below
  rarity: CharacterRarity,      // See rarity guide below
  
  // LORE & BACKGROUND
  description: string,          // 2-3 paragraph character backstory
  historicalPeriod: string,     // Time period (e.g., "Ancient Greece, 1200 BCE")
  mythology: string,            // Cultural context (e.g., "Greek Mythology")
  personality: CharacterPersonality, // Complex personality system (see below)
  
  // PROGRESSION CORE
  level: number,               // Starting level (always 1 for new characters)
  baseStats: BaseStats,        // 6 core stats (see stat guide)
  combatStats: CombatStats,    // Calculated battle stats
  statPoints: number,          // Always 0 for level 1 characters
  
  // SYSTEMS INTEGRATION
  experience: CharacterExperience,    // XP tracking system
  skills: CharacterSkills,           // 5-category skill system
  abilities: CharacterAbilities,     // Character powers (4-6 abilities)
  progressionTree: ProgressionTree,  // Character advancement path
  
  // EQUIPMENT SYSTEM
  equippedItems: {
    weapon?: Equipment,         // Character-specific weapons
    armor?: Equipment,          // Archetype-appropriate armor
    accessory?: Equipment       // Special items
  },
  inventory: Item[],            // Starting items
  
  // PSYCHOLOGICAL PROFILE (CRITICAL)
  psychStats: {
    training: number,           // 50-85, instruction following ability
    teamPlayer: number,         // 30-90, team cooperation level
    ego: number,               // 20-95, arrogance/humility
    mentalHealth: number,      // 70-95, psychological stability
    communication: number      // 40-90, expression ability
  },
  
  // FINANCIAL PERSONALITY
  financialPersonality: {
    spendingStyle: 'conservative' | 'moderate' | 'impulsive' | 'strategic',
    moneyMotivations: string[], // ['glory', 'status', 'security', 'power', 'family']
    financialWisdom: number,    // 30-90, financial intelligence
    riskTolerance: number,      // 20-95, risk appetite
    luxuryDesire: number,       // 10-95, material desires
    generosity: number,         // 30-85, willingness to help others
    financialTraumas: string[], // Past experiences shaping money behavior
    moneyBeliefs: string[]      // Core financial philosophies
  },
  
  // BATTLE SYSTEM INTEGRATION
  traditionalStats: TraditionalStats, // Battle compatibility stats
  battleAI: {
    aggression: number,         // 20-95, combat aggressiveness
    defensiveness: number,      // 30-90, protective instincts
    riskTaking: number,        // 25-85, tactical risk appetite
    adaptability: number,       // 40-85, learning ability
    preferredStrategies: string[] // Combat approach preferences
  }
}
```

---

## 📊 **STAT ALLOCATION GUIDE** 

### **Base Stats System (6 Core Stats)**

**Available Stats:**
- **Strength**: Physical power, damage (30-120)
- **Agility**: Speed, dodge, mobility (30-120)  
- **Intelligence**: Magic, tactics, learning (30-120)
- **Vitality**: Health, endurance, resistance (30-120)
- **Wisdom**: Awareness, experience gain (30-120)
- **Charisma**: Leadership, social influence (30-120)

### **Stat Allocation by Archetype**

#### **⚔️ WARRIOR** (Examples: Achilles, Joan of Arc, Genghis Khan)
**Stat Patterns:**
- **Primary**: Strength 80-100, Vitality 80-120
- **Secondary**: Agility 60-85, Charisma 75-95
- **Tertiary**: Intelligence 60-85
- **Weakness**: Wisdom 45-90 (varies by character wisdom)
- **Total Range**: 355-430 points

**Character Concept**: Physical combat leaders, battlefield commanders, honor-driven warriors

#### **🔮 MAGE/MYSTIC** (Examples: Merlin, Cleopatra, Tesla)
**Stat Patterns:**
- **Primary**: Intelligence 85-120, Wisdom 85-100
- **Secondary**: Charisma 65-98, Vitality 60-70
- **Tertiary**: Agility 50-70
- **Weakness**: Strength 30-55 (glass cannon design)
- **Total Range**: 328-410 points

**Character Concept**: Knowledge seekers, magical powerhouses, strategic masterminds

#### **🗡️ ASSASSIN/TRICKSTER** (Examples: Holmes, Billy the Kid, Robin Hood)
**Stat Patterns:**
- **Primary**: Agility 85-100, Intelligence 80-98
- **Secondary**: Wisdom 75-90, Charisma 65-90
- **Tertiary**: Strength 45-80, Vitality 60-85
- **Total Range**: 323-485 points

**Character Concept**: Speed specialists, tactical thinkers, adaptable survivors

#### **🛡️ TANK** (Examples: Frankenstein's Monster, Space Cyborg)
**Stat Patterns:**
- **Primary**: Vitality 95-120, Strength 95-100
- **Secondary**: Intelligence 65-75
- **Weakness**: Agility 30-80, Charisma 35-65
- **Total Range**: 410-465 points

**Character Concept**: Damage absorbers, protective guardians, immovable objects

#### **👽 SUPPORT** (Examples: Alien Grey)
**Stat Patterns:**
- **Primary**: Intelligence 100-120, Wisdom 90-100
- **Secondary**: Agility 70-80, Vitality 60-80
- **Tertiary**: Charisma 40-65
- **Weakness**: Strength 40-60
- **Total Range**: 328-440 points

**Character Concept**: Team enhancers, battlefield controllers, utility specialists

#### **🐺 BEAST** (Examples: Fenrir)
**Stat Patterns:**
- **Primary**: Strength 85-95, Agility 90-100, Vitality 90-100
- **Weakness**: Intelligence 30-50, Wisdom 30-50
- **Tertiary**: Charisma 50-65
- **Total Range**: 300-410 points

**Character Concept**: Primal power, instinctual combat, raw physical dominance

### **Stat Allocation by Rarity**

#### **🌟 MYTHIC** (300-485 points)
- **Signature Stats**: 1-2 stats at 95-120 (legendary mastery)
- **Supporting Stats**: 2-3 stats at 70-100
- **Allowed Extremes**: Can have stats as low as 30 for dramatic weaknesses
- **Examples**: Sun Wukong (485), Fenrir (300), Merlin (328)

#### **⭐⭐⭐⭐⭐ LEGENDARY** (320-430 points)
- **Signature Stats**: 1-2 stats at 85-100 (excellence)
- **Supporting Stats**: 2-3 stats at 60-85
- **Minimum**: 30 in any stat (controlled weaknesses)
- **Examples**: Dracula (430), Joan of Arc (405), Achilles (355)

#### **⭐⭐⭐⭐ EPIC** (350-410 points)
- **Signature Stats**: 1-2 stats at 80-95 (very strong)
- **Supporting Stats**: 2-3 stats at 55-80
- **Minimum**: 35 in any stat
- **Examples**: Frankenstein (410), Cleopatra (353)

#### **⭐⭐⭐ RARE** (330-360 points)
- **Signature Stats**: 1-2 stats at 70-85 (strong)
- **Supporting Stats**: 3-4 stats at 50-75
- **Minimum**: 40 in any stat
- **Examples**: Sammy Slugger (340)

#### **⭐⭐ UNCOMMON** (310-340 points)
- **Signature Stats**: 1 stat at 65-75 (good)
- **Supporting Stats**: 4-5 stats at 45-65
- **Minimum**: 45 in any stat

#### **⭐ COMMON** (280-320 points)
- **Maximum**: 65 in any stat
- **Distribution**: Relatively balanced, no extreme specialization
- **Minimum**: 50 in any stat

---

## 🎭 **PERSONALITY SYSTEM**

### **Character Personality Structure**

```typescript
personality: {
  traits: string[],           // 4-6 defining traits ["Bold", "Strategic", "Honorable"]
  speechStyle: string,        // Communication style ["Formal", "Casual", "Poetic", "Aggressive"]
  motivations: string[],      // 3-5 driving forces ["Glory", "Knowledge", "Revenge"]
  fears: string[],           // 2-4 vulnerabilities ["Death", "Failure", "Betrayal"]
  relationships: [            // Bonds with ALL existing characters
    {
      characterId: string,    // Target character ID
      relationship: 'ally' | 'rival' | 'mentor' | 'student' | 'enemy' | 'neutral',
      strength: number,       // -100 to 100 (intensity)
      history: string         // Background of relationship
    }
  ]
}
```

### **Psychology Stats Guidelines**

**Training** (50-85): Instruction following ability
- **80-85**: Disciplined military background
- **70-79**: Experienced but independent
- **60-69**: Moderate cooperation
- **50-59**: Rebellious or free-spirited

**Team Player** (30-90): Cooperation level
- **80-90**: Natural team leaders
- **60-79**: Good team members
- **40-59**: Individualistic but workable
- **30-39**: Lone wolves, difficult to manage

**Ego** (20-95): Arrogance level
- **80-95**: Legendary figures with massive egos
- **60-79**: Confident leaders
- **40-59**: Healthy self-confidence
- **20-39**: Humble, self-doubting

**Mental Health** (70-95): Psychological stability
- **90-95**: Exceptionally stable minds
- **80-89**: Strong mental fortitude
- **70-79**: Generally stable with some issues

**Communication** (40-90): Expression ability
- **80-90**: Master communicators, leaders
- **60-79**: Good social skills
- **50-59**: Average communication
- **40-49**: Introverted or communication barriers

---

## 🏺 **ABILITIES SYSTEM**

### **Required Abilities Per Character (4-6 total)**

#### **1 Ultimate Ability** (Signature Power)
```typescript
{
  id: string,
  name: string,              // Epic name reflecting character lore
  type: 'ultimate',
  power: 80-100,            // High damage/effect
  cooldown: 5-8,            // Long cooldown
  energyCost: 80-100,       // High energy cost
  description: string,       // Lore-appropriate description
  effects: string[],        // Specific battle effects
  icon: string,             // Emoji or icon identifier
  rarity: 'legendary' | 'mythic'
}
```

#### **2-3 Active Abilities** (Core Powers)
```typescript
{
  type: 'active',
  power: 40-70,             // Moderate damage/effect
  cooldown: 2-4,            // Medium cooldown
  energyCost: 30-60,        // Moderate energy cost
  rarity: 'rare' | 'epic'
}
```

#### **1-2 Passive Abilities** (Always-On Bonuses)
```typescript
{
  type: 'passive',
  effects: string[],        // Permanent bonuses
  requirements: string[],   // Activation conditions
  rarity: 'uncommon' | 'rare'
}
```

### **Ability Themes by Archetype**

**Warriors**: Physical attacks, battlefield control, inspiring allies
**Mages**: Elemental magic, area effects, magical barriers
**Assassins**: Critical strikes, stealth, poison/debuffs
**Tanks**: Damage absorption, healing, protective abilities
**Support**: Team buffs, healing, utility effects
**Beasts**: Natural weapons, pack bonuses, primal rage

---

## 🗡️ **EQUIPMENT INTEGRATION**

### **Required Equipment Per Character**

#### **3-Tier Weapon Progression**
1. **Common Starter Weapon** (Level 1)
   - Stat bonuses: +5-10 to primary stats
   - Simple effects, lore-appropriate
   - Example: "Wooden Training Sword" → "Bronze Spear"

2. **Rare Elite Weapon** (Level 15)
   - Stat bonuses: +15-25 to multiple stats
   - Special effects or abilities
   - Example: "Masterwork Steel Blade" → "Enchanted War Spear"

3. **Legendary Ultimate Weapon** (Level 30)
   - Stat bonuses: +30-50 to multiple stats
   - Unique abilities, major effects
   - Tied to character's legendary status
   - Example: "Excalibur" → "Spear of Destiny"

#### **Character-Specific Equipment Requirements**
- **Historical Accuracy**: Weapons appropriate to character's era
- **Cultural Authenticity**: Equipment matching character's background
- **Power Scaling**: Appropriate for character's rarity level
- **Visual Design**: Distinctive appearance matching character aesthetic

---

## 📊 **COMPLETE CHARACTER DATA STRUCTURE REQUIREMENTS**

### **FOUNDATIONAL CHARACTER TEMPLATE**

Every new character requires a comprehensive data structure with the following core sections:

#### **1. Basic Identity Fields**
```typescript
{
  id: string;                    // Unique identifier (e.g., "king_arthur")
  name: string;                  // Display name ("King Arthur")
  title?: string;                // Optional title ("Once and Future King")
  avatar: string;                // Emoji representation ("👑")
  archetype: CharacterArchetype; // 'warrior' | 'mage' | 'assassin' | 'tank' | 'support' | 'beast' | 'trickster' | 'mystic'
  rarity: CharacterRarity;       // 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'
}
```

#### **2. Lore & Historical Background**
```typescript
{
  description: string;           // Character backstory and legend
  historicalPeriod: string;      // "Medieval England (6th century)"
  mythology: string;             // "Arthurian Legend" or "Historical"
  
  personality: {
    traits: string[];            // ['Honorable', 'Noble', 'Determined', 'Wise']
    speechStyle: string;         // "Formal and regal"
    motivations: string[];       // ['Justice', 'Unity', 'Peace']
    fears: string[];            // ['Failure', 'Betrayal', 'Chaos']
    relationships: Array<{       // Bonds with other characters
      characterId: string;
      relationship: 'ally' | 'rival' | 'mentor' | 'student' | 'enemy' | 'neutral';
      strength: number;          // -100 to 100
      history: string;
    }>;
  };
}
```

#### **3. Statistics Structure**
```typescript
{
  level: number;                 // Starting level (typically 1)
  
  // Base Stats (primary progression system)
  baseStats: {
    strength: number;            // 30-120 based on rarity/archetype
    agility: number;             // Physical speed and dexterity
    intelligence: number;        // Magical power and learning
    vitality: number;            // Health and endurance
    wisdom: number;              // Experience gain and awareness
    charisma: number;            // Social abilities and leadership
  };
  
  // Traditional Stats (battle system compatibility)
  traditionalStats: {
    strength: number;            // 0-100, physical damage
    vitality: number;            // 0-100, HP and resistance
    speed: number;               // 0-100, turn order
    dexterity: number;           // 0-100, accuracy/critical
    stamina: number;             // 0-100, actions per turn
    intelligence: number;        // 0-100, spell power
    charisma: number;            // 0-100, social attacks
    spirit: number;              // 0-100, special abilities
  };
  
  // Combat Stats (calculated values)
  combatStats: {
    health: number;              // Current/max health
    maxHealth: number;
    mana: number;                // Current/max mana
    maxMana: number;
    attack: number;              // Physical attack power
    defense: number;             // Physical defense
    magicAttack: number;         // Magical attack power
    magicDefense: number;        // Magical defense
    speed: number;               // Combat speed
    criticalChance: number;      // Critical hit percentage
    criticalDamage: number;      // Critical damage multiplier
    accuracy: number;            // Hit chance
    evasion: number;             // Dodge chance
  };
}
```

#### **4. Psychology & Mental State System**
```typescript
{
  psychStats: {
    training: number;            // 0-100, instruction-following ability
    teamPlayer: number;          // 0-100, cooperation with others
    ego: number;                 // 0-100, arrogance/self-importance
    mentalHealth: number;        // 0-100, psychological stability
    communication: number;       // 0-100, expression/articulation ability
  };
  
  // Battle personality traits (affects combat behavior)
  personalityTraits: string[];   // ['Brilliant', 'Arrogant', 'Strategic']
  speakingStyle: 'formal' | 'casual' | 'archaic' | 'technical' | 'poetic' | 'gruff' | 'mysterious';
  decisionMaking: 'logical' | 'emotional' | 'impulsive' | 'calculated';
  conflictResponse: 'aggressive' | 'diplomatic' | 'withdrawn' | 'manipulative';
}
```

#### **5. Financial Personality System**
```typescript
{
  financialPersonality: {
    spendingStyle: 'conservative' | 'moderate' | 'impulsive' | 'strategic';
    moneyMotivations: string[];  // ['glory', 'status', 'security', 'power', 'family']
    financialWisdom: number;     // 0-100, base financial intelligence
    riskTolerance: number;       // 0-100, willingness to take risks
    luxuryDesire: number;        // 0-100, desire for expensive things
    generosity: number;          // 0-100, willingness to spend on others
    financialTraumas: string[];  // Past experiences affecting money decisions
    moneyBeliefs: string[];      // Core beliefs about wealth and money
  };
}
```

#### **6. Battle AI Configuration**
```typescript
{
  battleAI: {
    aggression: number;          // 0-100, combat aggressiveness
    defensiveness: number;       // 0-100, protective instincts
    riskTaking: number;          // 0-100, tactical risk appetite
    adaptability: number;        // 0-100, learning/adjustment ability
    preferredStrategies: string[]; // ['frontal_assault', 'spell_weaving', 'counter']
  };
}
```

#### **7. Skills System Integration**
```typescript
{
  // 5-Category Skills System (managed by progression system)
  coreSkills: {
    combat: { level: number; experience: number; maxLevel: 999; };
    survival: { level: number; experience: number; maxLevel: 999; };
    mental: { level: number; experience: number; maxLevel: 999; };
    social: { level: number; experience: number; maxLevel: 999; };
    spiritual: { level: number; experience: number; maxLevel: 999; };
  };
}
```

#### **8. Equipment Integration**
```typescript
{
  equippedItems: {
    weapon?: Equipment;          // Currently equipped weapon
    armor?: Equipment;           // Currently equipped armor
    accessory?: Equipment;       // Currently equipped accessory
  };
  
  equipmentBonuses: {            // Calculated stat bonuses from gear
    strength: number;
    agility: number;
    intelligence: number;
    vitality: number;
    wisdom: number;
    charisma: number;
  };
}
```

#### **9. Abilities & Powers**
```typescript
{
  abilities: CharacterAbilities; // 4-6 abilities (1 ultimate, 2-3 active, 1-2 passive)
  
  battleAbilities: Array<{
    id: string;
    name: string;
    type: 'attack' | 'defense' | 'special' | 'support';
    power: number;
    cooldown: number;
    description: string;
    mentalHealthRequired: number; // Minimum mental health to use reliably
  }>;
  
  specialPowers: Array<{
    id: string;
    name: string;
    type: 'passive' | 'active' | 'combo';
    description: string;
    effect: string;
    cooldown: number;
    teamPlayerRequired?: number;  // Some abilities require teamwork
  }>;
}
```

#### **10. Progression & Customization**
```typescript
{
  progressionTree: ProgressionTree;    // Character-specific advancement paths
  unlockedContent: string[];           // Available content/features
  achievements: string[];              // Earned achievements
  
  customization: {
    battleQuotes: string[];            // Character-specific combat dialogue
    outfit?: string;                   // Visual customization
    weaponSkin?: string;               // Weapon appearance
    victoryAnimation?: string;         // Win celebration
  };
  
  // Game mechanics
  trainingLevel: number;               // 0-100, affects gameplan adherence
  bondLevel: number;                   // 0-100, relationship with player/coach
  fatigue: number;                     // 0-100, affects performance
}
```

### **EXAMPLE CHARACTER TEMPLATE**

Based on existing character data (Achilles):

```typescript
const kingArthurTemplate = {
  name: 'King Arthur',
  title: 'Once and Future King',
  avatar: '👑',
  archetype: 'warrior',
  rarity: 'legendary',
  
  description: 'Legendary king of Britain who united the land through noble leadership and the power of Excalibur.',
  historicalPeriod: 'Medieval England (6th century)',
  mythology: 'Arthurian Legend',
  
  personality: {
    traits: ['Honorable', 'Noble', 'Just', 'Inspiring'],
    speechStyle: 'Formal and regal',
    motivations: ['Unity', 'Justice', 'Peace'],
    fears: ['Betrayal', 'Failure', 'Corruption'],
    relationships: []
  },
  
  level: 1,
  baseStats: {
    strength: 85,      // Strong warrior
    agility: 70,       // Moderate speed
    intelligence: 90,  // Wise ruler
    vitality: 95,      // Great endurance
    wisdom: 85,        // Experienced leader
    charisma: 100      // Natural leader
  },
  
  psychStats: {
    training: 85,      // Disciplined
    teamPlayer: 95,    // Excellent leader
    ego: 40,           // Humble for a king
    mentalHealth: 90,  // Stable and focused
    communication: 95  // Inspirational speaker
  },
  
  financialPersonality: {
    spendingStyle: 'strategic',
    moneyMotivations: ['security', 'power', 'honor'],
    financialWisdom: 85,
    riskTolerance: 60,
    luxuryDesire: 45,
    generosity: 90,
    financialTraumas: ['Kingdom's economic struggles'],
    moneyBeliefs: ['Wealth should serve the people', 'Honor above profit']
  },
  
  battleAI: {
    aggression: 70,
    defensiveness: 80,
    riskTaking: 60,
    adaptability: 85,
    preferredStrategies: ['protect_allies', 'inspire_team', 'noble_duel']
  }
};
```

### **VALIDATION REQUIREMENTS**

- **Stat Total Compliance**: Must fall within rarity range (Legendary: 320-430 points)
- **Archetype Consistency**: Stats and abilities must match character class expectations
- **Era Integration**: All personality traits and reactions must align with historical period
- **Interface Compliance**: Must match TeamCharacter interface exactly for battle system
- **Balance Verification**: Character must be competitive but not overpowered for their rarity

---

## 🖼️ **COMPLETE IMAGE ASSET REQUIREMENTS (65+ Images)**

### **IMAGE PROMPT TEMPLATES BY CATEGORY**

Each character requires specific images across 33+ different contexts. Below are the exact prompt templates with naming conventions.

---

## **🎨 COACH TAB IMAGES**

### **1. Performance Coaching**
**Location**: `/public/images/1-on-1_coaching/`
**Naming**: `{character_name}_1-on-1.png`
**Prompt Template**:
"Semi-realistic, graphic novel style portrait of [Character name] strategizing in their own way. [Character's distinctive visual appearance and era-appropriate elements]. Strategic planning activity (whiteboard, maps, diagrams, etc.) with abstract symbols (X's, O's, lines, arrows). The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio). Ensure there are no borders, WORDS, LETTERS, or any extraneous graphical elements, text, numbers, or symbols within the image."

### **2. Personal Problems (Individual Sessions)**
**Location**: `/public/images/Coaching/Personal/`
**Naming**: `{character_name}_personal.png`
**Prompt Template**:
"Semi-realistic, graphic novel style portrait of [Character name] sitting at small modern table in brightly lit contemporary coffee shop. [Character] in full era-appropriate attire looking directly at camera with timeless, knowing, perhaps slightly amused expression. Background: blurred espresso machine and counter. Simple ceramic coffee cup on table. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio). Ensure there are no borders or any extraneous graphical elements, text, numbers, or symbols within the image."

### **3. Finance**
**Location**: `/public/images/Coaching/Finance/`
**Naming**: `{character_name}_finance.png`
**Prompt Template**:
"Realistic cartoon illustration of [Character name] standing alone in luxury hotel lobby wearing anachronistic modern luxury outfit (designer tracksuit, gem-studded sneakers, sunglasses indoors). Setting: marble floors, towering indoor palms, minimalist modern furniture. Posture: confident, composed, hands at sides, unbothered by extravagance. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio)."

### **4. Therapy**
**Location**: `/public/images/Coaching/Therapy/`
**Naming**: `{character_name}_therapy.png`
**Prompt Template**:
"Realistic style cartoon illustration of [Character name] with [era-appropriate appearance details], wearing [character's iconic attire]. [Character] is sitting in a contemporary therapist's office with a bookshelf behind them. The therapist is not seen on camera. The image is full-bleed extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio)."

### **5. Group Activities**
**Location**: `/public/images/Coaching/Group/`
**Naming**: `{character_name}_group.png`
**Prompt Template**:
"Semi-realistic, graphic novel style portrait of [Character name] participating in modern group activity (fishing, sports, etc.) in full era-appropriate attire. [Character] wearing humorous modern activity gear awkwardly over their historical outfit. Expression of confusion/disdain at modern activity/tools. Activity-appropriate background setting. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio). Ensure there are no borders or any extraneous graphical elements, text, numbers, or symbols within the image."

---

## **👤 CHARACTERS TAB IMAGES**

### **1. Progression**
**Location**: `/public/images/Character/Progression/`
**Naming**: `{Character Name} {01-03}.png`
**Prompt Template**:
"Semi-realistic, graphic novel style portrait of [Character name] at modern university graduation ceremony on stage with university banners backdrop. [Character] in full era-appropriate attire with oversized academic gown draped over it. Mortarboard cap perched on helmet/head. [Character] solemnly accepting rolled diploma from bewildered university dean. Expression: regal, stoic gravity, treating diploma with reverence of sacred artifact. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio). Ensure there are no borders or any extraneous graphical elements, text, numbers, or symbols within the image."

### **2. Equipment**
**Location**: `/public/images/Character/Equipment/`
**Naming**: `{character_name}_equipment.png`
**Prompt Template**:
"Semi-realistic, graphic novel style portrait of [Character name] in simple, well-lit modern workshop at clean wooden workbench. [Character] meticulously cleaning/polishing/maintaining their signature weapon. [Character] in full era-appropriate attire with modern leather tool apron over it. Using modern cleaning supplies (cloth, polishing solution, cleaning kit) laid out neatly. Expression: serene focus, same reverence as preparing for battle. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio). Ensure there are no borders or any extraneous graphical elements, text, numbers, or symbols within the image."

### **3. Skills/Abilities**
**Location**: `/public/images/Character/Skills:Abilities/`
**Naming**: `{character_name}_skills.png`
**Prompt Template**:
"Semi-realistic, graphic novel style portrait of [Character name] attempting humorous demonstration of skill/ability that may not align with their character. [Character] in full era-appropriate attire in modern setting appropriate to the skill. Scene shows evidence of repeated failed attempts (arrows around target, scattered objects, etc.). [Character's] expression: intense, frustrated concentration. Optional second character as stoic, unbothered participant/target. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio). Ensure there are no borders or any extraneous graphical elements, text, numbers, or symbols within the image."

#### **Skills/Abilities Image (1 required)**
**Location**: `/public/images/Character/Skills:Abilities/`
**Naming**: `{character_name}_skills.png`
**Examples**:
- `achilles_skills.png`
- `merlin_skills.png`
- `joan_of_arc_skills.png`

#### **Equipment Image (1 required)**
**Location**: `/public/images/Character/Equipment/`
**Naming**: `{character_name}_equipment.png`
**Examples**:
- `achilles_equipment.png`
- `cleopatra_equipment.png`

#### **Training Images (3 required)**
**Location**: `/public/images/Training/`
**Naming**: `Training {Character Name} {01-03}.png`
**Examples**:
- `Training Achilles 01.png`
- `Training Tesla 02.png`
- `Training Joan of Arc 03.png`

#### **1-on-1 Coaching Image (1 required)**
**Location**: `/public/images/1-on-1_coaching/`
**Naming**: `{character_name}_1-on-1.png`
**Examples**:
- `achilles_1-on-1.png`
- `sherlock_holmes_1-on-1.png`

#### **Confessional Image (1 required)**
**Location**: `/public/images/Confessional/Spartan Apartment/`
**Naming**: `{Character_Name}_Conf_SptnApt.png`
**Examples**:
- `Achilles_Conf_SptnApt.png`
- `Joan_of_Arc_Conf_SptnApt.png`

#### **Homepage Images (4 required)**
**Location**: `/public/images/Homepage/`
**Naming**: `{Character Name} {01-04}.png`
**Examples**:
- `Achilles 01.png` through `Achilles 04.png`
- `Tesla 01.png` through `Tesla 04.png`

#### **Battle Images (51+ required - MAJOR TASK)**
**Location**: `/public/images/colosseaum/`
**Naming**: `Battle {New Character} vs {Existing Character} {01-03}.png`

**Required Battle Images Against ALL Existing Characters:**
1. **Achilles**: 3 battle scenes
2. **Merlin**: 3 battle scenes
3. **Fenrir**: 3 battle scenes
4. **Cleopatra**: 3 battle scenes
5. **Sherlock Holmes**: 3 battle scenes
6. **Dracula**: 3 battle scenes
7. **Joan of Arc**: 3 battle scenes
8. **Frankenstein's Monster**: 3 battle scenes
9. **Sun Wukong**: 3 battle scenes
10. **Sammy Slugger**: 3 battle scenes
11. **Billy the Kid**: 3 battle scenes
12. **Genghis Khan**: 3 battle scenes
13. **Tesla**: 3 battle scenes
14. **Zeta Alien**: 3 battle scenes
15. **Robin Hood**: 3 battle scenes
16. **Space Cyborg**: 3 battle scenes
17. **Agent X**: 3 battle scenes

**Total**: 17 characters × 3 images = **51 battle images minimum**

**Example Battle Image Names:**
- `Battle King Arthur vs Achilles 01.png`
- `Battle King Arthur vs Merlin 02.png`
- `Battle King Arthur vs Fenrir 03.png`

---

## **⚔️ BATTLE TAB IMAGES**

### **Battle Arena (Pre/Post Battle)**
**Location**: `/public/images/colosseaum/`
**Naming**: `{character_name}_battle_arena.png`
**Prompt Template**:
"Realistic, cinematic-style illustration of [Character name] in futuristic colosseum arena from slightly low angle, close-up on character. Character standing on circular lift platform that has risen from glossy black stage floor. [Character] in era-appropriate attire, holding period-accurate weapon, in cautious/alert battle pose. Behind character: glowing rectangular portal framing their era-appropriate environment (office, castle, laboratory, etc.) with era-specific details and atmospheric lighting. Arena setting: packed seating with roaring crowd, bright stadium lights. Lighting: Divine golden light from portal mixing with cool arena spotlights creating dramatic reflections. Ultra-sharp, realistic illustration, cinematic composition, no text. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio)."

**Note**: Character's directional orientation relative to portal can be randomized or set to coordinate with clock positions for variety.

### **Battle Images vs All Existing Characters (51 total)**
**Location**: `/public/images/colosseaum/`
**Naming**: `Battle {New Character} vs {Existing Character} {01-03}.png`

#### **Battle Scene 1 - In New Character's World**
**Prompt Template**:
"Realistic, cinematic-style illustration of [New Character] facing off against [Existing Character]. They are locked in desperate battle in [New Character's home environment - era/mythology appropriate setting]. [Existing Character], a creature/figure from [their era], looks jarringly out of place against the backdrop of [New Character's environmental details]. [New Character], using their wits and environment, [character-appropriate combat action]. The lighting is [era-appropriate lighting style]. Ultra-sharp, realistic illustration, cinematic composition, no text. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio)."

#### **Battle Scene 2 - In Existing Character's World**  
**Prompt Template**:
"Realistic, cinematic-style illustration of [New Character] facing off against [Existing Character]. They are fighting in [Existing Character's home environment]. [Existing Character], empowered by their home, is [enhanced description]. [New Character], dwarfed by [environmental challenge], [defensive/adaptive action appropriate to character]. The scene is [environmental mood], with [lighting description]. Ultra-sharp, realistic illustration, cinematic composition, no text. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio)."

#### **Battle Scene 3 - In Random/Neutral World**
**Prompt Template**:
"Realistic, cinematic-style illustration of [New Character] and [Existing Character], both disoriented and facing off in a surreal, alien [random environment]. [Environmental description with otherworldly elements]. [New Character] and [Existing Character] are momentarily distracted from their fight, cautiously observing the hostile and unfamiliar environment, their rivalry now complicated by a shared struggle to survive. The lighting is otherworldly [color palette]. Ultra-sharp, realistic illustration, cinematic composition, no text. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio)."

**Required Battle Images Against**: Achilles, Merlin, Fenrir, Cleopatra, Sherlock Holmes, Dracula, Joan of Arc, Frankenstein's Monster, Sun Wukong, Sammy Slugger, Billy the Kid, Genghis Khan, Tesla, Zeta Alien, Robin Hood, Space Cyborg, Agent X

**Total**: 17 characters × 3 scenes each = **51 battle images**

---

## **👥 SOCIAL TAB IMAGES**

### **1. Clubhouse**
**Location**: `/public/images/Social/Clubhouse/`
**Naming**: `{character_name}_clubhouse.png`
**Prompt Template**:
"Semi-realistic, graphic novel style portrait of [Character name] standing alone in the luxurious ColosSeaum clubhouse at night, gazing out through towering floor-to-ceiling windows at the glowing ocean arena below. [Character] is dressed in [era-appropriate formal attire with character-specific details]. [Character] stands in slight profile, [characteristic pose/gesture]. The clubhouse interior features polished marble floors, rich velvet seating, and soft warm lighting, while the cool blue glow of the arena reflects on the glass and on their attire. The mood is [character-appropriate: regal/brooding/contemplative/amused], blending warm interior tones with cool exterior highlights. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio). Ensure there are no borders or any extraneous graphical elements, text, numbers, or symbols within the image."

### **2. Community Board (Holo Trash Talk Board)**
**Location**: `/public/images/Social/Board/`
**Naming**: `{character_name}_community_board.png`
**Prompt Template**:
"Futuristic holographic message board floating in mid-air, covered with glowing multicolor text, doodles, and trash talk messages as if written by various characters. In the foreground, [Character name] stands [in characteristic pose with their signature weapon/tool], [characteristic expression] and pointing at one of the glowing messages. The background shows a sleek, high-tech lobby with neon lighting and scattered VIP signage. The board looks chaotic but vibrant, like a futuristic social media wall. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio). Ensure there are no borders or any extraneous graphical elements, text, numbers, or symbols within the image."

### **3. Graffiti Wall (Digital Graffiti Wall)**
**Location**: `/public/images/Social/Graffiti/`
**Naming**: `{character_name}_graffiti.png`
**Prompt Template**:
"Vibrant cyberpunk alley scene with a glowing digital graffiti wall covered in colorful tags and doodles. [Character name], wearing [casual streetwear adapted to their era but still with signature elements], is spraying [character-specific tag/symbol] with a futuristic spray can that leaves neon trails. [Optional: Second character nearby with contrasting reaction - approval/disapproval]. The character's graffiti tag reflects their personality - [examples: archer's arrow, monkey doodles, electrical equations, fang marks, etc.] glowing in [character-appropriate color]. The scene is alive with color, like a mix of street art and holograms, set in a back alley of the floating ColosSeaum or secret players-only area. The tone is colorful and rebellious with a street-culture vibe. The image is full-bleed, extending to all edges of the tall, card-shaped format (approximately 2:3.5 aspect ratio). Ensure there are no borders or any extraneous graphical elements, text, numbers, or symbols within the image."

---

## 🤖 **DIALOGUE/AI PROMPT SYSTEM INTEGRATION**

### **COMPREHENSIVE PROMPT REQUIREMENTS**

Based on analysis of existing character prompt templates, each new character requires sophisticated dialogue systems across 11+ conversation contexts. The system maintains character consistency while adapting to different interaction types.

### **1. Kitchen Table Chat System**
**Context**: Domestic conversations in headquarters
**File Integration**: `kitchenChatService.ts`

**Required Elements**:
- **Character Identity Layer**: Detailed personality profile with traits, speech style, motivations, fears, and historical period
- **Living Situation Context**: Dynamic responses based on apartment tier (Spartan → Basic House → Team Mansion → Elite Compound)
- **Sleeping Arrangement Impact**: Character reactions influenced by sleep quality (floor/couch sleepers = resentful, bed sleepers = guilty/defensive)
- **Scene Type Variations**: Three conversation modes - mundane (deadpan everyday topics), conflict (tension/clashes), chaos (escalating arguments)
- **Era/Historical Integration**: Medieval characters reference honor/battles, Victorian focus on propriety/analysis, Ancient compare to past glories
- **Response Format**: 1-3 sentences conversational, personality-driven reactions to mundane triggers, historical perspective on domestic situations

**Template Structure**:
```typescript
CHARACTER_KITCHEN_PROFILE = {
  traits: ['Bold', 'Strategic', 'Honorable'],
  speechStyle: 'Direct and commanding',
  motivations: ['Glory', 'Honor', 'Victory'],
  fears: ['Dishonor', 'Failure'],
  eraReactions: {
    modernLiving: 'Views cramped quarters as beneath their station',
    technology: 'Fascinated but suspicious of modern conveniences',
    roommates: 'Treats other legendary figures as equals in exile'
  }
}
```

**Response Requirements**:
- 1-3 sentence conversational responses
- Era-specific reactions to modern domestic situations
- Living situation stress affects personality expression
- Relationship dynamics with other characters
- Historical identity maintained in mundane contexts

### **2. Confessional System**
**Context**: Personal reflection sessions
**File Integration**: `confessionalService.ts`

**Required Elements**:
- **Invisible Director Format**: Characters respond to inaudible prompts using "You want to know about..." acknowledgment patterns
- **Reality TV Dynamics**: Authentic confessional booth responses about living arrangements, competition drama, alliance formation
- **Vulnerability Progression**: Defensive (guarded, deflecting) → Breakthrough (emotional cracks, personal revelations) across sessions
- **Memory Integration**: Characters reflect on past conflicts, therapy sessions, and drama with high embarrassment/emotional intensity
- **Response Format**: 1-2 sentences, memorable reveals, historical personality clashing with reality TV context
- **Privacy System**: Confessional content stays private (no memory export), import-only for context

**Template Structure**:
```typescript
CONFESSIONAL_SETUP = `You are ${character.name} in the BLANK WARS reality show confessional booth. An invisible director behind the camera just asked you an inaudible question about: "${hostmasterQuestion}"

CONFESSIONAL BOOTH SETUP:
- You're alone in the confessional booth, speaking directly to the camera
- The director's voice is inaudible to viewers - only your responses are heard
- You react to their unheard question/prompt and address it naturally
```

**Response Requirements**:
- Begin with "You want to know about..." acknowledgment patterns
- 1-2 sentence memorable reveals
- Historical personality clashing with reality TV dynamics
- Vulnerability progression from defensive to breakthrough
- Private memories stay internal (no export to other systems)

### **3. Performance Coaching System**
**Context**: 1-on-1 combat training
**File Integration**: `PerformanceCoachingChat.tsx`

**Required Elements**:
- **Role Clarity**: Character is BEING COACHED (not giving coaching), refers to "MY stats" when discussing performance data
- **Data-Referencing Responses**: Must reference actual numerical stats (level, attack, health, win rate, gameplan adherence %) in 2-3 sentence responses
- **Era-Specific Combat Understanding**: Historical period influences coaching reception (Achilles = honor/glory, Joan = faith/tactics, Holmes = analytical/logical)
- **Combat Philosophy Expression**: Characters express battle approach through historical/mythological lens while seeking improvement guidance
- **Performance Integration**: Characters discuss stat weaknesses, equipment gaps, battle history analysis, and level-appropriate concerns
- **Personality-Driven Reception**: Traits affect how advice is received (warriors focus strength, mages emphasize strategy, assassins discuss precision)

**Template Structure**:
```typescript
COACHING_CONTEXT = `This is a performance coaching session. You are ${selectedCharacter.name}, a warrior/fighter character speaking to your coach about YOUR OWN combat performance.

CRITICAL ROLE CLARIFICATION: 
- YOU ARE THE CHARACTER BEING COACHED, NOT THE COACH
- These are YOUR stats, YOUR performance data, YOUR battle record
- You should talk about YOUR performance, YOUR strengths, YOUR areas for improvement
```

**Response Requirements**:
- Characters reference actual numerical stats in responses
- Performance discussion integrates with personality traits
- Era-specific combat understanding affects coaching reception
- 2-3 sentences, data-referencing style
- Combat philosophy expression

### **4. Financial Advisory System**
**Context**: Money management decisions
**File Integration**: `FinancialAdvisorChat.tsx`

**Required Elements**:
- **Era-Specific Money Confusion/Fascination**: Legendary figures from their era finding modern financial concepts foreign or fascinating
- **Trust/Stress Dynamic**: Trust level (0-100%) affects advice reception, financial stress (0-100%) influences decision-making quality
- **Decision Psychology**: Spending personality ('impulsive', 'moderate', 'conservative', 'strategic') shapes money attitudes and choices
- **Cultural Financial Understanding**: Medieval = honor/divine purpose, Victorian = propriety/social order, Ancient = conquest/glory affecting financial views
- **Financial Decision Simulation**: Characters make spending decisions (luxury purchases, investments) that coach can approve/reject based on character psychology
- **Outcome Tracking**: Success/failure of financial decisions affects future trust levels and stress, with AI judge system evaluating results

**Template Structure**:
```typescript
FINANCIAL_PROMPT = `You are ${selectedCharacter?.name}, a legendary figure, participating in a financial coaching session with your team's financial advisor.

CHARACTER FINANCIAL PSYCHOLOGY:
- You are a legendary figure from your era, so modern financial concepts might be foreign or fascinating
- React to financial advice based on your background and personality
- Your trust level (${trustLevel}%) affects how you receive coaching
- Your financial stress (${stressLevel}%) influences your decision-making
```

**Response Requirements**:
- Era-specific money concept confusion/fascination
- Financial stress levels affect decision-making quality
- Trust dynamics affect advice reception
- Decision psychology based on character personality
- Cultural financial understanding differences

### **5. Therapy System**
**Context**: Individual and group therapy
**File Integration**: `TherapyModule.tsx`

**Required Elements**:
- Psychological depth
- Willingness to open up
- Response to therapeutic techniques
- Character-specific trauma/issues
- Growth potential

**Template Structure**:
```typescript
THERAPIST_CORE_TEMPLATES = {
  'carl-jung': {
    approach: `Your therapeutic approach focuses on:
    - Archetypal analysis and understanding character types
    - Integration of the shadow self (hidden/rejected aspects)
    - Dream work and symbolic interpretation`,
  },
  'seraphina': {
    approach: `Your therapeutic approach includes:
    - Emotional healing through magical metaphors
    - Intuitive understanding of heart wounds
    - Transformation work using fairy magic concepts`,
  }
};
```

**Response Requirements**:
- Resistance to modern therapy concepts initially
- Historical skepticism of mental health treatment
- Vulnerability progression: Initial → Resistance → Breakthrough
- Era-appropriate therapy reception patterns
- Real living conflicts inform therapy content

### **6. Group Activities System**
**Context**: Team building exercises
**File Integration**: `CombinedGroupActivitiesWrapper.tsx`

**Required Elements**:
- Team interaction style
- Leadership tendencies
- Conflict resolution approach
- Social bonding preferences
- Competitive vs collaborative nature

**Template Structure**:
```typescript
GROUP_ACTIVITY_CONTEXT = {
  activityType: ['games', 'therapy', 'meditation', 'sports'],
  characterRole: 'participant', // not leader unless personality demands
  groupDynamics: 'characters understand their role in team activities',
  crossEraInteraction: 'historical figures navigating modern group activities'
}
```

**Response Requirements**:
- Activity-specific reactions (games vs therapy vs meditation)
- Group dynamics awareness and role understanding
- Collaborative vs competitive tendencies based on personality
- Cross-era social dynamics navigation
- Activity engagement levels vary by character type

### **7. Battle AI Decision Making**
**Context**: Combat choices and reactions
**File Integration**: `battleEngine.ts` and `teamBattleSystem.ts`

**Required Elements**:
- **Tactical Preferences**: Array of preferred strategy strings (e.g., 'frontal_assault', 'spell_weaving', 'counter', 'lifesteal', 'buff_allies')
- **Risk Tolerance**: Numeric riskTaking value (0-100) affecting combat behavior (High: 85-95, Medium: 60-80, Low: 25-40)
- **Team Strategy Reaction**: Training level (0-100) + mental state modifiers (mental health, team player, ego, morale) affecting gameplan adherence
- **Emergency Decision Patterns**: Rogue action system with triggers (low mental health, stress overload, team conflict) and response types (ignores strategy, flees battle, goes berserk)
- **Combat Communication Style**: Speech patterns, personality traits, and battle quotes affecting in-combat dialogue

**Template Structure**:
```typescript
BATTLE_AI_PROFILE = {
  aggression: number,        // 20-95, combat aggressiveness
  defensiveness: number,     // 30-90, protective instincts
  riskTaking: number,       // 25-85, tactical risk appetite
  adaptability: number,      // 40-85, learning ability
  preferredStrategies: string[] // Combat approach preferences
}
```

**Response Requirements**:
- Tactical preferences drive decision-making
- Risk tolerance affects combat choices
- Reaction to team strategies and coordination
- Emergency decision patterns under pressure
- Combat communication style during battles

### **8. Equipment Advisory System**
**Context**: Gear management and optimization discussions
**File Integration**: `EquipmentAdvisorChat.tsx`

**Required Elements**:
- **Archetype-Specific Recommendations**: Equipment advice based on character class (warrior = strength weapons, mage = intelligence gear, assassin = agility items)
- **Stat-Based Analysis**: Characters receive specific equipment suggestions based on current stat weaknesses (e.g., "Your vitality (65) needs heavier armor")
- **Era-Appropriate Gear Reactions**: Historical characters respond to modern equipment concepts through their cultural lens
- **Equipment Synergy Understanding**: Characters discuss how gear complements their abilities and fighting style
- **Upgrade Path Guidance**: Progressive equipment recommendations as characters advance in level and capability
- **Bond Level Integration**: Equipment discussions can increase character-coach relationship bonds

### **9. Skills Development System**
**Context**: Ability progression and training planning
**File Integration**: `SkillDevelopmentChat.tsx`

**Required Elements**:
- **5-Category Skill Analysis**: Characters discuss combat, survival, mental, social, and spiritual skill development priorities
- **Skill-to-Stat Mapping**: Understanding how skill advancement affects battle performance through stat multipliers
- **Training Priority Planning**: Characters identify which skills to focus on based on their archetype and current progression
- **Ability Synergy Discussion**: How different skills complement each other and character builds
- **Experience Allocation Strategy**: Planning how to distribute skill experience points for optimal character development
- **Historical Skill Integration**: Characters relate skill development to their legendary backgrounds and expertise areas

### **10. AI Drama Board (Community Board) System**
**Context**: Community message interactions and social dynamics
**File Integration**: `AIMessageBoard.tsx` and `CommunityBoard.tsx`

**Required Elements**:
- **Post Creation**: Characters generate community messages about recent events, training, battles, or personal updates
- **Drama Response Patterns**: Characters react to posts based on personality (supportive, competitive, confrontational, analytical)
- **Relationship-Driven Interactions**: Character responses influenced by existing bonds and conflicts with post authors
- **Gossip and Rumor Spreading**: Characters share and react to information about other characters and team dynamics
- **Community Hierarchy Awareness**: Characters understand their social standing and interact accordingly
- **Event-Driven Content**: Posts often reference recent battles, training sessions, living situation changes, or interpersonal drama

### **11. Social Lounge (Clubhouse) System**
**Context**: Casual social interactions in shared spaces
**File Integration**: `ClubhouseLounge.tsx`

**Required Elements**:
- **Mood-Based Interactions**: Characters have dynamic moods (relaxed, excited, annoyed, thoughtful, playful) affecting conversation style
- **Activity Awareness**: Characters discuss and react to ongoing lounge activities (games, music, competitions)
- **Cross-Team Socializing**: Characters interact with fighters from other teams, creating alliance or rivalry dynamics
- **Status Broadcasting**: Characters can announce arrivals, departures, and current activities to the social space
- **Casual Conversation Topics**: Lighter discussions about non-combat topics, personal interests, and daily life
- **Group Dynamic Navigation**: Characters adapt their behavior based on who else is present in the lounge

### **Character Consistency Framework**

**Cross-Context Requirements**:
- **Same Personality Traits**: All prompts reference identical trait arrays
- **Era Integration**: Historical background influences all interactions
- **Speech Style Consistency**: Communication patterns maintained across contexts
- **Relationship Dynamics**: Bonds with other characters affect all interactions
- **Living Situation Integration**: Stress from overcrowding affects all conversations

**Master Character Prompt Template**
```typescript
characterPrompt: {
  corePersonality: {
    name: string,
    era: string,
    background: string,
    personalityTraits: string[],
    speechPatterns: string[],
    motivations: string[],
    fears: string[]
  },
  conversationContexts: {
    casual: string,              // Kitchen chat, informal moments
    formal: string,              // Official discussions, coaching
    stressed: string,            // High-pressure situations
    relaxed: string,            // Downtime, recreational activities
    conflict: string,           // Disagreements, tensions
    supportive: string          // Helping others, team bonding
  },
  responseGuidelines: {
    vocabularyLevel: string,     // Era-appropriate language
    emotionalRange: string,      // Typical emotional expressions
    topicExpertise: string[],    // Knowledge areas
    topicAvoidance: string[],    // Uncomfortable subjects
    relationships: object        // Character-specific interaction rules
  }
}
```

**Response Format Standards**:
```typescript
RESPONSE_FORMATS = {
  kitchen: '1-3 sentences, conversational',
  confessional: '1-2 sentences, direct to camera',
  coaching: '2-3 sentences, data-referencing',
  financial: '1-3 sentences, decision-focused',
  therapy: '1-2 sentences, emotionally authentic',
  group: '2-3 sentences, socially aware',
  battle: 'Action-oriented, tactical communication'
}
```

### **Depth and Authenticity Standards**

**Character Development Arc**:
```typescript
const characterDepth = {
  surface: "Character maintains defenses, gives surface-level responses",
  emerging: "Character shows cracks in defenses, hints at deeper issues", 
  breakthrough: "Character becomes vulnerable, shares authentic emotions"
}
```

**Historical Authenticity Requirements**:
- Era-appropriate reactions to modern concepts
- Cultural understanding limitations and fascinations
- Personality traits drive all decision-making
- Realistic character growth across conversation types
- Maintenance of legendary status while showing humanity

---

## 🔧 **TECHNICAL INTEGRATION REQUIREMENTS**

### **Files Requiring Updates**

#### **1. Core Character Database**
**File**: `/src/data/characters.ts`
**Updates Required**:
- Add character template to `characterTemplates` object
- Include in `createDemoCharacterCollection()` function
- Verify template validation
- Test character instantiation

#### **2. Equipment Integration**
**File**: `/src/data/equipment.ts`
**Updates Required**:
- Add 3-tier weapon progression
- Define character equipment compatibility
- Update equipment filtering functions
- Add character weapon mappings

#### **3. Abilities Integration**
**File**: `/src/data/abilities.ts`
**Updates Required**:
- Add character-specific abilities (4-6 total)
- Define ability progressions
- Update ability filtering systems
- Add ability interaction definitions

#### **4. Skills Integration**
**File**: `/src/data/skills.ts`
**Updates Required**:
- Add signature skills for character
- Define archetype skill bonuses
- Update skill interaction systems
- Add character skill progression trees

#### **5. Image Utility Updates**
**File**: `/src/utils/characterImageUtils.ts`
**Updates Required**:
- Add character image mappings for all contexts
- Update image path functions
- Add error handling for missing images
- Test image loading across all tabs

**File**: `/src/utils/battleImageMapper.ts`
**Updates Required**:
- Add battle image mappings for all matchups
- Update battle scene generation
- Add character vs all existing characters

### **Database Integration**

#### **Character Creation Validation**
```typescript
// Required validation checks
const validateNewCharacter = (character: Character) => {
  // Stat total within rarity range
  const statTotal = Object.values(character.baseStats).reduce((a, b) => a + b, 0);
  const rarityRanges = {
    'mythic': [300, 485],
    'legendary': [320, 430],
    'epic': [350, 410],
    'rare': [330, 360]
  };
  
  // All required fields present
  // Psychology stats within valid ranges
  // Abilities match archetype requirements
  // Equipment compatibility verified
  // Image assets exist and load properly
}
```

---

## ✅ **QUALITY ASSURANCE CHECKLIST**

### **Pre-Integration Testing**

#### **Data Validation**
- [ ] Character template instantiates without errors
- [ ] All required fields populated with valid data
- [ ] Stat totals within rarity range
- [ ] Psychology stats within valid ranges (training: 50-85, etc.)
- [ ] Financial personality complete and consistent
- [ ] Abilities match archetype and power level
- [ ] Equipment progression appropriate for character level

#### **Image Asset Verification**
- [ ] All 73+ images created and properly named
- [ ] Images load correctly in all tabs
- [ ] Battle images exist for all character matchups
- [ ] Image dimensions consistent with existing assets
- [ ] Image quality meets standards
- [ ] No broken image links in any context

#### **AI Integration Testing**
- [ ] Character responds appropriately in kitchen chat
- [ ] Confessional monologues match personality
- [ ] Performance coaching responses authentic
- [ ] Financial decisions reflect personality
- [ ] Therapy sessions show psychological depth
- [ ] Group activities show social dynamics
- [ ] Battle AI makes character-appropriate decisions

#### **Game Balance Testing**
- [ ] Character performs competitively in battles
- [ ] Stat distribution creates unique playstyle
- [ ] Abilities balanced against existing characters
- [ ] Equipment progression feels rewarding
- [ ] Financial behavior realistic and engaging
- [ ] Training responses improve gameplay

#### **Integration Testing**
- [ ] Character appears in all appropriate tabs
- [ ] Image loading works across all contexts
- [ ] Skill progression functions correctly
- [ ] Equipment equipping works properly
- [ ] Battle integration seamless
- [ ] Chat systems recognize character
- [ ] Headquarters integration functional

### **Post-Integration Validation**

#### **System Compatibility**
- [ ] No performance impact from new character
- [ ] All existing functionality remains intact
- [ ] No memory leaks or stability issues
- [ ] Cross-tab navigation works properly
- [ ] Save/load functionality includes new character

#### **User Experience**
- [ ] Character feels distinct and authentic
- [ ] Personality consistent across contexts
- [ ] Visual design coherent and appealing
- [ ] Gameplay mechanics intuitive
- [ ] Educational/entertainment value high

---

## 📚 **DEVELOPMENT WORKFLOW**

### **Phase 1: Concept & Design (8-12 hours)**
1. **Character Concept Development**
   - Research historical/mythological background
   - Define unique personality traits
   - Establish archetype and rarity level
   - Create initial stat distribution

2. **Ability Design**
   - Design 4-6 character abilities
   - Balance power levels
   - Create lore-appropriate descriptions
   - Define visual effects

3. **Equipment Design**
   - Create 3-tier weapon progression
   - Design era-appropriate gear
   - Balance stat bonuses
   - Create visual designs

### **Phase 2: Asset Creation (24-32 hours)**
1. **Image Asset Production**
   - Character progression images (4)
   - Skills, equipment, coaching images (3)
   - Training and confessional images (4)
   - Homepage showcase images (4)
   - Battle scene images (51+)

2. **Prompt Template Development**
   - Kitchen chat personality
   - Confessional monologue style
   - Coaching response patterns
   - Financial decision behavior
   - Therapy session dynamics
   - Group activity interactions
   - Battle AI decision-making

### **Phase 3: Technical Integration (8-12 hours)**
1. **Data File Updates**
   - Add character template to characters.ts
   - Update equipment.ts with new gear
   - Add abilities to abilities.ts
   - Update image utilities

2. **System Integration**
   - Test character creation
   - Verify image loading
   - Test AI responses
   - Validate battle integration

### **Phase 4: Testing & Polish (4-8 hours)**
1. **Quality Assurance**
   - Run integration checklist
   - Test user experience
   - Verify game balance
   - Fix any issues

2. **Documentation**
   - Update character roster
   - Document new abilities
   - Update image asset inventory

---

## 🚨 **CRITICAL SUCCESS FACTORS**

### **Must-Have Requirements**
1. **Exact Naming Conventions**: Image paths must match exactly
2. **Complete Asset Coverage**: All 73+ images required
3. **Balanced Stat Distribution**: Within rarity ranges
4. **Authentic Personality**: Consistent across all contexts
5. **Technical Integration**: Zero breaking changes

### **Common Pitfalls to Avoid**
1. **Image Naming Errors**: Will break image loading
2. **Incomplete Ability Sets**: Character feels weak/incomplete
3. **Inconsistent Personality**: Breaks immersion
4. **Power Level Imbalance**: Makes character over/underpowered
5. **Missing Battle Images**: Breaks battle system

### **Quality Standards**
- **Historical Accuracy**: Research-backed authenticity
- **Gameplay Balance**: Competitive but not overpowered
- **Visual Consistency**: Matches game art style
- **Personality Depth**: Multi-dimensional character
- **Technical Reliability**: Zero bugs or crashes

---

## 📈 **SUCCESS METRICS**

### **Development Success**
- [ ] Character integrates without technical issues
- [ ] All image assets load properly
- [ ] AI responses feel authentic to character
- [ ] Game balance maintained
- [ ] User testing shows positive engagement

### **Long-term Success**
- [ ] Character becomes popular choice among players
- [ ] Unique gameplay mechanics create new strategies
- [ ] Character lore enriches game world
- [ ] Visual design receives positive feedback
- [ ] Character performs well in competitive play

---

**This bible ensures every new character meets the high standards of the "Blank Wars" universe while providing a systematic approach to character development that scales across the team.**

**Remember: Quality over speed. A single well-crafted character is better than multiple rushed characters that break the game experience.**