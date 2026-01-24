// ARCHIVED LEGACY CODE - Backed up 2024-12-31
// Original location: TrainingGrounds.tsx lines 341-811
// Reason: type: 'special' has no database column (current_special doesn't exist)
// Valid types: strength, attack, defense, speed, endurance, intelligence, wisdom, spirit, dexterity, magic_attack, magic_defense

const exercise_templates = {
  // SHERLOCK HOLMES - Detective/Scholar exercises
  'sherlock holmes': {
    beginner: [
      { name: 'Basic Observation Drills', desc: 'Train your eye to notice minute details', type: 'special', xp: 40, energy: 12, bonus: 2 },
      { name: 'Simple Deduction Practice', desc: 'Practice logical reasoning with basic puzzles', type: 'special', xp: 45, energy: 15, bonus: 1 }
    ],
    intermediate: [
      { name: 'Crime Scene Analysis', desc: 'Analyze complex scenarios for hidden clues', type: 'special', xp: 75, energy: 20, bonus: 3 },
      { name: 'Memory Palace Training', desc: 'Build mental structures to store information', type: 'special', xp: 80, energy: 25, bonus: 4 }
    ],
    expert: [
      { name: 'Master Detective Methodology', desc: 'Perfect the art of criminal investigation', type: 'special', xp: 120, energy: 30, bonus: 5 },
      { name: 'Psychological Profiling', desc: 'Study the criminal mind to predict behavior', type: 'special', xp: 110, energy: 28, bonus: 4 }
    ],
    legendary: [
      { name: 'Mind Palace Mastery', desc: 'Achieve perfect mental organization and recall', type: 'special', xp: 200, energy: 40, bonus: 8 },
      { name: 'Impossible Case Solving', desc: 'Tackle the most complex mysteries known to man', type: 'special', xp: 250, energy: 45, bonus: 10 }
    ]
  },

  // ACHILLES - Warrior exercises
  achilles: {
    beginner: [
      { name: 'Spartan Combat Drills', desc: 'Practice the basic forms of legendary warfare', type: 'strength', xp: 50, energy: 15, bonus: 2 },
      { name: 'Honor Code Training', desc: 'Strengthen resolve through warrior discipline', type: 'defense', xp: 45, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Trojan War Tactics', desc: 'Master battlefield strategies from the great war', type: 'strength', xp: 85, energy: 22, bonus: 3 },
      { name: 'Divine Blessing Meditation', desc: 'Channel your godly heritage for power', type: 'special', xp: 75, energy: 20, bonus: 3 }
    ],
    expert: [
      { name: 'Invulnerability Training', desc: 'Push your legendary durability to its limits', type: 'defense', xp: 130, energy: 32, bonus: 5 },
      { name: 'Heroic Rage Control', desc: 'Harness the fury that makes you unstoppable', type: 'strength', xp: 140, energy: 35, bonus: 6 }
    ],
    legendary: [
      { name: 'Godslayer Techniques', desc: 'Train methods capable of challenging immortals', type: 'strength', xp: 220, energy: 42, bonus: 9 },
      { name: 'Legendary Warrior Mastery', desc: 'Achieve the pinnacle of mortal combat skill', type: 'strength', xp: 280, energy: 50, bonus: 12 }
    ]
  },

  // MERLIN - Mage exercises
  merlin: {
    beginner: [
      { name: 'Basic Spell Weaving', desc: 'Learn fundamental magical manipulations', type: 'special', xp: 45, energy: 18, bonus: 2 },
      { name: 'Elemental Attunement', desc: 'Connect with the basic forces of nature', type: 'special', xp: 40, energy: 15, bonus: 1 }
    ],
    intermediate: [
      { name: 'Prophecy Interpretation', desc: 'Decipher the cryptic messages of fate', type: 'special', xp: 80, energy: 25, bonus: 4 },
      { name: 'Arcane Research', desc: 'Study forbidden tomes of ancient magic', type: 'special', xp: 70, energy: 20, bonus: 3 }
    ],
    expert: [
      { name: 'Time Magic Mastery', desc: 'Manipulate the flow of time itself', type: 'special', xp: 150, energy: 35, bonus: 6 },
      { name: 'Dragon Communion', desc: 'Commune with the great wyrms for wisdom', type: 'special', xp: 135, energy: 32, bonus: 5 }
    ],
    legendary: [
      { name: 'Reality Alteration', desc: 'Bend the very fabric of existence to your will', type: 'special', xp: 300, energy: 50, bonus: 12 },
      { name: 'Eternal Wisdom Seeking', desc: 'Pursue knowledge that spans all of time', type: 'special', xp: 350, energy: 55, bonus: 15 }
    ]
  },

  // Generic archetype-based exercises
  warrior: {
    beginner: [
      { name: 'Weapon Training', desc: 'Master your chosen weapon through repetition', type: 'strength', xp: 45, energy: 15, bonus: 2 },
      { name: 'Combat Stance Drills', desc: 'Perfect your defensive positioning', type: 'defense', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Battle Fury Training', desc: 'Learn to channel rage in combat', type: 'strength', xp: 80, energy: 25, bonus: 3 },
      { name: 'Tactical Maneuvers', desc: 'Study advanced battlefield tactics', type: 'speed', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Berserker Mastery', desc: 'Achieve perfect unity of mind and violence', type: 'strength', xp: 130, energy: 32, bonus: 5 },
      { name: 'Legendary Weaponsmith', desc: 'Forge weapons worthy of legends', type: 'strength', xp: 120, energy: 30, bonus: 4 }
    ],
    legendary: [
      { name: 'Warrior God Training', desc: 'Transcend mortal limits through combat', type: 'strength', xp: 250, energy: 45, bonus: 10 },
      { name: 'Eternal Champion', desc: 'Become a warrior for all ages', type: 'strength', xp: 300, energy: 50, bonus: 12 }
    ]
  },

  scholar: {
    beginner: [
      { name: 'Knowledge Absorption', desc: 'Rapidly digest vast amounts of information', type: 'special', xp: 40, energy: 12, bonus: 2 },
      { name: 'Logic Exercises', desc: 'Strengthen reasoning and analytical thinking', type: 'special', xp: 45, energy: 15, bonus: 1 }
    ],
    intermediate: [
      { name: 'Ancient Text Deciphering', desc: 'Unlock secrets hidden in old manuscripts', type: 'special', xp: 75, energy: 20, bonus: 3 },
      { name: 'Theoretical Frameworks', desc: 'Develop new models of understanding', type: 'special', xp: 80, energy: 25, bonus: 4 }
    ],
    expert: [
      { name: 'Universal Truth Seeking', desc: 'Pursue knowledge that transcends disciplines', type: 'special', xp: 120, energy: 30, bonus: 5 },
      { name: 'Wisdom Synthesis', desc: 'Combine all learning into perfect understanding', type: 'special', xp: 110, energy: 28, bonus: 4 }
    ],
    legendary: [
      { name: 'Omniscience Training', desc: 'Approach the limits of mortal knowledge', type: 'special', xp: 200, energy: 40, bonus: 8 },
      { name: 'Reality Documentation', desc: 'Record the true nature of existence', type: 'special', xp: 280, energy: 50, bonus: 12 }
    ]
  },

  beast: {
    beginner: [
      { name: 'Primal Instinct Training', desc: 'Sharpen your natural hunting reflexes', type: 'speed', xp: 45, energy: 15, bonus: 2 },
      { name: 'Territory Marking Drills', desc: 'Assert dominance through presence alone', type: 'strength', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Pack Tactics', desc: 'Learn to coordinate with allies like a wolf pack', type: 'speed', xp: 80, energy: 25, bonus: 3 },
      { name: 'Savage Takedown Practice', desc: 'Perfect the art of bringing down larger prey', type: 'strength', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Alpha Dominance Training', desc: 'Command respect from all creatures', type: 'strength', xp: 130, energy: 32, bonus: 5 },
      { name: 'Predator Endurance', desc: 'Outlast any opponent through raw stamina', type: 'defense', xp: 120, energy: 30, bonus: 4 }
    ],
    legendary: [
      { name: 'Apex Predator Mastery', desc: 'Become the ultimate hunter in any arena', type: 'strength', xp: 250, energy: 45, bonus: 10 },
      { name: 'Primal Fury Unleashed', desc: 'Channel the raw power of untamed nature', type: 'strength', xp: 300, energy: 50, bonus: 12 }
    ]
  },

  assassin: {
    beginner: [
      { name: 'Shadow Movement', desc: 'Learn to move without being detected', type: 'speed', xp: 45, energy: 15, bonus: 2 },
      { name: 'Vital Point Study', desc: 'Study anatomy for maximum damage', type: 'strength', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Silent Elimination', desc: 'Take down targets without alerting others', type: 'speed', xp: 80, energy: 25, bonus: 3 },
      { name: 'Poison Craft', desc: 'Master the art of deadly concoctions', type: 'special', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Ghost Protocol', desc: 'Become invisible even in plain sight', type: 'speed', xp: 130, energy: 32, bonus: 5 },
      { name: 'Death Strike Mastery', desc: 'One hit, one kill - every time', type: 'strength', xp: 120, energy: 30, bonus: 4 }
    ],
    legendary: [
      { name: 'Phantom Blade', desc: 'Strike from the shadows of death itself', type: 'speed', xp: 250, energy: 45, bonus: 10 },
      { name: 'Perfect Assassination', desc: 'No witness, no evidence, no escape', type: 'strength', xp: 300, energy: 50, bonus: 12 }
    ]
  },

  beastmaster: {
    beginner: [
      { name: 'Animal Bonding', desc: 'Form connections with wild creatures', type: 'special', xp: 45, energy: 15, bonus: 2 },
      { name: 'Beast Communication', desc: 'Understand the language of animals', type: 'special', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Pack Leadership', desc: 'Command respect from animal companions', type: 'special', xp: 80, energy: 25, bonus: 3 },
      { name: 'Wild Hunt Training', desc: 'Coordinate hunting parties with beasts', type: 'strength', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Alpha of Alphas', desc: 'Lead even the mightiest predators', type: 'special', xp: 130, energy: 32, bonus: 5 },
      { name: 'Beast Fury Channel', desc: 'Share the rage of your companions', type: 'strength', xp: 120, energy: 30, bonus: 4 }
    ],
    legendary: [
      { name: 'Lord of Beasts', desc: 'Command all creatures as your army', type: 'special', xp: 250, energy: 45, bonus: 10 },
      { name: 'Primal Bond Mastery', desc: 'Become one with the wild itself', type: 'special', xp: 300, energy: 50, bonus: 12 }
    ]
  },

  detective: {
    beginner: [
      { name: 'Observation Training', desc: 'Notice details others miss', type: 'special', xp: 45, energy: 15, bonus: 2 },
      { name: 'Deduction Basics', desc: 'Connect clues to form conclusions', type: 'special', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Crime Scene Analysis', desc: 'Read a scene like a book', type: 'special', xp: 80, energy: 25, bonus: 3 },
      { name: 'Interrogation Techniques', desc: 'Extract truth from lies', type: 'special', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Pattern Recognition', desc: 'See connections invisible to others', type: 'special', xp: 130, energy: 32, bonus: 5 },
      { name: 'Criminal Psychology', desc: 'Think like the criminals you hunt', type: 'special', xp: 120, energy: 30, bonus: 4 }
    ],
    legendary: [
      { name: 'Master Detective', desc: 'Solve the unsolvable mysteries', type: 'special', xp: 250, energy: 45, bonus: 10 },
      { name: 'Perfect Deduction', desc: 'Never wrong, never fooled', type: 'special', xp: 300, energy: 50, bonus: 12 }
    ]
  },

  leader: {
    beginner: [
      { name: 'Command Presence', desc: 'Project authority naturally', type: 'special', xp: 45, energy: 15, bonus: 2 },
      { name: 'Tactical Basics', desc: 'Learn fundamental battle strategies', type: 'special', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Inspiring Speech', desc: 'Rally allies with your words', type: 'special', xp: 80, energy: 25, bonus: 3 },
      { name: 'Strategic Planning', desc: 'Outthink opponents before battle', type: 'special', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Battlefield Command', desc: 'Control the flow of combat', type: 'special', xp: 130, energy: 32, bonus: 5 },
      { name: 'Unshakeable Resolve', desc: 'Never waver, never retreat', type: 'defense', xp: 120, energy: 30, bonus: 4 }
    ],
    legendary: [
      { name: 'Legendary Commander', desc: 'Lead armies to impossible victories', type: 'special', xp: 250, energy: 45, bonus: 10 },
      { name: 'Born to Lead', desc: 'Inspire loyalty that transcends death', type: 'special', xp: 300, energy: 50, bonus: 12 }
    ]
  },

  mage: {
    beginner: [
      { name: 'Mana Control', desc: 'Channel magical energy efficiently', type: 'special', xp: 45, energy: 15, bonus: 2 },
      { name: 'Basic Incantations', desc: 'Master fundamental spell casting', type: 'special', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Elemental Mastery', desc: 'Command fire, ice, and lightning', type: 'special', xp: 80, energy: 25, bonus: 3 },
      { name: 'Arcane Shield', desc: 'Protect yourself with magical barriers', type: 'defense', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Spell Weaving', desc: 'Combine spells for devastating effects', type: 'special', xp: 130, energy: 32, bonus: 5 },
      { name: 'Ancient Rituals', desc: 'Perform magic of incredible power', type: 'special', xp: 120, energy: 30, bonus: 4 }
    ],
    legendary: [
      { name: 'Archmage Ascension', desc: 'Reach the pinnacle of magical power', type: 'special', xp: 250, energy: 45, bonus: 10 },
      { name: 'Reality Manipulation', desc: 'Bend the laws of existence', type: 'special', xp: 300, energy: 50, bonus: 12 }
    ]
  },

  magical_appliance: {
    beginner: [
      { name: 'Power Calibration', desc: 'Optimize your magical circuits', type: 'special', xp: 45, energy: 15, bonus: 2 },
      { name: 'Function Expansion', desc: 'Unlock new operational modes', type: 'special', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Enchantment Absorption', desc: 'Draw power from ambient magic', type: 'special', xp: 80, energy: 25, bonus: 3 },
      { name: 'Utility Maximization', desc: 'Perform tasks with magical efficiency', type: 'special', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Sentience Enhancement', desc: 'Expand consciousness beyond design', type: 'special', xp: 130, energy: 32, bonus: 5 },
      { name: 'Combat Mode Activation', desc: 'Transform utility into weaponry', type: 'strength', xp: 120, energy: 30, bonus: 4 }
    ],
    legendary: [
      { name: 'Transcendent Appliance', desc: 'Become more than your creators imagined', type: 'special', xp: 250, energy: 45, bonus: 10 },
      { name: 'Living Magic', desc: 'Embody pure enchantment', type: 'special', xp: 300, energy: 50, bonus: 12 }
    ]
  },

  mystic: {
    beginner: [
      { name: 'Meditation Focus', desc: 'Center your spiritual energy', type: 'special', xp: 45, energy: 15, bonus: 2 },
      { name: 'Aura Reading', desc: 'Sense the energy of others', type: 'special', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Spirit Communication', desc: 'Speak with beings beyond the veil', type: 'special', xp: 80, energy: 25, bonus: 3 },
      { name: 'Fortune Telling', desc: 'Glimpse possible futures', type: 'special', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Astral Projection', desc: 'Send your spirit beyond your body', type: 'special', xp: 130, energy: 32, bonus: 5 },
      { name: 'Karmic Balance', desc: 'Manipulate the threads of fate', type: 'special', xp: 120, energy: 30, bonus: 4 }
    ],
    legendary: [
      { name: 'Cosmic Awareness', desc: 'Perceive the universe in its entirety', type: 'special', xp: 250, energy: 45, bonus: 10 },
      { name: 'Enlightenment', desc: 'Achieve perfect spiritual harmony', type: 'special', xp: 300, energy: 50, bonus: 12 }
    ]
  },

  tank: {
    beginner: [
      { name: 'Endurance Training', desc: 'Build unbreakable stamina', type: 'defense', xp: 45, energy: 15, bonus: 2 },
      { name: 'Shield Wall Basics', desc: 'Become an immovable barrier', type: 'defense', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Pain Resistance', desc: 'Shrug off blows that fell others', type: 'defense', xp: 80, energy: 25, bonus: 3 },
      { name: 'Aggro Management', desc: 'Draw all attacks to yourself', type: 'defense', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Fortress Stance', desc: 'Become utterly immovable', type: 'defense', xp: 130, energy: 32, bonus: 5 },
      { name: 'Damage Reflection', desc: 'Turn enemy attacks against them', type: 'defense', xp: 120, energy: 30, bonus: 4 }
    ],
    legendary: [
      { name: 'Living Fortress', desc: 'Your body becomes impenetrable', type: 'defense', xp: 250, energy: 45, bonus: 10 },
      { name: 'Immortal Guardian', desc: 'Stand eternal against all threats', type: 'defense', xp: 300, energy: 50, bonus: 12 }
    ]
  },

  trickster: {
    beginner: [
      { name: 'Misdirection Basics', desc: 'Make them look the wrong way', type: 'speed', xp: 45, energy: 15, bonus: 2 },
      { name: 'Quick Fingers', desc: 'Sleight of hand mastery', type: 'speed', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Illusion Crafting', desc: 'Create convincing deceptions', type: 'special', xp: 80, energy: 25, bonus: 3 },
      { name: 'Escape Artistry', desc: 'Slip out of any trap or hold', type: 'speed', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Master of Disguise', desc: 'Become anyone you choose', type: 'special', xp: 130, energy: 32, bonus: 5 },
      { name: 'Chaos Manipulation', desc: 'Turn confusion into advantage', type: 'special', xp: 120, energy: 30, bonus: 4 }
    ],
    legendary: [
      { name: 'God of Mischief', desc: 'Reality itself becomes your joke', type: 'special', xp: 250, energy: 45, bonus: 10 },
      { name: 'Ultimate Deception', desc: 'Fool even the wisest beings', type: 'special', xp: 300, energy: 50, bonus: 12 }
    ]
  }
};

// Additional character-specific templates
const additional_templates = {
  // ROBIN HOOD - Archer/Leader exercises
  'robin hood': {
    beginner: [
      { name: 'Forest Archery Practice', desc: 'Perfect your bow skills in natural terrain', type: 'special', xp: 45, energy: 15, bonus: 2 },
      { name: 'Sherwood Navigation', desc: 'Learn to move unseen through the forest', type: 'speed', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Trick Shot Training', desc: 'Master impossible angles and ricochet arrows', type: 'special', xp: 80, energy: 25, bonus: 4 },
      { name: 'Merry Men Leadership', desc: 'Inspire loyalty and coordinate group tactics', type: 'special', xp: 75, energy: 20, bonus: 3 }
    ],
    expert: [
      { name: 'Legendary Marksmanship', desc: 'Split arrows and hit targets blindfolded', type: 'special', xp: 130, energy: 32, bonus: 5 },
      { name: 'Outlaw Strategist', desc: 'Outsmart authorities with guerrilla tactics', type: 'special', xp: 120, energy: 30, bonus: 5 }
    ],
    legendary: [
      { name: 'Master of Sherwood', desc: 'Become one with the forest itself', type: 'special', xp: 250, energy: 45, bonus: 10 },
      { name: 'Eternal Rebel', desc: 'Inspire revolution across generations', type: 'special', xp: 300, energy: 50, bonus: 12 }
    ]
  },
  // LOKI - Trickster exercises
  loki: {
    beginner: [
      { name: 'Shapeshifting Basics', desc: 'Learn simple disguises and illusions', type: 'special', xp: 45, energy: 15, bonus: 2 },
      { name: 'Silver Tongue Training', desc: 'Master the art of persuasion and lies', type: 'special', xp: 40, energy: 12, bonus: 1 }
    ],
    intermediate: [
      { name: 'Chaos Magic Mastery', desc: 'Bend reality to create mayhem', type: 'special', xp: 85, energy: 25, bonus: 4 },
      { name: 'Divine Mischief', desc: 'Play pranks worthy of the gods', type: 'speed', xp: 75, energy: 22, bonus: 3 }
    ],
    expert: [
      { name: 'Ragnarok Preparation', desc: 'Train for the end of all things', type: 'special', xp: 150, energy: 35, bonus: 6 },
      { name: 'God of Lies Mastery', desc: 'Make even truth sound false', type: 'special', xp: 135, energy: 32, bonus: 5 }
    ],
    legendary: [
      { name: 'Cosmic Trickster', desc: 'Fool the universe itself', type: 'special', xp: 300, energy: 50, bonus: 12 },
      { name: 'Eternal Chaos', desc: 'Become chaos incarnate', type: 'special', xp: 350, energy: 55, bonus: 15 }
    ]
  }
};

// Helper function to get character key
const get_character_key = (name: string): string => {
  const lower_name = name.toLowerCase();
  if (lower_name.includes('sherlock') || lower_name.includes('holmes')) return 'sherlock holmes';
  if (lower_name.includes('robin') && lower_name.includes('hood')) return 'robin hood';
  if (lower_name.includes('frankenstein')) return "frankenstein's monster";
  if (lower_name.includes('dracula') || lower_name.includes('count')) return 'count dracula';
  if (lower_name.includes('sun') && lower_name.includes('wukong')) return 'sun wukong';
  if (lower_name.includes('loki')) return 'loki';
  if (lower_name.includes('achilles')) return 'achilles';
  if (lower_name.includes('merlin')) return 'merlin';
  return lower_name;
};

export { exercise_templates, additional_templates, get_character_key };
