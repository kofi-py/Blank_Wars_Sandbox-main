import { io, Socket } from 'socket.io-client';
import { ConflictData, TherapyContext, TherapyContextData } from '@/services/ConflictDatabaseService';
import ConflictDatabaseService from '../services/ConflictDatabaseService';
// TherapyPromptTemplateService removed - using backend unified persona system
import GameEventBus from '../services/gameEventBus';
import EventContextService from '../services/eventContextService';
import { sendViaAIChat } from '../services/chatAdapter';
import apiClient, { characterAPI } from '../services/apiClient';
import { Contestant, TherapyMessage, TherapySpeakerType, TherapyMessageType, TherapySessionType, TherapyIntensity, TherapyBonusType, TherapyStatChange } from '@blankwars/types';
import { resolveTherapistAgentKey, mapTherapistToAgentKey } from './therapyAgentResolver';
// Removed lib/chat/context - using ConflictDatabaseService directly

const TEMPLATE_MARKERS = [
  '[THERAPY_MODE_BASE_PROMPT]',
  'RESPONSE REQUIREMENTS',
  'HUMOR STYLE',
  'THERAPY SESSION CONTEXT',
  'DEERSTALKER-DEBUG-PATIENT',
  'VIOLIN-DEBUG-HEADER',
  'PIPE-TOBACCO-DEBUG-UNIFIED',
  'CHARACTER:',
  'ROLE:'
];

// Keep only real conversational lines
function cleanHistoryFilter(s: string): boolean {
  if (!s) return false;
  return !TEMPLATE_MARKERS.some(t => s.includes(t));
}
import { mustResolveAgentKey, nameToAgentKey } from '../lib/chat/agent_keys';
import TherapyGameSystem, { type TherapyGameState, type TherapyReward } from '../services/therapyGameSystem';

// Feature flag for quick rollback
const USE_HTTP_FOR_INDIVIDUAL_PATIENT = true; // flip to false to revert quickly

// Helper function to build consistent therapy meta objects
// Removed buildTherapyMeta() - backend now fetches all data directly from DB


// Unified transcript builder for consistent conversation history
const MAX_HISTORY_TURNS = 8; // Reasonable window size

function buildUnifiedTranscript(session: TherapySession): TherapyMessage[] {
  if (!session.session_history) {
    throw new Error('STRICT MODE: session.session_history is required');
  }

  const filtered = session.session_history.filter(m => {
    if (!m.message) {
      throw new Error(`STRICT MODE: Message missing message field: ${JSON.stringify(m)}`);
    }
    if (!m.speaker_id) {
      throw new Error(`STRICT MODE: Message missing speaker_id: ${JSON.stringify(m)}`);
    }
    if (!m.speaker_name) {
      throw new Error(`STRICT MODE: Message missing speaker_name: ${JSON.stringify(m)}`);
    }
    return m.message.trim() && !m.message.includes('[META_START]') && !m.message.includes('[META_END]');
  });

  return filtered.slice(-MAX_HISTORY_TURNS);
}

export interface TherapySession {
  id: string;
  type: 'individual' | 'group';
  therapist_id: string;
  therapist_userchar_id: string;  // user_character ID for therapist - required for proper message tracking
  therapist_name: string;  // Display name for therapist (required for conversation history)
  participant_ids: string[];
  stage: 'initial' | 'resistance' | 'breakthrough';
  session_history: TherapyMessage[];
  start_time: Date;
  context: TherapyContext;
  group_dynamics?: string[];
  participants?: { id: string; name: string }[]; // Resolved participant names
  round_count?: number; // Track completed therapy rounds (therapist + patient = 1 round)
  eleanor_review_pending?: boolean; // Flag for Eleanor's review
  intensity_strategy?: 'soft' | 'medium' | 'hard'; // Coach's recommended approach
  game_state?: TherapyGameState; // Therapy game mechanics state
  gameState?: TherapyGameState; // Alternate property name (alias)
  rounds?: number; // Number of rounds completed
  patient_agent_key?: string;
  topic?: 'conflict' | 'acclimation';
  conflict_id?: string;
}

// TherapyMessage imported from @blankwars/types

// TherapyReward replaced by TherapyStatChange from @blankwars/types
// The correct bonus types are: bond_level, current_communication, current_confidence,
// current_mental_health, current_morale, current_stress, current_team_player, experience

interface IndividualTherapyContext {
  character: Contestant;
  therapist_id: string;
  therapist_userchar_id: string;  // user_character ID for therapist
  therapist_name: string;  // Display name for therapist
  therapy_context: TherapyContext;
  session_stage: 'initial' | 'resistance' | 'breakthrough';
  previous_messages?: TherapyMessage[];
}

interface GroupTherapyContext {
  characters: Contestant[];
  therapist_id: string;
  therapist_userchar_id: string;  // user_character ID for therapist
  therapist_name: string;  // Display name for therapist
  group_dynamics: string[];
  session_stage: 'initial' | 'resistance' | 'breakthrough';
  previous_messages?: TherapyMessage[];
  intensity_strategy: 'soft' | 'medium' | 'hard';  // Coach's recommended approach
}

export class TherapyChatService {
  private socket: Socket | null = null;
  private active_sessions: Map<string, TherapySession> = new Map();
  private messageHandlers: Map<string, (message: TherapyMessage) => void> = new Map();
  private gameSystem = TherapyGameSystem.getInstance();
  private gameStates = new Map<string, TherapyGameState>();
  private conflictDb = ConflictDatabaseService.getInstance();
  private judgeSubscription: (() => void) | null = null;

  constructor() {
    this.initializeSocket();
    this.setupJudgeEventSubscription();
  }

  private setupJudgeEventSubscription() {
    // First, if a subscription from a previous hot-reload or session exists, unsubscribe from it.
    if (this.judgeSubscription) {
      console.log('🎖️ [JUDGE-SUB] Unsubscribing from a lingering "zombie" event listener.');
      this.judgeSubscription();
      this.judgeSubscription = null;
    }

    // Subscribe to therapy_round_completed events for automatic judge triggering
    this.judgeSubscription = GameEventBus.getInstance().subscribe('therapy_round_completed', async (event) => {
      console.log('🎖️ [JUDGE-SUB] Received therapy_round_completed event:', event);

      const { session_id, roundsCompleted } = event.metadata;
      if (roundsCompleted >= 7) {
        console.log(`🎖️ [JUDGE-SUB] Triggering judge for round ${roundsCompleted}`);
        await this.queueJudgeEvaluation(session_id, roundsCompleted);
      } else {
        console.log(`🎖️ [JUDGE-SUB] Skipping judge - round ${roundsCompleted} not yet round 7`);
      }
    });

    console.log('🎖️ [JUDGE-SUB] Event-driven judge subscription active');
  }

  private initializeSocket() {
    let socketUrl: string;

    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;

      // Check for localhost first
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const backendPort = '4000'; // Backend runs on port 4000
        socketUrl = `${protocol}//${hostname}:${backendPort}`;
      } else if (process.env.NEXT_PUBLIC_BACKEND_URL) {
        socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      } else {
        throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is not configured. Cannot connect to backend.');
      }
    } else {
      // Server-side rendering - only use env var
      if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
        // Don't throw during SSR on localhost builds
        socketUrl = 'http://localhost:4000';
      } else {
        socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      }
    }

    console.log('🧠 Therapy Chat Service initializing with URL:', socketUrl);

    // Disabled WebSocket connection - using HTTP only for therapy
    console.log('🔄 Therapy Chat Service: Using HTTP-only mode (WebSockets disabled)');
    this.socket = null as any;

    // WebSocket event handlers disabled - using HTTP only
    // WebSocket handlers disabled - all communication via HTTP now
    // this.socket.on('chat_response', (data) => { ... });
    // this.socket.on('chat_error', (error) => { ... });
  }

  private mustGetDisplayName(session: TherapySession, contextTag: string): string {
    const name = session.context?.character?.name;
    if (!name) {
      throw new Error(`Display name missing in ${contextTag} - session context invalid`);
    }
    return name;
  }

  /**
   * Start an individual therapy session
   */
  async startIndividualSession(
    character_id: string,
    therapist_id: string,
    therapist_userchar_id: string,
    therapist_name: string,
    selected_character?: any,
    intensity_strategy?: 'soft' | 'medium' | 'hard'
  ): Promise<TherapySession> {
    if (!therapist_userchar_id) {
      throw new Error('STRICT MODE: therapist_userchar_id is required');
    }
    if (!therapist_name) {
      throw new Error('STRICT MODE: therapist_name is required');
    }
    const session_id = `therapy_individual_${Date.now()}_${character_id}`;

    // Get therapy context data from ConflictDatabaseService
    const conflictService = ConflictDatabaseService.getInstance();
    let contextData: TherapyContextData;
    try {
      contextData = await conflictService.getTherapyContextData(character_id);
    } catch (error) {
      console.error(`Failed to get therapy context for ${character_id}:`, error);
      throw error;
    }

    // Decide topic deterministically based on active conflicts
    const conflicts = contextData.active_conflicts || [];
    const topic: 'conflict' | 'acclimation' = conflicts.length > 0 ? 'conflict' : 'acclimation';
    console.log(`🎯 THERAPY TOPIC for ${character_id}: ${topic} (${conflicts.length} conflicts)`);

    // If no intensity specified, calculate optimal based on character
    let finalIntensity = intensity_strategy;
    let intensityReason = '';

    if (!finalIntensity) {
      // Default to medium if not specified
      finalIntensity = 'medium';
      console.log('🎯 No intensity strategy specified, defaulting to medium');
    } else {
      // Calculate effectiveness of chosen strategy
      const effectiveness = this.calculateIntensityEffectiveness(contextData.character, finalIntensity);
      console.log(`🎯 Therapy intensity '${finalIntensity}' effectiveness: ${effectiveness.effectiveness}% - ${effectiveness.reason}`);
      intensityReason = effectiveness.reason;
    }

    // Lock patient agent_key at session start to prevent character identity flipping  
    const patient_agent_key = contextData.character.character_id;
    if (!patient_agent_key) {
      throw new Error('Missing character_id for therapy session');
    }

    const session: TherapySession = {
      id: session_id,
      type: 'individual',
      therapist_id: therapist_id,
      therapist_userchar_id: therapist_userchar_id,
      therapist_name: therapist_name,
      participant_ids: [character_id], // Use instance ID for roster lookup
      stage: 'initial',
      session_history: [],
      start_time: new Date(),
      intensity_strategy: finalIntensity,
      context: {
        ...contextData,
        session_id: session_id,
        patient_agent_key: patient_agent_key,
        therapist_id: therapist_id,
        session_stage: 'initial',
        group_dynamics: [],
        all_participant_ids: [character_id]
      },
      patient_agent_key: patient_agent_key,
      // Add participants with names for easy access
      topic: topic, // 'conflict' or 'acclimation'
      conflict_id: topic === 'conflict' && conflicts.length > 0 ? conflicts[0].id : undefined
    };

    this.active_sessions.set(session_id, session);

    // Initialize therapy game state
    const game_state = this.gameSystem.initializeSession(
      selected_character?.character_id,
      therapist_id
    );
    this.gameStates.set(session_id, game_state);

    // Publish therapy session start event
    const eventBus = GameEventBus.getInstance();
    await eventBus.publish({
      type: 'therapy_session_start',
      source: 'therapy_room',
      primary_character_id: character_id,
      severity: 'medium',
      category: 'therapy',
      description: `${character_id} started individual therapy session with ${therapist_id}`,
      metadata: {
        session_type: 'individual',
        therapist_id,
        session_stage: 'initial'
      },
      tags: ['therapy', 'individual', 'session_start']
    });

    // Generate opening question using real API (automatically adds to session history)
    await this.generateTherapistQuestion(session_id);
    console.log('🧠 Individual therapy session started:', session_id);

    return session;
  }

  /**
   * Start a group therapy session
   */
  async startGroupSession(context: GroupTherapyContext): Promise<TherapySession> {
    if (!context.therapist_userchar_id) {
      throw new Error('STRICT MODE: therapist_userchar_id is required for group therapy');
    }
    if (!context.therapist_name) {
      throw new Error('STRICT MODE: therapist_name is required for group therapy');
    }
    const session_id = `therapy_group_${Date.now()}_${context.characters.map(c => c.id).join('_')}`;

    const session: TherapySession = {
      id: session_id,
      type: 'group',
      therapist_id: context.therapist_id,
      therapist_userchar_id: context.therapist_userchar_id,
      therapist_name: context.therapist_name,
      participant_ids: context.characters.map(c => c.id),
      stage: context.session_stage,
      session_history: [],
      start_time: new Date(),
      group_dynamics: context.group_dynamics,
      intensity_strategy: context.intensity_strategy,
      context: {
        ...(await this.conflictDb.getTherapyContextData(context.characters[0].id)),
        session_id,
        patient_agent_key: context.characters[0].character_id,
        therapist_id: context.therapist_id,
        session_stage: context.session_stage,
        all_participant_ids: context.characters.map(c => c.id),
        group_dynamics: context.group_dynamics
      }
    };

    this.active_sessions.set(session_id, session);

    // Generate therapist group opening question using the new dual API
    // Note: generateGroupTherapistQuestion already adds the message to session history
    await this.generateGroupTherapistQuestion(session_id);
    console.log('🧠 Group therapy session started:', session_id);

    return session;
  }

  /**
   * Generate therapist question in individual therapy (Step 1 of dual API)
   */
  async generateTherapistQuestion(session_id: string): Promise<string> {
    console.log('🔍 INDIVIDUAL THERAPIST QUESTION CALLED');
    console.log('🔍 Looking for session_id:', session_id);
    console.log('🔍 Available sessions:', Array.from(this.active_sessions.keys()));
    const session = this.active_sessions.get(session_id);
    if (!session) {
      console.error('🔍 SESSION NOT FOUND!', {
        requested: session_id,
        available: Array.from(this.active_sessions.keys()),
        count: this.active_sessions.size
      });
      throw new Error(`Session ${session_id} not found`);
    }

    const messageId = `therapy_therapist_${Date.now()}_${session.therapist_id}`;

    // Session context already set by startIndividualSession - no lookup needed
    // const therapistPrompt = this.buildTherapistPrompt(session);

    console.log('📤 Sending therapist question request:', {
      session_id,
      therapist_id: session.therapist_id,
      messageId
    });

    // Use normalized HTTP adapter instead of socket events
    try {
      // Map therapist ID to correct agent_key (therapists are system agents)
      function mapTherapistToAgentKey(therapist_id: string): string {
        const therapistMap: Record<string, string> = {
          'zxk14bw7': 'zxk14bw7',
          'carl-jung': 'carl_jung',
          'seraphina': 'seraphina'
        };
        return therapistMap[therapist_id] || therapist_id;
      }

      const agent_key = mapTherapistToAgentKey(session.therapist_id);
      console.log('🔍 THERAPIST MAPPING:', { therapist_id: session.therapist_id, agent_key });

      // Build conversation history using unified transcript builder
      const messages = buildUnifiedTranscript(session);
      console.log('[THERAPIST DEBUG] Session history length:', session.session_history.length);
      console.log('[THERAPIST DEBUG] Messages being sent:', messages);

      const result = await sendViaAIChat(session_id, {
        agent_key,
        character: agent_key, // Ensure character field is set for backend
        message: "", // ✅ empty - server ignores for therapy
        messages: messages, // Include conversation history
        chat_type: 'therapy',
        topic: session.stage ?? 'therapy',
        // Removed meta - backend fetches all data from DB directly
        userchar_id: session.context?.character?.id,
        therapist_id: agent_key,
        therapist_userchar_id: session.therapist_userchar_id,
        intensity_strategy: session.intensity_strategy // Pass intensity to backend
      });

      if (!result.text) {
        throw new Error('STRICT MODE: sendViaAIChat returned no text for therapist response');
      }
      const text = this.enforceTwoSentenceCap(result.text);
      const responseMessageId = crypto.randomUUID();

      const therapistMessage: TherapyMessage = {
        id: responseMessageId,
        session_id,
        speaker_id: session.therapist_userchar_id,  // Use user_character ID, not canonical ID
        speaker_name: session.therapist_name,
        speaker_type: 'therapist',
        message: text,
        timestamp: new Date(),
        message_type: 'question',
      };

      // Filter out meta instructions before saving to history
      const messageContent = therapistMessage.message || '';
      const hasMetaMarkers = messageContent.includes('[META_START]') || messageContent.includes('[META_END]');

      if (!hasMetaMarkers) {
        session.session_history.push(therapistMessage);
        // Process therapy message for game mechanics
        if (this.gameSystem && session.game_state) {
          try {
            const result = this.gameSystem.processTherapyMessage(
              session.game_state,
              therapistMessage.message,
              'therapist'
            );
            session.game_state = result.updated_state;
            console.log(`🎮 [GAME-MECHANICS] Therapist msg processed - Rounds: ${session.game_state.rounds_completed}`);
          } catch (error) {
            console.warn(`🎮 [GAME-MECHANICS] Error processing therapist message:`, error);
          }
        }
      } else {
        // Clean the message by removing everything between META markers
        const cleanedMessage = messageContent.replace(/\[META_START\][\s\S]*?\[META_END\]/g, '').trim();
        if (cleanedMessage.length > 0) {
          therapistMessage.message = cleanedMessage;
          session.session_history.push(therapistMessage);
          // Process therapy message for game mechanics
          if (this.gameSystem && session.game_state) {
            try {
              const result = this.gameSystem.processTherapyMessage(
                session.game_state,
                cleanedMessage,
                'therapist'
              );
              session.game_state = result.updated_state;
              console.log(`🎮 [GAME-MECHANICS] Cleaned therapist msg processed - Rounds: ${session.game_state.rounds_completed}`);
            } catch (error) {
              console.warn(`🎮 [GAME-MECHANICS] Error processing cleaned therapist message:`, error);
            }
          }
        } else {
          console.log('🛡️ [META-FILTER] Blocked meta-only message from session_history');
        }
      }
      if (!text) {
        throw new Error('Therapist response unavailable from AI');
      }
      return text;
    } catch (err) {
      console.warn('[therapy] sendViaAIChat failed:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Generate patient response in individual therapy (Step 2 of dual API)
   */
  async generatePatientResponse(
    session_id: string,
    character_id: string,
    therapist_question: string
  ): Promise<string> {
    console.log('🔍 PATIENT RESPONSE CALLED for session_id:', session_id);
    const session = this.active_sessions.get(session_id);
    if (!session) {
      throw new Error(`Session ${session_id} not found`);
    }

    return new Promise(async (resolve, reject) => {
      const messageId = `therapy_patient_${Date.now()}_${character_id}`;

      // Use the locked patient agent_key to prevent character identity flipping
      const resolvedKey = session.context.patient_agent_key;
      if (!resolvedKey) {
        reject(new Error('patient_agent_key missing - session not initialized correctly'));
        return;
      }

      // Hard validation for display name - no 'Patient' fallback
      let display_name: string;
      try {
        display_name = this.mustGetDisplayName(session, 'therapy-individual');
      } catch (e) {
        reject(e);
        return;
      }

      console.log('📤 Sending patient response request:', {
        session_id,
        character_id,
        messageId,
        therapist_question: therapist_question.substring(0, 50) + '...'
      });

      try {
        // Build conversation history for memory system
        const messages = buildUnifiedTranscript(session);
        console.log('[PATIENT DEBUG] Session history length:', session.session_history.length);

        const result = await sendViaAIChat(session_id, {
          agent_key: resolvedKey,
          character: resolvedKey, // Ensure character field is set for backend
          message: therapist_question, // Send actual question, not prompt
          messages: messages, // Include conversation history
          chat_type: 'therapy',
          topic: session.stage ?? 'therapy',
          userchar_id: session.context?.character?.id,
          therapist_id: session.therapist_id,
          therapist_userchar_id: session.therapist_userchar_id
          // intensity_strategy not included - patient doesn't need to know about it
        });

        const rawText = result?.text ?? 'I prefer not to discuss this.';
        const text = this.enforceTwoSentenceCap(rawText);

        const patientMessage: TherapyMessage = {
          id: messageId,
          session_id,
          speaker_id: character_id,
          speaker_name: display_name,
          speaker_type: 'contestant',
          message: text,
          timestamp: new Date(),
          message_type: 'response'
        };

        // Filter out meta instructions before saving to history
        const messageContent = patientMessage.message || '';
        const hasMetaMarkers = messageContent.includes('[META_START]') || messageContent.includes('[META_END]');

        if (!hasMetaMarkers) {
          session.session_history.push(patientMessage);
        } else {
          // Clean the message by removing everything between META markers
          const cleanedMessage = messageContent.replace(/\[META_START\][\s\S]*?\[META_END\]/g, '').trim();
          if (cleanedMessage.length > 0) {
            patientMessage.message = cleanedMessage;
            session.session_history.push(patientMessage);
          } else {
            console.log('🛡️ [META-FILTER] Blocked meta-only message from session_history');
          }
        }

        // Process therapy game mechanics
        await this.processGameMechanics(session_id, character_id, text, 'contestant');

        // Analyze patient response for therapeutic events
        const responseText = text.toLowerCase();
        let event_type = 'therapy_session_progress';
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        let emotionalIntensity = 5;

        if (responseText.includes('breakthrough') || responseText.includes('understand')) {
          event_type = 'therapy_breakthrough';
          severity = 'high';
          emotionalIntensity = 8;
        }

        // Publish therapeutic event
        GameEventBus.getInstance().publish({
          type: event_type as any, // Convert to EventType
          source: 'therapy_room',
          primary_character_id: character_id,
          severity,
          category: 'therapy',
          description: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          metadata: {
            session_id,
            therapist_id: session.therapist_id,
            session_stage: session.stage,
            response_length: text.length,
            emotionalIntensity,
            breakthrough_indicator: event_type === 'therapy_breakthrough'
          },
          tags: ['therapy', 'individual', 'patient_response', event_type.replace('therapy_', '')]
        }).catch(error => console.error('Error publishing therapy event:', error));

        resolve(text);
      } catch (error) {
        console.error('❌ HTTP patient response failed:', error);
        reject(error);
      }
    });
  }


  /**
   * Generate group therapist question (Step 1 of dual API for group therapy)
   */
  async generateGroupTherapistQuestion(
    session_id: string
  ): Promise<string> {
    const session = this.active_sessions.get(session_id);
    if (!session || session.type !== 'group') {
      throw new Error(`Group session ${session_id} not found`);
    }

    const messageId = `therapy_group_therapist_${Date.now()}_${session.therapist_id}`;

    // Ensure the session has a display name for the patients
    const character_ids = session.participant_ids;

    // Fetch full character context
    try {
      const contextData = await this.conflictDb.getTherapyContextData(character_ids[0]);
      session.context = {
        ...contextData,
        ...(session.context || {}), // preserve existing session props
        character: contextData.character, // ensure character is full
        all_participant_ids: character_ids,
        session_id,
        patient_agent_key: contextData.character.character_id, // strict assignment
        therapist_id: session.therapist_id,
        session_stage: session.stage,
        group_dynamics: session.group_dynamics || []
      };
    } catch (e) {
      console.warn(`Could not load full context for group session ${session_id}`, e);
      throw new Error(`Failed to load character context for ${character_ids[0]} in group session`);
    }

    const display_name = session.context.character.name;

    console.log('📤 Sending group therapist question request:', {
      session_id,
      therapist_id: session.therapist_id,
      messageId,
      group_size: session.participant_ids.length
    });

    // Use the EXACT same approach as individual therapy
    try {
      // Map therapist ID to correct agent_key (same as individual therapy)
      function mapTherapistToAgentKey(therapist_id: string): string {
        // Strict mapping - no fallbacks
        const therapistMap: Record<string, string> = {
          'zxk14bw7': 'zxk14bw7',
          'carl-jung': 'carl_jung',
          'seraphina': 'seraphina'
        };
        const key = therapistMap[therapist_id];
        if (!key) throw new Error(`Unknown therapist ID: ${therapist_id}`);
        return key;
      }

      const agent_key = mapTherapistToAgentKey(session.therapist_id);
      console.log('🔍 THERAPIST MAPPING:', { therapist_id: session.therapist_id, agent_key });
      console.log('🔍 SESSION DEBUG:', {
        participant_ids: session.participant_ids,
        context_all_participant_ids: session.context?.all_participant_ids,
        session_type: session.type,
        session_id
      });

      // Build short, clean conversation history (mirror individual therapy pattern)
      const messages = buildUnifiedTranscript(session);

      const participant_idsToSend = session.participant_ids;
      console.log('🔍 SENDING participant_ids:', participant_idsToSend);

      const result = await sendViaAIChat(session_id, {
        agent_key,
        character: agent_key, // Ensure character field is set for backend
        message: '',                             // ✅ empty - server ignores for therapy
        messages,                                // ✅ provide cleaned history
        chat_type: 'group_therapy',
        topic: session.stage,
        // Removed meta - backend fetches all data from DB directly
        userchar_id: session.context.character.id,
        therapist_id: agent_key,
        therapist_userchar_id: session.therapist_userchar_id,
        participant_ids: participant_idsToSend,
        intensity_strategy: session.intensity_strategy
      });

      // Enforce 2-sentence cap for therapist responses
      const rawText = (result?.text ?? '').trim();
      const text = this.enforceTwoSentenceCap(rawText);

      console.warn('[THERAPIST-SENTENCE-DEBUG]', {
        raw_length: rawText.length,
        capped_length: text.length,
        raw_text: rawText.substring(0, 150) + '...',
        capped_text: text.substring(0, 150) + '...',
        successful: rawText.length > text.length
      });

      if (!text) {
        throw new Error('Group therapist response unavailable');
      }

      const responseMessageId =
        (globalThis as any)?.crypto?.randomUUID?.() ?? `msg_${Date.now()}`;

      const therapistMessage: TherapyMessage = {
        id: responseMessageId,
        session_id,
        speaker_id: session.therapist_userchar_id,  // Use user_character ID, not canonical ID
        speaker_name: session.therapist_name,
        speaker_type: 'therapist',
        message: text,
        timestamp: new Date(),
        message_type: 'question',
      };

      session.session_history.push(therapistMessage);
      return text;
    } catch (err) {
      console.warn('[group-therapy] sendViaAIChat failed:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Generate group patient response - HTTP path like individual therapy
   */

  async generateGroupPatientResponse(
    session_id: string,
    character_id: string,
    therapist_question: string
  ): Promise<string> {
    console.log('🎯 GROUP PATIENT START', { session_id, character_id });

    const session = this.active_sessions.get(session_id);
    if (!session || session.type !== 'group') {
      throw new Error(`Group session ${session_id} not found`);
    }

    // Ensure session has proper character context before proceeding
    await this.ensureGroupSessionCharacterContext(session, character_id);

    const messageId = `therapy_group_patient_${Date.now()}_${character_id}`;

    // Strict context check
    if (!session.context) {
      throw new Error('Session context missing');
    }

    // Use the EXACT same approach as individual therapy
    // agent_key needs canonical character_id (e.g. "kangaroo"), not userchar_id (UUID)
    const agent_key = session.context.character.character_id;

    // Build short, clean conversation history
    const messages = buildUnifiedTranscript(session);

    // Strict participant IDs
    const participant_idsToSend = session.participant_ids;

    try {
      const result = await sendViaAIChat(session_id, {
        agent_key,
        character: agent_key,
        message: '',                             // ✅ empty - server ignores for therapy
        messages,                                // ✅ provide cleaned history
        chat_type: 'group_therapy',
        topic: session.stage,
        userchar_id: session.context.character.id,
        therapist_id: session.therapist_id,
        therapist_userchar_id: session.therapist_userchar_id,
        participant_ids: participant_idsToSend,
        intensity_strategy: session.intensity_strategy
      });

      const rawText = (result?.text ?? '').trim();
      const text = this.enforceTwoSentenceCap(rawText);

      if (!text) {
        throw new Error('Group patient response unavailable');
      }

      // Get patient name from session context (set by ensureGroupSessionCharacterContext)
      const patient_name = session.context?.character?.name;
      if (!patient_name) {
        throw new Error('STRICT MODE: patient name not available in session context');
      }

      const patientMessage: TherapyMessage = {
        id: messageId,
        session_id,
        speaker_id: character_id,
        speaker_name: patient_name,
        speaker_type: 'contestant',
        message: text,
        timestamp: new Date(),
        message_type: 'response',
      };

      session.session_history.push(patientMessage);

      // Process therapy game mechanics
      await this.processGameMechanics(session_id, character_id, text, 'contestant');

      return text;
    } catch (err) {
      console.warn('[group-therapy-patient] sendViaAIChat failed:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Generate therapist intervention or follow-up question
   */
  async generateTherapistIntervention(
    session_id: string,
    intervention_type: 'question' | 'intervention' = 'question'
  ): Promise<string> {
    const session = this.active_sessions.get(session_id);
    if (!session) {
      throw new Error(`Session ${session_id} not found`);
    }

    // WebSocket connection check disabled - using HTTP-only mode
    // if (!this.socket?.connected) {
    //   throw new Error('Socket not connected to backend. Please refresh the page and try again.');
    // }

    return new Promise(async (resolve, reject) => {
      const messageId = `therapy_therapist_${Date.now()}_${session.therapist_id}`;

      // Ensure the session has a display name for the patient
      const character_id = session.participant_ids[0]; // Individual therapy has one participant

      console.log('🔍 DEBUG character extraction:', {
        session_id: session.id,
        participant_ids: session.participant_ids,
        character_id,
        session_context: session.context
      });

      // Extract character name from participant ID
      const fallbackFromId = (id: string) =>
        id?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      // Map common character IDs to proper names
      const character_nameMap: Record<string, string> = {
        'robin_hood': 'Robin Hood',
        'frankenstein_monster': 'Frankenstein\'s Monster',
        'sherlock_holmes': 'Sherlock Holmes',
        'achilles': 'Achilles',
        'holmes': 'Sherlock Holmes'
      };
      const display_name = character_nameMap[character_id] ||
        session.context?.character?.name ||
        fallbackFromId(character_id);

      // Get character data
      try {
        const contextData = await this.conflictDb.getTherapyContextData(character_id);
        session.context = {
          ...contextData,
          ...(session.context || {}),
          character: contextData.character
        };
      } catch (e) {
        // If not found (e.g. first load), try loading
        await this.conflictDb.loadCharacters();
        try {
          const contextData = await this.conflictDb.getTherapyContextData(character_id);
          session.context = {
            ...contextData,
            ...(session.context || {}),
            character: contextData.character
          };
        } catch (e) {
          throw new Error(`Failed to load character context for ${character_id} in therapist intervention`);
        }
      }

      // Build therapist intervention prompt
      let prompt = this.buildTherapistInterventionPrompt(session, intervention_type);

      // Hard validation for prompt placeholder replacement - no 'Patient' fallback
      const validatedDisplayName = this.mustGetDisplayName(session, 'therapist-intervention');
      prompt = prompt.replace(/\[Patient(?:'|'|)s Name\]/g, validatedDisplayName);

      // Use common chat API format for therapist
      const agent_key = resolveTherapistAgentKey(session.therapist_id);
      const requestData = {
        message: intervention_type === 'question' ? 'Ask therapeutic question' : 'Make therapeutic intervention',
        character: agent_key,
        character_data: {
          name: this.getTherapistName(session.therapist_id),
          agent_key: agent_key,
          personality: {
            traits: ['Professional', 'Insightful', 'Caring'],
            speech_style: 'Therapeutic and supportive',
            motivations: ['Healing', 'Growth', 'Understanding'],
            fears: ['Causing harm', 'Missing important signs']
          },
          bond_level: 5
        },
        // promptOverride: prompt, // DISABLED - let backend handle prompts
        session_type: 'therapy_therapist',
        session_id,
        messageId,
        intervention_type: intervention_type,
        session_stage: session.stage,
        previous_messages: buildUnifiedTranscript(session)
      };

      console.log('📤 Sending therapist intervention request:', {
        session_id,
        therapist_id: session.therapist_id,
        intervention_type: intervention_type,
        messageId
      });

      // Convert to HTTP Universal Chat Library (like other methods)
      try {
        const agent_key = mapTherapistToAgentKey(session.therapist_id);
        console.log('🔍 THERAPIST MAPPING:', { therapist_id: session.therapist_id, agent_key });

        // Build short, clean conversation history
        const messages = buildUnifiedTranscript(session);

        const instruction = intervention_type === 'question'
          ? 'Ask therapeutic question'
          : 'Make therapeutic intervention';

        const result = await sendViaAIChat(session_id, {
          agent_key,
          message: '',                 // ✅ empty - server ignores for therapy
          messages,                    // ✅ provide history
          chat_type: 'therapy',
          topic: session.stage ?? 'therapy',
          // Removed meta - backend fetches all data from DB directly
          userchar_id: session.context?.character?.id,
          therapist_id: agent_key
        });

        const rawText = result?.text ?? '';
        const text = this.enforceTwoSentenceCap(rawText);

        const therapistMessage: TherapyMessage = {
          id: messageId,
          session_id,
          speaker_id: session.therapist_userchar_id,  // Use user_character ID, not canonical ID
          speaker_name: session.therapist_name,
          speaker_type: 'therapist',
          message: text,
          timestamp: new Date(),
          message_type: 'intervention'
        };

        session.session_history.push(therapistMessage);
        if (!text) {
          throw new Error('AI returned empty therapist intervention');
        }
        resolve(text);
        return;
      } catch (err) {
        console.warn('[therapy] HTTP intervention failed:', err);
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

    });
  }



  /**
   * Build character-specific therapy prompt
   */
  private buildCharacterTherapyPrompt(session: TherapySession, character_id: string, trigger?: string): string {
    // Let backend unified persona system handle prompt generation
    // Just provide the context information
    const contextInfo = {
      session_type: session.type,
      character_id,
      therapist_id: session.therapist_id,
      session_stage: session.stage,
      trigger,
      context: session.context,
      participant_ids: session.participant_ids,
      group_dynamics: session.group_dynamics,
      session_history: session.session_history
    };

    return `Session context: ${JSON.stringify(contextInfo)}`;
  }

  /**
   * Build therapist intervention prompt
   */
  private buildTherapistInterventionPrompt(session: TherapySession, intervention_type: 'question' | 'intervention'): string {
    // Let backend unified persona system handle prompt generation
    const contextInfo = {
      therapist_id: session.therapist_id,
      session_type: session.type,
      session_stage: session.stage,
      session_history: session.session_history,
      intervention_type: intervention_type,
      therapy_context: session.context,
      group_dynamics: session.group_dynamics
    };

    return `Therapist intervention context: ${JSON.stringify(contextInfo)}`;
  }

  /**
   * Handle therapy responses from backend
   */
  private handleTherapyResponse(data: any) {
    const handler = this.messageHandlers.get(data.session_id);
    if (handler && data.message) {
      if (!data.speaker_name) {
        throw new Error(`STRICT MODE: Backend response missing speaker_name for session ${data.session_id}`);
      }
      const message: TherapyMessage = {
        id: data.messageId,
        session_id: data.session_id,
        speaker_id: data.speaker_id,
        speaker_name: data.speaker_name,
        speaker_type: data.speaker_type,
        message: data.message,
        timestamp: new Date(),
        message_type: data.message_type || 'response'
      };
      handler(message);
    }
  }

  /**
   * Subscribe to session messages
   */
  subscribeToSession(session_id: string, handler: (message: TherapyMessage) => void) {
    this.messageHandlers.set(session_id, handler);
  }

  /**
   * Unsubscribe from session messages
   */
  unsubscribeFromSession(session_id: string) {
    this.messageHandlers.delete(session_id);
  }

  /**
   * Get session by ID
   */
  getSession(session_id: string): TherapySession | undefined {
    return this.active_sessions.get(session_id);
  }

  /**
   * End therapy session
   */
  async endSession(session_id: string) {
    // Call backend to clear session state
    try {
      await fetch('/api/ai/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id })
      });
      console.log('🧹 [SESSION-CLEANUP] Cleared backend state for:', session_id);
    } catch (error) {
      console.error('🧹 [SESSION-CLEANUP] Failed to clear backend:', error);
    }

    this.active_sessions.delete(session_id);
    this.gameStates.delete(session_id);
    this.messageHandlers.delete(session_id);
    console.log('🧠 Therapy session ended:', session_id);
  }

  // Clean up all active sessions (for component unmount/mount cleanup)
  async endAllSessions() {
    const session_ids = Array.from(this.active_sessions.keys());
    await Promise.all(session_ids.map(session_id => this.endSession(session_id)));
    console.log('🧠 All therapy sessions ended:', session_ids.length);
  }

  /**
   * Advance session stage
   */
  advanceSessionStage(session_id: string): 'initial' | 'resistance' | 'breakthrough' {
    const session = this.active_sessions.get(session_id);
    if (!session) return 'initial';

    if (session.stage === 'initial') {
      session.stage = 'resistance';
    } else if (session.stage === 'resistance') {
      session.stage = 'breakthrough';
    }

    return session.stage;
  }

  /**
   * Get conversation history for session
   */
  getSessionHistory(session_id: string, limit: number = 20): TherapyMessage[] {
    const session = this.active_sessions.get(session_id);
    if (!session) return [];

    return session.session_history
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-limit);
  }

  /**
   * Wait for socket connection
   */
  async waitForConnection(timeout: number = 5000): Promise<boolean> {
    // WebSocket disabled - always return true for HTTP-only mode
    return true;
  }


  /**
   * Build group therapist prompt for dual API system
   */
  private buildGroupTherapistPrompt(session: TherapySession): string {
    if (session.type !== 'group') {
      throw new Error('buildGroupTherapistPrompt called on non-group session');
    }

    const is_openingQuestion = session.session_history.length <= 1; // Only therapist opening exists

    console.log('🎭 Group therapist prompt type:', is_openingQuestion ? 'OPENING' : 'FOLLOW-UP', 'history length:', session.session_history.length);
    console.log('🎭 Recent session history:', session.session_history.slice(-3).map(msg => `${msg.speaker_type}: ${msg.message.substring(0, 50)}...`));

    // Let backend unified persona system handle prompt generation
    const contextInfo = {
      therapist_id: session.therapist_id,
      session_type: 'group',
      session_stage: session.stage,
      session_history: session.session_history,
      is_openingQuestion,
      intervention_type: is_openingQuestion ? 'opening' : 'question',
      group_dynamics: session.group_dynamics
    };

    console.log(is_openingQuestion ? '🎭 Using OPENING question context for group therapist' : '🎭 Using FOLLOW-UP intervention context for group therapist');
    return `Group therapy context: ${JSON.stringify(contextInfo)}`;
  }

  /**
   * NO MORE FRONTEND PROMPT BUILDING - Just return minimal context for backend
   */
  private async buildGroupPatientPrompt(session: TherapySession, character_id: string, therapist_question: string): Promise<string> {
    if (session.type !== 'group') {
      throw new Error('buildGroupPatientPrompt called on non-group session');
    }

    console.log('🔄 Frontend will send minimal data - backend handles all prompt assembly');

    // Return simple marker - the actual API call will send minimal data to backend
    return `[GROUP_THERAPY_BACKEND_ASSEMBLY:${character_id}]`;
  }

  // Ensure group session has character context (id, character_id, name)
  private async ensureGroupSessionCharacterContext(
    session: TherapySession,
    character_id: string
  ): Promise<void> {
    // Check if context is already for THIS specific character (not just any character)
    const currentCharId = session.context?.character?.id;
    if (currentCharId === character_id) return;

    // Get character data
    try {
      const contextData = await this.conflictDb.getTherapyContextData(character_id);
      session.context = {
        ...contextData,
        ...(session.context || {}),
        character: contextData.character
      };
      return;
    } catch (e) {
      // If not found (e.g. first load), try loading
      await this.conflictDb.loadCharacters();
      try {
        const contextData = await this.conflictDb.getTherapyContextData(character_id);
        session.context = {
          ...contextData,
          ...(session.context || {}),
          character: contextData.character
        };
        return;
      } catch (e2) {
        console.warn(`Failed to load context for ${character_id}`, e2);
      }
    }

    // STRICT MODE: No fallbacks - throw if we can't load the character
    throw new Error(`Failed to load character context for ${character_id} in group session`);
  }




  // Map character display names to agent keys (must match backend persona names)
  private nameToAgentKey(name?: string): string | null {
    if (!name) return null;
    const key = name.trim().toLowerCase();
    const map: Record<string, string> = {
      "frankenstein's monster": "frankenstein_monster",
      "frankensteins monster": "frankenstein_monster",  // handle missing apostrophe
      "robin hood": "robin_hood",
      "sherlock holmes": "holmes",  // backend expects 'holmes', not 'sherlock_holmes'
      "joan of arc": "joan",
      "agent x": "agent_x",
      "fenrir": "fenrir",
      "rilak-trelkar": "rilak_trelkar",
      "rilak trelkar": "rilak_trelkar",
      "rilak": "rilak_trelkar",
      "alien grey": "rilak_trelkar",
      "achilles": "achilles",
      "billy the kid": "billy_the_kid",
      "genghis khan": "genghis_khan",
      "sun wukong": "sun_wukong",
      "space cyborg": "space_cyborg",
      "sam spade": "sam_spade",
      "nikola tesla": "tesla",
      "cleopatra": "cleopatra",
      "count dracula": "dracula",
      "merlin": "merlin"
    };
    return map[key] ?? null;
  }

  // Pull the most recent therapist "question" message from history
  private getLastTherapistQuestion(session: TherapySession): string {
    const msgs = [...session.session_history].reverse();
    const q = msgs.find(m =>
      m.speaker_type === 'therapist' &&
      m.message_type === 'question'
    );
    return (q?.message ?? '').trim();
  }

  // No sentence capping - trust prompt instructions per company policy
  private enforceTwoSentenceCap(text: string): string {
    if (!text) return '';

    // Just clean up extra whitespace and return - no truncation
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Build therapist prompt for dual API system
   */
  private buildTherapistPrompt(session: TherapySession): string {
    const THERAPIST_STYLES: Record<string, any> = {
      'seraphina': { name: 'Fairy Godmother Seraphina', style: 'unified persona system' },
      'carl_jung': { name: 'Carl Jung', style: 'analytical and depth-oriented' },
      'freud': { name: 'Sigmund Freud', style: 'psychoanalytic and probing' }
    };

    // Normalize therapist ID for style lookup (hyphen -> underscore)
    const normalizedTherapistId = session.therapist_id.replace(/-/g, '_');
    const therapistInfo = THERAPIST_STYLES[normalizedTherapistId];
    if (!therapistInfo) {
      throw new Error(`Unknown therapist ID: ${session.therapist_id}. Valid IDs: ${Object.keys(THERAPIST_STYLES).join(', ')}`);
    }

    // Get conversation context from recent history using actual speaker names
    const recentHistory = buildUnifiedTranscript(session).map(msg =>
      `${msg.speaker_name}: ${msg.message}`
    ).join('\n');

    return `
THERAPY SESSION - THERAPIST ROLE

You are ${therapistInfo.name}, a skilled therapist conducting individual therapy. Your therapeutic style is ${therapistInfo.style}.

[FRONTEND_PROMPT_MARKER_2025]

PATIENT CONTEXT:
The patient is ${session.context?.character?.name}, a ${session.context?.character?.archetype} with a background as ${session.context?.character?.description}. They are dealing with conflicts related to living in shared quarters with other characters. They have ongoing disputes about kitchen duties, sleeping arrangements, and general roommate tensions.

CHARACTER BACKGROUND: Use terminology and references appropriate to their historical/fictional context.

RECENT CONVERSATION:
${recentHistory}

SESSION STAGE: ${session.stage}

THERAPEUTIC OBJECTIVES:
1. Ask one thoughtful, therapeutic question
2. Focus on helping the patient explore their conflicts and emotions
3. Use your ${therapistInfo.style} therapeutic approach
4. Guide the patient toward self-discovery and healing
5. Create a safe space for vulnerability

[THERAPIST_PROMPT]

RESPONSE REQUIREMENTS:
- Address them directly by name (e.g., "${this.mustGetDisplayName(session, 'prompt-template')}") - not "Patient [Name]"
- Use terminology specific to their character background and archetype
- Ask exactly one therapeutic question about their conflicts/feelings
- Keep response to maximum 2 sentences. End after asking your question.
- Use ${therapistInfo.style} tone; be direct and compassionate.
${recentHistory ?
        '- Build on the previous conversation context.' :
        '- This is the opening question—ask what brings them to therapy, in your style.'
      }

Remember: You are the THERAPIST asking questions, not the patient sharing problems.
    `.trim();
  }

  /**
   * NO MORE FRONTEND PROMPT BUILDING - Just return minimal context for backend
   */
  private async buildPatientPrompt(session: TherapySession, character_id: string, therapist_question: string): Promise<string> {
    console.log('🔄 Frontend will send minimal data - backend handles all prompt assembly');

    // Return simple marker - the actual API call will send minimal data to backend
    return `[INDIVIDUAL_THERAPY_BACKEND_ASSEMBLY:${character_id}]`;
  }

  /**
   * Get therapist display name
   */
  private getTherapistName(therapist_id: string): string {
    const names: Record<string, string> = {
      'seraphina': 'Fairy Godmother Seraphina',
      'carl-jung': 'Carl Jung',
      'carl_jung': 'Carl Jung',
      'zxk14bw7': 'Zxk14bW^7',
      'freud': 'Sigmund Freud'
    };

    const name = names[therapist_id];
    if (!name) {
      throw new Error(`Unknown therapist ID: ${therapist_id}. Valid IDs: ${Object.keys(names).join(', ')}`);
    }
    return name;
  }

  /**
   * Process therapy game mechanics for a message
   */
  private async processGameMechanics(
    session_id: string,
    character_id: string,
    message: string,
    speaker_type: 'contestant' | 'therapist'
  ): Promise<void> {
    console.log(`🎮 [GAME-MECHANICS] Processing ${speaker_type} message for session ${session_id}`);

    const game_state = this.gameStates.get(session_id);
    if (!game_state) {
      console.warn(`No game state found for session ${session_id}`);
      return;
    }

    console.log(`🎮 [GAME-MECHANICS] Current rounds: ${game_state.rounds_completed}`);
  }

  private async queueJudgeEvaluation(session_id: string, rounds_completed: number) {
    const session = this.active_sessions.get(session_id);
    if (!session) {
      console.warn(`Session ${session_id} not found for judge evaluation`);
      return;
    }

    const character_id = session.participant_ids[0]; // Primary participant

    // Build transcript slice for judges - participants (patients + therapist) × 3 rounds
    const participantCount = session.participant_ids.length + 1; // +1 for therapist
    const messageCount = participantCount * 3;
    const transcriptSlice = session.session_history.slice(-messageCount).map(msg => {
      if (!msg.speaker_name) {
        throw new Error(`STRICT MODE: Message missing speaker_name: ${JSON.stringify(msg)}`);
      }
      if (!msg.speaker_id) {
        throw new Error(`STRICT MODE: Message missing speaker_id: ${JSON.stringify(msg)}`);
      }
      return {
        message: msg.message,
        speaker_name: msg.speaker_name,
        speaker_id: msg.speaker_id
      };
    });

    const judges = ['eleanor_roosevelt', 'king_solomon', 'anubis'];

    const selectedJudge = judges[Math.floor(Math.random() * judges.length)];
    try {
      await sendViaAIChat(`${selectedJudge}_review_${session_id}`, {
        agent_key: selectedJudge,
        character: selectedJudge,
        message: `Evaluate therapy round ${rounds_completed}. Return scores + rationale.`,
        userchar_id: character_id,
        chat_type: 'therapy_evaluation',
        meta: { userchar_id: character_id, domain: 'evaluation', trace_id: `r${rounds_completed}:${selectedJudge}:${session_id}` },
        messages: transcriptSlice
      });
      console.log(`🎖️ ${selectedJudge} evaluation completed for round ${rounds_completed}`);
    } catch (err) {
      console.warn(`Judge evaluation failed for ${selectedJudge}:`, err);
      // Graceful degradation - continue with other judges, no socket avalanche
    }
  }

  private analyzeMessageInBackground(
    session_id: string,
    character_id: string,
    message: string,
    speaker_type: 'contestant' | 'therapist'
  ): void {
    // Re-enabled - Required for proper therapy game mechanics and judge state
    console.log(`🎮 [GAME-MECHANICS] Processing ${speaker_type} message for session ${session_id}`);

    // Get session for game state updates
    const session = this.active_sessions.get(session_id);
    if (!session) return;

    // Update rounds tracking
    if (!session.rounds) session.rounds = 0;

    // Apply therapy rewards through game system
    if (this.gameSystem) {
      try {
        this.gameSystem.applyTherapyRewards(character_id, [], session.therapist_id);
        console.log(`🎮 [GAME-MECHANICS] Current rounds: ${session.rounds}`);
      } catch (error) {
        console.warn(`🎮 [GAME-MECHANICS] Error applying rewards:`, error);
      }
    }
  }


  /**
   * Calculate optimal intensity strategy based on character traits
   */
  private calculateIntensityEffectiveness(
    character: any,
    intensity: 'soft' | 'medium' | 'hard'
  ): { effectiveness: number; reason: string } {
    // Base effectiveness
    let effectiveness = 50;
    let reasons: string[] = [];

    // Character archetype influences
    const archetype = character?.archetype?.toLowerCase() || '';

    // Warriors/tough types resist soft approach, respond to hard
    if (['warrior', 'soldier', 'spartan', 'viking', 'samurai'].some(t => archetype.includes(t))) {
      if (intensity === 'hard') {
        effectiveness += 30;
        reasons.push('Warriors respect direct confrontation');
      } else if (intensity === 'soft') {
        effectiveness -= 20;
        reasons.push('Warriors may see gentleness as weakness');
      }
    }

    // Mystics/intellectuals prefer medium approach
    if (['mystic', 'scholar', 'philosopher', 'scientist', 'detective'].some(t => archetype.includes(t))) {
      if (intensity === 'medium') {
        effectiveness += 25;
        reasons.push('Intellectuals appreciate balanced discourse');
      } else if (intensity === 'hard') {
        effectiveness -= 15;
        reasons.push('Aggressive approach triggers defensive intellectualization');
      }
    }

    // Healers/empaths respond to soft approach
    if (['healer', 'caregiver', 'diplomat', 'artist'].some(t => archetype.includes(t))) {
      if (intensity === 'soft') {
        effectiveness += 25;
        reasons.push('Gentle souls open up to compassion');
      } else if (intensity === 'hard') {
        effectiveness -= 30;
        reasons.push('Harsh approach causes emotional shutdown');
      }
    }

    // Tricksters need unpredictability - medium works best
    if (['trickster', 'rogue', 'thief', 'jester'].some(t => archetype.includes(t))) {
      if (intensity === 'medium') {
        effectiveness += 20;
        reasons.push('Balanced approach keeps tricksters engaged');
      }
    }

    // Species modifiers
    const species = character?.species?.toLowerCase() || '';
    if (species.includes('robot') || species.includes('ai') || species.includes('android')) {
      if (intensity === 'hard') {
        effectiveness += 15;
        reasons.push('Logical beings respond to direct data');
      }
    }

    if (species.includes('alien')) {
      if (intensity === 'medium') {
        effectiveness += 10;
        reasons.push('Unknown species require careful calibration');
      }
    }

    // Defensive stats influence
    const defensiveness = character?.psych_stats?.defensiveness || 50;
    if (defensiveness > 70) {
      if (intensity === 'soft') {
        effectiveness += 15;
        reasons.push('High defensiveness needs gentle approach');
      } else if (intensity === 'hard') {
        effectiveness -= 25;
        reasons.push('Confrontation increases already high defenses');
      }
    } else if (defensiveness < 30) {
      if (intensity === 'hard') {
        effectiveness += 10;
        reasons.push('Low defenses can handle direct approach');
      }
    }

    // Gameplan adherence affects response to structure
    const gameplan_adherence = character?.psych_stats?.gameplan_adherence || 50;
    if (gameplan_adherence > 70) {
      if (intensity === 'medium' || intensity === 'hard') {
        effectiveness += 15;
        reasons.push('Disciplined characters respond to structured approach');
      }
    } else if (gameplan_adherence < 30) {
      if (intensity === 'soft') {
        effectiveness += 10;
        reasons.push('Chaotic characters need flexibility');
      }
    }

    // Cap effectiveness between 10-100
    effectiveness = Math.max(10, Math.min(100, effectiveness));

    return {
      effectiveness,
      reason: reasons.join('. ') || 'Standard therapeutic approach'
    };
  }

  /**
   * Have therapist announce the celebrity judge's arrival
   * Uses session.therapist_name and passed judge_name - no hardcoded names
   */
  private async announceJudgeArrival(
    session_id: string,
    session: TherapySession,
    judge_name: string
  ): Promise<void> {
    // Validate required data
    if (!judge_name) {
      throw new Error('STRICT MODE: judge_name is required for announceJudgeArrival');
    }
    if (!session.therapist_name) {
      throw new Error('STRICT MODE: session.therapist_name is required for announceJudgeArrival');
    }
    if (!session.therapist_userchar_id) {
      throw new Error('STRICT MODE: session.therapist_userchar_id is required for announceJudgeArrival');
    }

    // Create therapist's introduction prompt using actual names from data
    const introPrompt = `As ${session.therapist_name}, briefly introduce the celebrity judge who will now evaluate our therapy session.
The judge is ${judge_name}, our senior BlankWars mental health counselor.
Be excited and respectful. Use your own words and personality style.
Keep it to 1-2 sentences maximum.`;

    const result = await sendViaAIChat(`judge_intro_${session_id}`, {
      agent_key: session.therapist_id,
      message: introPrompt,
      chat_type: 'therapy'
    });

    if (!result.text) {
      throw new Error('STRICT MODE: sendViaAIChat returned no text for judge introduction');
    }

    const introMessage: TherapyMessage = {
      id: `judge_intro_${Date.now()}`,
      session_id,
      speaker_id: session.therapist_userchar_id,
      speaker_name: session.therapist_name,
      speaker_type: 'therapist',
      message: result.text,
      timestamp: new Date(),
      message_type: 'intervention'
    };

    session.session_history.push(introMessage);

    // Notify handlers
    const handler = this.messageHandlers.get(session_id);
    if (!handler) {
      throw new Error(`STRICT MODE: No message handler registered for session ${session_id}`);
    }
    handler(introMessage);
  }

  /**
   * Public function to trigger judge review with random judge selection
   */
  async triggerJudgeReview(session_id: string, session: TherapySession): Promise<void> {
    console.log(`🧑‍⚖️ Triggering judge review directly for session ${session_id}`);

    // Fetch judges from database - no hardcoded IDs
    const judges = await characterAPI.get_system_characters('judge');
    if (!judges || judges.length === 0) {
      throw new Error('STRICT MODE: No judges found in database');
    }

    const selectedJudge = judges[Math.floor(Math.random() * judges.length)];
    if (!selectedJudge.id || !selectedJudge.name) {
      throw new Error(`STRICT MODE: Judge missing required fields: ${JSON.stringify(selectedJudge)}`);
    }

    console.log(`🎖️ Selected judge: ${selectedJudge.name} (userchar_id: ${selectedJudge.id})`);
    await this.triggerJudgeReviewPrivate(session_id, session, selectedJudge.id, selectedJudge.name, selectedJudge.character_id);
  }

  /**
   * Trigger celebrity judge's session review after 3 rounds
   * Uses backend modular prompt system - no hardcoded prompts or name mappings
   * Handles both individual (single patient) and group (multiple patients) therapy
   */
  private async triggerJudgeReviewPrivate(
    session_id: string,
    session: TherapySession,
    judge_userchar_id: string,
    judge_name: string,
    judge_canonical_id: string
  ): Promise<void> {
    // Validate required parameters
    if (!judge_userchar_id) {
      throw new Error('STRICT MODE: judge_userchar_id is required');
    }
    if (!judge_name) {
      throw new Error('STRICT MODE: judge_name is required');
    }
    if (!judge_canonical_id) {
      throw new Error('STRICT MODE: judge_canonical_id is required');
    }

    // Get intensity from session
    const intensity = session.intensity_strategy;
    if (!intensity) {
      throw new Error('STRICT MODE: session.intensity_strategy is required for judge evaluation');
    }

    // Build transcript from session history using speaker attribution
    const transcript = session.session_history.map(msg => {
      if (!msg.speaker_name) {
        throw new Error(`STRICT MODE: Message missing speaker_name: ${JSON.stringify(msg)}`);
      }
      if (!msg.speaker_id) {
        throw new Error(`STRICT MODE: Message missing speaker_id: ${JSON.stringify(msg)}`);
      }
      return {
        message: msg.message,
        speaker_name: msg.speaker_name,
        speaker_id: msg.speaker_id
      };
    });

    if (transcript.length === 0) {
      throw new Error('STRICT MODE: Session has no messages to evaluate');
    }

    console.log(`🎖️ Sending session to ${judge_name} for evaluation via backend...`);

    // Determine if this is group therapy with multiple patients
    const isGroupTherapy = session.type === 'group' && session.participant_ids.length >= 2;

    if (isGroupTherapy) {
      // GROUP THERAPY: Use batch endpoint with multiple patients
      // Extract unique patients from transcript (exclude therapist)
      const therapist_id = session.therapist_userchar_id;
      const patientMap = new Map<string, string>(); // id -> name

      for (const msg of transcript) {
        if (msg.speaker_id !== therapist_id) {
          patientMap.set(msg.speaker_id, msg.speaker_name);
        }
      }

      if (patientMap.size < 2) {
        throw new Error(`STRICT MODE: Group therapy requires at least 2 patients, found ${patientMap.size}`);
      }

      const patients = Array.from(patientMap.entries()).map(([id, name]) => ({
        patient_userchar_id: id,
        patient_name: name
      }));

      console.log(`🎖️ [GROUP] Evaluating ${patients.length} patients: ${patients.map(p => p.patient_name).join(', ')}`);

      const response = await apiClient.post('/ai/therapy-evaluation-batch', {
        judge_userchar_id,
        patients,
        chat_type: 'therapy_evaluation_batch',
        transcript,
        intensity
      });

      if (!response.data) {
        throw new Error('STRICT MODE: Backend returned no data');
      }
      if (!response.data.ok) {
        throw new Error(`STRICT MODE: Backend returned error: ${JSON.stringify(response.data)}`);
      }
      if (!response.data.evaluations || !Array.isArray(response.data.evaluations)) {
        throw new Error('STRICT MODE: Backend returned no evaluations array');
      }

      // Process batch evaluations
      for (const evaluation of response.data.evaluations) {
        console.log(`🎖️ ${judge_name} gave ${evaluation.patient_name} a ${evaluation.choice}: ${evaluation.critique}`);

        // Create judge message for each patient
        const judgeMessage: TherapyMessage = {
          id: `judge_eval_${Date.now()}_${evaluation.patient_id}`,
          session_id: session_id,
          message: `[To ${evaluation.patient_name}] Grade: ${evaluation.choice}\n\n${evaluation.critique}`,
          speaker_id: judge_userchar_id,
          speaker_name: judge_name,
          speaker_type: 'judge',
          message_type: 'response',
          timestamp: new Date()
        };

        // Notify message handler
        const handler = this.messageHandlers.get(session_id);
        if (handler) {
          handler(judgeMessage);
        }
      }

      console.log(`🎖️ ${judge_name} group evaluation complete!`);
      return;
    }

    // INDIVIDUAL THERAPY: Use single-patient endpoint
    const patient_userchar_id = session.participant_ids[0];
    if (!patient_userchar_id) {
      throw new Error('STRICT MODE: No patient found in session.participant_ids');
    }

    const response = await apiClient.post('/ai/therapy-evaluation', {
      judge_userchar_id,
      patient_userchar_id,
      chat_type: 'therapy_evaluation',
      transcript,
      intensity,
      session_type: session.type
    });

    if (!response.data) {
      throw new Error('STRICT MODE: Backend returned no data');
    }
    if (!response.data.ok) {
      throw new Error(`STRICT MODE: Backend returned error: ${JSON.stringify(response.data)}`);
    }
    if (!response.data.evaluation) {
      throw new Error('STRICT MODE: Backend returned no evaluation');
    }

    const evaluation = response.data.evaluation;
    console.log(`🎖️ ${judge_name}'s evaluation:`, evaluation);

    // Build stat changes display from backend response
    const statsDisplay = evaluation.stats_applied && evaluation.stats_applied.length > 0
      ? evaluation.stats_applied.map((s: { stat: string; change: number }) =>
        `• ${s.stat}: ${s.change > 0 ? '+' : ''}${s.change}`
      ).join('\n')
      : '• No stat changes';

    // Create judge's review message (matching group therapy format)
    const judgeMessage: TherapyMessage = {
      id: `judge_eval_${Date.now()}_${evaluation.patient_id}`,
      session_id,
      speaker_id: judge_userchar_id,
      speaker_name: judge_name,
      speaker_type: 'judge',
      message: `📋 **Session Review by ${judge_name}**\n\n**Grade: ${evaluation.choice}**\n\n${evaluation.critique}\n\n**Stat Changes:**\n${statsDisplay}`,
      timestamp: new Date(),
      message_type: 'response'
    };

    // Stats are now applied by backend - no need for frontend to do it

    // Notify message handlers about judge's review
    const handler = this.messageHandlers.get(session_id);
    if (!handler) {
      throw new Error(`STRICT MODE: No message handler registered for session ${session_id}`);
    }
    handler(judgeMessage);

    console.log(`🎖️ ${judge_name} evaluation complete!`, { choice: evaluation.choice, stats_applied: evaluation.stats_applied });
  }

  /**
   * Analyze message content for therapeutic elements
   */
  private async analyzeMessageContent(message: string, character_id: string): Promise<{
    emotional_depth: number;
    vulnerability_level: number;
    insight_quality: number;
    defensive_patterns: number;
    empathy_shown: number;
  }> {
    // Use AI for sophisticated therapeutic message analysis - NO FALLBACKS
    const analysisPrompt = `Analyze this therapy patient message for therapeutic progress. 

Message: "${message}"

Rate each dimension from 1-10:

EMOTIONAL_DEPTH (1-10): How emotionally engaged and expressive is this message?
- 1-3: Flat, clinical, no emotional language
- 4-6: Some emotional content but surface level  
- 7-8: Rich emotional expression, shares feelings
- 9-10: Deep, profound emotional vulnerability

VULNERABILITY_LEVEL (1-10): How personally revealing and open is this message?
- 1-3: Generic statements, no personal disclosure
- 4-6: Some personal details but guarded
- 7-8: Genuine openness about struggles/fears
- 9-10: Raw, unguarded personal revelation

INSIGHT_QUALITY (1-10): How much self-awareness and understanding is shown?
- 1-3: No recognition of patterns or understanding
- 4-6: Basic awareness but shallow insights
- 7-8: Clear understanding of personal patterns
- 9-10: Deep psychological insights and connections

DEFENSIVE_PATTERNS (1-10): How much resistance/avoidance is present?
- 1-3: Open, receptive, no defensive behaviors
- 4-6: Mild deflection or qualification
- 7-8: Clear defensiveness, changing topics, minimizing
- 9-10: Strong resistance, denial, shutting down

EMPATHY_SHOWN (1-10): How much understanding of therapist/others is demonstrated?
- 1-3: Self-focused, no acknowledgment of others
- 4-6: Basic politeness but limited empathy
- 7-8: Clear understanding and appreciation of others
- 9-10: Deep empathic connection and gratitude

Respond with ONLY this JSON format:
{"emotional_depth": X, "vulnerability_level": Y, "insight_quality": Z, "defensive_patterns": W, "empathy_shown": V}`;

    console.log('🎯 Sending message to AI for therapy analysis:', message.slice(0, 50) + '...');

    // Create unique session ID for this analysis call
    const session_id = `therapy_analysis_${Date.now()}_${character_id}`;

    // Randomly select a judge for analysis (since analyzer was collapsed into judges)
    const judges = ['eleanor_roosevelt', 'king_solomon', 'anubis'];
    const selectedJudge = judges[Math.floor(Math.random() * judges.length)];

    // Send to AI for analysis using explicit role system
    const result = await sendViaAIChat(session_id, {
      role: 'judge', // Always explicit judge role
      agent_key: selectedJudge, // WHO is speaking (the judge)
      character_id: character_id, // WHO is being evaluated (the patient)
      userchar_id: character_id, // WHICH DB row to update with awards
      message: analysisPrompt,
      chat_type: 'therapy_analysis', // Routes to therapy domain
      chat_id: session_id // Required by backend routing
      // No therapist_id needed - analyzers work independently
    });

    console.log('🎯 Raw AI analysis response:', result.text);

    // Parse AI response - fail fast if it doesn't work
    const aiResponse = result.text.trim();
    const jsonMatch = aiResponse.match(/\{[^}]+\}/);

    if (!jsonMatch) {
      throw new Error(`AI analysis failed - no JSON found in response: ${aiResponse}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields exist
    const required_fields = ['emotional_depth', 'vulnerability_level', 'insight_quality', 'defensive_patterns', 'empathy_shown'];
    for (const field of required_fields) {
      if (parsed[field] === undefined) {
        throw new Error(`AI analysis missing required field: ${field}`);
      }
    }

    // Validate and clamp values
    const analysis = {
      emotional_depth: Math.max(1, Math.min(10, Math.round(parsed.emotional_depth))),
      vulnerability_level: Math.max(1, Math.min(10, Math.round(parsed.vulnerability_level))),
      insight_quality: Math.max(1, Math.min(10, Math.round(parsed.insight_quality))),
      defensive_patterns: Math.max(1, Math.min(10, Math.round(parsed.defensive_patterns))),
      empathy_shown: Math.max(1, Math.min(10, Math.round(parsed.empathy_shown)))
    };

    console.log('🎯 AI Therapy Analysis Complete:', { message: message.slice(0, 50) + '...', analysis });
    return analysis;
  }

  /**
   * Get the current game state for a therapy session
   */
  getGameState(session_id: string): TherapyGameState | null {
    return this.gameStates.get(session_id) || null;
  }

  /**
   * Get therapy session summary with game elements
   */
  getTherapySessionSummary(session_id: string) {
    const game_state = this.gameStates.get(session_id);
    if (!game_state) {
      return null;
    }
    return this.gameSystem.generateSessionSummary(game_state);
  }

  /**
   * Clean up session resources
   */

  disconnect() {
    this.socket?.disconnect();
  }
}

// Export singleton instance
export const therapyChatService = new TherapyChatService();
