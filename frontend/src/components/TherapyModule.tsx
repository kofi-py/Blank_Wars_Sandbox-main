'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import dynamic from 'next/dynamic';
import {
  Brain, Users, MessageCircle, Star, Crown,
  Sparkles, Heart, Zap, Shield, User
} from 'lucide-react';
import { characterAPI } from '@/services/apiClient';
import { Contestant, TherapyMessage } from '@blankwars/types';
import ConflictDatabaseService, { ConflictData, TherapyContext } from '@/services/ConflictDatabaseService';
import { therapyChatService, TherapySession } from '@/data/therapyChatService';
import EventPublisher from '@/services/eventPublisher';
import ConflictRewardSystem from '@/services/conflictRewardSystem';
import { getCharacterImagePath, getCharacterImageSet } from '@/utils/characterImageUtils';
// Removed demo characters - now using database characters consistently

// Removed local interfaces - using imported types from conflictRewardSystem


interface Therapist {
  id: string;  // character_id (e.g., 'carl_jung')
  userchar_id: string;  // from user_characters table - needed for prompt assembly
  name: string;
  title: string;
  description: string;
  specialties: string[];
  bonuses: {
    type: string;
    value: number;
    description: string;
  }[];
  rarity: 'common' | 'rare' | 'legendary';
  unlocked: boolean;
  portrait: string;
}

// Display data for therapists - merged with DB data at runtime to get userchar_id
type TherapistDisplayData = Omit<Therapist, 'userchar_id'>;

const THERAPIST_DISPLAY_DATA: Record<string, TherapistDisplayData> = {
  'carl_jung': {
    id: 'carl_jung',
    name: 'Carl Jung',
    title: 'The Archetype Master',
    description: 'Legendary psychologist who understands the depths of character archetypes and the collective unconscious.',
    specialties: ['Archetype Analysis', 'Dream Work', 'Shadow Integration', 'Team Harmony'],
    bonuses: [
      { type: 'bond_level', value: 15, description: '+15% Bond Level growth' },
      { type: 'team_harmony', value: 20, description: '+20% Team coordination' },
      { type: 'character_insight', value: 25, description: '+25% Contestant development speed' }
    ],
    rarity: 'common',
    unlocked: true,
    portrait: 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main/Coaching/Therapy/Therapists/Carl_Jung.png'
  },
  'zxk14bw7': {
    id: 'zxk14bw7',
    name: 'Zxk14bW^7',
    title: 'The Cosmic Sage',
    description: 'Ancient extraterrestrial therapist with millennia of wisdom from across seventeen galaxies.',
    specialties: ['Cosmic Perspective', 'Logic Matrices', 'Conflict Resolution', 'Strategic Thinking'],
    bonuses: [
      { type: 'strategy', value: 30, description: '+30% Strategic planning effectiveness' },
      { type: 'conflict_resolution', value: 25, description: '+25% Conflict resolution speed' },
      { type: 'mental_clarity', value: 20, description: '+20% Mental clarity and focus' }
    ],
    rarity: 'common',
    unlocked: true,
    portrait: 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main/Coaching/Therapy/Therapists/Zxk14bW^7.png'
  },
  'seraphina': {
    id: 'seraphina',
    name: 'Fairy Godmother Seraphina',
    title: 'Fairy Godmother Therapist',
    description: 'Personality defined by unified therapist persona system.',
    specialties: ['Therapy Sessions', 'Contestant Analysis'],
    bonuses: [
      { type: 'morale', value: 35, description: '+35% Team morale boost' },
      { type: 'healing', value: 20, description: '+20% Emotional healing rate' },
      { type: 'transformation', value: 25, description: '+25% Personal growth acceleration' }
    ],
    rarity: 'common',
    unlocked: true,
    portrait: 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main/Coaching/Therapy/Therapists/Fairy_Godmother_Seraphina.png'
  }
};

const TherapyModule = () => {
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [availableTherapists, setAvailableTherapists] = useState<Therapist[]>([]);
  const [therapyType, setTherapyType] = useState<'individual' | 'group'>('individual');
  const [available_characters, setAvailableContestants] = useState<Contestant[]>([]);
  const [selected_character, setSelectedContestant] = useState<Contestant | null>(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Contestant[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [intensityStrategy, setIntensityStrategy] = useState<'soft' | 'medium' | 'hard'>('medium');

  // Function to get random therapy image for a character
  const getTherapyContestantImage = (character_name: string): string => {
    return getCharacterImagePath(character_name, 'therapy');
  };

  // Function to get multiple therapy images for a character (for 2x2 grid)
  const getTherapyContestantImages = (character_name: string): string[] => {
    return getCharacterImageSet(character_name, 'therapy', 4);
  };
  const [therapyContext, setTherapyContext] = useState<TherapyContext | null>(null);
  const [active_conflicts, setActiveConflicts] = useState<ConflictData[]>([]);
  const [session_stage, setSessionStage] = useState<'initial' | 'resistance' | 'breakthrough'>('initial');
  const [dynamicPrompts, setDynamicPrompts] = useState<string[]>([]);
  const [groupDynamics, setGroupDynamics] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<TherapySession | null>(null);
  const [sessionMessages, setSessionMessages] = useState<TherapyMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [is_paused, setIsPaused] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [roundCount, setRoundCount] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [judgeEvaluationComplete, setJudgeEvaluationComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const conflict_service = ConflictDatabaseService.getInstance();
  const event_publisher = EventPublisher.getInstance();

  // Clean up any leftover therapy sessions on component mount/unmount
  useEffect(() => {
    // Clean up leftover sessions on mount
    therapyChatService.endAllSessions();

    // Clean up on unmount
    return () => {
      therapyChatService.endAllSessions();
    };
  }, []);
  const conflict_reward_system = ConflictRewardSystem.getInstance();

  // Load therapists from DB and merge with display data
  useEffect(() => {
    const loadTherapists = async () => {
      try {
        const dbTherapists = await characterAPI.get_system_characters('therapist');
        console.log('🎭 Loaded therapists from DB:', dbTherapists);

        // Merge DB data (userchar_id) with display data (portraits, descriptions)
        const merged: Therapist[] = dbTherapists.map(dbT => {
          const displayData = THERAPIST_DISPLAY_DATA[dbT.character_id];
          if (!displayData) {
            throw new Error(`STRICT MODE: No display data for therapist ${dbT.character_id}`);
          }
          return {
            ...displayData,
            userchar_id: dbT.id, // userchar_id from DB
          };
        });

        setAvailableTherapists(merged);
        console.log('🎭 Therapists loaded and merged:', merged.length);
      } catch (error) {
        console.error('❌ Error loading therapists:', error);
        throw error; // Fail fast
      }
    };

    loadTherapists();
  }, []);

  useEffect(() => {
    const loadContestants = async () => {
      try {
        // Use database characters for consistency with kitchen chat and conflict tracking
        const characters = await characterAPI.get_user_characters();

        // Strict validation - backend sends health/attack/defense (not base_ prefix)
        const mapped_characters = characters.map(c => {
          if (c.level === undefined) throw new Error(`Missing level for character ${c.name}`);
          if (c.health === undefined) throw new Error(`Missing health for character ${c.name}`);
          if (c.attack === undefined) throw new Error(`Missing attack for character ${c.name}`);
          return c;
        });

        console.log('🎭 Loaded therapy characters from database:', mapped_characters.length, 'characters');
        console.log('🎭 Contestant names:', mapped_characters.map(c => c.name));
        console.log('🎭 Contestant IDs:', mapped_characters.map(c => c.id));
        setAvailableContestants(mapped_characters);
      } catch (error) {
        console.error('Error loading characters:', error);
        setAvailableContestants([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadContestants();
  }, []);

  // Load therapy context when character is selected
  useEffect(() => {
    const loadTherapyContext = async () => {
      if (selected_character && therapyType === 'individual') {
        try {
          // Use the actual database ID that ConflictDatabaseService expects
          const character_key = selected_character.id;
          console.log('🔍 [TherapyModule] Loading therapy context for:', character_key);
          console.log('🔍 [TherapyModule] selected_character object:', selected_character);

          const context = await conflict_service.getTherapyContextForCharacter(character_key);
          setTherapyContext(context);
          setActiveConflicts(context.active_conflicts);

          // Generate dynamic prompts based on context
          const prompts = generateDynamicPrompts(context);
          setDynamicPrompts(prompts);
        } catch (error) {
          console.error('Error loading therapy context:', error);
        }
      }
    };

    loadTherapyContext();
  }, [selected_character, therapyType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeSession) {
        therapyChatService.unsubscribeFromSession(activeSession.id);
      }
    };
  }, [activeSession]);

  // Generate dynamic prompts based on therapy context
  const generateDynamicPrompts = (context: TherapyContext): string[] => {
    const prompts: string[] = [];

    // Housing-based prompts
    if (context.current_occupancy > context.room_capacity) {
      prompts.push(`Living with ${context.current_occupancy} people in a ${context.room_capacity}-person space must be stressful...`);
    }

    // Performance-based prompts
    if (context.league_ranking > 10) {
      prompts.push(`How does being ranked #${context.league_ranking} in the league affect your mindset?`);
    }

    // Roommate-based prompts
    if (context.roommates.length > 0) {
      prompts.push(`Tell me about your relationship with ${context.roommates[0].name}...`);
    }

    // Team chemistry prompts
    if (context.team_chemistry < 70) {
      prompts.push(`Your team chemistry is at ${context.team_chemistry}%. What's causing the friction?`);
    }

    // Conflict-specific prompts
    context.active_conflicts.forEach(conflict => {
      if (conflict.severity === 'high' || conflict.severity === 'critical') {
        prompts.push(`I sense there's something about ${conflict.category.replace('_', ' ')} that's really bothering you...`);
      }
    });

    return prompts.slice(0, 6); // Limit to 6 prompts
  };

  // Generate group therapy dynamics for selected trio
  const generateGroupDynamics = (members: Contestant[]): string[] => {
    if (members.length !== 3) return [];

    const [char1, char2, char3] = members;
    // Safety check - ensure all characters exist
    if (!char1 || !char2 || !char3) return [];

    const dynamics: string[] = [];

    // Cultural/temporal conflicts
    const eras = members.map(m => getContestantEra(m));
    if (new Set(eras).size === 3) {
      dynamics.push(`${char1.name} (${eras[0]}) clashes with ${char2.name} (${eras[1]}) and ${char3.name} (${eras[2]}) over vastly different worldviews`);
    }

    // Archetype triangles
    const archetypes = members.map(m => m.archetype);
    if (archetypes.includes('warrior') && archetypes.includes('scholar') && archetypes.includes('leader')) {
      dynamics.push(`Classic power triangle: ${char1.name}'s ${char1.archetype} nature vs ${char2.name}'s ${char2.archetype} approach vs ${char3.name}'s ${char3.archetype} style`);
    }

    // Personality combustion
    const personality_clashes = [
      `${char1.name} judges ${char2.name}'s lifestyle while ${char3.name} enables the behavior`,
      `${char2.name} feels ganged up on by ${char1.name} and ${char3.name}`,
      `${char3.name} plays mediator between ${char1.name} and ${char2.name} but secretly resents both`,
      `All three compete for the same recognition, creating underlying tension`,
      `${char1.name} and ${char2.name} have history that ${char3.name} doesn't understand`
    ];

    // Character-specific dynamics using canonical character_id
    // Valid archetypes from migration 093: warrior, beast, tank, assassin, mage, scholar, trickster, detective, leader, beastmaster, magical_appliance, mystic, system
    if (members.some(m => m.character_id === 'dracula')) {
      dynamics.push(`Someone's nocturnal appetites are creating tension in the group`);
    }

    if (members.some(m => m.archetype === 'beast' || m.archetype === 'beastmaster')) {
      dynamics.push(`Primal instincts clash with civilized expectations`);
    }

    if (members.some(m => m.archetype === 'trickster')) {
      dynamics.push(`One member deflects serious conversations with humor, frustrating the others`);
    }

    if (members.some(m => m.archetype === 'leader')) {
      dynamics.push(`Leadership power struggle - who's really in charge of this trio?`);
    }

    if (members.some(m => m.archetype === 'detective')) {
      dynamics.push(`Someone keeps analyzing everyone's behavior instead of sharing their own feelings`);
    }
    return dynamics.slice(0, 4);
  };

  // Get character era from database - strict validation
  const getContestantEra = (character: Contestant): string => {
    if (!character.origin_era) {
      throw new Error(`Missing origin_era for character ${character.name} (canonical: ${character.character_id})`);
    }
    return character.origin_era;
  };

  // Handle group member selection
  const handleGroupMemberToggle = (character: Contestant) => {
    setSelectedGroupMembers(prev => {
      const is_selected = prev.some(m => m.id === character.id);

      if (is_selected) {
        // Remove character
        const new_selection = prev.filter(m => m.id !== character.id);
        setGroupDynamics(generateGroupDynamics(new_selection));
        return new_selection;
      } else if (prev.length < 3) {
        // Add character if under limit
        const new_selection = [...prev, character];
        setGroupDynamics(generateGroupDynamics(new_selection));
        return new_selection;
      }

      return prev; // No change if already at limit
    });
  };

  const handleStartSession = useCallback(async () => {
    const is_ready_for_session = selectedTherapist && (
      (therapyType === 'individual' && selected_character) ||
      (therapyType === 'group' && selectedGroupMembers.length >= 2)
    );

    if (!is_ready_for_session) return;

    try {
      setIsSessionActive(true);
      setIsGeneratingResponse(true);

      // Wait for socket connection
      const connected = await therapyChatService.waitForConnection();
      if (!connected) {
        throw new Error('Unable to connect to therapy service. Please check your connection and try again.');
      }

      // Clean up any existing sessions before starting new one
      therapyChatService.endAllSessions();

      let session: TherapySession;

      if (therapyType === 'individual' && selected_character && selectedTherapist) {
        // Use userchar ID directly - no canonical conversion that breaks service lookups
        const character_id = selected_character?.id;

        if (!character_id) {
          throw new Error(`Expected valid character id, got: ${character_id}`);
        }

        console.log('🔍 DEBUG start-individual payload:', {
          character_id,
          selected_character_id: selected_character?.id,
          selected_character_character_id: (selected_character as any)?.character_id,
          selected_character_slug: (selected_character as any)?.slug,
        });

        if (!character_id) {
          alert('Error: Contestant id missing. Try reloading characters and pick again.');
          setIsSessionActive(false);
          setIsGeneratingResponse(false);
          return;
        }

        // IMPORTANT: use exactly the variable we just computed and pass selected_character
        session = await therapyChatService.startIndividualSession(
          character_id,
          selectedTherapist.id,
          selectedTherapist.userchar_id,
          selectedTherapist.name,
          selected_character,
          intensityStrategy
        );

        console.log('🧠 Individual therapy session started:', session.id);
      } else if (therapyType === 'group' && selectedGroupMembers.length >= 2 && selectedTherapist) {
        // Start group therapy session
        session = await therapyChatService.startGroupSession({
          characters: selectedGroupMembers,
          therapist_id: selectedTherapist.id,
          therapist_userchar_id: selectedTherapist.userchar_id,
          therapist_name: selectedTherapist.name,
          group_dynamics: groupDynamics,
          session_stage: session_stage,
          intensity_strategy: intensityStrategy
        });

        console.log('🧠 Group therapy session started:', session.id);
      } else {
        throw new Error('Invalid session configuration');
      }

      setActiveSession(session);
      setSessionMessages(session.session_history);

      console.log('📌 SESSION STARTED - Setting up auto-play');
      console.log('📌 Session history length:', session.session_history.length);

      // Auto-start logic based on therapy type
      if (session.session_history.length > 0) {
        if (therapyType === 'individual' && selected_character) {
          console.log('🚀 IMMEDIATE AUTO-START: Triggering first individual patient response');
          // Individual therapy auto-start
          setTimeout(() => {
            // Turn tracking handled by turnCount now
            setIsGeneratingResponse(true);

            // Get the last therapist message
            const last_therapist_message = session.session_history
              .slice()
              .reverse()
              .find(msg => msg.speaker_type === 'therapist');

            if (!last_therapist_message?.message) {
              throw new Error('No therapist message found in session history');
            }
            const therapist_question = last_therapist_message.message;

            console.log('🚀 Calling therapyChatService.generatePatientResponse directly');
            therapyChatService.generatePatientResponse(
              session.id,
              selected_character.id,
              therapist_question
            ).then((response) => {
              console.log('🚀 First individual patient response generated:', response);
              // Turn tracking handled by turnCount now
              setRoundCount(1);

              // --- GEMINI'S FIX ---
              // After Turn 1 (Therapist) and Turn 2 (Patient) are done,
              // update the state to reflect the session is ready for user input.
              setTurnCount(2);
              setIsPaused(true);
              // --- END FIX ---

              setIsGeneratingResponse(false);
              console.log('🎬 Initial round complete: waiting for user to continue');
            }).catch(error => {
              console.error('❌ Direct patient response failed:', error);
              setIsGeneratingResponse(false);
            });
          }, 2000);
        } else if (therapyType === 'group' && selectedGroupMembers.length >= 2) {
          console.log('🚀 IMMEDIATE AUTO-START: Triggering first group patient responses');
          // Group therapy auto-start - session already has therapist opening, just get patient responses
          setTimeout(async () => {
            // Turn tracking handled by turnCount now
            setIsGeneratingResponse(true);

            // Get the FIRST (original) therapist message, not the duplicate
            const first_therapist_message = session.session_history.find(msg => msg.speaker_type === 'therapist');
            if (!first_therapist_message?.message) {
              throw new Error('No therapist message found in group session history');
            }
            const therapist_question = first_therapist_message.message;

            console.log('🚀 Starting group patient responses to ORIGINAL opening question');
            console.log('🚀 Using therapist question:', therapist_question.substring(0, 100) + '...');

            try {
              // Get all three characters to respond in sequence to the ORIGINAL opening question
              for (let i = 0; i < selectedGroupMembers.length; i++) {
                const character = selectedGroupMembers[i];
                console.log(`🎬 GROUP: Patient ${i + 1}/3 responding (${character.name})`);

                try {
                  await therapyChatService.generateGroupPatientResponse(
                    session.id,
                    character.id,
                    therapist_question
                  );

                  console.log(`🎬 GROUP: Patient ${i + 1}/3 response generated (${character.name})`);

                  // Small delay between responses for readability
                  if (i < selectedGroupMembers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                  }
                } catch (error) {
                  console.error(`❌ GROUP: Patient ${i + 1} failed (${character.name}):`, error);
                  // Continue with other patients even if one fails
                }
              }

              // All patients have responded, now pause for user to continue
              console.log('🚀 All group patients responded, pausing for user');
              // Turn tracking handled by turnCount now
              setRoundCount(prev => prev + 1);

              // --- GEMINI'S FIX FOR GROUP THERAPY ---
              // After Turn 1 (Therapist) and Turn 2 (All Patients) are done,
              // update the state to reflect the session is ready for user input.
              setTurnCount(2);
              setIsPaused(true);
              // --- END FIX ---

              setIsGeneratingResponse(false);

            } catch (error) {
              console.error('❌ GROUP AUTO-START ERROR:', error);
              setIsGeneratingResponse(false);
            }
          }, 2000);
        }
      }

      // Reset round counters
      setRoundCount(0);
      setTurnCount(0);
      setJudgeEvaluationComplete(false);
      setIsPaused(false);
      setIsGeneratingResponse(false);

      // Subscribe to session messages
      therapyChatService.subscribeToSession(session.id, (message: TherapyMessage) => {
        console.log('📨 New message received:', message.speaker_type);
        setSessionMessages(prev => [...prev, message]);
      });


    } catch (error) {
      console.error('Error starting therapy session:', error);
      alert(error instanceof Error ? error.message : 'Failed to start therapy session');
      setIsSessionActive(false);
    } finally {
      setIsGeneratingResponse(false);
    }
  }, [
    therapyType,
    selected_character,
    selectedTherapist,
    selectedGroupMembers,
    groupDynamics,
    session_stage,
    setIsSessionActive,
    setIsGeneratingResponse,
    // setExchangesInRound removed
    setRoundCount,
    setIsPaused,
    setSessionMessages,
    setActiveSession
  ]);

  // Auto-advance group therapy session with dual API
  const autoAdvanceGroupTherapy = async (therapist_question: string) => {
    console.log('🎬 Auto-advance GROUP therapy called:', {
      has_session: !!activeSession,
      is_paused,
      isGeneratingResponse,
      turnCount,
      group_size: selectedGroupMembers.length
    });

    if (!activeSession || activeSession.type !== 'group' || is_paused || isGeneratingResponse) {
      console.log('🚫 GROUP AUTO-ADVANCE BLOCKED');
      return;
    }

    try {
      setIsGeneratingResponse(true);

      // Get all three characters to respond in sequence
      for (let i = 0; i < selectedGroupMembers.length; i++) {
        const character = selectedGroupMembers[i];
        console.log(`🎬 GROUP: Patient ${i + 1}/3 responding (${character.name})`);

        try {
          await therapyChatService.generateGroupPatientResponse(
            activeSession.id,
            character.id,
            therapist_question
          );

          console.log(`🎬 GROUP: Patient ${i + 1}/3 response generated (${character.name})`);

          // Small delay between responses for readability
          if (i < selectedGroupMembers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error) {
          console.error(`❌ GROUP: Patient ${i + 1} failed (${character.name}):`, error);
          // Continue with other patients even if one fails
        }
      }

      // All patients have responded, now pause for user to continue
      // set_exchanges_in_round(0); // Removed
      setRoundCount(prev => prev + 1);
      setIsPaused(true);
      setIsGeneratingResponse(false);

      console.log('🎬 GROUP ROUND COMPLETE: All 3 patients responded, paused for user');

    } catch (error) {
      console.error('❌ GROUP AUTO-ADVANCE ERROR:', error);
      setIsGeneratingResponse(false);
      setIsPaused(true);
    }
  };

  // Handle judge evaluation for Turn 7
  const handleJudgeEvaluation = async () => {
    console.log('🎯 [JUDGE-DEBUG] handleJudgeEvaluation called', {
      has_active_session: !!activeSession,
      isGeneratingResponse,
      turnCount
    });
    if (!activeSession) {
      console.log('🚫 JUDGE EVALUATION BLOCKED: No active session');
      return;
    }
    // Note: Don't check isGeneratingResponse here - caller (autoAdvanceTherapy) already set it
    console.log('🧑‍⚖️ Handling Judge Evaluation for Turn 7...');
    try {
      // We will create this new service function in the next step
      await therapyChatService.triggerJudgeReview(activeSession.id, activeSession);
      // After judge is done, you might want to end the session or show a summary
      setJudgeEvaluationComplete(true); // Mark judge evaluation as complete
      setIsPaused(true); // Pause to show the final ruling
    } catch (error) {
      console.error('❌ Judge evaluation failed:', error);
      setErrorMessage('Failed to get the judge\'s evaluation.');
      setIsPaused(true);
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  // Auto-advance therapy session (like confessional)
  const autoAdvanceTherapy = async () => {
    console.log('🎬 Auto-advance therapy called:', {
      has_session: !!activeSession,
      is_paused,
      isGeneratingResponse,
      turnCount,
      roundCount
    });

    console.log('🎬 Current state check:', {
      has_active_session: !!activeSession,
      is_pausedState: is_paused,
      is_generating_state: isGeneratingResponse,
      should_continue: !!activeSession && !is_paused && !isGeneratingResponse
    });

    if (!activeSession || isGeneratingResponse || isAdvancing) {
      console.log('🚫 AUTO-ADVANCE BLOCKED:', {
        no_session: !activeSession,
        is_generating: isGeneratingResponse,
        is_advancing: isAdvancing
      });
      return;
    }

    setIsAdvancing(true);
    try {
      setIsGeneratingResponse(true);

      if (activeSession.type === 'individual' && selected_character) {
        const next_turn = turnCount + 1;
        console.log(`🎬 Advancing to Turn: ${next_turn}`);

        // --- RESTORED LOGIC ---
        console.log(`🎯 [TURN-DEBUG] Checking judge trigger: next_turn=${next_turn}, should trigger=${next_turn >= 7}`);
        if (next_turn >= 7) { // Check for turn 7 or greater to call the judge
          console.log(`🎯 [TURN-DEBUG] Triggering judge evaluation for turn ${next_turn}`);
          await handleJudgeEvaluation();
        } else if (next_turn % 2 !== 0) { // Odd turns (3, 5) are for the therapist
          setTurnCount(next_turn);
          console.log(`🎬 THERAPIST TURN: ${next_turn}`);
          await handleTherapistIntervention('question');

          // Automatically trigger the patient's response
          const patient_next_turn = next_turn + 1;
          setTurnCount(patient_next_turn);
          console.log(`🎬 AUTO PATIENT TURN: ${patient_next_turn}`);
          await handleContestantResponse(selected_character.id);

          setRoundCount(prev => prev + 1);
          setIsPaused(true);
          console.log('🎬 PATIENT DONE: paused for user');
        }
        // Note: We no longer need an 'else' block for even turns, as they are now
        // handled automatically after the therapist's turn.
      } else if (activeSession.type === 'group' && selectedGroupMembers.length >= 2) {
        // Group therapy: simple turn-based system
        const next_turn = turnCount + 1;
        setTurnCount(next_turn);

        // Check for judge trigger at round 5 (shorter than individual - group has 4 characters per round)
        const next_round = roundCount + 1;
        console.log(`🎯 [GROUP-ROUND-DEBUG] Checking judge trigger: next_round=${next_round}, should trigger=${next_round >= 5}`);
        if (next_round >= 5) {
          console.log(`🎯 [GROUP-ROUND-DEBUG] Triggering judge evaluation for round ${next_round}`);
          await handleJudgeEvaluation();
          return;
        }

        if (next_turn % 2 === 1) {
          // Odd turn: Therapist speaks
          console.log('🎬 GROUP THERAPIST TURN:', next_turn);
          try {
            const therapist_question = await therapyChatService.generateGroupTherapistQuestion(activeSession.id);
            console.log('🎬 GROUP THERAPIST DONE: question generated');

            // After turn 1, automatically trigger patient responses
            if (next_turn === 1) {
              setIsPaused(false);
              autoAdvanceTherapy(); // Trigger patient responses
              return;
            } else {
              setIsPaused(true); // Wait for user to continue after therapist
            }
          } catch (error) {
            console.error('❌ GROUP THERAPIST FAILED:', error);
            setIsPaused(true);
          }
        } else {
          // Even turn: All patients respond (handled by autoAdvanceGroupTherapy)
          console.log('🎬 GROUP PATIENTS TURN:', next_turn);
          // This will be handled by the existing autoAdvanceGroupTherapy logic
          setRoundCount(prev => prev + 1);
          setIsPaused(true);
        }
      }
    } catch (error) {
      console.error('Error in auto-advance therapy:', error);
      setIsPaused(true);
    } finally {
      setIsGeneratingResponse(false);
      setIsAdvancing(false);
    }
  };

  // Continue therapy session (like confessional continue)
  const continueTherapy = () => {
    console.log('🔧 Continue button triggered (using direct advance)');
    setIsPaused(false);
    // Use the same logic as the working Force button
    autoAdvanceTherapy();
  };

  // Pause therapy session
  const pauseTherapy = () => {
    setIsPaused(true);
  };

  // Handle character response in therapy session
  const handleContestantResponse = async (character_id: string, trigger?: string) => {
    if (!activeSession) return;

    try {
      setIsGeneratingResponse(true);

      // Get the last therapist question from session history
      const last_therapist_message = activeSession.session_history
        .slice()
        .reverse()
        .find(msg => msg.speaker_type === 'therapist');

      const therapist_question = last_therapist_message?.message || 'What brings you to therapy today?';

      console.log('🎭 Patient responding to therapist question:', therapist_question.substring(0, 50) + '...');

      // Use new dual API system - patient response only
      const response = await therapyChatService.generatePatientResponse(
        activeSession.id,
        character_id,
        therapist_question
      );

      console.log('🎭 Patient response generated:', response);
      // The response will be automatically added to sessionMessages via subscription

    } catch (error) {
      console.error('Error generating character response:', error);
      if (error instanceof Error && error.message === 'USAGE_LIMIT_REACHED') {
        alert('AI usage limit reached. Please try again later.');
      } else {
        alert('Failed to generate character response. Please try again.');
      }
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  // Handle therapist intervention
  const handleTherapistIntervention = async (interventionType: 'question' | 'intervention' = 'question') => {
    if (!activeSession) return;

    try {
      setIsGeneratingResponse(true);

      let response: string;

      if (activeSession.type === 'individual') {
        // Use new dual API system for individual therapy
        response = await therapyChatService.generateTherapistQuestion(activeSession.id);
        console.log('🧠 Therapist question generated (dual API):', response);
      } else if (activeSession.type === 'group') {
        // Use new dual API system for group therapy
        response = await therapyChatService.generateGroupTherapistQuestion(activeSession.id);
        console.log('🧠 Group therapist question generated (dual API):', response);
      } else {
        // Fallback to old method
        response = await therapyChatService.generateTherapistIntervention(
          activeSession.id,
          interventionType
        );
        console.log('🧠 Therapist intervention generated (fallback API):', response);
      }
      // The response will be automatically added to sessionMessages via subscription

    } catch (error) {
      console.error('Error generating therapist intervention:', error);
      alert('Failed to generate therapist response. Please try again.');
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  // End therapy session
  const handleEndSession = () => {
    if (activeSession) {
      therapyChatService.endSession(activeSession.id);
      setActiveSession(null);
      setSessionMessages([]);
      setIsSessionActive(false);
      console.log('🧠 Therapy session ended');
    }
  };

  // Advance session stage
  const handleAdvanceStage = async () => {
    if (activeSession) {
      const new_stage = therapyChatService.advanceSessionStage(activeSession.id);
      setSessionStage(new_stage);
      console.log('🧠 Session stage advanced to:', new_stage);

      // Publish therapy event and calculate rewards when breakthrough stage is reached
      if (new_stage === 'breakthrough') {
        try {
          const participant_ids = activeSession.type === 'individual'
            ? [selected_character?.id].filter(Boolean)
            : selectedGroupMembers.map(char => char.id);

          for (const character_id of participant_ids) {
            // Calculate conflict resolution rewards
            if (active_conflicts.length > 0) {
              const major_conflict = active_conflicts[0]; // Take the first/major conflict
              const rewards = conflict_reward_system.calculateResolutionRewards(
                major_conflict.category,
                'collaborative', // Therapy is collaborative resolution
                major_conflict.severity,
                participant_ids.filter(id => id) as string[]
              );

              console.log('🎁 Therapy breakthrough rewards calculated:', rewards);

              // Apply rewards - save to backend
              try {
                await characterAPI.save_therapy_session(character_id, {
                  session_id: activeSession.id,
                  rewards,
                  experience_bonus: rewards.experience_bonus,
                  immediate_rewards: rewards.immediate,
                  long_term_rewards: rewards.long_term,
                  relationship_changes: rewards.relationship_changes
                });

                // Apply all reward types to character stats
                const stat_updates: Record<string, number> = {};

                // Add experience bonus
                stat_updates.experience = rewards.experience_bonus;

                // Process immediate rewards (temporary boosts)
                rewards.immediate.forEach((reward) => {
                  // Use the stat_name field to determine which stat to update
                  switch (reward.stat_name) {
                    case 'mental_health':
                      stat_updates.mental_health = (stat_updates.mental_health || 0) + reward.value;
                      break;
                    case 'communication':
                      stat_updates.charisma = (stat_updates.charisma || 0) + reward.value;
                      break;
                    case 'team_player':
                      stat_updates.team_player = (stat_updates.team_player || 0) + reward.value;
                      break;
                    case 'morale':
                      stat_updates.morale = (stat_updates.morale || 0) + reward.value;
                      break;
                    case 'experience':
                      stat_updates.experience = (stat_updates.experience || 0) + reward.value;
                      break;
                    default:
                      console.log(`🔓 Unhandled reward stat: ${reward.stat_name}`);
                      break;
                  }
                });

                // Process long-term rewards (permanent benefits)
                rewards.long_term.forEach((reward) => {
                  if (reward.permanent) {
                    // Use stat_name to determine which stat to update
                    switch (reward.stat_name) {
                      case 'mental_health':
                        stat_updates.mental_health = (stat_updates.mental_health || 0) + reward.value;
                        break;
                      case 'communication':
                        stat_updates.wisdom = (stat_updates.wisdom || 0) + reward.value;
                        stat_updates.charisma = (stat_updates.charisma || 0) + reward.value;
                        break;
                      case 'team_player':
                        stat_updates.team_player = (stat_updates.team_player || 0) + reward.value;
                        break;
                      case 'experience':
                        stat_updates.experience = (stat_updates.experience || 0) + reward.value;
                        break;
                      default:
                        console.log(`🔓 Unhandled long-term reward stat: ${reward.stat_name}`);
                        break;
                    }
                  }
                });

                // Apply relationship changes
                if (Object.keys(rewards.relationship_changes).length > 0) {
                  await characterAPI.update_stats(character_id, rewards.relationship_changes);
                }

                // Apply all stat updates as increments
                if (Object.keys(stat_updates).length > 0) {
                  await characterAPI.increment_stats(character_id, stat_updates);
                }

                console.log(`✨ ${character_id} therapy progress saved:`, {
                  experience_bonus: rewards.experience_bonus,
                  immediate_rewards: rewards.immediate.length,
                  long_term_rewards: rewards.long_term.length,
                  relationship_changes: Object.keys(rewards.relationship_changes).length,
                  stat_updates: Object.keys(stat_updates)
                });
              } catch (error) {
                console.error('Failed to save therapy session:', error);
                setErrorMessage('⚠️ Unable to save therapy progress to server. Progress applied locally only.');
                // Clear error message after 5 seconds
                setTimeout(() => setErrorMessage(null), 5000);
                // Still log the rewards even if API call fails
                console.log(`✨ ${character_id} receives (offline):`, {
                  experience_bonus: rewards.experience_bonus,
                  immediate_rewards: rewards.immediate.length,
                  long_term_rewards: rewards.long_term.length,
                  relationship_changes: Object.keys(rewards.relationship_changes).length
                });
              }
            }

            await event_publisher.publishTherapySession({
              character_id: character_id,
              session_type: activeSession.type,
              therapist_id: activeSession.therapist_id,
              breakthroughs: ['therapy_stage_advancement'],
              conflicts_addressed: active_conflicts.map(c => c.category),
              stage: 'breakthrough',
              topics_discussed: active_conflicts.map(c => c.category),
              insights: ['Therapy breakthrough achieved'],
              resistance_level: 0,
              breakthrough_achieved: true
            });
          }
          console.log('✅ Therapy breakthrough events and rewards processed');
        } catch (error) {
          console.warn('❌ Failed to publish therapy events:', error);
        }
      }
    }
  };

  // Generate group therapy prompt
  const generateGroupTherapyPrompt = (): string => {
    if (selectedGroupMembers.length !== 3) return '';

    const [char1, char2, char3] = selectedGroupMembers;

    return `
GROUP THERAPY SESSION CONTEXT:
You are participating in a group therapy session with ${char1.name}, ${char2.name}, and ${char3.name}. This is a documentary-style reality show about legendary characters from different eras living and competing together.

CURRENT GROUP DYNAMIC:
${groupDynamics.join('\n')}

THERAPIST: ${selectedTherapist?.name || 'Unknown'}
SESSION STAGE: ${session_stage}

BEHAVIORAL SCRIPT FOR GROUP SESSION:
1. Each character must stay true to their personality and era
2. Conflicts should emerge naturally from the established dynamics
3. Contestants will resist opening up initially, creating tension
4. The therapist will work to get each character to reveal their deeper issues
5. Breakthrough moments should be dramatic and authentic to each character
6. Group members will trigger each other's defensive responses
7. Unexpected alliances and rivalries will form during the session

INDIVIDUAL CHARACTER NOTES:
- ${char1.name} (${char1.archetype}): ${getContestantEra(char1)} background, Level ${char1.level}
- ${char2.name} (${char2.archetype}): ${getContestantEra(char2)} background, Level ${char2.level}  
- ${char3.name} (${char3.archetype}): ${getContestantEra(char3)} background, Level ${char3.level}

Remember: This is group therapy for entertainment value. Drama, conflict, and character growth are essential for compelling viewing.
`;
  };

  // Generate group therapist opening question
  // REMOVED: Local therapist prompt generation
  // All therapist questions are now AI-generated by backend via therapyChatService.generateGroupTherapistQuestion()
  // Backend prompts are in /backend/src/services/promptAssemblyService.ts:
  //   - Carl Jung (line 427): Analytical, archetypes, collective unconscious
  //   - Zxk14bW^7 (line 515): Alien cosmic perspective
  //   - Seraphina (line 680): Sassy fairy godmother tough love

  const handleTherapistSelection = (therapist: Therapist) => {
    setSelectedTherapist(therapist);

    // Preview context logged for debugging
    if (therapyContext) {
      console.log(`${therapist.name} therapy context prepared for session`);
    }
  };

  // Memoize character images to prevent infinite loop
  const character_images = useMemo(() => {
    if (!selected_character) return [];
    return getTherapyContestantImages(selected_character.name);
  }, [selected_character]);

  if (is_loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading therapy module...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-6">
        {/* Left Sidebar - Contestants */}
        <div className="w-80 bg-gray-800/80 rounded-xl p-4 h-fit">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Contestants
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {therapyType === 'individual'
              ? selected_character ? '1 character selected' : 'Select a character for therapy'
              : `${selectedGroupMembers.length}/3 selected for group therapy`
            }
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {available_characters.map((character) => {
              const is_selected = therapyType === 'individual'
                ? selected_character?.id === character.id
                : selectedGroupMembers.some(member => member.id === character.id);
              const is_disabled = therapyType === 'group' && !is_selected && selectedGroupMembers.length >= 3;

              return (
                <button
                  key={character.id}
                  onClick={() => {
                    if (therapyType === 'individual') {
                      setSelectedContestant(character);
                    } else {
                      if (is_selected) {
                        setSelectedGroupMembers(prev => prev.filter(member => member.id !== character.id));
                      } else if (selectedGroupMembers.length < 3) {
                        setSelectedGroupMembers(prev => [...prev, character]);
                      }
                    }
                  }}
                  disabled={is_disabled}
                  className={`w-full p-3 rounded-lg border transition-all text-left ${is_selected
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : is_disabled
                      ? 'border-gray-700 bg-gray-800/30 text-gray-500 cursor-not-allowed opacity-50'
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300 cursor-pointer'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚔️</span>
                    <div className="flex-1">
                      <div className="font-semibold">{character.name}</div>
                      <div className="text-xs opacity-75">Lv.{character.level}</div>
                    </div>
                    {is_selected && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-8">
          {/* Contestant Display - 3D Model or Fallback 2D Images */}
          {((therapyType === 'individual' && selected_character) ||
            (therapyType === 'group' && selectedGroupMembers.length > 0)) && (
              <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 rounded-xl p-6">
                {/* Individual Therapy - 2D Images Only */}
                {therapyType === 'individual' && selected_character && (
                  <div className="flex flex-col items-center">
                    <div className="w-[40rem] h-[86rem] rounded-xl border-4 border-gray-600 shadow-2xl bg-gray-800 p-2">
                      <div className="flex flex-col h-full gap-2">
                        {/* Top image - image 2 (middle/unique image) displayed larger */}
                        <div className="h-[65%] rounded-lg overflow-hidden border-2 border-gray-500/30">
                          <img
                            src={character_images[1]}
                            alt={`${selected_character.name} therapy showcase`}
                            className="w-full h-full object-cover object-top"
                            onError={(e) => {
                              console.error(`❌ Therapy showcase image failed to load:`, e.currentTarget.src);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                        {/* Bottom row - images 1 and 3 (matching series) side by side */}
                        <div className="h-[35%] grid grid-cols-2 gap-2">
                          {[0, 2].map((imageIndex, gridIndex) => (
                            <div key={gridIndex} className="rounded-lg overflow-hidden border-2 border-gray-500/30">
                              <img
                                src={character_images[imageIndex]}
                                alt={`${selected_character.name} therapy ${imageIndex + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error(`❌ Therapy image ${imageIndex + 1} failed to load:`, e.currentTarget.src);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-white font-semibold text-sm">{selected_character.name}</div>
                      <div className="text-gray-400 text-xs">Lv.{selected_character.level}</div>
                    </div>
                  </div>
                )}

                {/* Group Therapy - 2D Images (for now) */}
                {therapyType === 'group' && (
                  <div className="flex justify-center items-center gap-4">
                    {selectedGroupMembers.slice(0, 3).map((member, index) => {
                      return (
                        <div key={member.id} className="flex flex-col items-center">
                          <div className={`rounded-xl overflow-hidden border-4 border-gray-600 shadow-2xl ${selectedGroupMembers.length === 1 ? 'w-80 h-96' :
                            selectedGroupMembers.length === 2 ? 'w-48 h-60' :
                              'w-32 h-40'
                            }`}>
                            <img
                              src={getTherapyContestantImage(member.name)}
                              alt={member.name}
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                console.error('❌ Therapy image failed to load:', e.currentTarget.src);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="mt-2 text-center">
                            <div className="text-white font-semibold text-sm">{member.name}</div>
                            <div className="text-gray-400 text-xs">Lv.{member.level}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          {/* Therapy Type Selection */}
          <div className="bg-gray-800/80 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="text-blue-400" />
              Session Type
            </h2>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setTherapyType('individual')}
                className={`p-6 rounded-lg border-2 transition-all ${therapyType === 'individual'
                  ? 'border-blue-400 bg-blue-400/10 text-blue-400'
                  : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
              >
                <MessageCircle className="mx-auto mb-2" size={24} />
                <div className="font-medium">Individual Session</div>
                <div className="text-sm opacity-75">One-on-one therapy</div>
              </button>
              <button
                onClick={() => setTherapyType('group')}
                className={`p-6 rounded-lg border-2 transition-all ${therapyType === 'group'
                  ? 'border-blue-400 bg-blue-400/10 text-blue-400'
                  : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
              >
                <Users className="mx-auto mb-2" size={24} />
                <div className="font-medium">Group Session</div>
                <div className="text-sm opacity-75">Team therapy</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Therapist Selection */}
      <div className="bg-gray-800/80 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Brain className="text-purple-400" />
          Choose Your Therapist
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableTherapists.map((therapist) => (
            <motion.div
              key={therapist.id}
              whileHover={{ scale: 1.02 }}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${selectedTherapist?.id === therapist.id
                ? 'border-purple-400 bg-purple-400/10'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                }`}
              onClick={() => handleTherapistSelection(therapist)}
            >
              {/* Large therapist image at the top */}
              <div className="text-center mb-6">
                <div className="w-56 h-56 mx-auto mb-4 rounded-xl overflow-hidden shadow-lg">
                  <img
                    src={therapist.portrait}
                    alt={therapist.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Failed to load therapist image:', therapist.portrait);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
                <div className="font-bold text-white text-lg">{therapist.name}</div>
                <div className="text-sm text-purple-400 font-medium">{therapist.title}</div>
              </div>

              <p className="text-gray-300 text-sm mb-6">{therapist.description}</p>

              <div className="space-y-2">
                <div className="text-sm font-medium text-white">Specialties:</div>
                <div className="flex flex-wrap gap-1">
                  {therapist.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-600 text-xs rounded text-gray-300"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <div className="text-sm font-medium text-white">Bonuses:</div>
                {therapist.bonuses.map((bonus, index) => (
                  <div key={index} className="text-xs text-green-400">
                    {bonus.description}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Dynamic Context Display */}
      {therapyContext && therapyType === 'individual' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Brain className="text-yellow-400" />
            Live Therapy Context
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-white">Living Situation</div>
              <div className="text-xs text-gray-300">
                {therapyContext.housing_tier} ({therapyContext.current_occupancy}/{therapyContext.room_capacity} capacity)
              </div>
              <div className="text-xs text-gray-300">
                Roommates: {therapyContext.roommates.map(r => r.name).join(', ')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-white">Team Performance</div>
              <div className="text-xs text-gray-300">
                League Ranking: #{therapyContext.league_ranking}
              </div>
              <div className="text-xs text-gray-300">
                Team Chemistry: {therapyContext.team_chemistry}%
              </div>
            </div>
          </div>

          {active_conflicts.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-white mb-2">Active Conflicts</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {active_conflicts.slice(0, 4).map((conflict, index) => (
                  <div key={index} className={`p-2 rounded text-xs ${conflict.severity === 'critical' ? 'bg-red-900/30 text-red-300' :
                    conflict.severity === 'high' ? 'bg-orange-900/30 text-orange-300' :
                      'bg-yellow-900/30 text-yellow-300'
                    }`}>
                    {conflict.category.replace('_', ' ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {dynamicPrompts.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-white mb-2">Dynamic Prompts</div>
              <div className="space-y-1">
                {dynamicPrompts.slice(0, 3).map((prompt, index) => (
                  <div key={index} className="text-xs text-blue-300 bg-blue-900/20 p-2 rounded">
                    {prompt}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Therapy Session Interface */}
      {isSessionActive && activeSession && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Brain className="text-purple-400" />
              Live Therapy Session - {activeSession.type === 'individual' ? 'Individual' : 'Group'}
            </h2>
            <div className="flex items-center gap-4">
              {/* Live/Paused Status */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${is_paused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
                <span className="text-purple-300 font-semibold">
                  {is_paused ? 'PAUSED' : 'LIVE SESSION'}
                </span>
                <span className="text-gray-500 text-sm">
                  (Round {roundCount})
                </span>
              </div>


              <button
                onClick={handleEndSession}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
              >
                End Session
              </button>
            </div>
          </div>

          {/* Session Messages */}
          <div className="bg-gray-900 rounded-lg p-6 mb-6 min-h-96 max-h-[600px] overflow-y-auto">
            <div className="space-y-4">
              {sessionMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${['king_solomon', 'eleanor_roosevelt', 'anubis'].includes(message.speaker_id)
                    ? 'bg-yellow-900/30 border border-yellow-500/30'
                    : message.speaker_type === 'therapist'
                      ? 'bg-purple-900/30 border border-purple-500/30'
                      : 'bg-blue-900/30 border border-blue-500/30'
                    }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`text-lg font-bold ${['king_solomon', 'eleanor_roosevelt', 'anubis'].includes(message.speaker_id)
                      ? 'text-yellow-400'
                      : message.speaker_type === 'therapist' ? 'text-purple-400' : 'text-blue-400'
                      }`}>
                      {(() => {
                        // Define known judges
                        const known_judges = [
                          { id: 'king_solomon', name: 'King Solomon' },
                          { id: 'eleanor_roosevelt', name: 'Eleanor Roosevelt' },
                          { id: 'anubis', name: 'Anubis' }
                        ];

                        // Find the speaker by ID from all available characters
                        // Use userchar_id for therapist since message.speaker_id is userchar_id
                        const all_participants = [
                          selectedTherapist && { id: selectedTherapist.userchar_id, name: selectedTherapist.name },
                          selected_character && { id: selected_character.id, name: selected_character.name },
                          ...available_characters.map(c => ({ id: c.id, name: c.name })),
                          ...selectedGroupMembers.map(c => ({ id: c.id, name: c.name })),
                          ...known_judges
                        ].filter(Boolean);

                        const speaker = all_participants.find(p => p.id === message.speaker_id);
                        if (speaker) {
                          return speaker.name;
                        }
                        // Use speaker_name from message if available (judges include this)
                        if (message.speaker_name) {
                          return message.speaker_name;
                        }
                        throw new Error(`STRICT MODE: No speaker found for speaker_id ${message.speaker_id}`);
                      })()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-white text-lg leading-relaxed">
                    <ReactMarkdown>{message.message}</ReactMarkdown>
                  </div>
                </div>
              ))}

              {isGeneratingResponse && (
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                    <span className="text-sm">Generating response...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Continue/Pause Controls */}
          <div className="flex justify-center gap-3 mt-4 mb-4">
            <button
              onClick={async () => {
                console.log('🔧 Continue button clicked');
                setIsPaused(false);

                // Handle group therapy directly to avoid closure issues
                if (activeSession?.type === 'group' && selectedGroupMembers.length >= 2) {
                  console.log('🔧 Continue: Group therapy direct handling');

                  // Check for judge trigger at round 5 (group therapy has more content per round)
                  const next_round = roundCount + 1;
                  console.log(`🎯 [GROUP-CONTINUE-DEBUG] Checking judge trigger: next_round=${next_round}, roundCount=${roundCount}`);
                  if (next_round >= 5) {
                    console.log(`🎯 [GROUP-CONTINUE-DEBUG] Triggering judge evaluation for round ${next_round}`);
                    await handleJudgeEvaluation();
                    return;
                  }

                  setIsGeneratingResponse(true);

                  try {
                    // Step 1: Generate therapist question
                    console.log('🔧 Continue: Generating group therapist question');
                    const therapist_question = await therapyChatService.generateGroupTherapistQuestion(activeSession.id);
                    console.log('🔧 Continue: Therapist question generated:', therapist_question.substring(0, 100) + '...');

                    // Small delay to let the therapist question settle
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Step 2: Get all patients to respond to the NEW question
                    for (let i = 0; i < selectedGroupMembers.length; i++) {
                      const character = selectedGroupMembers[i];
                      console.log(`🔧 Continue: Patient ${i + 1}/3 responding to NEW question (${character.name})`);

                      try {
                        await therapyChatService.generateGroupPatientResponse(
                          activeSession.id,
                          character.id,
                          therapist_question
                        );
                        console.log(`🔧 Continue: Patient ${i + 1}/3 response generated (${character.name})`);

                        // Small delay between responses
                        if (i < selectedGroupMembers.length - 1) {
                          await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                      } catch (error) {
                        console.error(`❌ Continue: Patient ${i + 1} failed (${character.name}):`, error);
                      }
                    }

                    // Step 3: Pause for next continue
                    setRoundCount(prev => prev + 1);
                    setIsPaused(true);
                    console.log('🔧 Continue: Group round complete, paused for user');

                  } catch (error) {
                    console.error('❌ Continue: Group therapy error:', error);
                    setIsPaused(true);
                  } finally {
                    setIsGeneratingResponse(false);
                  }
                } else {
                  // Individual therapy or fallback
                  // Use setTimeout to ensure state updates have processed
                  setTimeout(async () => {
                    await autoAdvanceTherapy();
                  }, 50);
                }
              }}
              disabled={isGeneratingResponse || !is_paused || turnCount < 2 || judgeEvaluationComplete}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>

            <button
              onClick={() => {
                console.log('⏸️ Pause button clicked');
                setIsPaused(true);
              }}
              disabled={isGeneratingResponse}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Pause
            </button>
          </div>

          {/* Session Status */}
          <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
            <div className="text-center">
              {is_paused ? (
                <span className="text-yellow-400">
                  ⏸️ Session paused - Click "Continue" below to watch the next round of therapy
                </span>
              ) : isGeneratingResponse ? (
                <span className="text-blue-400">
                  🎬 Therapy session in progress... {activeSession.type === 'individual' ? 'Contestant and therapist' : 'Contestants and therapist'} are working through their issues
                </span>
              ) : (
                <span className="text-green-400">
                  ✨ Ready for next round - Click "Continue" below to advance the therapy session
                </span>
              )}
            </div>
            {activeSession.type === 'group' && (
              <div className="text-center mt-2 text-sm text-gray-400">
                Next speakers: {selectedGroupMembers.map(c => c.name).join(' → ')} → Therapist
              </div>
            )}

          </div>

          {/* Session Info */}
          <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
            <div className="text-xs text-gray-400">
              Session ID: {activeSession.id} | Started: {new Date(activeSession.start_time).toLocaleString()}
              {activeSession.type === 'individual' && therapyContext && (
                <span> | Conflicts: {active_conflicts.length} | Team Chemistry: {therapyContext.team_chemistry}%</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Intensity Strategy Selection */}
      {!isSessionActive && selectedTherapist && (
        (therapyType === 'individual' && selected_character) ||
        (therapyType === 'group' && selectedGroupMembers.length >= 2)
      ) && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Brain className="text-purple-400" />
              Therapy Intensity Instructions
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Tell the therapist what intensity level to use with your character. You're instructing the therapist on how hard to push the patient. Different characters respond better to different intensities.
            </p>
            <div className="flex gap-3 justify-center">
              {(['soft', 'medium', 'hard'] as const).map(intensity => (
                <button
                  key={intensity}
                  onClick={() => setIntensityStrategy(intensity)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all capitalize ${intensityStrategy === intensity
                    ? 'bg-purple-600 text-white border-2 border-purple-400'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
                    }`}
                >
                  {intensity}
                </button>
              ))}
            </div>
            {/* Intensity descriptions */}
            <div className="mt-4 text-center">
              {intensityStrategy === 'soft' && (
                <p className="text-sm text-gray-400">
                  <Heart className="inline w-4 h-4 mr-1 text-pink-400" />
                  Gentle, supportive approach. Best for sensitive or traumatized characters.
                </p>
              )}
              {intensityStrategy === 'medium' && (
                <p className="text-sm text-gray-400">
                  <Users className="inline w-4 h-4 mr-1 text-blue-400" />
                  Balanced approach. Good for most characters with moderate resistance.
                </p>
              )}
              {intensityStrategy === 'hard' && (
                <p className="text-sm text-gray-400">
                  <Zap className="inline w-4 h-4 mr-1 text-yellow-400" />
                  Direct, challenging approach. Best for stubborn or prideful characters.
                </p>
              )}
            </div>
          </div>
        )}

      {/* Start Session Button */}
      {!isSessionActive && (
        <div className="text-center">
          <button
            onClick={handleStartSession}
            disabled={
              isGeneratingResponse ||
              !selectedTherapist ||
              (therapyType === 'individual' && !selected_character) ||
              (therapyType === 'group' && selectedGroupMembers.length < 2)
            }
            className={`px-8 py-3 rounded-lg font-medium transition-all ${selectedTherapist && (
              (therapyType === 'individual' && selected_character) ||
              (therapyType === 'group' && selectedGroupMembers.length >= 2)
            ) && !isGeneratingResponse
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
          >
            {isGeneratingResponse ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Starting Session...
              </div>
            ) : (
              <>
                {therapyType === 'individual'
                  ? 'Start Individual Therapy Session'
                  : `Start Group Therapy Session (${selectedGroupMembers.length} members)`
                }
              </>
            )}
          </button>

          {therapyType === 'group' && selectedGroupMembers.length < 3 && (
            <div className="mt-2 text-sm text-gray-400">
              Please select {3 - selectedGroupMembers.length} more character{3 - selectedGroupMembers.length !== 1 ? 's' : ''} to start group therapy
            </div>
          )}
        </div>
      )}

      {/* Future: Rare Therapist Acquisition */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 opacity-50">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Crown className="text-yellow-400" />
          Rare Therapists
        </h2>
        <p className="text-gray-400 text-center py-8">
          Unlock legendary therapists through card packs, tournament victories, and special events!
          <br />
          <span className="text-sm text-gray-500">Coming soon...</span>
        </p>
      </div>
    </div>
  );
};

export default TherapyModule;