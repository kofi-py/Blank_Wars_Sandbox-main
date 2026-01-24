import { io, Socket } from 'socket.io-client';
import { ConflictData, TherapyContext, TherapistPromptStyle } from '@/services/ConflictDatabaseService';
import ConflictDatabaseService from '../services/ConflictDatabaseService';
// TherapyPromptTemplateService removed - using backend unified persona system
import GameEventBus from '../services/gameEventBus';
import EventContextService from '../services/eventContextService';
import { sendViaAIChat } from '../services/chatAdapter';
import apiClient from '../services/apiClient';
import { resolveTherapistAgentKey, mapTherapistToAgentKey } from './therapyAgentResolver';
import { ensureRosterReady, enrichCharacter, getCharacterById } from '../lib/chat/context';
import { mustResolveAgentKey, nameToAgentKey } from '../lib/chat/agentKeys';
import TherapyGameSystem, { type TherapyGameState } from '../services/therapyGameSystem';

// Feature flag for quick rollback
const USE_HTTP_FOR_INDIVIDUAL_PATIENT = true; // flip to false to revert quickly

// Helper function to build consistent therapy meta objects
function buildTherapyMeta(opts: {
  domain?: 'therapy';
  role?: 'patient' | 'therapist';
  usercharId?: string;
  characterDisplayName?: string;
  characterIdCanonical?: string;
}) {
  return {
    domain: 'therapy' as const,
    role: opts.role, // Include role for the custom humor system
    usercharId: opts.usercharId,
    characterDisplayName: opts.characterDisplayName,
    characterIdCanonical: opts.characterIdCanonical,
  };
}

// Normalize various HTTP response shapes into a string
function extractAIText(res: any): string {
  if (typeof res === 'string') return res;
  return (
    res?.message ??
    res?.text ??
    res?.reply ??
    res?.data?.message ??
    res?.choices?.[0]?.message?.content ??
    ''
  );
}

interface TherapySession {
  id: string;
  type: 'individual' | 'group';
  therapistId: string;
  participantIds: string[];
  stage: 'initial' | 'resistance' | 'breakthrough';
  sessionHistory: TherapyMessage[];
  startTime: Date;
  context?: TherapyContext;
  groupDynamics?: string[];
}

interface TherapyMessage {
  id: string;
  sessionId: string;
  speakerId: string; // character ID or therapist ID
  speakerType: 'character' | 'therapist';
  message: string;
  timestamp: Date;
  messageType: 'response' | 'question' | 'intervention';
}

interface IndividualTherapyContext {
  character: Character;
  therapistId: string;
  therapyContext: TherapyContext;
  sessionStage: 'initial' | 'resistance' | 'breakthrough';
  previousMessages?: TherapyMessage[];
}

interface GroupTherapyContext {
  characters: Character[];
  therapistId: string;
  groupDynamics: string[];
  sessionStage: 'initial' | 'resistance' | 'breakthrough';
  previousMessages?: TherapyMessage[];
}

export class TherapyChatService {
  private socket: Socket | null = null;
  private activeSessions: Map<string, TherapySession> = new Map();
  private messageHandlers: Map<string, (message: TherapyMessage) => void> = new Map();
  private gameSystem = TherapyGameSystem.getInstance();
  private gameStates = new Map<string, TherapyGameState>();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    let socketUrl: string;

    if (process.env.NODE_ENV === 'production') {
      socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://blank-wars-backend.railway.app';
    } else {
      socketUrl = 'http://localhost:4000';
    }

    console.log('🧠 Therapy Chat Service initializing with URL:', socketUrl);

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('✅ Therapy Chat Service connected to:', socketUrl, 'with ID:', this.socket?.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Therapy Chat Service connection error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 Therapy Chat Service disconnected:', reason);
    });

    this.socket.on('chat_response', (data) => {
      console.log('📥 Therapy session global response received:', {
        hasMessage: !!data.message,
        hasError: !!data.error
      });
      // Individual response handlers now handle their own responses
    });

    this.socket.on('chat_error', (error) => {
      console.error('❌ Therapy session error:', error);
    });
  }

  /**
   * Start an individual therapy session
   */
  async startIndividualSession(characterId: string, therapistId: string, selectedCharacter?: any): Promise<TherapySession> {
    const sessionId = `therapy_individual_${Date.now()}_${characterId}`;

    const session: TherapySession = {
      id: sessionId,
      type: 'individual',
      therapistId: therapistId,
      participantIds: [selectedCharacter?.id ?? characterId], // Use instance ID for roster lookup
      stage: 'initial',
      sessionHistory: [],
      startTime: new Date(),
      context: {
        character: {
          id: selectedCharacter?.id ?? null,                               // userchar_*
          character_id: selectedCharacter?.character_id ?? characterId,    // template code
          slug: selectedCharacter?.slug ?? selectedCharacter?.id ?? null,
          templateId: selectedCharacter?.templateId ?? null
        }
      }
    };

    this.activeSessions.set(sessionId, session);

    // Initialize therapy game state
    const gameState = this.gameSystem.initializeSession(
      selectedCharacter?.character_id ?? characterId,
      therapistId
    );
    this.gameStates.set(sessionId, gameState);

    // Publish therapy session start event
    const eventBus = GameEventBus.getInstance();
    await eventBus.publish({
      type: 'therapy_session_start',
      source: 'therapy_room',
      primaryCharacterId: characterId,
      severity: 'medium',
      category: 'therapy',
      description: `${characterId} started individual therapy session with ${therapistId}`,
      metadata: {
        sessionType: 'individual',
        therapistId,
        sessionStage: 'initial'
      },
      tags: ['therapy', 'individual', 'session_start']
    });

    // Generate opening question using real API (automatically adds to session history)
    await this.generateTherapistQuestion(sessionId);
    console.log('🧠 Individual therapy session started:', sessionId);

    return session;
  }

  /**
   * Start a group therapy session
   */
  async startGroupSession(context: GroupTherapyContext): Promise<TherapySession> {
    const sessionId = `therapy_group_${Date.now()}_${context.characters.map(c => c.id).join('_')}`;

    const session: TherapySession = {
      id: sessionId,
      type: 'group',
      therapistId: context.therapistId,
      participantIds: context.characters.map(c => c.id),
      stage: context.sessionStage,
      sessionHistory: [],
      startTime: new Date(),
      groupDynamics: context.groupDynamics
    };

    this.activeSessions.set(sessionId, session);

    // Generate therapist group opening question using the new dual API
    // Note: generateGroupTherapistQuestion already adds the message to session history
    await this.generateGroupTherapistQuestion(sessionId);
    console.log('🧠 Group therapy session started:', sessionId);

    return session;
  }

  /**
   * Generate therapist question in individual therapy (Step 1 of dual API)
   */
  async generateTherapistQuestion(sessionId: string): Promise<string> {
    console.log('🔍 INDIVIDUAL THERAPIST QUESTION CALLED');
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const messageId = `therapy_therapist_${Date.now()}_${session.therapistId}`;
    
    // Ensure the session has a display name for the patient
    const characterId = session.participantIds[0]; // Individual therapy has one participant
    
    console.log('🔍 DEBUG character extraction (first question):', {
      sessionId: session.id,
      participantIds: session.participantIds,
      characterId,
      sessionContext: session.context
    });
    
    // Ensure roster is ready and get character data
    await ensureRosterReady();
    
    // Pull everything we reasonably can see right now
    const rawCandidates = [
      characterId,
      session?.participantIds?.[0],
      session.context?.character?.character_id,
      session.context?.character?.slug,
      session.context?.character?.id,
      session.context?.character?.templateId,
      session.context?.character?.template_id,
      session.context?.character?.baseName,
      session.context?.character?.base_name,
    ].filter(Boolean) as string[];

    // Add a couple of safe slug variants to avoid trivial misses
    const normalize = (s: string) => s.trim().toLowerCase();
    const withVariants = new Set<string>();
    for (const v of rawCandidates) {
      const lower = normalize(v);
      withVariants.add(lower);
      withVariants.add(lower.replace(/['']/g, ''));   // <-- fix curly apostrophe
      withVariants.add(lower.replace(/\s+/g, '_'));
      // Optional hardening:
      // withVariants.add(lower.replace(/[_\s]+/g, '-'));
      // withVariants.add(lower.replace(/[-\s]+/g, '_'));
    }
    const candidateIds = Array.from(withVariants);
    
    console.log('[therapy] candidateIds for lookup:', candidateIds);
    console.log('[therapy] DEBUG rawCandidates:', rawCandidates);
    console.log('[therapy] DEBUG session participantIds:', session?.participantIds);
    
    let character;
    for (const id of candidateIds) {
      character = await getCharacterById(id);
      if (character) {
        console.log(`[therapy] Found character with ID: ${id}`);
        break;
      }
    }
    
    if (!character) {
      throw new Error(`[therapy] Character not found. Tried IDs: ${candidateIds.join(', ')}`);
    }
    
    const displayName = character.display_name || character.name;
    if (!displayName) {
      throw new Error(`[therapy] Character ${characterId} has no display name`);
    }

    console.log('🔍 DEBUG character name resolution (first question):', {
      characterId,
      character,
      finalDisplayName: displayName
    });

    // Ensure we have character context with ID for resolution
    // enrich context using normalized fields from context.ts
    session.context = {
      ...(session.context || {}),
      character: {
        ...(session.context?.character || {}),
        id: character.id,
        name: character.name,
        character_id: character.character_id ?? character.id,
        templateId: character.templateId,
        archetype: character.archetype,
      }
    };
    
    const therapistPrompt = this.buildTherapistPrompt(session);

    console.log('📤 Sending therapist question request:', {
      sessionId,
      therapistId: session.therapistId,
      messageId,
      promptLength: therapistPrompt.length
    });

    // Use normalized HTTP adapter instead of socket events
    try {
      // Map therapist ID to correct agentKey (therapists are system agents)
      function mapTherapistToAgentKey(therapistId: string): string {
        const therapistMap: Record<string, string> = {
          'zxk14bw7': 'alien_therapist',
          'carl-jung': 'carl_jung',
          'seraphina': 'seraphina'
        };
        return therapistMap[therapistId] || therapistId;
      }

      const agentKey = mapTherapistToAgentKey(session.therapistId);
      console.log('🔍 THERAPIST MAPPING:', { therapistId: session.therapistId, agentKey });
      
      // Build conversation history for memory system
      const messages = session.sessionHistory.slice(-4).map(msg => ({
        role: msg.speakerType === 'therapist' ? 'assistant' : 'user',
        content: msg.message
      }));
      console.log('[THERAPIST DEBUG] Session history length:', session.sessionHistory.length);
      console.log('[THERAPIST DEBUG] Messages being sent:', messages);

      const result = await sendViaAIChat(sessionId, {
        agentKey,
        message: therapistPrompt,
        messages: messages, // Include conversation history
        chatType: 'therapy',
        topic: session.stage ?? 'therapy',
        meta: buildTherapyMeta({
          role: 'therapist',
          characterDisplayName: session.therapistId,
          characterIdCanonical: agentKey,
        })
      });

      const rawText = result?.text ?? ''; // sendViaAIChat already normalizes via extractAIText
      const text = this.enforceTwoSentenceCap(rawText);
      const responseMessageId =
        (globalThis as any)?.crypto?.randomUUID?.() ?? `msg_${Date.now()}`;

      const therapistMessage: TherapyMessage = {
        id: responseMessageId,
        sessionId,
        speakerId: session.therapistId,
        speakerType: 'therapist',
        message: text || 'How are you feeling today?',
        timestamp: new Date(),
        messageType: 'question',
      };

      session.sessionHistory.push(therapistMessage);
      return text || 'Therapist response unavailable';
    } catch (err) {
      console.warn('[therapy] sendViaAIChat failed:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Generate patient response in individual therapy (Step 2 of dual API)
   */
  async generatePatientResponse(
    sessionId: string,
    characterId: string,
    therapistQuestion: string
  ): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!this.socket?.connected) {
      throw new Error('Socket not connected to backend. Please refresh the page and try again.');
    }

    return new Promise(async (resolve, reject) => {
      const messageId = `therapy_patient_${Date.now()}_${characterId}`;

      const patientPrompt = await this.buildPatientPrompt(session, characterId, therapistQuestion);

      // Use the shared helper for validation (from agentKeys.ts, not local)
      const resolvedKey = mustResolveAgentKey(
        session.context?.character?.name,
        session.context?.character?.character_id,
        'therapy-individual'
      );

      // Hard validation for display name - no 'Patient' fallback
      const displayName = this.mustGetDisplayName(session, 'therapy-individual');

      const requestData = {
        message: therapistQuestion,
        character: characterId,
        characterData: {
          name: displayName,  // No fallback - hard-validated above
          agent_key: resolvedKey,  // No archetype, no unknown - validated above
          personality: {
            traits: ['complex', 'conflicted'],
            speechStyle: 'Authentic to character background',
            motivations: ['Growth', 'Understanding'],
            fears: ['Vulnerability', 'Judgment']
          },
          bondLevel: 1
        },
        // promptOverride: patientPrompt, // DISABLED - let backend handle prompts
        sessionType: 'therapy_patient',
        sessionId,
        messageId,
        therapistId: session.therapistId,
        sessionStage: session.stage,
        previousMessages: session.sessionHistory.slice(-5).map(msg => ({
          role: msg.speakerType === 'character' ? 'assistant' : 'user',
          content: msg.message
        }))
      };

      console.log('📤 Sending patient response request:', {
        sessionId,
        characterId,
        messageId,
        promptLength: patientPrompt.length,
        therapistQuestion: therapistQuestion.substring(0, 50) + '...'
      });

      if (USE_HTTP_FOR_INDIVIDUAL_PATIENT) {
        // NEW — HTTP Universal Chat Library
        try {
          const patientMeta = buildTherapyMeta({
            role: 'patient',
            usercharId: session.context?.character?.id || characterId,
            characterDisplayName: session.context?.character?.name || characterId,
            characterIdCanonical: resolvedKey,
          });

          // Build conversation history for memory system
          const messages = session.sessionHistory.slice(-4).map(msg => ({
            role: msg.speakerType === 'character' ? 'assistant' : 'user',
            content: msg.message
          }));
          console.log('[PATIENT DEBUG] Session history length:', session.sessionHistory.length);
          console.log('[PATIENT DEBUG] Messages being sent:', messages);

          const result = await sendViaAIChat(sessionId, {
            agentKey: resolvedKey,
            message: patientPrompt,
            messages: messages, // Include conversation history
            chatType: 'therapy',
            topic: session.stage ?? 'therapy',
            meta: patientMeta,
          });

          const rawText = result?.text ?? 'I prefer not to discuss this.';
          const text = this.enforceTwoSentenceCap(rawText);

          const patientMessage: TherapyMessage = {
            id: messageId,
            sessionId,
            speakerId: characterId,
            speakerType: 'character',
            message: text,
            timestamp: new Date(),
            messageType: 'response'
          };

          session.sessionHistory.push(patientMessage);

          // Process therapy game mechanics
          await this.processGameMechanics(sessionId, characterId, text, 'character');

          // Analyze patient response for therapeutic events
          const responseText = text.toLowerCase();
          let eventType = 'therapy_session_progress';
          let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
          let emotionalIntensity = 5;

          if (responseText.includes('breakthrough') || responseText.includes('understand')) {
            eventType = 'therapy_breakthrough';
            severity = 'high';
            emotionalIntensity = 8;
          }

          // Publish therapeutic event
          GameEventBus.getInstance().publish({
            type: eventType as any, // Convert to EventType
            source: 'therapy_room',
            primaryCharacterId: characterId,
            severity,
            category: 'therapy',
            description: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            metadata: {
              sessionId,
              therapistId: session.therapistId,
              sessionStage: session.stage,
              responseLength: text.length,
              emotionalIntensity,
              breakthroughIndicator: eventType === 'therapy_breakthrough'
            },
            tags: ['therapy', 'individual', 'patient_response', eventType.replace('therapy_', '')]
          }).catch(error => console.error('Error publishing therapy event:', error));

          resolve(text);
          return; // Exit the Promise here
        } catch (error) {
          console.error('❌ HTTP patient response failed:', error);
          reject(error);
          return;
        }
      }
    });
  }


  /**
   * Generate group therapist question (Step 1 of dual API for group therapy)
   */
  async generateGroupTherapistQuestion(
    sessionId: string
  ): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.type !== 'group') {
      throw new Error(`Group session ${sessionId} not found`);
    }

    const messageId = `therapy_group_therapist_${Date.now()}_${session.therapistId}`;

    // Ensure the session has a display name for the patients
    const characterIds = session.participantIds;
    
    // Extract character name from first participant ID
    const fallbackFromId = (id: string) =>
      id?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Map common character IDs to proper names
    const characterNameMap: Record<string, string> = {
      'robin_hood': 'Robin Hood',
      'frankenstein_monster': 'Frankenstein\'s Monster', 
      'sherlock_holmes': 'Sherlock Holmes',
      'achilles': 'Achilles',
      'holmes': 'Sherlock Holmes'
    };

    const displayName = characterNameMap[characterIds[0]] || 
                       session.context?.character?.name ||
                       fallbackFromId(characterIds[0]);

    session.context = {
      ...(session.context || {}),
      character: { ...(session.context?.character || {}), name: displayName }
    };

    // Build group therapist prompt using template service
    let therapistPrompt = this.buildGroupTherapistPrompt(session);
    
    // Hard validation for prompt placeholder replacement - no 'Patient' fallback  
    const validatedDisplayName = this.mustGetDisplayName(session, 'group-therapist-prompt');
    therapistPrompt = therapistPrompt.replace(/\[Patient(?:'|'|)s Name\]/g, validatedDisplayName);
    
    // Ensure therapist prompt has brevity control
    if (!/\[THERAPY_ENHANCED_MIN\]/.test(therapistPrompt)) {
      therapistPrompt += '\n\n[THERAPY_ENHANCED_MIN]';
    }

    console.log('📤 Sending group therapist question request:', {
      sessionId,
      therapistId: session.therapistId,
      messageId,
      groupSize: session.participantIds.length,
      promptLength: therapistPrompt.length
    });

    // Use the EXACT same approach as individual therapy
    try {
      // Map therapist ID to correct agentKey (same as individual therapy)
      function mapTherapistToAgentKey(therapistId: string): string {
        const therapistMap: Record<string, string> = {
          'zxk14bw7': 'alien_therapist',
          'carl-jung': 'carl_jung',
          'seraphina': 'seraphina'
        };
        return therapistMap[therapistId] || therapistId;
      }

      const agentKey = mapTherapistToAgentKey(session.therapistId);
      console.log('🔍 THERAPIST MAPPING:', { therapistId: session.therapistId, agentKey });
      
      const result = await sendViaAIChat(sessionId, {
        agentKey,
        message: therapistPrompt,
        chatType: 'therapy',
        topic: session.stage ?? 'therapy',
        meta: buildTherapyMeta({
          role: 'therapist',
          characterDisplayName: session.therapistId,
          characterIdCanonical: agentKey,
        })
      });

      // Enforce 2-sentence cap for therapist responses
      const rawText = (result?.text ?? '').trim();
      const text = this.enforceTwoSentenceCap(rawText);
      
      console.warn('[THERAPIST-SENTENCE-DEBUG]', {
        rawLength: rawText.length,
        cappedLength: text.length,
        rawText: rawText.substring(0, 150) + '...',
        cappedText: text.substring(0, 150) + '...',
        successful: rawText.length > text.length
      });
      
      const responseMessageId =
        (globalThis as any)?.crypto?.randomUUID?.() ?? `msg_${Date.now()}`;

      const therapistMessage: TherapyMessage = {
        id: responseMessageId,
        sessionId,
        speakerId: session.therapistId,
        speakerType: 'therapist',
        message: text || 'Welcome to group therapy. Let\'s explore what\'s happening between you three.',
        timestamp: new Date(),
        messageType: 'question',
      };

      session.sessionHistory.push(therapistMessage);
      return text || 'Group therapist response unavailable';
    } catch (err) {
      console.warn('[group-therapy] sendViaAIChat failed:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Generate group patient response - HTTP path like individual therapy
   */
  async generateGroupPatientResponse(
    sessionId: string,
    characterId: string,
    therapistQuestion: string
  ): Promise<string> {
    console.log('🎯 GROUP PATIENT START', { sessionId, characterId });
    
    const session = this.activeSessions.get(sessionId);
    if (!session || session.type !== 'group') {
      throw new Error(`Group session ${sessionId} not found`);
    }

    // Ensure session has proper character context before proceeding
    await this.ensureGroupSessionCharacterContext(session, characterId);

    // Get therapist question from session history if not provided
    const questionToUse = therapistQuestion || this.getLastTherapistQuestion(session);
    
    // Build prompt (uses same system/contexts as individual therapy)
    let patientPrompt = await this.buildGroupPatientPrompt(session, characterId, questionToUse);
    if (!/\[THERAPY_ENHANCED_MIN\]/.test(patientPrompt)) {
      patientPrompt += '\n\n[THERAPY_ENHANCED_MIN]';
    }

    // Use the shared helper for validation (from agentKeys.ts, not local)
    const agentKey = mustResolveAgentKey(
      session.context?.character?.name,
      session.context?.character?.character_id,
      'group-therapy'
    );
    
    console.warn('[AGENT-KEY-DEBUG]', characterId, {
      character_id: session.context?.character?.character_id,
      name: session.context?.character?.name,
      nameMapping: this.nameToAgentKey(session.context?.character?.name),
      archetype: session.context?.character?.archetype, // For debugging only
      resolvedKey: agentKey
    });

    console.log('📤 Sending group patient response via HTTP:', {
      sessionId,
      characterId,
      agentKey,
      promptLength: patientPrompt.length
    });

    const result = await sendViaAIChat(sessionId, {
      agentKey,
      character: agentKey,  // belt-and-suspenders: ensures adapter can't miss it
      message: patientPrompt,
      chatType: 'therapy',
      topic: session.stage ?? 'therapy',
      meta: buildTherapyMeta({
        role: 'patient',
        usercharId: session.context?.character?.id || characterId,
        characterDisplayName: session.context?.character?.name || characterId,
        characterIdCanonical: agentKey,
      })
    });

    // Enforce 2-sentence cap without mid-sentence truncation
    const rawText = (result?.text ?? '').trim();
    const text = this.enforceTwoSentenceCap(rawText);
    
    console.warn('[RESPONSE-DEBUG]', characterId, {
      rawLength: rawText.length,
      cappedLength: text.length,
      rawText: rawText.substring(0, 100) + '...',
      cappedText: text.substring(0, 100) + '...'
    });

    const messageId = `therapy_group_patient_${Date.now()}_${characterId}`;
    const msg: TherapyMessage = {
      id: messageId,
      sessionId,
      speakerId: characterId,
      speakerType: 'character',
      message: text,
      timestamp: new Date(),
      messageType: 'response'
    };
    session.sessionHistory.push(msg);
    return text;
  }

  /**
   * Generate therapist intervention or follow-up question
   */
  async generateTherapistIntervention(
    sessionId: string,
    interventionType: 'question' | 'intervention' = 'question'
  ): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!this.socket?.connected) {
      throw new Error('Socket not connected to backend. Please refresh the page and try again.');
    }

    return new Promise(async (resolve, reject) => {
      const messageId = `therapy_therapist_${Date.now()}_${session.therapistId}`;

      // Ensure the session has a display name for the patient
      const characterId = session.participantIds[0]; // Individual therapy has one participant
      
      console.log('🔍 DEBUG character extraction:', {
        sessionId: session.id,
        participantIds: session.participantIds,
        characterId,
        sessionContext: session.context
      });
      
      // Extract character name from participant ID
      const fallbackFromId = (id: string) =>
        id?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      // Map common character IDs to proper names
      const characterNameMap: Record<string, string> = {
        'robin_hood': 'Robin Hood',
        'frankenstein_monster': 'Frankenstein\'s Monster', 
        'sherlock_holmes': 'Sherlock Holmes',
        'achilles': 'Achilles',
        'holmes': 'Sherlock Holmes'
      };

      const displayName = characterNameMap[characterId] || 
                         session.context?.character?.name ||
                         fallbackFromId(characterId);

      console.log('🔍 DEBUG character name resolution:', {
        characterId,
        mappedName: characterNameMap[characterId],
        contextName: session.context?.character?.name,
        fallbackName: fallbackFromId(characterId),
        finalDisplayName: displayName
      });

      session.context = {
        ...(session.context || {}),
        character: { ...(session.context?.character || {}), name: displayName }
      };

      // Build therapist intervention prompt
      let prompt = this.buildTherapistInterventionPrompt(session, interventionType);
      
      // Hard validation for prompt placeholder replacement - no 'Patient' fallback
      const validatedDisplayName = this.mustGetDisplayName(session, 'therapist-intervention');
      prompt = prompt.replace(/\[Patient(?:'|'|)s Name\]/g, validatedDisplayName);

      // Use common chat API format for therapist
      const agentKey = resolveTherapistAgentKey(session.therapistId);
      const requestData = {
        message: interventionType === 'question' ? 'Ask therapeutic question' : 'Make therapeutic intervention',
        character: agentKey,
        characterData: {
          name: this.getTherapistName(session.therapistId),
          agent_key: agentKey,
          personality: {
            traits: ['Professional', 'Insightful', 'Caring'],
            speechStyle: 'Therapeutic and supportive',
            motivations: ['Healing', 'Growth', 'Understanding'],
            fears: ['Causing harm', 'Missing important signs']
          },
          bondLevel: 5
        },
        // promptOverride: prompt, // DISABLED - let backend handle prompts
        sessionType: 'therapy_therapist',
        sessionId,
        messageId,
        interventionType,
        sessionStage: session.stage,
        previousMessages: session.sessionHistory.slice(-5).map(msg => ({
          role: msg.speakerType === 'therapist' ? 'assistant' : 'user',
          content: msg.message
        }))
      };

      console.log('📤 Sending therapist intervention request:', {
        sessionId,
        therapistId: session.therapistId,
        interventionType,
        messageId
      });

      // Convert to HTTP Universal Chat Library (like other methods)
      try {
        const agentKey = mapTherapistToAgentKey(session.therapistId);
      console.log('🔍 THERAPIST MAPPING:', { therapistId: session.therapistId, agentKey });
        
        const result = await sendViaAIChat(sessionId, {
          agentKey,
          message: prompt,
          chatType: 'therapy',
          topic: session.stage ?? 'therapy',
          meta: buildTherapyMeta({
            role: 'therapist',
            characterDisplayName: session.therapistId,
            characterIdCanonical: agentKey,
          })
        });

        const rawText = result?.text ?? '';
        const text = this.enforceTwoSentenceCap(rawText);

        const therapistMessage: TherapyMessage = {
          id: messageId,
          sessionId,
          speakerId: session.therapistId,
          speakerType: 'therapist',
          message: text,
          timestamp: new Date(),
          messageType: 'intervention'
        };

        session.sessionHistory.push(therapistMessage);
        resolve(text || 'Therapist intervention unavailable');
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
  private buildCharacterTherapyPrompt(session: TherapySession, characterId: string, trigger?: string): string {
    // Let backend unified persona system handle prompt generation
    // Just provide the context information
    const contextInfo = {
      sessionType: session.type,
      characterId,
      therapistId: session.therapistId,
      sessionStage: session.stage,
      trigger,
      context: session.context,
      participantIds: session.participantIds,
      groupDynamics: session.groupDynamics,
      sessionHistory: session.sessionHistory
    };
    
    return `Session context: ${JSON.stringify(contextInfo)}`;
  }

  /**
   * Build therapist intervention prompt
   */
  private buildTherapistInterventionPrompt(session: TherapySession, interventionType: 'question' | 'intervention'): string {
    // Let backend unified persona system handle prompt generation
    const contextInfo = {
      therapistId: session.therapistId,
      sessionType: session.type,
      sessionStage: session.stage,
      sessionHistory: session.sessionHistory,
      interventionType,
      therapyContext: session.context,
      groupDynamics: session.groupDynamics
    };
    
    return `Therapist intervention context: ${JSON.stringify(contextInfo)}`;
  }

  /**
   * Handle therapy responses from backend
   */
  private handleTherapyResponse(data: any) {
    const handler = this.messageHandlers.get(data.sessionId);
    if (handler && data.message) {
      const message: TherapyMessage = {
        id: data.messageId,
        sessionId: data.sessionId,
        speakerId: data.speakerId,
        speakerType: data.speakerType,
        message: data.message,
        timestamp: new Date(),
        messageType: data.messageType || 'response'
      };
      handler(message);
    }
  }

  /**
   * Subscribe to session messages
   */
  subscribeToSession(sessionId: string, handler: (message: TherapyMessage) => void) {
    this.messageHandlers.set(sessionId, handler);
  }

  /**
   * Unsubscribe from session messages
   */
  unsubscribeFromSession(sessionId: string) {
    this.messageHandlers.delete(sessionId);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TherapySession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * End therapy session
   */
  endSession(sessionId: string) {
    this.activeSessions.delete(sessionId);
    this.messageHandlers.delete(sessionId);
    console.log('🧠 Therapy session ended:', sessionId);
  }

  /**
   * Advance session stage
   */
  advanceSessionStage(sessionId: string): 'initial' | 'resistance' | 'breakthrough' {
    const session = this.activeSessions.get(sessionId);
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
  getSessionHistory(sessionId: string, limit: number = 20): TherapyMessage[] {
    const session = this.activeSessions.get(sessionId);
    if (!session) return [];

    return session.sessionHistory
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-limit);
  }

  /**
   * Wait for socket connection
   */
  async waitForConnection(timeout: number = 5000): Promise<boolean> {
    if (this.socket?.connected) {
      return true;
    }

    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = timeout / 100;

      const checkInterval = setInterval(() => {
        attempts++;

        if (this.socket?.connected) {
          clearInterval(checkInterval);
          resolve(true);
        }

        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }


  /**
   * Build group therapist prompt for dual API system
   */
  private buildGroupTherapistPrompt(session: TherapySession): string {
    if (session.type !== 'group') {
      throw new Error('buildGroupTherapistPrompt called on non-group session');
    }

    const isOpeningQuestion = session.sessionHistory.length <= 1; // Only therapist opening exists

    console.log('🎭 Group therapist prompt type:', isOpeningQuestion ? 'OPENING' : 'FOLLOW-UP', 'history length:', session.sessionHistory.length);
    console.log('🎭 Recent session history:', session.sessionHistory.slice(-3).map(msg => `${msg.speakerType}: ${msg.message.substring(0, 50)}...`));

    // Let backend unified persona system handle prompt generation
    const contextInfo = {
      therapistId: session.therapistId,
      sessionType: 'group',
      sessionStage: session.stage,
      sessionHistory: session.sessionHistory,
      isOpeningQuestion,
      interventionType: isOpeningQuestion ? 'opening' : 'question',
      groupDynamics: session.groupDynamics
    };
    
    console.log(isOpeningQuestion ? '🎭 Using OPENING question context for group therapist' : '🎭 Using FOLLOW-UP intervention context for group therapist');
    return `Group therapy context: ${JSON.stringify(contextInfo)}`;
  }

  /**
   * Build group patient prompt for dual API system
   */
  private async buildGroupPatientPrompt(session: TherapySession, characterId: string, therapistQuestion: string): Promise<string> {
    if (session.type !== 'group') {
      throw new Error('buildGroupPatientPrompt called on non-group session');
    }

    try {
      console.log('🏗️ Building group patient prompt for:', characterId, 'in group session');
      console.log('🏗️ Using therapist question:', therapistQuestion.substring(0, 100) + '...');

      // Helper to cap strings and get display names
      const cap = (s: string, n = 160) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');
      const nameFromId = (id: string) => {
        const map: Record<string, string> = {
          'robin_hood': 'Robin Hood',
          'frankenstein_monster': 'Frankenstein\'s Monster',
          'sherlock_holmes': 'Sherlock Holmes',
          'holmes': 'Sherlock Holmes',
          'achilles': 'Achilles',
          'billy_the_kid': 'Billy the Kid',
          'genghis_khan': 'Genghis Khan',
          'sun_wukong': 'Sun Wukong',
          'agent_x': 'Agent X',
          'zeta_reticulan': 'Zeta Reticulan',
          'zeta': 'Zeta Reticulan',
          'space_cyborg': 'Space Cyborg',
          'sammy_slugger': 'Sammy Slugger',
          'joan': 'Joan of Arc',
          'tesla': 'Nikola Tesla',
          'cleopatra': 'Cleopatra',
          'dracula': 'Count Dracula',
          'fenrir': 'Fenrir',
          'merlin': 'Merlin',
        };
        return map[id] || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      };

      // Use same approach as individual therapy - get therapy context directly
      const conflictService = ConflictDatabaseService.getInstance();
      
      // Get therapy context for this character (handles userchar_* IDs)
      const therapyContext = await conflictService.getTherapyContextForCharacter(characterId);
      console.log('🔍 Got therapy context for character:', characterId, 'conflicts:', therapyContext.activeConflicts.length);

      // Get other participants' contexts for group dynamics
      const otherParticipantIds = session.participantIds.filter(id => id !== characterId);
      const otherContexts = await Promise.all(
        otherParticipantIds.map(async id => {
          try {
            const ctx = await conflictService.getTherapyContextForCharacter(id);
            return { id, context: ctx };
          } catch (error) {
            console.warn(`Could not get context for participant ${id}:`, error);
            return null;
          }
        })
      ).then(results => results.filter(r => r !== null) as Array<{id: string, context: any}>);

      // Extract character names using the therapy context
      const characterName = nameFromId(therapyContext.character?.id || characterId);
      const otherParticipants = otherContexts.map(p => nameFromId(p.context.character?.id || p.id));

      // Generate base therapy prompt using the same system as individual therapy
      const basePrompt = conflictService.generateTherapyPrompt(
        therapyContext,
        session.therapistId,
        session.stage,
        { mode: 'group_therapy' }
      );

      // Add group context and therapist question
      const fullPrompt = `${basePrompt}

GROUP THERAPY CONTEXT:
You are in group therapy with ${otherParticipants.join(' and ')}. You all live together as roommates and are working through interpersonal conflicts with the help of a therapist.

RESPONSE REQUIREMENTS:
1. Answer as ${characterName} responding to the therapist's question
2. Acknowledge the group therapy setting and your roommates
3. Be authentic to your character background and personality
4. Keep response to 1-2 sentences maximum - be concise
5. Share personal struggles or conflicts with your roommates
6. DO NOT ask questions back to the therapist
7. Focus on YOUR perspective in this group setting

THERAPIST QUESTION: "${therapistQuestion}"

[THERAPY_ENHANCED_MIN]`;
      
      console.log('✅ Group patient prompt generated successfully, length:', fullPrompt.length);
      return fullPrompt;

    } catch (error) {
      console.error('❌ Error building group patient prompt:', error);
      // Fallback prompt if template service fails
      return `
You are ${characterId} in group therapy with ${session.participantIds.filter(id => id !== characterId).join(', ')}.

The therapist just asked the group: "${therapistQuestion}"

CRITICAL INSTRUCTIONS:
1. You are a PATIENT in group therapy, not the therapist
2. Respond to what the therapist just asked the GROUP
3. Express YOUR personal feelings about the group dynamics and conflicts
4. Do NOT ask questions or give advice to others
5. React authentically to the other group members and therapist
6. Keep your response 1-2 sentences, personal and character-authentic
7. This is YOUR therapy session - be vulnerable, defensive, or reactive as fits your character

RESPOND AS ${characterId} THE GROUP THERAPY PATIENT: Answer the therapist's question personally and authentically.
      `.trim();
    }
  }

  // Ensure group session has character context (id, character_id, name)
  private async ensureGroupSessionCharacterContext(
    session: TherapySession,
    characterId: string
  ): Promise<void> {
    const hasId = !!session.context?.character?.id;
    const hasTemplate = !!session.context?.character?.character_id;
    const hasName = !!session.context?.character?.name;
    if (hasId && hasTemplate && hasName) return;

    // Try ConflictDatabaseService cache first (already used elsewhere)
    try {
      const cds = ConflictDatabaseService.getInstance();
      // Always ensure characters are loaded, don't rely on cache
      let list = (cds as any).characters;
      if (!Array.isArray(list) || list.length === 0) {
        list = await (cds as any).loadCharacters?.();
      }
      
      console.warn('[CHARACTER-LOADING-DEBUG]', characterId, {
        listLength: Array.isArray(list) ? list.length : 'not array',
        characterIds: Array.isArray(list) ? list.map((c: any) => c?.id).slice(0, 5) : 'none',
        searchingFor: characterId
      });
      
      const u = Array.isArray(list) ? list.find((c: any) => c?.id === characterId) : null;
      
      console.warn('[CHARACTER-FOUND-DEBUG]', characterId, {
        found: !!u,
        character: u ? {
          id: u.id,
          name: u.name,
          display_name: u.display_name,
          character_id: u.character_id,
          templateId: u.templateId,
          template_id: u.template_id,
          archetype: u.archetype
        } : null
      });
      
      if (u) {
        session.context = {
          ...(session.context || {}),
          character: {
            ...(session.context?.character || {}),
            id: u.id ?? characterId,
            character_id: u.character_id ?? u.templateId ?? u.template_id ?? null,
            name:
              u.display_name ??
              u.name ??
              u.title ??
              u.slug ??
              session.context?.character?.name ??
              null,
            archetype: u.archetype ?? session.context?.character?.archetype ?? null,
          },
        };
        return;
      }
    } catch {}

    // Last resort: keep at least the id so downstream fallbacks can work
    session.context = {
      ...(session.context || {}),
      character: {
        ...(session.context?.character || {}),
        id: characterId,
        character_id: session.context?.character?.character_id ?? null,
        name: session.context?.character?.name ?? null,
        archetype: session.context?.character?.archetype ?? null,
      },
    };
  }


  // DRY helper: Get display name with hard validation - no 'Patient' fallbacks
  private mustGetDisplayName(session: TherapySession, contextTag: string): string {
    const name = session.context?.character?.name;
    if (!name) {
      throw new Error(`[${contextTag}] missing character.name in session.context`);
    }
    return name;
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
      "alien grey": "zeta_reticulan",
      "zeta reticulan": "zeta_reticulan",
      "achilles": "achilles",
      "billy the kid": "billy_the_kid",
      "genghis khan": "genghis_khan",
      "sun wukong": "sun_wukong",
      "space cyborg": "space_cyborg",
      "sammy slugger": "sammy_slugger",
      "nikola tesla": "tesla",
      "cleopatra": "cleopatra",
      "count dracula": "dracula",
      "merlin": "merlin"
    };
    return map[key] ?? null;
  }

  // Pull the most recent therapist "question" message from history
  private getLastTherapistQuestion(session: TherapySession): string {
    const msgs = [...session.sessionHistory].reverse();
    const q = msgs.find(m =>
      m.speakerType === 'therapist' &&
      (m.messageType === 'question' || m.messageType === 'therapist')
    );
    return (q?.message ?? '').trim();
  }

  // Enforce a max of two sentences without mid-sentence truncation
  private enforceTwoSentenceCap(text: string): string {
    if (!text) return '';
    
    // Clean up extra whitespace first
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    // More robust sentence splitting that handles quotes, parentheses, etc.
    // Match sentences ending with . ! ? followed by optional quotes/brackets and space
    const sentences = cleaned.match(/[^.!?]+[.!?](?:["'\)\]]*(?:\s+|$))/g) || [cleaned];
    
    // Take first two sentences
    const capped = sentences.slice(0, 2).join('').trim();
    
    console.warn('[SENTENCE-DEBUG]', { 
      original: text.length, 
      sentences: sentences.length, 
      capped: capped.length,
      firstTwo: sentences.slice(0, 2).map(s => s.substring(0, 50) + '...'),
      successful: capped.length < text.length
    });
    
    return capped || text; // Fallback to original if regex fails
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
    const normalizedTherapistId = session.therapistId.replace(/-/g, '_');
    const therapistInfo = THERAPIST_STYLES[normalizedTherapistId] || { name: 'Therapist', style: 'supportive' };

    // Get conversation context from recent history
    const recentHistory = session.sessionHistory.slice(-6).map(msg =>
      `${msg.speakerType === 'therapist' ? 'Therapist' : 'Patient'}: ${msg.message}`
    ).join('\n');

    return `
THERAPY SESSION - THERAPIST ROLE

You are ${therapistInfo.name}, a skilled therapist conducting individual therapy. Your therapeutic style is ${therapistInfo.style}.

[FRONTEND_PROMPT_MARKER_2025]

PATIENT CONTEXT:
The patient is ${session.context?.character?.name || 'a character'}, a ${session.context?.character?.archetype || 'character'} with a background as ${session.context?.character?.description || 'a fictional character'}. They are dealing with conflicts related to living in shared quarters with other characters. They have ongoing disputes about kitchen duties, sleeping arrangements, and general roommate tensions.

CHARACTER BACKGROUND: Use terminology and references appropriate to their historical/fictional context (e.g., for Robin Hood: "fellow," "justice," "band of merry men"; for Frankenstein's Monster: "creator," "humanity," "existence"; for Sherlock Holmes: "deduction," "observation," "cases").

RECENT CONVERSATION:
${recentHistory || 'Session just beginning'}

SESSION STAGE: ${session.stage || 'initial'}

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
   * Build patient prompt for dual API system
   */
  private async buildPatientPrompt(session: TherapySession, characterId: string, therapistQuestion: string): Promise<string> {
    try {
      console.log('🏗️ Building patient prompt for:', characterId, 'with question:', therapistQuestion.substring(0, 50) + '...');

      // Import character context from recent experiences
      const contextService = EventContextService.getInstance();
      const recentContext = await contextService.getPersonalProblemsContext(characterId);

      // Use ConflictDatabaseService for authentic patient prompts with real conflicts
      const conflictService = ConflictDatabaseService.getInstance();

      // Get therapy context for the character
      const therapyContext = await conflictService.getTherapyContextForCharacter(characterId);
      console.log('🔍 Got therapy context for character:', characterId, 'conflicts:', therapyContext.activeConflicts.length);

      // Generate the base patient prompt from ConflictDatabaseService
      const basePrompt = conflictService.generateTherapyPrompt(
        therapyContext,
        session.therapistId,
        session.stage,
        { mode: 'therapy' }
      );

      console.log('✅ Base prompt generated successfully, length:', basePrompt.length);

      // If basePrompt came from therapy mode, keep the enhanced layer minimal
      const isTherapyMode = basePrompt.includes('[THERAPY_MODE_BASE_PROMPT]');

      // Build recent context (limited for therapy mode)
      const limitedRecentContext = (recentContext || '')
        .split('\n')
        .slice(-2)
        .map(line => line.slice(0, 140))
        .join('\n');

      let enhancedPrompt: string;
      if (isTherapyMode) {
        // Do NOT add duplicate caps/rules/behavioral script in therapy mode
        enhancedPrompt = [
          basePrompt,
          limitedRecentContext ? `\nRECENT CONTEXT (last 2):\n${limitedRecentContext}` : '',
          `\nTherapist just asked: "${therapistQuestion}"`,
          '[THERAPY_ENHANCED_MIN]'
        ].join('').trim();
      } else {
        // Existing non-therapy behavior (unchanged)
        enhancedPrompt = `
${basePrompt}

RECENT EXPERIENCES AND EMOTIONAL STATE:
${recentContext}

CURRENT THERAPEUTIC EXCHANGE:
Therapist just asked you: "${therapistQuestion}"

RESPONSE REQUIREMENTS:
1. You are the PATIENT responding to this specific question
2. Answer as your character would, drawing from your real conflicts and experiences
3. Do NOT ask questions back to the therapist - you are receiving therapy, not giving it
4. Share personal struggles, conflicts with roommates, or emotional challenges
5. Show your character's personality while being vulnerable and authentic
6. CRITICAL: Maximum 2 sentences. Count your words carefully - stop at 40 words maximum. 
7. HARD CAP: Keep your reply ≤ 100 tokens. Stop once finished. Do not exceed this limit.
8. Focus on one specific conflict or feeling rather than multiple topics

IMPORTANT: When discussing conflicts, reference specific recent incidents by name and timing. Instead of saying 'eternal squabbles' or 'constant tension', mention actual events like 'this morning's bathroom schedule argument with Dracula and Merlin' or 'yesterday's kitchen cleanup dispute'. Be specific about what actually happened.

CRITICAL: Respond TO the therapist's question as a patient sharing personal information. Be brief but meaningful.
        `.trim();
      }

      // For debug
      if (process.env.AGI_DEBUG) {
        console.log('[PATIENT_PROMPT]', {
          therapyMode: isTherapyMode,
          chars: enhancedPrompt.length
        });
      }

      console.log('✅ Enhanced prompt completed, total length:', enhancedPrompt.length);
      return enhancedPrompt;

    } catch (error) {
      console.error('❌ Error building patient prompt:', error);
      // Fallback prompt if ConflictDatabaseService fails
      return `
You are ${characterId} in individual therapy. The therapist just asked: "${therapistQuestion}"

Respond as a patient sharing personal struggles and conflicts with your roommates. Be authentic to your character while being vulnerable in therapy.

CRITICAL: You are the PATIENT, not the therapist. Share your problems, don't ask questions.
      `.trim();
    }
  }

  /**
   * Get therapist display name
   */
  private getTherapistName(therapistId: string): string {
    const names: Record<string, string> = {
      'carl-jung': 'Carl Jung',
      'zxk14bw7': 'Zxk14bW^7',
      'seraphina': 'Fairy Godmother Seraphina'
    };
    return names[therapistId] || 'Therapist';
  }

  /**
   * Process therapy game mechanics for a message
   */
  private async processGameMechanics(
    sessionId: string,
    characterId: string,
    message: string,
    speakerType: 'character' | 'therapist'
  ): Promise<void> {
    const gameState = this.gameStates.get(sessionId);
    if (!gameState) {
      console.warn(`No game state found for session ${sessionId}`);
      return;
    }

    // Analyze message for therapeutic content
    const messageAnalysis = this.analyzeMessageContent(message);
    
    // Process the message through the game system
    const gameResult = this.gameSystem.processTherapyMessage(
      gameState,
      message,
      speakerType,
      messageAnalysis
    );

    // Update stored game state
    this.gameStates.set(sessionId, gameResult.updatedState);

    // Log achievements and progression for debugging
    if (gameResult.achievementsUnlocked.length > 0) {
      console.log('🏆 Therapy achievements unlocked:', gameResult.achievementsUnlocked.map(a => a.title));
    }

    if (gameResult.stageProgression) {
      console.log('📈 Therapy stage progression:', gameResult.stageProgression);
    }

    if (gameResult.pointsEarned.length > 0) {
      console.log('💎 Therapy points earned:', gameResult.pointsEarned);
    }

    // Map per-message points to canonical rewards
    const rewards = gameResult.pointsEarned.map(pe => {
      switch (pe.type) {
        case 'insight':       return { type: 'experience', value: pe.amount, description: pe.reason };
        case 'breakthrough':  return { type: 'mental_health', value: 10, description: pe.reason };
        case 'vulnerability': return { type: 'bond_level', value: Math.ceil(pe.amount / 5), description: pe.reason };
        case 'empathy':       return { type: 'bond_level', value: Math.ceil(pe.amount / 10), description: pe.reason };
        default:              return { type: 'experience', value: pe.amount, description: pe.reason };
      }
    });
    this.gameSystem.applyTherapyRewards(characterId, rewards);
  }

  /**
   * Analyze message content for therapeutic elements
   */
  private analyzeMessageContent(message: string): {
    emotional_depth: number;
    vulnerability_level: number;
    insight_quality: number;
    defensive_patterns: number;
    empathy_shown: number;
  } {
    const text = message.toLowerCase();
    let emotional_depth = 1;
    let vulnerability_level = 1;
    let insight_quality = 1;
    let defensive_patterns = 1;
    let empathy_shown = 1;

    // Emotional depth indicators
    const emotionalWords = ['feel', 'emotion', 'heart', 'soul', 'deep', 'profound', 'overwhelm', 'pain', 'joy', 'love', 'fear', 'anger', 'sad', 'happy'];
    const emotionalCount = emotionalWords.filter(word => text.includes(word)).length;
    emotional_depth = Math.min(10, 3 + emotionalCount * 2);

    // Vulnerability indicators
    const vulnerabilityWords = ['admit', 'confess', 'share', 'open', 'honest', 'trust', 'vulnerable', 'scared', 'weak', 'struggle', 'difficult', 'hard'];
    const vulnerabilityCount = vulnerabilityWords.filter(word => text.includes(word)).length;
    vulnerability_level = Math.min(10, 2 + vulnerabilityCount * 2);

    // Insight quality indicators
    const insightWords = ['understand', 'realize', 'see', 'learn', 'discover', 'recognize', 'pattern', 'connection', 'because', 'insight'];
    const insightCount = insightWords.filter(word => text.includes(word)).length;
    insight_quality = Math.min(10, 1 + insightCount * 2.5);

    // Defensive patterns
    const defensiveWords = ['but', 'however', 'actually', 'fine', 'okay', 'whatever', 'don\'t', 'can\'t', 'won\'t', 'refuse', 'no'];
    const defensiveCount = defensiveWords.filter(word => text.includes(word)).length;
    defensive_patterns = Math.min(10, 1 + defensiveCount * 1.5);

    // Empathy indicators
    const empathyWords = ['understand', 'see', 'appreciate', 'thank', 'helpful', 'wise', 'right', 'makes sense', 'agree'];
    const empathyCount = empathyWords.filter(word => text.includes(word)).length;
    empathy_shown = Math.min(10, 1 + empathyCount * 2);

    return {
      emotional_depth: Math.round(emotional_depth),
      vulnerability_level: Math.round(vulnerability_level),
      insight_quality: Math.round(insight_quality),
      defensive_patterns: Math.round(defensive_patterns),
      empathy_shown: Math.round(empathy_shown)
    };
  }

  /**
   * Get the current game state for a therapy session
   */
  getGameState(sessionId: string): TherapyGameState | null {
    return this.gameStates.get(sessionId) || null;
  }

  /**
   * Get therapy session summary with game elements
   */
  getTherapySessionSummary(sessionId: string) {
    const gameState = this.gameStates.get(sessionId);
    if (!gameState) {
      return null;
    }
    return this.gameSystem.generateSessionSummary(gameState);
  }

  /**
   * Clean up session resources
   */
  endSession(sessionId: string): void {
    // Remove session data
    this.activeSessions.delete(sessionId);
    
    // Clean up game state
    this.gameStates.delete(sessionId);
    
    // Remove any message handlers for this session
    this.messageHandlers.delete(sessionId);
    
    console.log(`🧹 Cleaned up therapy session: ${sessionId}`);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

// Export singleton instance
export const therapyChatService = new TherapyChatService();
