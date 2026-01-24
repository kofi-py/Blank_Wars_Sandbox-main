/**
 * Story Arcs System
 * Character introduction stories that emphasize psychological depth
 * Part of the revolutionary _____ WARS psychology-based battle system
 */

export interface StoryScene {
  id: string;
  title: string;
  content: string;
  character_focus: string;
  psychology_reveal: string[];
  choices?: StoryChoice[];
  auto_advance?: boolean;
  duration?: number;
}

export interface StoryChoice {
  text: string;
  consequence: string;
  psychology_impact: {
    character: string;
    trait: string;
    change: number;
  };
  next_scene: string;
}

export interface StoryArc {
  id: string;
  title: string;
  description: string;
  character_id: string;
  unlock_requirement: string;
  scenes: StoryScene[];
  completed: boolean;
  psychology_lessons: string[];
}

export const storyArcs: StoryArc[] = [
  {
    id: 'achilles-awakening',
    title: 'The Rage of Achilles',
    description: 'Witness the legendary warrior\'s struggle with uncontrolled fury and learn to manage his psychological volatility.',
    character_id: 'achilles',
    unlock_requirement: 'Tutorial completion',
    completed: false,
    psychology_lessons: [
      'Anger management in high-stress situations',
      'The psychology of pride and honor',
      'Channeling negative emotions into positive action',
      'Understanding trauma responses in warriors'
    ],
    scenes: [
      {
        id: 'achilles-intro',
        title: 'The Warrior\'s Awakening',
        content: `The air shimmers with divine energy as a figure materializes on the battlefield. Achilles, the greatest warrior of Troy, stands before you with eyes blazing like molten bronze. His legendary armor gleams, but you can see the tension in his every muscle, the barely contained fury that made him both hero and tragedy.

"Another commander..." he growls, his voice carrying the weight of ancient battles. "Tell me, mortal, do you know who I am? Do you understand the rage that burns within me? The fury that destroyed Troy and consumed my very soul?"

His psychological profile flashes in your mind: High Pride, Severe Anger Management Issues, Deep Loyalty to Friends, Trauma from Loss. This is not just a warrior - this is a damaged soul carrying centuries of psychological wounds.`,
        character_focus: 'achilles',
        psychology_reveal: [
          'Achilles suffers from severe anger management issues stemming from divine heritage',
          'His pride is both his greatest strength and most dangerous weakness',
          'He carries deep trauma from the loss of Patroclus and the Trojan War',
          'His loyalty to friends is absolute but can be manipulated'
        ],
        choices: [
          {
            text: 'Show respect for his legendary status and acknowledge his pain',
            consequence: 'Achilles nods with grudging respect, seeing you understand his burden',
            psychology_impact: {
              character: 'achilles',
              trait: 'trust',
              change: 15
            },
            next_scene: 'achilles-respect'
          },
          {
            text: 'Challenge him to prove his worth in battle',
            consequence: 'Achilles\' eyes blaze with fury at the perceived insult',
            psychology_impact: {
              character: 'achilles',
              trait: 'rage',
              change: 20
            },
            next_scene: 'achilles-challenge'
          },
          {
            text: 'Try to calm him with logical reasoning',
            consequence: 'Achilles dismisses your words as the babbling of a weak mind',
            psychology_impact: {
              character: 'achilles',
              trait: 'respect',
              change: -10
            },
            next_scene: 'achilles-logic'
          }
        ]
      },
      {
        id: 'achilles-respect',
        title: 'Recognition of Pain',
        content: `Achilles\' expression softens slightly, the fury in his eyes dimming to a controlled burn. "You... you see it, don\'t you? The weight I carry. Most commanders see only the weapon, not the man."

He removes his helmet, revealing a face marked by sorrow as much as battle. "I have killed thousands, led armies to victory, but I could not save the one who mattered most. Patroclus... my beloved friend, my other half. His death broke something in me that divine blood cannot heal."

The legendary warrior\'s vulnerability is shocking. This is the psychological key - beneath the rage lies profound grief and guilt.`,
        character_focus: 'achilles',
        psychology_reveal: [
          'Achilles\' rage is a defense mechanism against overwhelming grief',
          'He responds positively to empathy and understanding',
          'His relationship with Patroclus is the core of his psychological wounds',
          'Acknowledging his pain builds trust and cooperation'
        ],
        choices: [
          {
            text: 'Offer to help him honor Patroclus\' memory through righteous battle',
            consequence: 'Achilles pledges his loyalty, seeing a commander worthy of following',
            psychology_impact: {
              character: 'achilles',
              trait: 'loyalty',
              change: 25
            },
            next_scene: 'achilles-bond'
          },
          {
            text: 'Promise that his new teammates will never face Patroclus\' fate',
            consequence: 'Achilles becomes fiercely protective of the team',
            psychology_impact: {
              character: 'achilles',
              trait: 'protective-instinct',
              change: 30
            },
            next_scene: 'achilles-protective'
          }
        ]
      },
      {
        id: 'achilles-challenge',
        title: 'The Fury Unleashed',
        content: `"PROVE MY WORTH?!" Achilles roars, his divine heritage blazing to life. The ground trembles under his feet as his rage transforms him into something terrifying and magnificent. "I am ACHILLES! I brought down the walls of Troy! I slaughtered Hector before the gates of his city!"

His spear appears in his hand, crackling with supernatural power. But you can see the psychological trap you\'ve fallen into - his pride and trauma have fused into a destructive force that recognizes only dominance.

"Face me in combat if you dare, or admit you are unworthy to command the son of Peleus!"`,
        character_focus: 'achilles',
        psychology_reveal: [
          'Challenging Achilles triggers his pride-based trauma response',
          'His rage becomes uncontrollable when his honor is questioned',
          'He conflates respect with fear and dominance',
          'This psychological pattern led to many of his historical tragedies'
        ],
        choices: [
          {
            text: 'Accept the challenge but make it a test of psychology, not violence',
            consequence: 'Intrigued by the unexpected approach, Achilles considers your words',
            psychology_impact: {
              character: 'achilles',
              trait: 'curiosity',
              change: 10
            },
            next_scene: 'achilles-psychology-test'
          },
          {
            text: 'Apologize and acknowledge his superiority',
            consequence: 'Achilles calms but views you as weak and unworthy',
            psychology_impact: {
              character: 'achilles',
              trait: 'contempt',
              change: 15
            },
            next_scene: 'achilles-contempt'
          }
        ]
      },
      {
        id: 'achilles-bond',
        title: 'The Sacred Oath',
        content: `Achilles kneels and places his hand over his heart, a gesture of the deepest respect among ancient warriors. "Then we are bound by sacred oath, commander. I will fight for you as I fought for Patroclus - with every breath in my body, every drop of divine blood in my veins."

His psychological transformation is remarkable. The rage remains, but now it has direction, purpose. "But know this - I will not tolerate weakness in battle, nor betrayal of our bond. Lead with honor, and I will follow you into the depths of Tartarus itself."

You have successfully navigated Achilles\' complex psychology, turning his trauma into loyalty.`,
        character_focus: 'achilles',
        psychology_reveal: [
          'Achilles\' loyalty, once earned, is absolute and unbreakable',
          'Sacred oaths and honor-based commitments resonate deeply with his psychology',
          'His protective instincts transfer to new relationships when properly cultivated',
          'Managing his psychology requires consistency and respect for his values'
        ],
        auto_advance: true,
        duration: 3000
      }
    ]
  },
  {
    id: 'holmes-mystery',
    title: 'The Mind Palace Paradox',
    description: 'Enter the brilliant but obsessive mind of Sherlock Holmes and learn to balance genius with psychological stability.',
    character_id: 'sherlock-holmes',
    unlock_requirement: 'Successfully manage Achilles in 2 battles',
    completed: false,
    psychology_lessons: [
      'Managing obsessive-compulsive tendencies in high-functioning individuals',
      'The psychology of intellectual superiority and social isolation',
      'Balancing analytical thinking with emotional intelligence',
      'Understanding addiction as a coping mechanism for genius-level minds'
    ],
    scenes: [
      {
        id: 'holmes-intro',
        title: 'The Consulting Detective',
        content: `The London fog swirls away to reveal a tall, lean figure in a deerstalker hat, examining the battlefield with piercing eyes. Sherlock Holmes turns his hawklike gaze upon you, and you feel as if every secret of your soul is being catalogued and filed away.

"Fascinating," he murmurs, pulling out a magnifying glass to study seemingly empty air. "A commander who managed to earn Achilles\' loyalty through psychological manipulation rather than force. Tell me, do you see what I see?"

He gestures to patterns invisible to your eyes. His psychological profile is complex: Brilliant Analytical Mind, Social Detachment, Obsessive Tendencies, Hidden Emotional Depth, Addiction-Prone Personality.

"Most commanders," Holmes continues, "fail to understand that every battle is won or lost in the mind first. The question is - can you solve the puzzle of my psychology before it solves you?"`,
        character_focus: 'sherlock-holmes',
        psychology_reveal: [
          'Holmes uses intellectual challenges to test potential allies',
          'His obsessive nature can be both asset and liability in team situations',
          'He masks emotional vulnerability behind analytical detachment',
          'His genius-level intelligence creates social isolation and psychological strain'
        ],
        choices: [
          {
            text: 'Accept his challenge and try to deduce his psychological state',
            consequence: 'Holmes is intrigued by your attempt to analyze the analyzer',
            psychology_impact: {
              character: 'sherlock-holmes',
              trait: 'respect',
              change: 10
            },
            next_scene: 'holmes-deduction'
          },
          {
            text: 'Admit you need his expertise and ask for his insights',
            consequence: 'Holmes appreciates your intellectual honesty',
            psychology_impact: {
              character: 'sherlock-holmes',
              trait: 'partnership',
              change: 15
            },
            next_scene: 'holmes-partnership'
          },
          {
            text: 'Challenge his need to intellectualize everything',
            consequence: 'Holmes becomes defensive about his psychological barriers',
            psychology_impact: {
              character: 'sherlock-holmes',
              trait: 'defensiveness',
              change: 20
            },
            next_scene: 'holmes-defensive'
          }
        ]
      },
      {
        id: 'holmes-deduction',
        title: 'The Battle of Minds',
        content: `Holmes raises an eyebrow, a slight smile playing at his lips. "Excellent! Please, proceed with your analysis. What do you deduce about my psychological state?"

You study him carefully: the nervous energy, the way his fingers tap in complex patterns, the slight tremor that suggests withdrawal from stimulants, the way his eyes dart between extreme focus and distant distraction.

"You see the obsession," you say slowly, "the way patterns consume your thoughts. But also the loneliness - genius is isolating. And there\'s something else... a void you\'re trying to fill with complexity because simplicity terrifies you."

Holmes freezes, his mask slipping for just a moment. "Remarkable," he whispers. "You see what most miss - that the mind palace is also a prison."`,
        character_focus: 'sherlock-holmes',
        psychology_reveal: [
          'Holmes\' brilliance is accompanied by deep psychological pain',
          'His analytical nature is partly a defense mechanism against emotional vulnerability',
          'He struggles with addiction and obsessive behaviors as coping mechanisms',
          'Recognition of his inner struggles creates genuine connection'
        ],
        choices: [
          {
            text: 'Offer to help him find purpose beyond solving puzzles',
            consequence: 'Holmes sees potential for meaningful partnership',
            psychology_impact: {
              character: 'sherlock-holmes',
              trait: 'purpose',
              change: 20
            },
            next_scene: 'holmes-purpose'
          },
          {
            text: 'Suggest using his analytical skills to understand team psychology',
            consequence: 'Holmes becomes fascinated with team dynamics as a new puzzle',
            psychology_impact: {
              character: 'sherlock-holmes',
              trait: 'engagement',
              change: 25
            },
            next_scene: 'holmes-team-analysis'
          }
        ]
      },
      {
        id: 'holmes-team-analysis',
        title: 'The Greatest Case',
        content: `Holmes\' eyes light up with the fervor of a man who has found his greatest case. "Of course! Team psychology - the most complex puzzle of all! Each individual a variables, their interactions creating exponential complexity!"

He begins pacing, his mind visibly racing. "Achilles\' rage patterns, the way trauma manifests in combat stress, the mathematical probability of psychological breakdown under pressure - it\'s magnificent!"

For the first time, you see Holmes genuinely excited about something beyond himself. His obsessive nature, properly channeled, could make him the perfect team psychologist.

"I accept your proposition, commander. Together, we shall solve the mystery of the human mind in combat. But I warn you - once I begin this investigation, I will see everything. Every weakness, every strength, every secret fear. Are you prepared for such transparency?"`,
        character_focus: 'sherlock-holmes',
        psychology_reveal: [
          'Holmes\' obsession can be redirected toward team psychology',
          'His analytical skills make him exceptional at reading team dynamics',
          'He thrives when given complex, meaningful problems to solve',
          'His psychological insights could prevent team crises before they occur'
        ],
        auto_advance: true,
        duration: 3000
      }
    ]
  },
  {
    id: 'dracula-darkness',
    title: 'The Count\'s Gambit',
    description: 'Navigate the manipulative psychology of Count Dracula while protecting your team from his dark influence.',
    character_id: 'dracula',
    unlock_requirement: 'Build strong team relationships to resist manipulation',
    completed: false,
    psychology_lessons: [
      'Recognizing and countering psychological manipulation',
      'Understanding narcissistic personality patterns',
      'Protecting team psychology from toxic influences',
      'Converting manipulation into strategic advantage'
    ],
    scenes: [
      {
        id: 'dracula-intro',
        title: 'Lord of Darkness',
        content: `The shadows themselves seem to bend and flow as a figure emerges from the darkness. Count Dracula steps into view with predatory grace, his pale features aristocratic and beautiful in their terrible perfection. His eyes hold the weight of centuries, and his smile promises both ecstasy and destruction.

"Ah, the commander who has gathered such... interesting specimens," his voice is silk over steel, cultured and hypnotic. "I confess myself intrigued. Achilles with his divine fury, Holmes with his brilliant madness... and now you seek to add Dracula to your collection?"

His psychological profile is deeply disturbing: Master Manipulator, Narcissistic Personality Disorder, Predatory Instincts, Ancient Wisdom, Seductive Charisma. Every word is calculated, every gesture designed to probe for weakness.

"Tell me, mortal, what makes you think you can control the night itself?"`,
        character_focus: 'dracula',
        psychology_reveal: [
          'Dracula views relationships as games of domination and control',
          'His charm is a weapon designed to create psychological dependence',
          'He feeds on psychological vulnerability as much as blood',
          'His centuries of experience make him expert at reading and exploiting human nature'
        ],
        choices: [
          {
            text: 'Set clear boundaries and refuse to be intimidated',
            consequence: 'Dracula respects strength but tests your resolve constantly',
            psychology_impact: {
              character: 'dracula',
              trait: 'respect',
              change: 10
            },
            next_scene: 'dracula-boundaries'
          },
          {
            text: 'Try to understand what he truly wants beyond power',
            consequence: 'Dracula is surprised by your attempt to see past his masks',
            psychology_impact: {
              character: 'dracula',
              trait: 'curiosity',
              change: 15
            },
            next_scene: 'dracula-depth'
          },
          {
            text: 'Warn him that your team is protected from his influence',
            consequence: 'Dracula views this as a direct challenge to his abilities',
            psychology_impact: {
              character: 'dracula',
              trait: 'challenged',
              change: 20
            },
            next_scene: 'dracula-challenge'
          }
        ]
      },
      {
        id: 'dracula-boundaries',
        title: 'The Price of Power',
        content: `Dracula\'s smile never wavers, but something predatory flickers in his ancient eyes. "Boundaries," he purrs, circling you like a shark sensing blood. "How deliciously... mortal. Very well, I shall respect your... limitations."

He pauses, studying your resolve. "But understand this, commander - I am not your pet monster to be leashed and commanded. I am Dracula, Lord of the Undead, Master of the Night. I offer my power in exchange for... entertainment."

The psychological dance is complex. He\'s testing not just your strength, but your consistency. Will you maintain these boundaries when he offers power? When he shows you secrets? When he saves your life?

"I will not betray your trust," he continues, "provided you do not bore me. Fail to interest me, and I shall find... other diversions among your precious team."`,
        character_focus: 'dracula',
        psychology_reveal: [
          'Dracula respects consistent boundaries more than submission',
          'He views relationships as contracts of mutual benefit',
          'Boredom is more dangerous to him than anger',
          'His threats often mask a desire for genuine engagement'
        ],
        choices: [
          {
            text: 'Agree to his terms but monitor his behavior closely',
            consequence: 'Dracula appreciates the pragmatic approach',
            psychology_impact: {
              character: 'dracula',
              trait: 'partnership',
              change: 15
            },
            next_scene: 'dracula-contract'
          },
          {
            text: 'Offer him the intellectual stimulation of team strategy',
            consequence: 'Dracula becomes intrigued by the complexity of team dynamics',
            psychology_impact: {
              character: 'dracula',
              trait: 'engagement',
              change: 20
            },
            next_scene: 'dracula-strategy'
          }
        ]
      },
      {
        id: 'dracula-strategy',
        title: 'The Master\'s Game',
        content: `Dracula\'s eyes gleam with genuine interest for the first time. "Strategy... yes, I see. You would have me use my centuries of experience, my understanding of mortal psychology, not as a weapon against your team but as a tool for their success."

He strokes his chin thoughtfully. "Fascinating. In all my years, few have thought to harness my manipulative nature for constructive purposes. Very well - I shall be your psychological strategist, your master of mental warfare against our enemies."

A dangerous smile crosses his features. "But know this - once I begin analyzing your enemies\' minds, picking apart their psychological defenses, you may find my methods... unsettling. I do not wage war gently, even psychological war."

You\'ve successfully reframed Dracula\'s predatory nature as a strategic asset while maintaining team safety.`,
        character_focus: 'dracula',
        psychology_reveal: [
          'Dracula can redirect his manipulative skills toward enemies rather than allies',
          'He appreciates being valued for his intelligence, not just his power',
          'Constructive use of his abilities satisfies his need for mental stimulation',
          'He becomes protective of team members when given a positive role'
        ],
        auto_advance: true,
        duration: 3000
      }
    ]
  }
];

export class StoryArcManager {
  private completed_arcs: string[] = [];
  private current_scene: string | null = null;
  private scene_choices: Record<string, {
    choice_index: number;
    choice: StoryChoice;
    timestamp: Date;
  }> = {};

  constructor(savedData?: {
    completed_arcs?: string[];
    current_scene?: string | null;
    scene_choices?: Record<string, { choice_index: number; choice: StoryChoice; timestamp: Date }>;
  }) {
    if (savedData) {
      this.completed_arcs = savedData.completed_arcs || [];
      this.current_scene = savedData.current_scene || null;
      this.scene_choices = savedData.scene_choices || {};
    }
  }

  // Get available story arcs based on unlock requirements
  getAvailableArcs(): StoryArc[] {
    return storyArcs.filter(arc => 
      !this.completed_arcs.includes(arc.id) && 
      this.checkUnlockRequirement(arc.unlock_requirement)
    );
  }

  // Start a story arc
  startArc(arcId: string): StoryScene | null {
    const arc = storyArcs.find(a => a.id === arcId);
    if (!arc || !this.checkUnlockRequirement(arc.unlock_requirement)) {
      return null;
    }

    this.current_scene = arc.scenes[0].id;
    return arc.scenes[0];
  }

  // Make choice in current scene
  makeChoice(choiceIndex: number): StoryScene | null {
    if (!this.current_scene) return null;

    const scene = this.getCurrentScene();
    if (!scene || !scene.choices || !scene.choices[choiceIndex]) {
      return null;
    }

    const choice = scene.choices[choiceIndex];
    this.scene_choices[this.current_scene] = {
      choice_index: choiceIndex,
      choice,
      timestamp: new Date()
    };

    // Apply psychology impact
    if (choice.psychology_impact) {
      this.applyPsychologyImpact(choice.psychology_impact);
    }

    // Move to next scene
    this.current_scene = choice.next_scene;
    return this.getCurrentScene();
  }

  // Get current scene
  getCurrentScene(): StoryScene | null {
    if (!this.current_scene) return null;

    for (const arc of storyArcs) {
      const scene = arc.scenes.find(s => s.id === this.current_scene);
      if (scene) return scene;
    }
    return null;
  }

  // Complete current arc
  completeCurrentArc(): boolean {
    if (!this.current_scene) return false;

    for (const arc of storyArcs) {
      if (arc.scenes.some(s => s.id === this.current_scene)) {
        this.completed_arcs.push(arc.id);
        arc.completed = true;
        this.current_scene = null;
        return true;
      }
    }
    return false;
  }

  // Check if requirement is met
  private checkUnlockRequirement(requirement: string): boolean {
    // Simplified check - in real implementation, this would check actual game state
    switch (requirement) {
      case 'Tutorial completion':
        return true; // Always available
      case 'Successfully manage Achilles in 2 battles':
        return this.completed_arcs.includes('achilles-awakening');
      case 'Build strong team relationships to resist manipulation':
        return this.completed_arcs.length >= 2;
      default:
        return false;
    }
  }

  // Apply psychology impact to character
  private applyPsychologyImpact(impact: {
    character: string;
    trait: string;
    change: number;
  }): void {
    // This would integrate with the character psychology system
    console.log(`Applied psychology impact:`, impact);
  }

  // Get completed arcs
  getCompletedArcs(): string[] {
    return [...this.completed_arcs];
  }

  // Get scene choices made
  getSceneChoices(): Record<string, {
    choice_index: number;
    choice: StoryChoice;
    timestamp: Date;
  }> {
    return { ...this.scene_choices };
  }

  // Save progress
  saveProgress(): void {
    const data = {
      completed_arcs: this.completed_arcs,
      current_scene: this.current_scene,
      scene_choices: this.scene_choices
    };
    localStorage.setItem('story-arc-progress', JSON.stringify(data));
  }

  // Load progress
  static loadProgress(): StoryArcManager {
    const saved = localStorage.getItem('story-arc-progress');
    const data = saved ? JSON.parse(saved) : {};
    return new StoryArcManager(data);
  }
}