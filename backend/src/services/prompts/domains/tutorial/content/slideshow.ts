/**
 * Tutorial Slideshow Content
 *
 * First-time onboarding flow for new users.
 * Each slide contains content for the host to narrate + visual cues for the frontend.
 */

export interface TutorialSlide {
  id: string;
  title: string;
  hostScript: string;  // What the host character says
  bulletPoints?: string[];  // Key points to display
  visualCue: string;  // Hint for frontend about what to show
  interactionType: 'continue' | 'choice' | 'highlight' | 'demo';
}

export const TUTORIAL_SLIDES: TutorialSlide[] = [
  // ============================================
  // SECTION 1: WELCOME & CORE CONCEPT
  // ============================================
  {
    id: 'welcome',
    title: 'Welcome to BlankWars',
    hostScript: `Welcome, Coach. Yes, that's what you are now - a Coach. You've just been handed a team of legendary figures ripped from history, mythology, and fiction. They're real, they're here, and they're yours to manage. But fair warning: they're not puppets. They have opinions. Egos. Grudges. Your job is to turn this chaos into a championship team.`,
    bulletPoints: [
      'You are the COACH - not the player, the coach',
      'Your team has minds of their own',
      'Win battles, manage personalities, build legends'
    ],
    visualCue: 'show_team_roster_overview',
    interactionType: 'continue'
  },
  {
    id: 'starter_deck',
    title: 'Your Starter Deck',
    hostScript: `You've been dealt your starter deck - 3 contestants and a full staff. That's me, your host, plus a trainer, therapist, judge, mascot, and real estate agent. We all work for YOU now. Your contestants? They're the ones who fight. The rest of us? We keep the machine running.`,
    bulletPoints: [
      '3 Contestants - your fighters',
      '6 Staff members - your support team',
      'Each character is unique with their own personality'
    ],
    visualCue: 'show_starter_deck_cards',
    interactionType: 'continue'
  },

  // ============================================
  // SECTION 2: LIVING ASSETS
  // ============================================
  {
    id: 'living_assets',
    title: 'Living Assets',
    hostScript: `Here's the thing about your contestants - they're not chess pieces. They're living assets with their own psychological states. Stress, ego, mental health, morale... these aren't just numbers. A stressed-out gladiator fights differently than a confident one. A high-ego demigod might ignore your brilliant strategy because they think they know better.`,
    bulletPoints: [
      'Stress - too high and they crack',
      'Ego - too high and they stop listening',
      'Mental Health - their overall psychological wellbeing',
      'Morale - how they feel about being on YOUR team'
    ],
    visualCue: 'show_character_psych_stats',
    interactionType: 'continue'
  },
  {
    id: 'adherence_intro',
    title: 'The Adherence Score',
    hostScript: `This right here - Gameplan Adherence - is the most important stat in the game. It determines whether your characters actually LISTEN to you. Every time you give an order, the game rolls a hundred-sided die against this number. Roll under? They obey. Roll over? They do whatever THEY want. Keep them happy, keep them loyal, keep this number high.`,
    bulletPoints: [
      'Adherence = how likely they follow orders',
      'd100 roll vs Adherence score every command',
      'Low adherence = rebellion in battle',
      'Therapy is the best way to boost it'
    ],
    visualCue: 'highlight_adherence_stat',
    interactionType: 'continue'
  },

  // ============================================
  // SECTION 3: TICKET ECONOMY
  // ============================================
  {
    id: 'tickets',
    title: 'Your Daily Tickets',
    hostScript: `Every day you get a set number of tickets. Think of them as your coaching hours. You can't do everything, so you have to be strategic. Send someone to training? That's tickets. Therapy session? Tickets. One-on-one chat to build trust? Tickets. Battle? You guessed it. Choose wisely - once they're spent, they're gone until tomorrow.`,
    bulletPoints: [
      'Tickets are your daily action allowance',
      'Every domain costs tickets to visit',
      'Spent tickets refresh daily',
      'Strategic allocation is key to success'
    ],
    visualCue: 'show_ticket_counter',
    interactionType: 'continue'
  },

  // ============================================
  // SECTION 4: DOMAINS
  // ============================================
  {
    id: 'domains_overview',
    title: 'Where to Spend Your Time',
    hostScript: `Your headquarters has multiple areas - we call them domains. Each one serves a different purpose. Some boost combat stats. Some heal psychological damage. Some build relationships. And some... well, some are where the actual fighting happens. Let me give you the tour.`,
    visualCue: 'show_domain_map',
    interactionType: 'continue'
  },
  {
    id: 'domain_training',
    title: 'Training Grounds',
    hostScript: `The Training Grounds are where your fighters get stronger, faster, tougher. Your trainer runs drills, pushes limits, and calls out slackers. Good for combat stats - strength, speed, defense. Not so good for their mood if your trainer is particularly brutal.`,
    bulletPoints: [
      'Boosts: Combat stats (STR, SPD, DEF)',
      'Risk: Can increase stress if pushed too hard',
      'Your Trainer leads these sessions'
    ],
    visualCue: 'show_training_domain',
    interactionType: 'continue'
  },
  {
    id: 'domain_therapy',
    title: 'Therapy',
    hostScript: `Therapy. Individual or group sessions with your team therapist. This is where you repair psychological damage, reduce stress, and most importantly - boost that Adherence score. A well-adjusted character is an obedient character. Mostly. Your therapist is worth their weight in gold.`,
    bulletPoints: [
      'Boosts: Mental health, reduces stress',
      'BEST source for Adherence improvement',
      'Individual or group sessions available',
      'Can backfire if session goes poorly'
    ],
    visualCue: 'show_therapy_domain',
    interactionType: 'continue'
  },
  {
    id: 'domain_one_on_one',
    title: 'One-on-One Chats',
    hostScript: `Sometimes your people just need to talk. One-on-one chats are private conversations between you and a single contestant. No agenda, no training, just... connection. This builds bond level and coach trust. The more they trust you, the more they'll listen when it matters.`,
    bulletPoints: [
      'Builds: Bond level, Coach trust',
      'Personal relationship building',
      'Learn about their problems and history',
      'Foundation for everything else'
    ],
    visualCue: 'show_chat_domain',
    interactionType: 'continue'
  },
  {
    id: 'domain_financial',
    title: 'Financial Advice',
    hostScript: `Your characters have their own wallets. Their own money. And sometimes they get ideas about how to spend or invest it. Good ideas. Bad ideas. Terrible ideas. They'll come to you for advice. Help them win money, reduce their financial stress. Steer them wrong and... well, they'll remember.`,
    bulletPoints: [
      'Characters have personal finances',
      'Help them with investment decisions',
      'Affects: Wallet, stress, trust',
      'Adherence check - they might ignore your advice'
    ],
    visualCue: 'show_financial_domain',
    interactionType: 'continue'
  },
  {
    id: 'domain_kitchen_table',
    title: 'Kitchen Table',
    hostScript: `The kitchen table is where your team hangs out together. Casual conversation, tension diffusion, team bonding. It's a mini-game that helps manage group dynamics. When your roster is at each other's throats, sometimes you just need to get everyone in a room and hash it out.`,
    bulletPoints: [
      'Team bonding and tension management',
      'Mini-game format',
      'Affects: Team chemistry, relationships',
      'Good for managing inter-character conflicts'
    ],
    visualCue: 'show_kitchen_table_domain',
    interactionType: 'continue'
  },
  {
    id: 'domain_group_activities',
    title: 'Group Activities',
    hostScript: `Group activities are team challenges that can boost both combat AND psychological stats. The mix depends on the activity. Some lean physical, some lean mental, some are balanced. Good way to build team cohesion while also preparing for battle.`,
    bulletPoints: [
      'Mixed combat and psych stat boosts',
      'Team-building exercises',
      'Variety of activity types',
      'Strengthens team bonds'
    ],
    visualCue: 'show_group_activities_domain',
    interactionType: 'continue'
  },

  // ============================================
  // SECTION 5: BATTLE
  // ============================================
  {
    id: 'battle_intro',
    title: 'The Battle Arena',
    hostScript: `And then there's Battle. This is where it all comes together. 3 versus 3 on a hex grid. Your fighters against theirs. Win and you earn XP, treasure, glory. Lose and... well, let's focus on winning.`,
    bulletPoints: [
      '3v3 combat on 12x12 hex grid',
      'Earn XP, currency, and rewards',
      'Risk losing progress if unprepared',
      'PvE (AI opponents) or PvP (other coaches)'
    ],
    visualCue: 'show_battle_arena',
    interactionType: 'continue'
  },
  {
    id: 'battle_matchmaking',
    title: 'Matchmaking',
    hostScript: `Before you fight, you pick your battle. PvE against AI opponents or PvP against other coaches. Here's the rule: you can only punch UP, never down. You can challenge opponents in your weight class or above, but you can't bully weaker teams. The matchmaking system handles the rest.`,
    bulletPoints: [
      'PvE: Fight AI opponents',
      'PvP: Challenge other coaches',
      'Weight classes prevent bullying',
      'Can punch up, never down'
    ],
    visualCue: 'show_matchmaking_screen',
    interactionType: 'continue'
  },
  {
    id: 'battle_judge',
    title: 'Home Court Advantage',
    hostScript: `Each team has a Judge on staff. Before every match, there's a coin flip to determine whose Judge presides. If it's YOUR judge, that's home court advantage. Judges rule on rebellions - and they all rule differently. Some are strict. Some are lenient. Know your judge.`,
    bulletPoints: [
      'Coin flip determines presiding Judge',
      'Your Judge = home court advantage',
      'Judges rule on rebellions',
      'Each Judge has unique personality and strictness'
    ],
    visualCue: 'show_judge_selection',
    interactionType: 'continue'
  },
  {
    id: 'battle_turns',
    title: 'Turn Order & Initiative',
    hostScript: `Once battle starts, turns are determined by Initiative - a composite stat based on speed and other factors. Here's the twist: turn order is mixed between teams. It's not "all your guys, then all their guys." It might be your fighter, then two of theirs, then yours again. Initiative matters.`,
    bulletPoints: [
      'Initiative determines turn order',
      'Turns are MIXED between teams',
      'Higher initiative = act first',
      'Ties resolved by coin flip'
    ],
    visualCue: 'show_initiative_order',
    interactionType: 'continue'
  },
  {
    id: 'battle_coaching_window',
    title: 'The Coaching Window',
    hostScript: `Before each of YOUR characters acts, you get a coaching window. 30 seconds in PvP, 5 in PvE. This is your moment. You select a Strategy, an Action, and a Target. Light attack? Heavy attack? Use a power? Defend? Cast a spell? Your call. But remember - they might not listen.`,
    bulletPoints: [
      '30 seconds (PvP) or 5 seconds (PvE)',
      'Select: Strategy + Action + Target',
      'Actions cost Action Points (1, 2, or 3)',
      'Characters have 3+ Action Points per turn'
    ],
    visualCue: 'show_coaching_interface',
    interactionType: 'continue'
  },
  {
    id: 'battle_actions',
    title: 'Actions & Costs',
    hostScript: `Every action costs Action Points. Your fighters typically have 3 or more per turn. Light attacks cost 1. Medium cost 2. Heavy cost 3. Same pattern for powers and spells - Rank 1 costs 1, Rank 2 costs 2, Rank 3 costs 3. Defense costs 1. Most items cost 1. Plan accordingly.`,
    bulletPoints: [
      'Light/Medium/Heavy attacks: 1/2/3 AP',
      'Powers & Spells Rank 1/2/3: 1/2/3 AP',
      'Defense: 1 AP',
      'Most items: 1 AP'
    ],
    visualCue: 'show_action_costs',
    interactionType: 'continue'
  },
  {
    id: 'battle_rebellion',
    title: 'Rebellion',
    hostScript: `After you give your orders, the Adherence roll happens. Pass? Your character executes your command and makes a declaration - a little in-character statement. Fail? Rebellion. The AI takes over, picks a different action based on the character's personality, and your judge has to rule on it.`,
    bulletPoints: [
      'd100 roll vs Adherence score',
      'Pass = follow orders + declaration',
      'Fail = REBELLION - AI chooses action',
      'Judge rules on the rebellion'
    ],
    visualCue: 'show_rebellion_example',
    interactionType: 'continue'
  },
  {
    id: 'battle_judge_rulings',
    title: 'Judge Rulings',
    hostScript: `When a rebellion happens, the Judge evaluates it. Was the rebellion justified? Did the coach give a suicidal order? Or was the character just being a brat? Rulings range from "approved" - no penalty - to "severely penalized" - that's minus 25 points and debuffs. Different judges rule differently.`,
    bulletPoints: [
      'Approved: No penalty',
      'Tolerated: Warning only',
      'Penalized: -10 points',
      'Severely Penalized: -25 points + debuffs'
    ],
    visualCue: 'show_judge_rulings',
    interactionType: 'continue'
  },
  {
    id: 'battle_victory',
    title: 'Victory Conditions',
    hostScript: `Battles last up to 3 rounds. Win by eliminating all enemy fighters - reduce their HP to zero. If time runs out, winner is determined by remaining health and points. Knockouts count. And yes, sometimes characters die. It's war, Coach.`,
    bulletPoints: [
      'Maximum 3 rounds',
      'Win by elimination (all enemies at 0 HP)',
      'Timeout: winner by points/remaining HP',
      'Rewards distributed after victory'
    ],
    visualCue: 'show_victory_screen',
    interactionType: 'continue'
  },

  // ============================================
  // SECTION 6: HQ & HOUSING
  // ============================================
  {
    id: 'hq_intro',
    title: 'Your Headquarters',
    hostScript: `Your team needs somewhere to live. That's your HQ. The tier of your headquarters affects everything - recovery rates, morale caps, team cohesion. A team crammed into a roach motel performs differently than one lounging in a penthouse. Plus, better HQs can house more characters.`,
    bulletPoints: [
      'HQ tier affects recovery and morale',
      'Better HQ = more character capacity',
      'Each tier has unique 3D environment',
      'Your Real Estate Agent handles upgrades'
    ],
    visualCue: 'show_hq_tiers',
    interactionType: 'continue'
  },
  {
    id: 'hq_sleeping',
    title: 'Sleeping Arrangements',
    hostScript: `Where your characters sleep matters. Master bed? Morale boost. Floor? Stress penalty. And characters notice. Put a proud warrior on the floor while someone else gets the nice bed? Expect drama. Housing assignments are part of team management.`,
    bulletPoints: [
      'Master Bed: Morale boost',
      'Regular Bed: Neutral',
      'Couch/Air Mattress: Minor penalty',
      'Floor: Stress penalty, morale hit'
    ],
    visualCue: 'show_sleeping_arrangements',
    interactionType: 'continue'
  },

  // ============================================
  // SECTION 7: PROGRESSION & COLLECTION
  // ============================================
  {
    id: 'progression',
    title: 'Leveling Up',
    hostScript: `Characters earn XP from battles, chats, and activities. Level up and they gain points to spend on Attributes, Resources, and Character Points for new powers and spells. But here's the catch - if their Adherence is low, they might spend those points themselves. On whatever THEY want.`,
    bulletPoints: [
      'XP from battles and activities',
      'Level up = points to allocate',
      'Attributes, Resources, Powers, Spells',
      'Low Adherence = they spend points themselves'
    ],
    visualCue: 'show_progression_screen',
    interactionType: 'continue'
  },
  {
    id: 'abilities',
    title: 'Powers & Spells',
    hostScript: `Abilities come in two flavors - Powers and Spells. Four tiers from universal to individual class, three effect rankings, three power levels each. Not every character qualifies for every ability. Their unique combination of archetype, species, and personal lore determines what they can learn.`,
    bulletPoints: [
      '4 tiers: Universal → Individual Class',
      '3 effect rankings per ability',
      '3 power levels per ability',
      'Qualification based on archetype + species + lore'
    ],
    visualCue: 'show_abilities_tree',
    interactionType: 'continue'
  },
  {
    id: 'card_packs',
    title: 'Expanding Your Collection',
    hostScript: `Want more characters? More staff? Card packs. You can purchase them, win them in tournaments, earn them through milestones, or find them in story mode. Each pack is a random draw of new contestants and system characters with unique bonuses. Build your collection, build your options.`,
    bulletPoints: [
      'Purchase with in-game currency',
      'Win in tournaments and milestones',
      'Find in story mode (coming soon)',
      'Each character is unique and collectible'
    ],
    visualCue: 'show_card_pack_opening',
    interactionType: 'continue'
  },

  // ============================================
  // SECTION 8: SOCIAL & COMMUNICATION
  // ============================================
  {
    id: 'social_intro',
    title: 'Communication Systems',
    hostScript: `BlankWars isn't just about battling - it's a living world. You have an inbox for messages from the system, other coaches, and yes, your own characters. They'll message you autonomously. Complaints, requests, trash talk. There's also a group chat where characters from all teams interact and... well, drama happens.`,
    bulletPoints: [
      'Inbox: System, coach, and character messages',
      'Characters message you autonomously',
      'Group chat: Cross-team interactions',
      'Challenge other coaches to PvP'
    ],
    visualCue: 'show_social_features',
    interactionType: 'continue'
  },

  // ============================================
  // SECTION 9: WRAP UP
  // ============================================
  {
    id: 'goals',
    title: 'Your Goals',
    hostScript: `So what are you trying to achieve? Win battles. Win seasons. Win tournaments. Top the leaderboards. Build the most powerful team. Collect legendary characters with persistent personalities and memories. And if you want, mint them to the blockchain and take them beyond BlankWars.`,
    bulletPoints: [
      'Win battles, seasons, tournaments',
      'Climb the leaderboards',
      'Build your collection',
      'Characters have persistent memories',
      'Optional: mint to blockchain'
    ],
    visualCue: 'show_leaderboards',
    interactionType: 'continue'
  },
  {
    id: 'ready',
    title: 'Ready to Coach?',
    hostScript: `That's the basics, Coach. Your team is waiting. Check your inbox - they probably have something to say already. Explore your HQ. Maybe send someone to therapy before they cause problems. And when you're ready... enter the arena. I'll be here if you need me. Just visit the Control Room.`,
    bulletPoints: [
      'Check your Inbox',
      'Explore your Headquarters',
      'Visit the Control Room for help anytime'
    ],
    visualCue: 'show_main_dashboard',
    interactionType: 'choice'
  }
];

/**
 * Get slide by ID
 */
export function getSlide(id: string): TutorialSlide | undefined {
  return TUTORIAL_SLIDES.find(s => s.id === id);
}

/**
 * Get slide index
 */
export function getSlideIndex(id: string): number {
  return TUTORIAL_SLIDES.findIndex(s => s.id === id);
}

/**
 * Get next slide
 */
export function getNextSlide(currentId: string): TutorialSlide | undefined {
  const currentIndex = getSlideIndex(currentId);
  if (currentIndex === -1 || currentIndex >= TUTORIAL_SLIDES.length - 1) {
    return undefined;
  }
  return TUTORIAL_SLIDES[currentIndex + 1];
}

/**
 * Get previous slide
 */
export function getPreviousSlide(currentId: string): TutorialSlide | undefined {
  const currentIndex = getSlideIndex(currentId);
  if (currentIndex <= 0) {
    return undefined;
  }
  return TUTORIAL_SLIDES[currentIndex - 1];
}

export const TOTAL_SLIDES = TUTORIAL_SLIDES.length;
