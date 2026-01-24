/**
 * Control Room Knowledge Base
 *
 * Comprehensive reference for the Control Room domain.
 * The host character uses this to answer user questions about the game.
 *
 * Structure: Categories → Topics → Entries
 * Each entry has a question/topic, answer, and related topics for cross-referencing.
 */

export interface KnowledgeEntry {
  id: string;
  topic: string;
  keywords: string[];  // For search matching
  content: string;
  relatedTopics?: string[];  // IDs of related entries
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  description: string;
  entries: KnowledgeEntry[];
}

export const KNOWLEDGE_BASE: KnowledgeCategory[] = [
  // ============================================
  // CORE CONCEPTS
  // ============================================
  {
    id: 'core',
    name: 'Core Concepts',
    description: 'Fundamental game concepts every coach needs to understand',
    entries: [
      {
        id: 'what_is_coach',
        topic: 'What is a Coach?',
        keywords: ['coach', 'role', 'player', 'what am i', 'my role'],
        content: `You are a COACH, not a player. You don't control your characters directly - you manage them. You make strategic decisions, give orders, build relationships, and manage their psychological states. But ultimately, your characters have their own minds. They might follow your orders. They might not. Your job is to build a team that WANTS to follow you.`,
        relatedTopics: ['adherence', 'living_assets', 'rebellion']
      },
      {
        id: 'living_assets',
        topic: 'Living Assets',
        keywords: ['living assets', 'characters', 'autonomy', 'ai', 'personalities'],
        content: `Your contestants are "living assets" - AI characters with their own personalities, memories, and psychological states. They're not puppets. They have opinions about their living conditions, their teammates, their coach (you), and their situation. Keep them happy and they'll perform. Neglect them and watch your team implode. Every character has persistent memories that carry across sessions.`,
        relatedTopics: ['psychological_stats', 'adherence', 'memories']
      },
      {
        id: 'tickets',
        topic: 'Tickets (Action Economy)',
        keywords: ['tickets', 'actions', 'daily', 'spend', 'economy', 'allowance'],
        content: `Tickets are your daily action allowance. Every domain visit costs tickets. Training? Tickets. Therapy? Tickets. Battle? Tickets. You get a set number each day, and once they're spent, you wait until tomorrow. Strategic ticket allocation is one of the most important skills in the game. Prioritize based on what your team needs most - don't waste tickets on domains that won't help your current situation.`,
        relatedTopics: ['domains_overview']
      },
      {
        id: 'weight_classes',
        topic: 'Weight Classes',
        keywords: ['weight class', 'matchmaking', 'power level', 'punch up', 'punch down'],
        content: `Teams are organized into weight classes based on overall power. The cardinal rule: you can punch UP but never DOWN. You can challenge teams at your level or higher, but you cannot bully weaker teams. This prevents griefing and ensures matches are competitive. As your team grows stronger, you'll move up into higher weight classes with tougher competition and better rewards.`,
        relatedTopics: ['battle_matchmaking', 'progression']
      }
    ]
  },

  // ============================================
  // PSYCHOLOGICAL STATS
  // ============================================
  {
    id: 'psych',
    name: 'Psychological Stats',
    description: 'Understanding your characters\' mental and emotional states',
    entries: [
      {
        id: 'psychological_stats',
        topic: 'Psychological Stats Overview',
        keywords: ['psych', 'psychological', 'stats', 'mental', 'emotional', 'state'],
        content: `Every character has psychological stats that affect their performance and behavior:

• STRESS - How overwhelmed they are. High stress impairs performance and can trigger breakdowns.
• MENTAL HEALTH - Overall psychological wellbeing. Low mental health makes everything harder.
• EGO - Self-importance. High ego characters may ignore orders because they think they know better.
• MORALE - How they feel about being on your team. Low morale = low effort.
• BOND LEVEL - How connected they feel to you specifically.
• COACH TRUST - How much they trust your judgment.
• GAMEPLAN ADHERENCE - The critical stat that determines if they follow orders.`,
        relatedTopics: ['adherence', 'stress', 'ego', 'morale', 'mental_health']
      },
      {
        id: 'adherence',
        topic: 'Gameplan Adherence (Critical Stat)',
        keywords: ['adherence', 'gameplan', 'follow orders', 'obey', 'listen', 'critical stat'],
        content: `GAMEPLAN ADHERENCE is the most important stat in the game. It's a number from 0-100 that determines how likely a character is to follow your orders.

Every time you give a command, the game rolls a d100 (hundred-sided die):
• Roll UNDER their Adherence = They obey
• Roll OVER their Adherence = They REBEL

A character with 80 Adherence follows orders 80% of the time. A character with 30 Adherence ignores you 70% of the time.

Adherence is affected by: stress, ego, bond level, coach trust, and recent events. THERAPY is the best way to improve it.`,
        relatedTopics: ['rebellion', 'therapy', 'psychological_stats']
      },
      {
        id: 'stress',
        topic: 'Stress',
        keywords: ['stress', 'stressed', 'overwhelmed', 'pressure'],
        content: `STRESS measures how overwhelmed a character is. High stress:
• Reduces performance in battle
• Lowers Adherence (more likely to rebel)
• Can trigger psychological breaks
• Makes characters irritable and harder to manage

Stress increases from: losing battles, poor living conditions, financial problems, conflict with teammates, overwork.

Stress decreases from: therapy, rest, good living conditions, resolving problems, winning.`,
        relatedTopics: ['psychological_stats', 'therapy', 'hq_tiers']
      },
      {
        id: 'ego',
        topic: 'Ego',
        keywords: ['ego', 'arrogant', 'arrogance', 'pride', 'humble'],
        content: `EGO measures self-importance. This is a double-edged stat:

HIGH EGO:
• May ignore your orders ("I know what I'm doing")
• Showboats and takes unnecessary risks in battle
• Difficult to manage, prone to rebellion
• BUT can perform exceptionally when confident

LOW EGO:
• More likely to follow orders
• Fights carefully, perhaps too cautiously
• Easier to manage
• May lack confidence in critical moments

Managing ego is about balance - you want confident fighters who still respect the gameplan.`,
        relatedTopics: ['adherence', 'rebellion', 'psychological_stats']
      },
      {
        id: 'morale',
        topic: 'Morale',
        keywords: ['morale', 'motivation', 'team spirit', 'happy', 'unhappy'],
        content: `MORALE is how the character feels about being on your team. High morale means they're motivated, engaged, and fighting for the team. Low morale means they're just going through the motions - or actively sabotaging.

Morale is affected by:
• Win/loss record
• Living conditions (HQ tier, sleeping arrangements)
• Relationships with teammates
• How you treat them
• Financial situation

Your MASCOT is specifically designed to help boost morale.`,
        relatedTopics: ['psychological_stats', 'hq_tiers', 'mascot']
      },
      {
        id: 'mental_health',
        topic: 'Mental Health',
        keywords: ['mental health', 'wellbeing', 'psychology', 'breakdown'],
        content: `MENTAL HEALTH is overall psychological wellbeing. It's the foundation that affects everything else. Low mental health:
• Amplifies stress effects
• Reduces performance across the board
• Makes recovery from setbacks harder
• Can lead to serious breakdowns

Mental health is best improved through THERAPY - both individual and group sessions. Your THERAPIST is your most important staff member for maintaining team mental health.`,
        relatedTopics: ['therapy', 'therapist', 'psychological_stats']
      },
      {
        id: 'bond_level',
        topic: 'Bond Level',
        keywords: ['bond', 'relationship', 'connection', 'trust'],
        content: `BOND LEVEL measures the personal connection between you (the coach) and a specific character. Higher bond means:
• More likely to follow orders
• More forgiving of your mistakes
• More open in conversations
• Better performance when you're counting on them

Build bond through: one-on-one chats, helping with personal problems, good financial advice, consistent fair treatment.`,
        relatedTopics: ['coach_trust', 'one_on_one_chat', 'psychological_stats']
      },
      {
        id: 'coach_trust',
        topic: 'Coach Trust',
        keywords: ['trust', 'coach trust', 'faith', 'believe'],
        content: `COACH TRUST is how much the character believes in your judgment. Different from bond level - you can like someone but not trust their decisions. High trust means:
• They assume your orders have good reasoning
• Less likely to rebel even in tough situations
• More likely to give you benefit of the doubt

Trust is built through: good advice that works out, honest communication, admitting mistakes, consistent behavior.`,
        relatedTopics: ['bond_level', 'adherence', 'psychological_stats']
      }
    ]
  },

  // ============================================
  // BATTLE SYSTEM
  // ============================================
  {
    id: 'battle',
    name: 'Battle System',
    description: 'Everything about combat in BlankWars',
    entries: [
      {
        id: 'battle_overview',
        topic: 'Battle Overview',
        keywords: ['battle', 'combat', 'fight', 'arena', 'overview'],
        content: `Battles in BlankWars are 3v3 tactical combat on a 12x12 hex grid. Your three fighters face three opponents over a maximum of 3 rounds.

Key features:
• Initiative-based turn order (mixed between teams)
• Coaching windows before each of your characters' turns
• Adherence rolls determine if orders are followed
• Judge rulings on rebellions
• Victory by elimination or points

Battles are the primary way to earn XP, currency, and rewards - but losing can set you back.`,
        relatedTopics: ['initiative', 'coaching_window', 'rebellion', 'victory_conditions']
      },
      {
        id: 'battle_matchmaking',
        topic: 'Matchmaking',
        keywords: ['matchmaking', 'pve', 'pvp', 'find match', 'opponent'],
        content: `Before battle, you choose your mode:

PVE (Player vs Environment): Fight AI-controlled teams. Good for practice, consistent rewards, less stressful. 5-second coaching windows.

PVP (Player vs Player): Fight other coaches. Higher stakes, better rewards, more unpredictable. 30-second coaching windows.

WEIGHT CLASS RULE: You can only fight opponents at your level or above. Never below. This prevents bullying and keeps matches competitive.`,
        relatedTopics: ['weight_classes', 'coaching_window', 'battle_overview']
      },
      {
        id: 'initiative',
        topic: 'Initiative & Turn Order',
        keywords: ['initiative', 'turn order', 'speed', 'first', 'who goes first'],
        content: `Turn order in battle is determined by INITIATIVE - a composite stat based on speed and other factors. Critically, turn order is MIXED between teams.

Example turn order:
1. Your Fighter A (Initiative 85)
2. Enemy Fighter B (Initiative 78)
3. Enemy Fighter C (Initiative 72)
4. Your Fighter B (Initiative 65)
5. Your Fighter C (Initiative 60)
6. Enemy Fighter A (Initiative 55)

This means positioning and timing matter. A fast character can strike before enemies react. Ties are resolved by coin flip.`,
        relatedTopics: ['battle_overview', 'speed_stat']
      },
      {
        id: 'coaching_window',
        topic: 'Coaching Window',
        keywords: ['coaching window', 'orders', 'strategy', 'command', '30 seconds'],
        content: `Before each of YOUR characters acts, you get a COACHING WINDOW:
• 30 seconds in PVP
• 5 seconds in PVE

During this window, you select:
1. STRATEGY - Overall approach
2. ACTION - Specific move (attack, defend, power, spell, item)
3. TARGET - Who or what to target

After you submit, an ADHERENCE ROLL happens. If successful, your character executes your orders. If failed, they REBEL and the AI chooses their action instead.`,
        relatedTopics: ['adherence', 'rebellion', 'actions']
      },
      {
        id: 'actions',
        topic: 'Actions & Action Points',
        keywords: ['action', 'action points', 'ap', 'attack', 'defend', 'cost'],
        content: `Every character has ACTION POINTS (typically 3+) to spend each turn. Costs:

ATTACKS:
• Light Attack: 1 AP
• Medium Attack: 2 AP
• Heavy Attack: 3 AP

POWERS & SPELLS:
• Rank 1: 1 AP
• Rank 2: 2 AP
• Rank 3: 3 AP

OTHER:
• Defense: 1 AP
• Most Items: 1 AP
• Movement: 1 AP per hex

You can combine actions (e.g., move + light attack = 2 AP) as long as you have points.`,
        relatedTopics: ['coaching_window', 'abilities', 'battle_overview']
      },
      {
        id: 'rebellion',
        topic: 'Rebellion',
        keywords: ['rebellion', 'rebel', 'disobey', 'ignore orders', 'refuse'],
        content: `REBELLION occurs when a character fails their Adherence roll. Instead of following your orders, they do what THEY want.

The process:
1. You give orders during coaching window
2. d100 is rolled against character's Adherence score
3. Roll OVER = REBELLION
4. AI analyzes valid alternative actions
5. Character AI selects action based on personality/history
6. Character makes a rebellious DECLARATION
7. JUDGE rules on the rebellion

Rebellions aren't always bad - sometimes the character makes a better call than you did. But usually it means loss of control at a critical moment.`,
        relatedTopics: ['adherence', 'judge_rulings', 'declarations']
      },
      {
        id: 'declarations',
        topic: 'Declarations',
        keywords: ['declaration', 'statement', 'in character', 'speech'],
        content: `Every turn, whether following orders or rebelling, characters make a DECLARATION - a 1-2 sentence in-character statement.

Following orders: "You want Rilak? With pleasure." (confident, aligned)
Rebelling: "I'm not your puppet. Figure it out yourself." (defiant)
Personality-driven: "Fenrir killed my roommate. HE dies today." (personal vendetta)

Declarations add narrative flavor and reveal character psychology. They're also used by judges when evaluating rebellions.`,
        relatedTopics: ['rebellion', 'judge_rulings']
      },
      {
        id: 'judge_rulings',
        topic: 'Judge Rulings',
        keywords: ['judge', 'ruling', 'verdict', 'penalty', 'approved', 'rebellion ruling'],
        content: `When a REBELLION occurs, the presiding JUDGE must rule on it. Judges evaluate whether the rebellion was justified.

VERDICT OPTIONS:
• APPROVED - Rebellion was justified (e.g., coach gave suicidal order). No penalty.
• TOLERATED - Borderline case. Warning only.
• PENALIZED - Unjustified rebellion. -10 points.
• SEVERELY PENALIZED - Egregious rebellion. -25 points + debuffs.

Different judges rule differently. Anubis is strict and values truth. Eleanor Roosevelt is compassionate. King Solomon seeks wisdom and context. Know your judge.`,
        relatedTopics: ['rebellion', 'judges', 'battle_overview']
      },
      {
        id: 'judges',
        topic: 'The Judges',
        keywords: ['judges', 'anubis', 'eleanor', 'solomon', 'who are the judges'],
        content: `Three judges preside over BlankWars battles:

ANUBIS (Strict/Truth)
• Values honesty and following rules
• Harsh on petulant rebellions
• Fair but unforgiving

ELEANOR ROOSEVELT (Compassionate)
• Considers emotional context
• More lenient on justified rebellions
• Looks for growth opportunities

KING SOLOMON (Wise)
• Seeks the full story
• Balances all factors
• Known for unexpected rulings

Each team has their own judge. Coin flip determines whose judge presides - home court advantage.`,
        relatedTopics: ['judge_rulings', 'rebellion', 'home_court']
      },
      {
        id: 'home_court',
        topic: 'Home Court Advantage',
        keywords: ['home court', 'coin flip', 'judge selection', 'advantage'],
        content: `Before each battle, a coin flip determines whose JUDGE presides over the match. If YOUR judge is selected, you have HOME COURT ADVANTAGE.

This matters because:
• Your judge knows your team's context
• Their ruling style may favor your characters
• Familiar judge = more predictable rulings

It's not a guaranteed advantage, but it helps. Investing in understanding your judge's preferences pays off over time.`,
        relatedTopics: ['judges', 'judge_rulings']
      },
      {
        id: 'victory_conditions',
        topic: 'Victory Conditions',
        keywords: ['victory', 'win', 'lose', 'win condition', 'how to win'],
        content: `Battles last a maximum of 3 ROUNDS.

WIN CONDITIONS:
• ELIMINATION - Reduce all 3 enemy fighters to 0 HP
• TIMEOUT - If 3 rounds complete, winner determined by remaining HP and points
• KNOCKOUT - Individual characters are eliminated when HP reaches 0

Note: Characters CAN die permanently in battle, though this is rare. Usually they're just knocked out and recover. Death occurs in extreme circumstances.`,
        relatedTopics: ['battle_overview', 'hp']
      }
    ]
  },

  // ============================================
  // DOMAINS
  // ============================================
  {
    id: 'domains',
    name: 'Domains',
    description: 'The different areas and activities available in the game',
    entries: [
      {
        id: 'domains_overview',
        topic: 'Domains Overview',
        keywords: ['domains', 'areas', 'activities', 'where to go', 'what to do'],
        content: `DOMAINS are the different areas and activities in BlankWars. Each domain serves a purpose and costs tickets to visit.

COMBAT-FOCUSED:
• Training Grounds - Build combat stats
• Battle Arena - Actual combat

PSYCH-FOCUSED:
• Therapy - Mental health, adherence (BEST for adherence)
• One-on-One Chat - Build relationships
• Financial Advice - Help with money problems

MIXED:
• Group Activities - Combat + psych boosts
• Kitchen Table - Team bonding, tension diffusion

MANAGEMENT:
• Progression - Spend level-up points
• Equipment/Abilities - Manage loadouts
• Headquarters - Housing and living conditions`,
        relatedTopics: ['tickets', 'training', 'therapy', 'battle_overview']
      },
      {
        id: 'training',
        topic: 'Training Grounds',
        keywords: ['training', 'train', 'workout', 'combat stats', 'trainer'],
        content: `The TRAINING GROUNDS are where your fighters improve their combat capabilities. Your TRAINER runs these sessions.

BENEFITS:
• Boost Strength, Speed, Defense
• Improve combat techniques
• Build physical conditioning

RISKS:
• Intense training can increase stress
• Brutal trainers may hurt morale
• Injured characters shouldn't train hard

Your trainer's personality affects training style. Some are supportive, others are drill sergeants. Know your trainer.`,
        relatedTopics: ['trainer', 'combat_stats', 'domains_overview']
      },
      {
        id: 'therapy',
        topic: 'Therapy',
        keywords: ['therapy', 'therapist', 'mental health', 'counseling', 'sessions'],
        content: `THERAPY is the most important domain for psychological management. Your THERAPIST conducts individual or group sessions.

BENEFITS:
• Reduce stress
• Improve mental health
• BEST way to boost ADHERENCE
• Process trauma and conflicts

TYPES:
• Individual - Focused, private, deeper work
• Group - Team dynamics, shared healing

RISKS:
• Sessions can backfire if they go poorly
• Digging into trauma may temporarily increase stress
• Requires trust to be effective`,
        relatedTopics: ['therapist', 'adherence', 'mental_health', 'domains_overview']
      },
      {
        id: 'one_on_one_chat',
        topic: 'One-on-One Chats',
        keywords: ['one on one', 'chat', 'talk', 'conversation', 'private'],
        content: `ONE-ON-ONE CHATS are private conversations between you and a single character. No structured agenda - just talking.

BENEFITS:
• Build BOND LEVEL
• Increase COACH TRUST
• Learn about their problems
• Understand their personality
• Foundation for everything else

These chats may seem low-stakes, but relationships built here pay dividends everywhere else. A character who trusts you is a character who follows orders.`,
        relatedTopics: ['bond_level', 'coach_trust', 'domains_overview']
      },
      {
        id: 'financial_domain',
        topic: 'Financial Advice',
        keywords: ['financial', 'money', 'investment', 'advice', 'wallet'],
        content: `Characters have their own WALLETS and sometimes get investment ideas - good or bad. They'll come to you for advice.

YOUR ROLE:
• Evaluate investment opportunities
• Advise on spending decisions
• Help manage debt

OUTCOMES:
• Good advice = money gained, trust increased, stress reduced
• Bad advice = money lost, trust damaged, stress increased

NOTE: Adherence check applies! Low adherence characters may ignore your advice and make their own financial decisions.`,
        relatedTopics: ['character_wallet', 'adherence', 'domains_overview']
      },
      {
        id: 'kitchen_table',
        topic: 'Kitchen Table',
        keywords: ['kitchen table', 'kitchen', 'team bonding', 'hangout', 'casual'],
        content: `The KITCHEN TABLE is where your team hangs out together in casual settings. It's a mini-game focused on team dynamics.

PURPOSE:
• Diffuse tensions between characters
• Build team chemistry
• Address conflicts before they explode
• Casual relationship building

When characters are fighting or tensions are high, getting everyone around the kitchen table can help clear the air. It's preventive maintenance for team dynamics.`,
        relatedTopics: ['team_chemistry', 'relationships', 'domains_overview']
      },
      {
        id: 'group_activities',
        topic: 'Group Activities',
        keywords: ['group', 'activities', 'team activities', 'challenges'],
        content: `GROUP ACTIVITIES are team challenges that boost both combat AND psychological stats. The mix depends on the activity.

TYPES:
• Physical challenges - More combat stats
• Team-building exercises - More psych stats
• Balanced activities - Both

BENEFITS:
• Stat boosts for multiple characters
• Team cohesion
• Shared experiences build bonds

These are efficient for improving multiple characters at once, though less focused than individual training or therapy.`,
        relatedTopics: ['domains_overview', 'combat_stats', 'psychological_stats']
      },
      {
        id: 'progression_domain',
        topic: 'Progression',
        keywords: ['progression', 'level up', 'spend points', 'skill points', 'allocate'],
        content: `The PROGRESSION domain is where you allocate points when characters level up.

POINT TYPES:
• Attribute Points - STR, SPD, DEF, etc.
• Resource Points - HP, Mana, Energy
• Character Points - Powers and Spells

WARNING: If a character has low ADHERENCE, they may spend their own points without consulting you. They'll allocate based on their own preferences, which may not match your build strategy.

This is another reason to keep Adherence high - you want control over character development.`,
        relatedTopics: ['leveling', 'abilities', 'adherence']
      },
      {
        id: 'confessional',
        topic: 'Confessional',
        keywords: ['confessional', 'reality tv', 'interview', 'booth'],
        content: `The CONFESSIONAL is a reality TV-style interview booth where characters share their true feelings about life in BlankWars.

CURRENT STATE: Not yet gamified - no rewards/penalties system yet.

FUTURE PLANS: Will include consequences for what characters reveal, potential drama triggers, and strategic information gathering.

For now, it's a way to hear what your characters really think when they're being candid.`,
        relatedTopics: ['domains_overview']
      }
    ]
  },

  // ============================================
  // STAFF & SYSTEM CHARACTERS
  // ============================================
  {
    id: 'staff',
    name: 'Staff & System Characters',
    description: 'Your support team and their roles',
    entries: [
      {
        id: 'staff_overview',
        topic: 'Staff Overview',
        keywords: ['staff', 'system characters', 'support team', 'employees'],
        content: `Your team includes STAFF - system characters who support your contestants:

• HOST - Announces battles, manages public events
• TRAINER - Runs training sessions, builds combat stats
• THERAPIST - Conducts therapy, best for adherence/mental health
• JUDGE - Presides over battles, rules on rebellions
• MASCOT - Boosts morale, keeps energy high
• REAL ESTATE AGENT - Handles HQ upgrades and housing

Each staff member has their own personality that affects how they do their job. Staff from different card packs may confer different bonuses.`,
        relatedTopics: ['trainer', 'therapist', 'judge', 'mascot', 'host', 'real_estate']
      },
      {
        id: 'trainer',
        topic: 'Trainer',
        keywords: ['trainer', 'training', 'coach trainer', 'drill'],
        content: `Your TRAINER runs training sessions and builds combat stats.

RESPONSIBILITIES:
• Conduct training sessions
• Push characters physically
• Develop combat techniques
• Assess physical readiness

PERSONALITY MATTERS: A brutal trainer gets results but may hurt morale. A gentle trainer preserves wellbeing but may not push hard enough. Know your trainer's style and use it strategically.`,
        relatedTopics: ['training', 'staff_overview']
      },
      {
        id: 'therapist',
        topic: 'Therapist',
        keywords: ['therapist', 'therapy', 'counselor', 'mental health staff'],
        content: `Your THERAPIST is arguably your most important staff member. They're the key to ADHERENCE.

RESPONSIBILITIES:
• Conduct individual therapy
• Run group sessions
• Manage psychological crises
• Build mental resilience

CRITICAL ROLE: Therapy is the BEST way to improve Gameplan Adherence. A good therapist keeps your team mentally healthy and obedient. Invest in therapy early and often.`,
        relatedTopics: ['therapy', 'adherence', 'staff_overview']
      },
      {
        id: 'judge_staff',
        topic: 'Judge (Staff)',
        keywords: ['judge staff', 'my judge', 'team judge'],
        content: `Your JUDGE is a staff member who presides over battles when selected by coin flip (home court advantage).

RESPONSIBILITIES:
• Rule on rebellions during battle
• Evaluate justifications
• Assign penalties or approvals

Each judge has a unique personality and strictness level. Understanding your judge helps you predict rulings and may influence how you coach characters who are prone to rebellion.`,
        relatedTopics: ['judges', 'judge_rulings', 'staff_overview']
      },
      {
        id: 'mascot',
        topic: 'Mascot',
        keywords: ['mascot', 'morale', 'cheerleader', 'spirit'],
        content: `Your MASCOT exists to boost morale and keep team energy high.

RESPONSIBILITIES:
• Celebrate victories
• Lift spirits after defeats
• Maintain positive atmosphere
• Team cheerleading

PERSONALITY: Mascots are enthusiastic by nature, but they're still employees with opinions. Even your mascot might complain about the break room coffee.`,
        relatedTopics: ['morale', 'staff_overview']
      },
      {
        id: 'host',
        topic: 'Host',
        keywords: ['host', 'announcer', 'commentator', 'mc'],
        content: `Your HOST handles public-facing events and battle commentary.

RESPONSIBILITIES:
• Announce and commentate battles
• Manage public team events
• Conduct confessional interviews
• Public relations

Your host's charisma and style affect how your team is perceived. They're also your guide during the tutorial and available in the Control Room for questions.`,
        relatedTopics: ['confessional', 'staff_overview']
      },
      {
        id: 'real_estate',
        topic: 'Real Estate Agent',
        keywords: ['real estate', 'agent', 'housing', 'hq', 'upgrades'],
        content: `Your REAL ESTATE AGENT handles headquarters and housing.

RESPONSIBILITIES:
• Pitch HQ upgrades
• Manage property
• Handle accommodations
• Advise on living arrangements

When you're ready to upgrade your HQ or need to optimize sleeping arrangements, your real estate agent is your contact. They're always looking for deals - and always trying to hit their quotas.`,
        relatedTopics: ['hq_tiers', 'sleeping_arrangements', 'staff_overview']
      }
    ]
  },

  // ============================================
  // ECONOMY & PROGRESSION
  // ============================================
  {
    id: 'economy',
    name: 'Economy & Progression',
    description: 'Money, leveling, and character development',
    entries: [
      {
        id: 'wallets',
        topic: 'Wallets (Money)',
        keywords: ['wallet', 'money', 'currency', 'finances', 'gold'],
        content: `BlankWars has TWO wallet systems:

COACH WALLET:
• Your personal funds
• Earn from battle winnings, management fees
• Spend on card packs, HQ upgrades, team expenses

CHARACTER WALLETS:
• Each contestant has their own money
• Earn from battle prizes, personal achievements
• Spend autonomously in the Contestant Store
• May ignore your financial advice (Adherence check)

Managing both is important - broke characters get stressed, broke coaches can't upgrade.`,
        relatedTopics: ['character_wallet', 'financial_domain', 'contestant_store']
      },
      {
        id: 'character_wallet',
        topic: 'Character Wallets & Autonomy',
        keywords: ['character wallet', 'autonomous spending', 'their money'],
        content: `Characters have THEIR OWN WALLETS. This is their money, not yours.

AUTONOMY:
• They earn their own prize money
• They can spend in the Contestant Store
• They may ignore your financial advice
• Adherence check determines if they listen

MANAGEMENT:
• Help them make good decisions (Financial Advice domain)
• Don't be a miser - let them spend sometimes (good for morale)
• High debt = high stress = performance problems

Balance autonomy with guidance. Characters who feel financially controlled may rebel more.`,
        relatedTopics: ['wallets', 'adherence', 'contestant_store']
      },
      {
        id: 'contestant_store',
        topic: 'Contestant Store',
        keywords: ['contestant store', 'shop', 'character shopping'],
        content: `The CONTESTANT STORE is a shop exclusively for characters (not coaches). Characters can browse and buy:
• Personal items
• Equipment they prefer
• Cosmetics
• Comfort items

AUTONOMY: Characters may shop here without your permission if Adherence is low. They'll buy what THEY want, which may not align with your build strategy.

As coach, encourage smart spending without being controlling. Happy characters who feel financially independent are more loyal.`,
        relatedTopics: ['character_wallet', 'adherence']
      },
      {
        id: 'leveling',
        topic: 'Leveling & XP',
        keywords: ['leveling', 'level up', 'xp', 'experience', 'grow'],
        content: `Characters earn XP from battles, activities, and conversations. Level up to gain points for:

• ATTRIBUTE POINTS - STR, SPD, DEX, etc.
• RESOURCE POINTS - HP, Mana, Energy
• CHARACTER POINTS - Powers and Spells

XP SOURCES:
• Battles (primary source)
• Domain activities
• Chats (even neutral chats give XP)
• Achievements

WARNING: Low Adherence characters may spend level-up points themselves, ignoring your build strategy.`,
        relatedTopics: ['progression_domain', 'abilities', 'adherence']
      },
      {
        id: 'card_packs',
        topic: 'Card Packs',
        keywords: ['card packs', 'cards', 'new characters', 'collection', 'gacha'],
        content: `CARD PACKS are how you expand your collection. Each pack contains random characters and staff.

HOW TO GET PACKS:
• Purchase with in-game currency
• Win in tournaments
• Earn through milestones
• Find in story mode (coming soon)
• NFT drops and giveaways

CONTENTS:
• New contestants
• New staff (may have unique bonuses)
• Special characters

Building a diverse collection gives you more strategic options for team composition.`,
        relatedTopics: ['staff_overview', 'collection']
      },
      {
        id: 'hq_tiers',
        topic: 'HQ Tiers',
        keywords: ['hq', 'headquarters', 'tiers', 'housing', 'upgrade'],
        content: `Your HEADQUARTERS tier affects your entire team:

EFFECTS:
• Recovery rates
• Morale caps
• Team cohesion bonuses
• Character capacity
• Unique 3D environments

TIER EXAMPLES:
• "Parents' Basement" - Low tier, cramped
• "Roach Motel" - Penalties to stats
• "Penthouse" - Bonuses across the board
• "Moon Base" - Top tier, maximum benefits

Upgrade through your Real Estate Agent. Better HQ = happier, more effective team.`,
        relatedTopics: ['sleeping_arrangements', 'real_estate', 'morale']
      },
      {
        id: 'sleeping_arrangements',
        topic: 'Sleeping Arrangements',
        keywords: ['sleeping', 'bed', 'floor', 'arrangements', 'where they sleep'],
        content: `WHERE characters sleep affects their stats:

ARRANGEMENTS (best to worst):
• Master Bed - Morale boost
• Regular Bed - Neutral
• Bunk Bed - Slight penalty
• Couch - Minor penalty
• Air Mattress - Minor penalty
• Floor - Stress penalty, morale hit

DRAMA POTENTIAL: Put a proud warrior on the floor while someone else gets the master bed? Expect conflict. Housing assignments are team management.`,
        relatedTopics: ['hq_tiers', 'morale', 'stress']
      }
    ]
  },

  // ============================================
  // ABILITIES
  // ============================================
  {
    id: 'abilities',
    name: 'Abilities',
    description: 'Powers, spells, and character capabilities',
    entries: [
      {
        id: 'abilities_overview',
        topic: 'Abilities Overview',
        keywords: ['abilities', 'powers', 'spells', 'skills', 'overview'],
        content: `Character abilities come in two main types: POWERS and SPELLS.

STRUCTURE:
• 4 Tiers: Universal → Class-specific → Archetype-specific → Individual
• 3 Effect Rankings per ability
• 3 Power Levels per ability

QUALIFICATION:
Not every character can learn every ability. Qualification depends on:
• Archetype
• Species
• Individual lore

This creates unique builds - a vampire mage has different options than a cyborg warrior.`,
        relatedTopics: ['powers', 'spells', 'archetypes']
      },
      {
        id: 'powers',
        topic: 'Powers',
        keywords: ['powers', 'abilities', 'skills'],
        content: `POWERS are non-magical abilities - physical techniques, trained skills, natural talents.

EXAMPLES:
• Combat maneuvers
• Athletic feats
• Tactical abilities
• Species-specific traits

COST IN BATTLE:
• Rank 1: 1 Action Point
• Rank 2: 2 Action Points
• Rank 3: 3 Action Points

Powers are generally more reliable but may be less dramatic than spells.`,
        relatedTopics: ['abilities_overview', 'actions']
      },
      {
        id: 'spells',
        topic: 'Spells',
        keywords: ['spells', 'magic', 'casting'],
        content: `SPELLS are magical abilities - supernatural effects that cost Mana to cast.

CHARACTERISTICS:
• Require Mana resource
• Often more powerful but riskier
• May have cooldowns or conditions
• Magical qualification required

COST IN BATTLE:
• Rank 1: 1 Action Point + Mana
• Rank 2: 2 Action Points + Mana
• Rank 3: 3 Action Points + Mana

Not all characters have magical aptitude. Species and archetype determine spell access.`,
        relatedTopics: ['abilities_overview', 'mana', 'actions']
      }
    ]
  },

  // ============================================
  // SOCIAL SYSTEMS
  // ============================================
  {
    id: 'social',
    name: 'Social Systems',
    description: 'Communication and social features',
    entries: [
      {
        id: 'inbox',
        topic: 'Inbox',
        keywords: ['inbox', 'messages', 'mail', 'notifications'],
        content: `Your INBOX receives messages from multiple sources:

• SYSTEM - Game notifications, updates, alerts
• OTHER COACHES - PvP challenges, social messages
• YOUR CHARACTERS - Autonomous messages from your team

CHARACTER MESSAGES:
Your characters will message you on their own. Complaints, requests, updates, concerns. Pay attention - these messages reveal their mental state and may require action.`,
        relatedTopics: ['autonomous_messages', 'pvp_challenges']
      },
      {
        id: 'autonomous_messages',
        topic: 'Autonomous Character Messages',
        keywords: ['autonomous', 'character messages', 'they message me'],
        content: `Characters MESSAGE YOU AUTONOMOUSLY. This isn't scripted - they decide to reach out based on their situation.

TYPES OF MESSAGES:
• Complaints about living conditions
• Requests for training or therapy
• Updates on personal situations
• Concerns about teammates
• Random thoughts and feelings

These messages are windows into their psychology. A character who messages constantly about stress needs attention. Silence from a usually chatty character might be concerning too.`,
        relatedTopics: ['inbox', 'living_assets']
      },
      {
        id: 'group_chat',
        topic: 'Social Group Chat',
        keywords: ['group chat', 'social', 'trash talk', 'public chat'],
        content: `The SOCIAL TAB includes a group chat where characters from ALL TEAMS interact.

FEATURES:
• Cross-team conversations
• Autonomous trash talk
• Character interactions
• Team rivalries develop naturally

Your characters will participate without your input. They'll trash talk opponents, defend teammates, start drama. It's entertaining and reveals inter-team dynamics.`,
        relatedTopics: ['autonomous_messages', 'social_features']
      },
      {
        id: 'pvp_challenges',
        topic: 'PvP Challenges',
        keywords: ['challenge', 'pvp', 'invite', 'fight request'],
        content: `You can CHALLENGE other coaches to PvP battles through the messaging system.

HOW IT WORKS:
• Send challenge through inbox
• Opponent accepts or declines
• Match is scheduled
• Both coaches prepare teams

MATCHMAKING RULES APPLY: You can only challenge coaches at your weight class or above. No bullying.`,
        relatedTopics: ['inbox', 'battle_matchmaking']
      }
    ]
  },

  // ============================================
  // GOALS & PROGRESSION
  // ============================================
  {
    id: 'goals',
    name: 'Goals & Long-term Progression',
    description: 'What you\'re working toward',
    entries: [
      {
        id: 'goals_overview',
        topic: 'Goals Overview',
        keywords: ['goals', 'objectives', 'what am i trying to do', 'purpose'],
        content: `WHAT ARE YOU WORKING TOWARD?

SHORT-TERM:
• Win battles
• Keep characters happy
• Build stats and abilities
• Manage resources

LONG-TERM:
• Win seasons and tournaments
• Top the leaderboards
• Build the ultimate team
• Collect legendary characters

OPTIONAL:
• Mint characters to blockchain
• Export to other platforms
• Persistent memories travel with characters`,
        relatedTopics: ['leaderboards', 'seasons', 'collection']
      },
      {
        id: 'leaderboards',
        topic: 'Leaderboards',
        keywords: ['leaderboards', 'rankings', 'best', 'top'],
        content: `LEADERBOARDS track the best coaches:

CATEGORIES:
• Global Power - Overall team strength
• Battle Victories - Win count
• Win Streaks - Consecutive wins
• Collection Size - Characters owned

Climbing leaderboards brings prestige and potentially rewards. Competition is fierce at the top.`,
        relatedTopics: ['goals_overview']
      },
      {
        id: 'seasons',
        topic: 'Seasons & Tournaments',
        keywords: ['seasons', 'tournaments', 'championship', 'competitive'],
        content: `BlankWars operates on SEASONAL CYCLES:

SEASONS:
• Character states snapshot on-chain
• Seasonal rankings
• Season championships

TOURNAMENTS:
• Bracket-style competition
• Special rewards
• Prestige and recognition

No power cap - teams can grow into ultra-powerful weight classes over time. The competitive scene evolves as teams grow.`,
        relatedTopics: ['goals_overview', 'leaderboards']
      },
      {
        id: 'collection',
        topic: 'Collection & Persistence',
        keywords: ['collection', 'collect', 'persistent', 'memories', 'nft'],
        content: `Your COLLECTION is more than just game assets:

PERSISTENT CHARACTERS:
• Characters have persistent personalities
• Database memories carry across sessions
• Relationships and history are tracked

OPTIONAL FEATURES:
• Mint to blockchain
• Extract from game to other platforms
• True ownership of your characters

Your characters are living, growing entities that can potentially outlast the game itself.`,
        relatedTopics: ['goals_overview', 'living_assets']
      }
    ]
  }
];

/**
 * Search the knowledge base by keywords
 */
export function searchKnowledge(query: string): KnowledgeEntry[] {
  const searchTerms = query.toLowerCase().split(/\s+/);

  const results: Array<{ entry: KnowledgeEntry; score: number }> = [];

  for (const category of KNOWLEDGE_BASE) {
    for (const entry of category.entries) {
      let score = 0;

      // Check topic
      for (const term of searchTerms) {
        if (entry.topic.toLowerCase().includes(term)) {
          score += 10;
        }
      }

      // Check keywords
      for (const term of searchTerms) {
        for (const keyword of entry.keywords) {
          if (keyword.includes(term)) {
            score += 5;
          }
        }
      }

      // Check content
      for (const term of searchTerms) {
        if (entry.content.toLowerCase().includes(term)) {
          score += 1;
        }
      }

      if (score > 0) {
        results.push({ entry, score });
      }
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.map(r => r.entry);
}

/**
 * Get entry by ID
 */
export function getEntry(id: string): KnowledgeEntry | undefined {
  for (const category of KNOWLEDGE_BASE) {
    const entry = category.entries.find(e => e.id === id);
    if (entry) return entry;
  }
  return undefined;
}

/**
 * Get related entries
 */
export function getRelatedEntries(id: string): KnowledgeEntry[] {
  const entry = getEntry(id);
  if (!entry || !entry.relatedTopics) return [];

  return entry.relatedTopics
    .map(getEntry)
    .filter((e): e is KnowledgeEntry => e !== undefined);
}

/**
 * Get all entries in a category
 */
export function getCategoryEntries(categoryId: string): KnowledgeEntry[] {
  const category = KNOWLEDGE_BASE.find(c => c.id === categoryId);
  return category ? category.entries : [];
}

/**
 * Get all category names and IDs
 */
export function getCategories(): Array<{ id: string; name: string; description: string }> {
  return KNOWLEDGE_BASE.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description
  }));
}
