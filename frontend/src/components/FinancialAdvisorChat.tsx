'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import SafeMotion from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { Send, DollarSign, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { characterAPI } from '../services/apiClient';
import { api } from '../services/apiClient';
// Universal Chat Library
import {
  ensureBrevityTag,
  twoSentenceCap,
  BREVITY_TAGS,
  sendChat,
  singleFlight,
  chatFlightKey,
  log,
  warn,
  error,
  logAgentKey,
  logResponse
} from '@/lib/chat';
import { mustResolveAgentKey } from '@/lib/chat/agent_keys';
import { FinancialDecision } from '../services/apiClient';
import { Contestant as Character } from '@blankwars/types';
import ConflictContextService from '../services/conflictContextService';
import EventContextService from '../services/eventContextService';
import { makeFinancialJudgeDecision, FinancialEventContext } from '../data/aiJudgeSystem';
import { GameEvent } from '@/services/gameEventBus';
import { FinancialPromptTemplateService } from '../data/financialPromptTemplateService';
import ChatFeedback, { ChatFeedbackData } from './ChatFeedback';
import { ChatResponseData, isChatResponseData } from '@/types/socket';
import { getCharacterFinancialTier, type FinancialTier } from '@/utils/finance';

// saveDecision removed - now using memory persist system

// Financial topics for category selection
const FIN_TOPICS = [
  'budget', 'spending', 'savings', 'debt',
  'investing', 'income', 'taxes', 'retirement', 'crypto'
] as const;

interface Message {
  id: string;
  messageId?: string; // Optional alternative ID field
  type: 'coach' | 'contestant' | 'system' | 'decision';
  content: string;
  timestamp: Date;
  decision?: {
    id: string;
    amount: number;
    options: string[];
    reasoning: string;
    urgency: 'low' | 'medium' | 'high';
  };
}

// FinancialDecision interface removed - now imported from /data/characters.ts

type Financials = {
  wallet: number;
  debt?: number;
  financial_stress: number;
  coach_trust_level: number;
  spending_personality: 'frugal' | 'moderate' | 'spender';
  recent_decisions: string[];
  monthly_earnings: number;
  equipment_budget?: number;
  consumables_budget?: number;
};

interface EnhancedCharacter extends Omit<Character, 'financials'> {
  base_name: string;
  financials?: Financials;
  display_bond_level?: number;
  financial_tier?: string;
  subscription_tier?: string;
  owner?: { subscription_tier?: string };
  stress?: number;
  trust?: number;
  battle_focus?: number;
}

interface FinancialAdvisorChatProps {
  selected_characterId: string;
  selected_character: EnhancedCharacter | null;
  available_characters: EnhancedCharacter[];
  onCharacterChange: (character_id: string) => void;
}

// Helper function to get character ID following the pattern from other chats
const getCharacterId = (character: EnhancedCharacter): string => {
  // Always use the database ID for API calls
  return character.id;
};

// Budget Allocation UI Component
interface BudgetAllocationUIProps {
  selected_character: EnhancedCharacter;
  onBudgetUpdate: (equipmentBudget: number, consumables_budget: number) => void;
}

const BudgetAllocationUI: React.FC<BudgetAllocationUIProps> = ({ selected_character, onBudgetUpdate }) => {
  const [equipment_budget, setEquipmentBudget] = useState(0);
  const [consumables_budget, setConsumablesBudget] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBudgetUI, setShowBudgetUI] = useState(false);

  if (typeof selected_character.wallet !== 'number') {
    throw new Error(`wallet must be a number for budget allocation`);
  }
  const current_wallet = selected_character.wallet;
  const total_budgeted = equipment_budget + consumables_budget;
  const available_for_budgeting = current_wallet;
  const is_valid_budget = total_budgeted <= available_for_budgeting;

  const handleBudgetSubmit = async () => {
    if (!is_valid_budget || isUpdating) return;

    setIsUpdating(true);
    try {
      await characterAPI.allocate_budget(selected_character.id, equipment_budget, consumables_budget);
      onBudgetUpdate(equipment_budget, consumables_budget);
      setShowBudgetUI(false);
    } catch (error) {
      console.error('Error updating budget:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mb-4">
      {!showBudgetUI ? (
        <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-400">Equipment Budget: </span>
              <span className="text-blue-400 font-semibold">${equipment_budget.toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Consumables Budget: </span>
              <span className="text-green-400 font-semibold">${consumables_budget.toLocaleString()}</span>
            </div>
          </div>
          <button
            onClick={() => setShowBudgetUI(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
          >
            Set Budget
          </button>
        </div>
      ) : (
        <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <h3 className="text-lg font-semibold mb-3 text-blue-300">Allocate Equipment & Consumables Budget</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Equipment Budget</label>
              <input
                type="number"
                value={equipment_budget}
                onChange={(e) => setEquipmentBudget(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Consumables Budget</label>
              <input
                type="number"
                value={consumables_budget}
                onChange={(e) => setConsumablesBudget(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                placeholder="0"
              />
            </div>
          </div>

          <div className="mb-4 text-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-400">Available Wallet:</span>
              <span className="text-green-400">${available_for_budgeting.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-400">Total Budgeted:</span>
              <span className={is_valid_budget ? 'text-blue-400' : 'text-red-400'}>${total_budgeted.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Remaining:</span>
              <span className={is_valid_budget ? 'text-gray-300' : 'text-red-400'}>${(available_for_budgeting - total_budgeted).toLocaleString()}</span>
            </div>
          </div>

          {!is_valid_budget && (
            <div className="text-red-400 text-sm mb-3">
              Budget exceeds available wallet amount!
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleBudgetSubmit}
              disabled={!is_valid_budget || isUpdating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isUpdating ? 'Updating...' : 'Set Budget'}
            </button>
            <button
              onClick={() => setShowBudgetUI(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// REMOVED: getCharacterStartingWallet, getLegacyCharacterFinancialTier, getCharacterMonthlyEarnings
// These were dead code with hardcoded fallbacks. Character financial data comes from database.

// Helper function to extract assistant text from API responses
const extractAssistantText = (raw: string): string => {
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === 'object') {
      if (typeof p.text === 'string') return p.text;
      if (typeof p.content === 'string') return p.content;
    }
  } catch { }
  return raw;
};

// REMOVED: getCharacterAppropriateAmount - dead code with hardcoded fallbacks
// Decision amounts come from backend store items

interface FinancialReactionDetails {
  monthly_payment_required?: number;
  monthly_income_required?: number;
  current_monthly_income?: number;
}

// Helper to trigger character reaction after system events
async function triggerCharacterReactionAfterSystemEvent(params: {
  agent_key: string;
  userchar_id: string;
  domain: 'financial';
  reason_code: 'unaffordable' | 'insufficient_funds' | string;
  details?: FinancialReactionDetails;
  session_id: string;
}) {
  const { agent_key, userchar_id, domain, reason_code, details, session_id } = params;

  const payload = {
    agent_key,
    message: 'How do you feel about the recent loan decision?', // Trigger reaction to system event
    chat_type: domain,
    domain,
    userchar_id,
    meta: {
      userchar_id: userchar_id, // IMPORTANT: Backend looks for this in meta.userchar_id
      recent_system_event: {
        type: 'LOAN_DECISION',
        status: 'DENIED',
        reason_code,
        details: details ?? {}
      }
    }
  };

  const res = await sendChat(session_id, payload);
  return res;
}

const FinancialAdvisorChat: React.FC<FinancialAdvisorChatProps> = ({
  selected_characterId,
  selected_character,
  available_characters,
  onCharacterChange
}) => {
  // Memoized financial tier calculation with error handling
  const financial_tier = React.useMemo<FinancialTier | null>(() => {
    if (!selected_character) return null;
    try {
      return getCharacterFinancialTier(selected_character);
    } catch (error) {
      console.error(`Failed to determine financial tier for ${selected_character.name || selected_character.id}: ${error}`);
      return null;
    }
  }, [selected_character?.id, selected_character?.financial_tier, selected_character?.subscription_tier, selected_character?.rarity, selected_character?.owner?.subscription_tier]);

  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input_message, setInputMessage] = useState('');
  const [is_loading, setIsLoading] = useState(false);
  const [pending_decision, setPendingDecision] = useState<FinancialDecision | null>(null);
  const [is_committing_decision, setIsCommittingDecision] = useState(false);
  const [topic, setTopic] = useState<string>('');
  const [session_id, setSessionId] = useState<string>(() =>
    selected_character ? `financial_${selected_character.id}` : ''
  );
  const messages_end_ref = useRef<HTMLDivElement>(null);
  const generated_for_char_ref = useRef<string | null>(null);
  const gen_timer_ref = useRef<number | null>(null);
  const reaction_handled_ref = useRef(false);

  // Debug: Component mount detection
  useEffect(() => {
    console.log('🏦 [FINANCIAL ADVISOR] Component mounted, selected_character:', selected_character?.name || 'None');
    return () => console.log('🏦 [FINANCIAL ADVISOR] Component unmounting');
  }, []);

  const [connected, setConnected] = useState(true); // Always connected with HTTP API
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [last_feedback, setLastFeedback] = useState<ChatFeedbackData | null>(null);

  // Deduplication guards to prevent multiple requests
  const did_init_ref = useRef<Record<string, boolean>>({});
  const in_flight_ref = useRef<Record<string, Promise<unknown> | null>>({});
  const [sending, setSending] = useState(false);

  // Mutex: prevent concurrent sends / rapid re-clicks
  const is_sending_ref = useRef(false);

  // Track coach recommendation for scoring
  const [last_coach_recommendation, setLastCoachRecommendation] = useState<'approve' | 'reject' | null>(null);

  // Guard the greeting useEffect so it runs once per session
  const greeted_ref = useRef(false);

  // helpers (same normalize you used elsewhere)
  const normalizeCode = (s?: string) =>
    (s ?? '').trim().toLowerCase().replace(/['']/g, '').replace(/\s+/g, '_');

  const canonical_character_id = useMemo(() => {
    // Use character_id from DB directly - no name mapping needed
    return normalizeCode(selected_character?.character_id);
  }, [selected_character]);

  const instanceId = selected_character?.id ?? selected_character?.slug ?? canonical_character_id;

  // Derive a merged, defaulted view of the character for rendering & requests
  const character_for_chat = useMemo(() => {
    if (!selected_character) return null;

    const defaults: Partial<Financials> = {
      financial_stress: 30,
      coach_trust_level: 50,
      spending_personality: 'moderate',
      recent_decisions: [],
    };

    const sc = selected_character;

    // Just use the DB value directly - no calculations!
    console.log(`[WALLET_DEBUG] Character: ${sc.name} (ID: ${sc.id}), DB wallet: ${sc.wallet}`);

    return sc;
  }, [selected_character]);

  // Using universal chat library for single-flight protection
  const scrollToBottom = () => {
    if (messages_end_ref.current) {
      const message_container = messages_end_ref.current.parentElement;
      if (message_container) {
        message_container.scrollTop = message_container.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // HTTP API connection setup - using persistent memory chat system
  useEffect(() => {
    if (!selected_character) return;

    // Clear messages and reset state when switching characters
    setMessages([]);
    setPendingDecision(null);
    setLastCoachRecommendation(null);

    // Only reset session when instanceId changes (new character) - use stable ID for conversation memory
    setSessionId(`financial_${instanceId}`);
    greeted_ref.current = false; // allow a new one-time greeting for the new session

    console.log('🏦 [FinancialAdvisor] Switched to character:', character_for_chat?.name, 'with wallet:', character_for_chat?.wallet);
    setConnected(true);
    setConnectionError(null);
  }, [instanceId]); // Only depend on instanceId, not selected_character

  // Helper functions for character reactions and events
  function characterSay(text: string) {
    setMessages(p => [...p, { id: crypto.randomUUID(), type: 'contestant', timestamp: new Date(), content: text }]);
  }

  // Removed local GameEvent interface to use global one

  interface DecisionOutcome {
    result: string;
    financial_impact: number;
    stress_change: number;
    trust_change: number;
    message: string;
  }

  async function emitEvent(evt: GameEvent) {
    try {
      await fetch('http://localhost:4000/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(evt) });
    } catch (e) {
      console.warn('event log failed', e);
    }
  }

  function goRogueProb(stress = selected_character?.stress ?? 50, trust = selected_character?.trust ?? 50, outcome: 'approved' | 'rejected' | 'error' = 'approved') {
    const base = outcome === 'approved' ? 0.2 : 0.55;
    const adj = ((stress - 50) - (trust - 50)) / 400;
    return Math.random() < Math.min(0.9, Math.max(0.05, base + adj));
  }

  // Coach performance feedback system
  function showCoachFeedback(type: 'success' | 'rogue' | 'rejected' | 'bad_advice', trust_change: number, coaching_points: number, is_rogue: boolean = false) {
    const emoji = type === 'success' ? '✅' : type === 'rogue' ? '⚠️' : type === 'bad_advice' ? '❌' : '✅';
    const action = is_rogue ? 'Character went rogue'
      : type === 'success' ? 'Good advice!'
      : type === 'bad_advice' ? 'Bad advice - endorsed unaffordable purchase!'
      : 'Good guidance - character listened!';

    // Clarify that trust is character stat, coaching points are coach stat
    const characterTrustText = trust_change > 0 ? `Character Trust +${trust_change}` : `Character Trust ${trust_change}`;
    const coachPointsText = coaching_points > 0 ? `Coach Points +${coaching_points}` : `Coach Points ${coaching_points}`;

    const feedbackMessage = `${emoji} ${action} • ${characterTrustText} • ${coachPointsText}`;

    // Add coach feedback message (appears as centered system message)
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'system',
      timestamp: new Date(),
      content: feedbackMessage
    }]);

    console.log('🎯 [COACH FEEDBACK]', feedbackMessage);
  }


  // Fetch pending decision from backend (handles roll + generation)
  const fetchPendingDecisionFromBackend = async (character_id: string): Promise<FinancialDecision | null> => {
    try {
      const response = await fetch(`http://localhost:4000/api/financials/characters/${character_id}/pending-decision`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('[FINANCIAL] Failed to fetch pending decision:', response.status);
        return null;
      }

      const data = await response.json();
      if (!data.ok || !data.pending) {
        return null; // No decision triggered
      }

      // Convert backend format to frontend FinancialDecision
      // STRICT MODE: All fields must come from backend
      if (!data.pending.item_name && !data.pending.equipment_name) {
        throw new Error('STRICT MODE: pending decision must have item_name or equipment_name');
      }
      if (!data.pending.character_reasoning) {
        throw new Error('STRICT MODE: pending decision must have character_reasoning');
      }
      if (data.pending.amount === undefined || data.pending.amount === null) {
        throw new Error('STRICT MODE: pending decision must have amount');
      }

      return {
        id: data.pending.id,
        character_id: data.pending.user_character_id,
        description: data.pending.item_name ?? data.pending.equipment_name,
        category: data.pending.category,
        amount: data.pending.amount,
        options: ['Approve', 'Reject'],
        character_reasoning: data.pending.character_reasoning,
        urgency: 'medium' as const,
        is_risky: data.pending.is_risky,
        status: 'pending' as const,
        timestamp: new Date(data.pending.created_at),
        coach_influence_attempts: 0,
      };
    } catch (error) {
      console.error('[FINANCIAL] Error fetching pending decision:', error);
      return null;
    }
  };

  // Process character making a decision based on coach influence
  const processCharacterDecision = async (decision: FinancialDecision, coach_input?: string) => {
    if (!selected_character) return;

    if (typeof selected_character.coach_financial_trust !== 'number') {
      throw new Error('coach_financial_trust must be a number from database');
    }
    if (typeof selected_character.financial_stress !== 'number') {
      throw new Error('financial_stress must be a number from database');
    }
    if (!selected_character.financial_personality?.spending_style) {
      throw new Error('financial_personality.spending_style must exist from database');
    }
    const trust_level = selected_character.coach_financial_trust;
    const stress_level = selected_character.financial_stress;
    const spending_personality = selected_character.financial_personality.spending_style;

    // Calculate decision factors
    let decision_score = Math.random() * 100;

    // Adjust based on coach trust
    if (coach_input && trust_level > 60) {
      decision_score += 20; // More likely to listen to good advice
    }

    // Adjust based on stress (stressed characters make worse decisions)
    if (stress_level > 70) {
      decision_score -= 25;
    }

    // Adjust based on personality
    if (spending_personality === 'impulsive') {
      decision_score -= 15;
    } else if (spending_personality === 'conservative') {
      decision_score += 15;
    }

    // Decision is handled by the WebSocket response
    // Clear the pending decision after processing
    setPendingDecision(null);

    return { decision_score };
  };

  const handleSendMessage = async () => {
    if (!input_message.trim() || !selected_character || !connected) return;
    if (is_sending_ref.current) return; // drop duplicates

    is_sending_ref.current = true;

    const user_message: Message = {
      id: crypto.randomUUID(),
      type: 'coach',
      content: input_message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => {
      const merged = [...prev, user_message];
      const seen = new Set<string>();
      return merged.filter(m => {
        const k = String(m.messageId ?? m.id ?? `${m.timestamp}-${m.type}`);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    });
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get context services like other working chats
      const event_contextService = EventContextService.getInstance();
      const conflictService = ConflictContextService.getInstance();

      console.log('🆔 Financial chat using character ID:', canonical_character_id, 'for character:', character_for_chat.name);

      // STRICT MODE: Living context must be available
      const living_context = await conflictService.generateLivingContext(character_for_chat.id);
      if (!living_context) {
        throw new Error(`STRICT MODE: Living context not available for character ${character_for_chat.id}`);
      }
      console.log('✅ Living context loaded for financial chat:', living_context);

      // STRICT MODE: Event context must be available
      const context_string = await event_contextService.getPerformanceContext(canonical_character_id);
      if (!context_string) {
        throw new Error(`STRICT MODE: Event context not available for character ${canonical_character_id}`);
      }
      const event_context = {
        recent_events: context_string,
        relationships: '',
        emotional_state: pending_decision ? 'considering_financial_decision' : 'open_to_advice',
        domain_specific: 'financial_coaching'
      };

      // Build financial coaching context inline like other working chats
      const financial_prompt = `You are ${character_for_chat.name}, a legendary figure, participating in a financial coaching session with your team's financial advisor.

SESSION TYPE: Financial Advisory and Decision Support

FINANCIAL COACHING CONTEXT:
- Current wallet: $${character_for_chat.wallet.toLocaleString()}
- Monthly earnings: $${character_for_chat.monthly_earnings.toLocaleString()}
- Financial stress level: ${character_for_chat.financial_stress}%
- Trust in coach: ${character_for_chat.coach_financial_trust}%
- Spending personality: ${character_for_chat.financial_personality?.spending_style}
- Recent decisions: ${character_for_chat.recent_decisions.length} previous financial choices
${pending_decision ? `- Pending Decision: ${pending_decision.description} for $${pending_decision.amount.toLocaleString()}` : ''}

CHARACTER FINANCIAL PSYCHOLOGY:
- You are a legendary figure from your era, so modern financial concepts might be foreign or fascinating
- React to financial advice based on your background and personality
- Your trust level (${character_for_chat.coach_financial_trust}%) affects how you receive coaching
- Your financial stress (${character_for_chat.financial_stress}%) influences your decision-making
- Your spending personality (${character_for_chat.financial_personality?.spending_style}) shapes your money attitudes

FINANCIAL COACHING SESSION GUIDELINES:
- This is specialized financial counseling focused on money decisions and financial wellness
- Respond authentically as ${character_for_chat.name} would to financial guidance
- Show your character's relationship with money based on your era and personality
- If stressed about finances, show that emotional state
- Consider the coach's advice through the lens of your character background
- Financial topics include: budgeting, spending decisions, investments, financial goals, money stress
- Respond with dialogue only, no stage directions or scene descriptions
- Keep responses conversational and direct

${pending_decision ? `CURRENT FINANCIAL DECISION:
You are considering: ${pending_decision.description} for $${pending_decision.amount.toLocaleString()}
Your reasoning: "${pending_decision.character_reasoning}"
Options: ${pending_decision.options.join(', ')}
Urgency: ${pending_decision.urgency}` : ''}

Respond as ${character_for_chat.name} would in a real financial coaching session, showing authentic reactions to money advice while maintaining your character voice and background.`;

      // Message sending using universal chat library
      const agent_key = mustResolveAgentKey(character_for_chat?.name, canonical_character_id, 'financial');
      const prompt_with_tag = ensureBrevityTag(financial_prompt, BREVITY_TAGS.finance);

      logAgentKey('finance-message', { character_id: canonical_character_id, agent_key, name: character_for_chat.name });

      console.log('[finance-message] payload preview', {
        kind: 'chat',
        user_text: user_message.content?.slice(0, 120),
        system: prompt_with_tag?.slice(0, 160),
      });

      const { text: raw_text = '' } = await singleFlight(
        chatFlightKey('finance', session_id || 'default', agent_key),
        () => sendChat(session_id ?? instanceId, {
          agent_key,
          message: user_message.content, // <-- Use actual user message, not system prompt
          chat_type: 'financial_advisor',
          topic,
          character_id: canonical_character_id,          // <-- canonical for DB/agent
          userchar_id: instanceId,                     // <-- Top level for backend
          conversation_context: prompt_with_tag, // <-- System prompt goes here
          meta: {
            user_message: user_message.content,                // <-- important
            userchar_id: instanceId,                   // <-- instance for UI/session
            character_idCanonical: canonical_character_id,
            wallet: character_for_chat.wallet,
            debt: character_for_chat.debt,
            financial_stress: character_for_chat.financial_stress,
            coach_financial_trust: character_for_chat.coach_financial_trust,
            recent_decisions: character_for_chat.recent_decisions,
            domain: 'financial',
            domain_specific: 'financial',
            // Removed walletCents - backend now queries wallet directly from database
            monthly_income: 0,  // TODO: Add real income data when available
            employed: false,        // TODO: Add real employment data when available
          },
          character_data: {
            name: character_for_chat.name,
            archetype: character_for_chat.archetype,
            level: character_for_chat.level,
            personality: character_for_chat.personality || {
              traits: ['Money-conscious'],
              speech_style: 'Direct',
              motivations: ['Financial security'],
              fears: ['Poverty'],
              relationships: []
            },
            // Add living context for conflict awareness
            living_context: living_context,
            // Add centralized event context
            event_context: event_context,
            // Character stats
            strength: character_for_chat.strength,
            dexterity: character_for_chat.dexterity,
            defense: character_for_chat.defense,
            intelligence: character_for_chat.intelligence,
            wisdom: character_for_chat.wisdom,
            charisma: character_for_chat.charisma,
            spirit: character_for_chat.spirit,
            // Combat stats - flat
            attack: character_for_chat.attack,
            speed: character_for_chat.speed,
            health: character_for_chat.health,
            max_health: character_for_chat.max_health,
            // Current status
            current_health: character_for_chat.health,
            injuries: character_for_chat.injuries,
            bond_level: character_for_chat.bond_level || character_for_chat.display_bond_level,
            // Financial-specific context
            financial_stats: {
              wallet: character_for_chat.wallet,
              monthly_earnings: character_for_chat.monthly_earnings,
              financial_stress: character_for_chat.financial_stress,
              coach_trust_level: character_for_chat.coach_financial_trust,
              spending_personality: character_for_chat.financial_personality?.spending_style,
              recent_decisions: character_for_chat.recent_decisions
            },
            // Pending decision context
            pending_financial_decision: pending_decision,
            // Add comprehensive financial coaching conversation context like CoachingSessionChat
            conversation_context: `${financial_prompt}`,

            // Domain-specific coaching context enhanced with proper templates
            session_context: {
              type: 'financial_advisory',
              has_decision: !!pending_decision,
              focus_areas: ['Financial planning', 'Money decisions', 'Spending habits', 'Financial stress', 'Investment choices', 'Budgeting'],
              coaching_approach: 'Character-specific financial guidance with era-appropriate perspectives'
            }
          },
          previous_messages: messages.slice(-5).map(msg => ({
            role: msg.type === 'coach' ? 'user' : 'assistant',
            content: msg.content
          }))
        })
      );

      const text = twoSentenceCap(extractAssistantText(raw_text));
      logResponse('finance-message', { raw_length: raw_text.length, capped_length: text.length });

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'contestant',
        content: text || 'I need a moment to think about that...',
        timestamp: new Date()
      }]);

      // Note: Don't automatically process decisions here - let the coach use the preset buttons
      // The processCharacterDecision function will be called from handlePresetDecision instead

      // Decision generation is now only done once per character selection in the initial greeting
    } catch (error) {
      console.error('Error in financial chat:', error);
      const error_message: Message = {
        id: crypto.randomUUID(),
        type: 'system',
        content: `Chat error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, error_message]);
    } finally {
      is_sending_ref.current = false;
      setIsLoading(false);
    }
  };


  const getCharacterContext = (character: EnhancedCharacter) => {
    return {
      financial_status: {
        wallet: character.wallet,
        stress: character.financial_stress,
        trust: character.coach_financial_trust,
        spending_style: character.financial_personality?.spending_style
      },
      recent_decisions: character.recent_decisions,
      monthly_earnings: character.monthly_earnings
    };
  };

  const processDecisionOutcome = async (decision: FinancialDecision, coach_decision: 'rejected' | 'approved' | 'character_choice', trust_level: number, stress_level: number) => {
    if (!selected_character) return null;

    if (typeof selected_character.wallet !== 'number') {
      throw new Error('wallet must be a number from database');
    }
    if (typeof selected_character.monthly_earnings !== 'number') {
      throw new Error('monthly_earnings must be a number from database');
    }
    const character_financials = {
      wallet: selected_character.wallet,
      financial_stress: stress_level,
      coach_trust_level: trust_level,
      spending_personality: selected_character.financial_personality?.spending_style,
      recent_decisions: selected_character.recent_decisions,
      monthly_earnings: selected_character.monthly_earnings
    };

    let outcome: DecisionOutcome;

    if (coach_decision === 'rejected') {
      // Coach rejected - determine if character listens
      const listen_chance = Math.min(trust_level * 0.8, 80); // Max 80% chance to listen
      const character_listens = Math.random() * 100 < listen_chance;

      if (character_listens) {
        outcome = {
          result: 'decision_avoided',
          financial_impact: 0,
          stress_change: -5, // Slightly less stress from avoiding bad decision
          trust_change: 5, // Trust increases when coach saves them
          message: `You convinced me to reconsider. I'll hold off on this decision for now.`
        };
      } else {
        // Character ignores advice - use AI judge for outcome
        const judge_context: FinancialEventContext = {
          character_id: selected_character.id,
          event_type: 'decision',
          financial_impact: decision.amount,
          stress_level: stress_level,
          coach_involvement: true,
          battle_context: undefined
        };

        const judge_ruling = makeFinancialJudgeDecision(judge_context, {
          id: decision.id,
          character_id: decision.character_id,
          amount: decision.amount,
          category: decision.category,
          outcome: 'pending',
          followed_advice: false,
          timestamp: decision.timestamp,
          description: decision.description,
          options: decision.options,
          character_reasoning: decision.character_reasoning,
          urgency: decision.urgency,
          status: decision.status,
          coach_influence_attempts: decision.coach_influence_attempts,
          financial_impact: 0,
          stress_impact: 0,
          relationship_impact: 0
        } as FinancialDecision, undefined);

        outcome = {
          result: 'ignored_advice',
          financial_impact: -Math.floor(decision.amount * 0.3), // 30% loss for ignoring advice
          stress_change: 20, // High stress from bad decision
          trust_change: -10, // Trust decreases when they ignore advice
          message: `I appreciate your concern, but I'm going to do this anyway. ${judge_ruling.commentary}`
        };
      }
    } else if (coach_decision === 'approved') {
      // Coach approved - simulate positive outcome
      const success_chance = Math.max(70 - stress_level * 0.3, 30); // Stress reduces success chance
      const is_successful = Math.random() * 100 < success_chance;

      if (is_successful) {
        outcome = {
          result: 'successful_decision',
          financial_impact: Math.floor(decision.amount * 0.1), // 10% return on investment
          stress_change: -10, // Stress decreases with success
          trust_change: 8, // Trust increases with good advice
          message: `Thanks for the support! This turned out to be a great decision.`
        };
      } else {
        outcome = {
          result: 'failed_decision',
          financial_impact: -Math.floor(decision.amount * 0.2), // 20% loss
          stress_change: 15, // Stress increases with failure
          trust_change: -5, // Trust decreases slightly
          message: `Even with your support, this didn't work out as expected. I'm frustrated.`
        };
      }
    } else {
      // Character's choice - let AI judge decide outcome
      const judge_context: FinancialEventContext = {
        character_id: selected_character.id,
        event_type: 'decision',
        financial_impact: decision.amount,
        stress_level: stress_level,
        coach_involvement: true,
        battle_context: undefined
      };

      const judge_ruling = makeFinancialJudgeDecision(judge_context, {
        id: decision.id,
        character_id: decision.character_id,
        amount: decision.amount,
        category: decision.category,
        outcome: 'pending',
        followed_advice: false,
        timestamp: decision.timestamp,
        description: decision.description,
        options: decision.options,
        character_reasoning: decision.character_reasoning,
        urgency: decision.urgency,
        status: decision.status,
        coach_influence_attempts: decision.coach_influence_attempts,
        financial_impact: 0,
        stress_impact: 0,
        relationship_impact: 0
      } as FinancialDecision, undefined);

      // Simulate outcome based on AI judge's risk assessment
      let financial_multiplier = 0;
      let stress_multiplier = 0;
      let trust_multiplier = 0;

      switch (judge_ruling.risk_assessment) {
        case 'excellent':
          financial_multiplier = 0.15; // 15% gain
          stress_multiplier = -15; // Stress decreases
          trust_multiplier = 2; // Small trust increase
          break;
        case 'good':
          financial_multiplier = 0.05; // 5% gain
          stress_multiplier = -5; // Slight stress decrease
          trust_multiplier = 1; // Minimal trust increase
          break;
        case 'questionable':
          financial_multiplier = -0.05; // 5% loss
          stress_multiplier = 10; // Stress increases
          trust_multiplier = 0; // No trust change
          break;
        case 'poor':
          financial_multiplier = -0.25; // 25% loss
          stress_multiplier = 20; // High stress
          trust_multiplier = -3; // Trust decreases
          break;
        case 'catastrophic':
          financial_multiplier = -0.5; // 50% loss
          stress_multiplier = 30; // Very high stress
          trust_multiplier = -5; // Significant trust decrease
          break;
      }

      outcome = {
        result: 'independent_choice',
        financial_impact: Math.floor(decision.amount * financial_multiplier),
        stress_change: stress_multiplier,
        trust_change: trust_multiplier,
        message: `I made my own call on this one. ${judge_ruling.commentary}`
      };
    }

    // Helper function to update local state
    const updateLocalFinancialState = () => {
      if (selected_character.wallet !== undefined) {
        selected_character.wallet += outcome.financial_impact;
        if (typeof selected_character.financial_stress !== 'number') {
          throw new Error('financial_stress must be a number from database');
        }
        if (typeof selected_character.coach_financial_trust !== 'number') {
          throw new Error('coach_financial_trust must be a number from database');
        }
        selected_character.financial_stress = Math.max(0, Math.min(100, selected_character.financial_stress + outcome.stress_change));
        selected_character.coach_financial_trust = Math.max(0, Math.min(100, selected_character.coach_financial_trust + outcome.trust_change));
        if (!selected_character.recent_decisions) selected_character.recent_decisions = [];

        // Store the complete decision with all outcome fields filled in
        const completed_decision: FinancialDecision = {
          ...decision,
          coach_decision,
          followed_advice: coach_decision === 'approved',
          outcome: outcome.result as any,
          financial_impact: outcome.financial_impact,
          stress_impact: outcome.stress_change,
          relationship_impact: outcome.trust_change,
          status: 'decided'
        };

        selected_character.recent_decisions.push(completed_decision);
      }
    };

    // Silent local fallback; memory save already handled via persist hint
    try {
      // temporarily disabled — memory save is handled via /ai/chat persist
      // await saveDecision(selected_character.id, { wallet: ..., financial_stress: ..., coach_trust_level: ... });
      // await saveDecision(selected_character.id, { decision: ..., amount: ..., coach_decision, outcome: ..., timestamp: ... });
      if (process.env.NODE_ENV === 'development') {
        console.log('Financial decision handled via memory persist system');
      }
    } catch (error) {
      // Silent handling - no banner
      if (process.env.NODE_ENV === 'development') {
        console.log('Decision save handled via memory system');
      }
    }

    // Always update local state for immediate UI feedback
    updateLocalFinancialState();

    return outcome;
  };

  // Helper function to determine if character will override coach based on their personality
  const willCharacterOverride = (character: EnhancedCharacter): boolean => {
    // Calculate real-time adherence using the same logic as gameplan_adherenceService
    const base_adherence = character.gameplan_adherence ?? 75;

    // Get psychological state impacts
    const stress_impact = -(character.stress_level * 0.3);
    const mental_healthImpact = (character.current_health - 50) * 0.2;
    const team_trustImpact = (character.team_trust - 50) * 0.1;
    const battle_focusImpact = (character.battle_focus - 50) * 0.15;

    // Calculate final adherence (mirrors gameplan_adherenceService.ts:57-59)
    const final_adherence = Math.max(0, Math.min(100,
      base_adherence + stress_impact + mental_healthImpact + team_trustImpact + battle_focusImpact
    ));

    // Convert adherence to override chance (inverse relationship)
    let override_chance = 0.1; // Default 10%

    if (final_adherence < 30) {
      override_chance = 0.7; // Critical adherence - 70% override chance
    } else if (final_adherence < 50) {
      override_chance = 0.5; // High risk - 50% override chance
    } else if (final_adherence < 70) {
      override_chance = 0.3; // Medium risk - 30% override chance
    }

    return Math.random() < override_chance;
  };

  // Helper function to commit financial decisions via REST API
  const commitFinancialDecision = async (decision: FinancialDecision): Promise<{ success: boolean, error?: string, financials?: Financials, wallet?: number, debt?: number }> => {
    if (!selected_character) return { success: false, error: 'No character selected' };

    // DOLLARS ONLY - no cents
    const price_in_dollars = decision.amount ?? 0;
    // DOLLARS ONLY - no cents conversions
    const wallet_dollars = selected_character.wallet;
    const payment_method: 'cash' | 'debt' = wallet_dollars >= (decision.amount ?? 0) ? 'cash' : 'debt';

    try {
      const url = `http://localhost:4000/api/characters/${selected_character.id}/decisions/commit`;
      const payload = {
        amount: price_in_dollars, // DOLLARS ONLY
        payment_method: payment_method,
        apr_bps: 1299,
        term_months: 24,
        description: decision.description,
        client_decision_id: decision.id ?? null,
      };

      console.log('💰 Committing financial decision:', { url, payload });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { success: false, error: error.error || 'Request failed' };
      }

      // Handle 204 No Content response (success with no body)
      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json();
      return { success: true, wallet: data.wallet, debt: data.debt };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const handlePresetDecision = async (decision_type: 'bad' | 'good' | 'character_choice') => {
    if (!pending_decision || !selected_character || is_committing_decision) return;

    console.log('[APPROVE] start', { id: pending_decision?.id, amount: pending_decision?.amount, type: decision_type });
    reaction_handled_ref.current = false;

    // Set in-flight guard for financial transactions
    if (decision_type === 'good' || decision_type === 'character_choice') {
      setIsCommittingDecision(true);
    }

    // Track coach recommendation for scoring (only for explicit approve/reject)
    if (decision_type === 'good') {
      setLastCoachRecommendation('approve');
    } else if (decision_type === 'bad') {
      setLastCoachRecommendation('reject');
    }
    // character_choice doesn't set a coach recommendation

    if (typeof selected_character.coach_financial_trust !== 'number') {
      throw new Error('coach_financial_trust must be a number from database');
    }
    if (typeof selected_character.financial_stress !== 'number') {
      throw new Error('financial_stress must be a number from database');
    }
    const trust_level = selected_character.coach_financial_trust;
    const stress_level = selected_character.financial_stress;

    let outcome: DecisionOutcome;
    let coach_message: string;

    if (decision_type === 'bad') {
      // Coach rejects the decision - use new immediate reaction system
      coach_message = `I strongly advise against this decision. The risks outweigh the benefits, and given your current financial situation, this could lead to significant problems. Let's explore better alternatives.`;

      // Send persist hint for rejected decision  
      const price_cents = Math.round((pending_decision.amount ?? 0) * 100);
      const payment_method: 'cash' | 'debt' = 'debt'; // Backend will determine actual payment method

      const financing = {
        recommended: true,
        type: 'loan',
        apr_bps: 1299,
        term_months: 24,
        est_monthly_cents: Math.round(
          price_cents * (0.1299 / 12) / (1 - Math.pow(1 + (0.1299 / 12), -24))
        )
      };

      // Determine character action and coach alignment
      const character_action = 'reject'; // Character followed coach's reject recommendation
      const followed_coach = last_coach_recommendation === 'reject';
      const coach_reward_points = followed_coach ? +1 : (last_coach_recommendation ? -1 : 0);

      // No wallet changes for rejected decisions
      const wallet_delta_cents = 0;
      const debt_principal_delta_cents = 0;

      // Add coach rejection message 
      const coach_rejection_message: Message = {
        id: crypto.randomUUID(),
        type: 'coach',
        timestamp: new Date(),
        content: coach_message
      };
      setMessages(prev => [...prev, coach_rejection_message]);

      // Character reaction + event logging for rejection
      const rogue = goRogueProb(undefined, undefined, 'rejected');
      console.log('[APPROVE] reaction', { branch: 'rejected', rogue });
      if (rogue) {
        characterSay(`I can't wait around—doing it anyway.`);
        const evt: GameEvent = {
          id: crypto.randomUUID(),
          type: 'financial_decision_made',
          primary_character_id: String(selected_character.id),
          description: `Character ignored coach rejection: ${pending_decision.description} ($${pending_decision.amount?.toLocaleString()})`,
          severity: 'medium',
          source: 'financial_advisory',
          category: 'financial',
          tags: ['rogue_action', 'rejection_ignored'],
          metadata: {
            decision_id: pending_decision.id,
            amount: pending_decision.amount,
            effects: { trust: -5, stress: +5 },
            callback_at: new Date(Date.now() + 2 * 3600e3).toISOString(),
            emotional_weight: 85,
            conflict_potential: 90
          },
          timestamp: new Date()
        };
        console.log('[APPROVE] events payload', evt);
        await emitEvent(evt);

        // Show coach feedback for rogue after rejection
        showCoachFeedback('rogue', -10, -3, true);
      } else {
        characterSay(`Understood. I'll hold off and explore safer options.`);
        const evt: GameEvent = {
          id: crypto.randomUUID(),
          type: 'financial_decision_made',
          primary_character_id: String(selected_character.id),
          description: `Character accepted coach rejection: ${pending_decision.description} ($${pending_decision.amount?.toLocaleString()})`,
          severity: 'low',
          source: 'financial_advisory',
          category: 'financial',
          tags: ['rejection_accepted'],
          metadata: {
            decision_id: pending_decision.id,
            amount: pending_decision.amount,
            effects: { trust: +2, stress: -2 },
            emotional_weight: 15,
            conflict_potential: 5
          },
          timestamp: new Date()
        };
        console.log('[APPROVE] events payload', evt);
        await emitEvent(evt);

        // Show coach feedback for successful rejection advice
        showCoachFeedback('rejected', 2, 1, false);
      }
      reaction_handled_ref.current = true;

      // Removed sendChat call to prevent AI system recursion
      // Old meta data for reference:
      // meta: {
      //   userchar_id: instanceId,
      //   domain: 'financial',
      //   domain_specific: 'financial',
      //   monthlyIncomeCents: 0,  // TODO: Add real income data when available
      //   employed: false,        // TODO: Add real employment data when available
      //   persist: { kind: 'financial.decision', ... }
      // });
    } else if (decision_type === 'good') {
      // Coach approves the decision - use REST API with affordability checks
      try {
        const result = await commitFinancialDecision(pending_decision);

        if (!result.success) {
          // Coach endorsed but purchase failed affordability check - BAD ADVICE
          let systemMessage = 'Purchase blocked.';
          if (result.error === 'unaffordable') {
            systemMessage = '🚫 Loan denied - monthly payment exceeds affordable debt limit.';
          } else if (result.error === 'insufficient_funds') {
            systemMessage = '🚫 Insufficient funds for cash purchase.';
          }

          // Show system message about the outcome (not coach dialogue)
          outcome = await processDecisionOutcome(pending_decision, 'rejected', trust_level, stress_level);

          // Add system message showing the result
          const system_outcome_message: Message = {
            id: crypto.randomUUID(),
            type: 'system',
            content: systemMessage,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, system_outcome_message]);

          // Character reacts to coach's bad advice - purchase was blocked by system
          // No "rogue" path here - the loan was denied, character can't override the bank
          characterSay(`Wait, you said this was a good idea but I can't even afford it? That's not helpful advice...`);
          const evt: GameEvent = {
            id: crypto.randomUUID(),
            type: 'financial_decision_made',
            primary_character_id: String(selected_character.id),
            description: `Coach endorsed unaffordable purchase: ${pending_decision.description}`,
            severity: 'medium',
            source: 'financial_advisory',
            category: 'financial',
            tags: ['bad_advice', 'unaffordable_endorsement'],
            metadata: {
              decision_id: pending_decision.id,
              amount: pending_decision.amount,
              effects: { trust: -3, stress: +5 },
              emotional_weight: 30,
              conflict_potential: 25
            },
            timestamp: new Date()
          };
          console.log('[BAD_ADVICE] events payload', evt);
          await emitEvent(evt);

          // Show coach feedback for BAD advice - endorsed something unaffordable
          showCoachFeedback('bad_advice', -3, -2, false);
          reaction_handled_ref.current = true;
          setPendingDecision(null);
          setIsCommittingDecision(false);
          return; // Exit early - decision is resolved
        }

        // Success - update character financials and send confirmation
        if (result && selected_character) {
          selected_character.wallet = result.wallet;
          selected_character.debt = result.debt;
        }

        outcome = await processDecisionOutcome(pending_decision, 'approved', trust_level, stress_level);
        const price_cents = Math.round((pending_decision.amount ?? 0) * 100);
        if (typeof selected_character.wallet !== 'number') {
          throw new Error('wallet must be a number from database');
        }
        const payment_method = (selected_character.wallet * 100) >= price_cents ? 'cash' : 'debt';

        // Coach gives approval advice (not transaction details)
        coach_message = `I think this is a reasonable decision given your current situation. The investment could help improve your position if managed carefully.`;

        // Add coach approval message (left side)
        const coach_approval_message: Message = {
          id: crypto.randomUUID(),
          type: 'coach',
          content: coach_message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, coach_approval_message]);

        // Character reaction + event logging
        const rogue = goRogueProb();
        console.log('[APPROVE] reaction', { branch: 'approved', rogue });
        if (rogue) {
          // Character reports going rogue + transaction details
          const transaction_details = payment_method === 'debt'
            ? `I went ahead and got the loan anyway - $${(price_cents / 100).toLocaleString()} at 12.99% APR, about $${Math.round(price_cents * (0.1299 / 12) / (1 - Math.pow(1 + (0.1299 / 12), -24)) / 100).toFixed(0)} per month for 24 months.`
            : `I went ahead and bought it with cash for $${(price_cents / 100).toLocaleString()}.`;
          characterSay(`Thanks for the advice, coach… but I'm going my own way. ${transaction_details}`);
          const evt: GameEvent = {
            id: crypto.randomUUID(),
            type: 'luxury_purchase_made',
            primary_character_id: String(selected_character.id),
            description: `Purchase completed: ${pending_decision.description}`,
            severity: 'low',
            source: 'financial_advisory',
            category: 'financial',
            tags: ['purchase_completed', 'rogue_action'],
            metadata: {
              decision_id: pending_decision.id,
              amount: pending_decision.amount,
              effects: { trust: +5, stress: -5 },
              callback_at: new Date(Date.now() + 300e3).toISOString(),
              payment_method: 'credit',
              emotional_weight: 20,
              conflict_potential: 0
            },
            timestamp: new Date()
          };
          console.log('[PURCHASE] events payload', evt);
          await emitEvent(evt);

          // Show coach feedback for rogue behavior
          showCoachFeedback('rogue', -8, -2, true);
        } else {
          // Character reports following advice + transaction details
          const transaction_details = payment_method === 'debt'
            ? `I went ahead and secured the financing - $${(price_cents / 100).toLocaleString()} at 12.99% APR, about $${Math.round(price_cents * (0.1299 / 12) / (1 - Math.pow(1 + (0.1299 / 12), -24)) / 100).toFixed(0)} per month for 24 months.`
            : `I made the purchase with cash - $${(price_cents / 100).toLocaleString()} from my wallet.`;
          characterSay(`Got it, coach. I'll follow your recommendation. ${transaction_details}`);
          const evt: GameEvent = {
            id: crypto.randomUUID(),
            type: 'luxury_purchase_made',
            primary_character_id: String(selected_character.id),
            description: `Purchase completed (following advice): ${pending_decision.description}`,
            severity: 'low',
            source: 'financial_advisory',
            category: 'financial',
            tags: ['purchase_completed', 'advice_followed'],
            metadata: {
              decision_id: pending_decision.id,
              amount: pending_decision.amount,
              effects: { trust: -2, stress: +2 },
              payment_method: 'credit',
              emotional_weight: 30,
              conflict_potential: 10
            },
            timestamp: new Date()
          };
          console.log('[PURCHASE] events payload', evt);
          await emitEvent(evt);

          // Show coach feedback for successful advice
          showCoachFeedback('success', 6, 3, false);
        }
        reaction_handled_ref.current = true;

        // Reset generation flag after decision is processed (allow future decisions)
        setTimeout(() => {
          generated_for_char_ref.current = null;
        }, 30000); // Allow new decisions after 30 seconds

        // Give character a chance to respond to coach's approval
        if (reaction_handled_ref.current) {
          return; // we already reacted—skip legacy override
        }
        const will_override = willCharacterOverride(selected_character);

        // Send context to AI for authentic character reaction to approval
        const approval_reaction_context = {
          situation: 'coach_approval_response',
          coach_message: coach_message,
          decision_description: pending_decision.description,
          decision_amount: pending_decision.amount,
          transaction_completed: true,
          will_have_second_thoughts: will_override,
          character_psychology: {
            gameplan_adherence: selected_character.gameplan_adherence,
            stress_level: selected_character.stress_level,
            mental_health: selected_character.current_health,
            team_trust: selected_character.team_trust,
            battle_focus: selected_character.battle_focus
          }
        };

        // Let AI generate character's authentic response to coach approval
        await sendChat(session_id ?? instanceId, {
          agent_key: canonical_character_id,
          message: will_override
            ? `[CHARACTER_SECOND_THOUGHTS] Your coach just approved and processed your financial decision (${pending_decision.description} - $${pending_decision.amount?.toLocaleString()}) saying: "${coach_message}". The transaction is complete. However, your psychological state makes you have second thoughts now that it's done. Respond authentically - maybe you're having buyer's remorse, anxiety, or questioning the decision despite the coach's support.`
            : `[CHARACTER_GRATEFUL] Your coach just approved and processed your financial decision (${pending_decision.description} - $${pending_decision.amount?.toLocaleString()}) saying: "${coach_message}". The transaction is complete and you feel good about following their guidance. Respond authentically based on your personality, expressing appreciation for their support and confidence in the decision.`,
          chat_type: 'financial_advisor',
          userchar_id: instanceId,
          character_id: canonical_character_id,
          meta: {
            userchar_id: instanceId,
            domain: 'financial',
            reaction_context: approval_reaction_context
          }
        });

      } catch (error) {
        console.error('Error committing financial decision:', error);
        outcome = await processDecisionOutcome(pending_decision, 'rejected', trust_level, stress_level);
        coach_message = 'There was an error processing this decision. Please try again.';

        // Add error message directly to chat (avoid triggering AI system)
        const error_message: Message = {
          id: crypto.randomUUID(),
          type: 'coach',
          content: coach_message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, error_message]);
      } finally {
        setIsCommittingDecision(false);
      }
    } else {
      // Character's choice - use REST API with affordability checks
      try {
        const result = await commitFinancialDecision(pending_decision);

        if (!result.success) {
          // Handle unaffordable loans and other errors
          console.log('🚨 LOAN REJECTED - Error handling triggered:', result.error);

          // 1. Character announces their decision (LEFT side)
          const character_decision: Message = {
            id: crypto.randomUUID(),
            type: 'contestant',
            content: `Perfect! I've decided - I'm going to get this ${pending_decision.description}. Let me apply for the financing right now.`,
            timestamp: new Date()
          };

          // 2. System rejection message (CENTER)
          let system_message = '🏦 Loan Application DENIED - Insufficient income for qualification';
          if (result.error === 'insufficient_funds') {
            system_message = '💳 Purchase DENIED - Insufficient funds in wallet';
          }

          const system_rejection: Message = {
            id: crypto.randomUUID(),
            type: 'system',
            content: system_message,
            timestamp: new Date()
          };

          console.log('🚨 ADDING DECISION AND SYSTEM REJECTION TO CHAT');
          setMessages(prev => [...prev, character_decision, system_rejection]);

          // 3. Trigger character reaction to the system denial
          setTimeout(async () => {
            try {
              console.log('🚨 TRIGGERING CHARACTER REACTION TO LOAN REJECTION');
              const extendedResult = result as { success: boolean; error?: string; monthly_payment_required?: number; monthly_income_required?: number; current_monthly_income?: number };
              const reaction_response = await triggerCharacterReactionAfterSystemEvent({
                agent_key: selected_character.character_id,
                userchar_id: selected_character.id,
                domain: 'financial',
                reason_code: result.error,
                details: {
                  monthly_payment_required: extendedResult.monthly_payment_required,
                  monthly_income_required: extendedResult.monthly_income_required,
                  current_monthly_income: extendedResult.current_monthly_income
                },
                session_id: session_id
              });

              console.log('🚨 GOT CHARACTER REACTION RESPONSE:', reaction_response);

              // Add the character's authentic reaction to the chat
              if (reaction_response.text) {
                const reaction_message: Message = {
                  id: crypto.randomUUID(),
                  type: 'contestant',
                  content: reaction_response.text,
                  timestamp: new Date()
                };
                console.log('🚨 ADDING REACTION MESSAGE TO CHAT:', reaction_message.content);
                setMessages(prev => [...prev, reaction_message]);
              } else {
                console.log('🚨 NO TEXT IN REACTION RESPONSE');
              }
            } catch (error) {
              console.error('🚨 FAILED TO GET CHARACTER REACTION:', error);
            }
          }, 500);

          // Process the rejection outcome
          outcome = await processDecisionOutcome(pending_decision, 'rejected', trust_level, stress_level);

          setIsCommittingDecision(false);
          setPendingDecision(null);
          return;
        }

        // Success - update character financials and send confirmation
        if (result && selected_character) {
          selected_character.wallet = result.wallet;
          selected_character.debt = result.debt;
        }

        outcome = await processDecisionOutcome(pending_decision, 'character_choice', trust_level, stress_level);
        const price_cents = Math.round((pending_decision.amount ?? 0) * 100);
        if (typeof selected_character.wallet !== 'number') {
          throw new Error('wallet must be a number from database');
        }
        const payment_method = (selected_character.wallet * 100) >= price_cents ? 'cash' : 'debt';

        if (payment_method === 'debt') {
          const monthly_payment = Math.round(price_cents * (0.1299 / 12) / (1 - Math.pow(1 + (0.1299 / 12), -24)));
          coach_message = `Your character proceeded with financing: $${(price_cents / 100).toLocaleString()} (~$${(monthly_payment / 100).toFixed(0)}/month for 24 months).`;
        } else {
          coach_message = `Your character made the purchase with cash: $${(price_cents / 100).toLocaleString()}. Wallet updated.`;
        }

        // Add success message directly to chat (avoid triggering AI system)
        const success_message: Message = {
          id: crypto.randomUUID(),
          type: 'coach',
          content: coach_message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, success_message]);

      } catch (error) {
        console.error('Error committing character choice decision:', error);
        outcome = await processDecisionOutcome(pending_decision, 'rejected', trust_level, stress_level);
        coach_message = 'There was an error processing your character\'s decision. Please try again.';

        // Add error message directly to chat (avoid triggering AI system)
        const error_message: Message = {
          id: crypto.randomUUID(),
          type: 'coach',
          content: coach_message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, error_message]);
      } finally {
        setIsCommittingDecision(false);
      }
    }

    // Add coach message to chat (only if new immediate reaction system didn't handle it)
    if (!reaction_handled_ref.current) {
      const coach_response_message: Message = {
        id: crypto.randomUUID(),
        type: 'coach',
        content: coach_message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, coach_response_message]);
    }

    // Add detailed decision announcement
    // Removed wallet calculation - backend handles payment method determination
    const price_cents = Math.round((pending_decision.amount ?? 0) * 100);
    const payment_method = 'debt'; // Backend determines actual payment method

    // Determine coach scoring for announcement
    const character_action = decision_type === 'bad' ? 'reject' : 'approve';
    const followed_coach = last_coach_recommendation ? (
      (decision_type === 'good' && last_coach_recommendation === 'approve') ||
      (decision_type === 'bad' && last_coach_recommendation === 'reject') ||
      (decision_type === 'character_choice' && last_coach_recommendation === 'approve')
    ) : null;
    // Legacy coach reward system removed - no longer tracking points

    // Only show old-style decision messages if new immediate reaction system didn't handle it
    if (!reaction_handled_ref.current) {
      let announcement_content = '';
      if (decision_type === 'bad') {
        announcement_content = `Decision rejected: ${pending_decision.description} ($${(pending_decision.amount ?? 0).toLocaleString()})`;
      } else if (payment_method === 'debt') {
        const monthly_amount = Math.round(price_cents * (0.1299 / 12) / (1 - Math.pow(1 + (0.1299 / 12), -24)));
        announcement_content = `Decision committed: ${pending_decision.description} ($${(pending_decision.amount ?? 0).toLocaleString()}) via financing @ 12.99% • 24 mo • ~$${(monthly_amount / 100).toFixed(0)}/mo`;
      } else {
        announcement_content = `Decision committed: ${pending_decision.description} ($${(pending_decision.amount ?? 0).toLocaleString()}) (cash)`;
      }

      const decision_message: Message = {
        id: crypto.randomUUID(),
        type: 'system',
        content: announcement_content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, decision_message]);
    }

    // Send through HTTP API for character response
    if (connected && !reaction_handled_ref.current) {
      setIsLoading(true);

      // Use the same format as handleSendMessage for consistency
      // Using canonical_character_id from component scope

      // Get living context and event context for robust response
      const getLivingContext = async () => {
        try {
          const conflictService = ConflictContextService.getInstance();
          return await conflictService.generateLivingContext(selected_character.id);
        } catch (error) {
          console.warn('⚠️ Could not generate living context:', error);
          return `Living in team quarters with other legendary figures. Current living situation affects financial decisions and stress levels.`;
        }
      };

      const getEventContext = async () => {
        try {
          const event_contextService = EventContextService.getInstance();
          const context_string = await event_contextService.getPerformanceContext(selected_character.id);
          return context_string ? {
            recent_events: context_string,
            relationships: '',
            emotional_state: 'processing_financial_decision',
            domain_specific: 'financial_coaching'
          } : null;
        } catch (error) {
          console.warn('⚠️ Could not generate event context:', error);
          return null;
        }
      };

      // Get contexts and send message
      const sendMessage = async () => {
        const living_context = await getLivingContext();
        const event_context = await getEventContext();

        // Check if we have a valid financial tier
        if (!financial_tier) {
          console.error(`Cannot provide financial coaching without tier data for ${selected_character.name || selected_character.id}`);
          return;
        }

        // Use the proper FinancialPromptTemplateService
        const financial_prompt = FinancialPromptTemplateService.generatePrompt({
          character_id: selected_character.id,
          character_name: selected_character.name,
          coach_input: coach_message,
          financial_state: {
            wallet: selected_character.wallet,
            monthly_earnings: selected_character.monthly_earnings,
            financial_stress: selected_character.financial_stress,
            coach_trust_level: selected_character.coach_financial_trust,
            spending_personality: selected_character.financial_personality?.spending_style,
            recent_decisions: selected_character.recent_decisions,
            financial_tier: financial_tier
          },
          decision: pending_decision ? {
            id: pending_decision.id,
            description: pending_decision.description,
            amount: pending_decision.amount,
            options: pending_decision.options,
            reasoning: pending_decision.character_reasoning,
            urgency: pending_decision.urgency
          } : undefined,
          conversation_type: 'advice'
        });

        console.log('🔧 Sending preset decision message:', {
          message: coach_message,
          character: canonical_character_id,
          decision_type,
          outcome,
          is_connected: connected
        });

        // Message handling using universal chat library
        setIsLoading(false);

        const agent_key2 = mustResolveAgentKey(selected_character?.name, canonical_character_id, 'financial');
        const coachPromptWithTag = ensureBrevityTag(coach_message, BREVITY_TAGS.finance);

        logAgentKey('finance-decision', { character_id: canonical_character_id, agent_key: agent_key2, decision_type, outcome });

        const { text: raw_text2 = '' } = await singleFlight(
          chatFlightKey('finance-decision', session_id || 'default', agent_key2),
          () => sendChat(session_id ?? instanceId, {
            agent_key: agent_key2,
            message: coachPromptWithTag,
            chat_type: 'financial_advisor',
            topic,
            userchar_id: instanceId,                     // <-- Add userchar_id as top-level param
            character_id: canonical_character_id,          // <-- canonical for DB/agent
            meta: {
              userchar_id: instanceId,                   // <-- instance for UI/session
              character_idCanonical: canonical_character_id,
              wallet: character_for_chat.wallet,
              debt: character_for_chat.debt,
              financial_stress: character_for_chat.financial_stress,
              coach_financial_trust: character_for_chat.coach_financial_trust,
              recent_decisions: character_for_chat.recent_decisions,
              domain: 'financial',
              domain_specific: 'financial',
              // Removed walletCents - backend queries wallet from DB
              monthly_income: 0,  // TODO: Add real income data when available
              employed: false,        // TODO: Add real employment data when available
            },
            character_data: {
              name: selected_character?.name,
              archetype: selected_character.archetype,
              level: selected_character.level,
              personality: selected_character.personality || {
                traits: ['Money-conscious'],
                speech_style: 'Direct',
                motivations: ['Financial security'],
                fears: ['Poverty'],
                relationships: []
              },
              // Add living context and event context
              living_context: living_context,
              event_context: event_context,
              // Add financial coaching context
              conversation_context: financial_prompt,
              // Character stats
              strength: selected_character.strength,
              dexterity: selected_character.dexterity,
              defense: selected_character.defense,
              intelligence: selected_character.intelligence,
              wisdom: selected_character.wisdom,
              charisma: selected_character.charisma,
              spirit: selected_character.spirit,
              // Combat stats - flat
              attack: selected_character.attack,
              speed: selected_character.speed,
              health: selected_character.health,
              max_health: selected_character.max_health,
              // Current status
              current_health: selected_character.health,
              injuries: selected_character.injuries,
              bond_level: selected_character.bond_level || selected_character.display_bond_level,
              // Financial-specific context
              financial_stats: {
                wallet: selected_character.wallet,
                monthly_earnings: selected_character.monthly_earnings,
                financial_stress: selected_character.financial_stress,
                coach_trust_level: selected_character.coach_financial_trust,
                spending_personality: selected_character.financial_personality?.spending_style,
                recent_decisions: selected_character.recent_decisions
              },
              // Pending decision context (should be null after decision is made)
              pending_financial_decision: null,
              // Decision context
              decision_outcome: outcome,
              coach_decision: decision_type,

              // Domain-specific coaching context enhanced with proper templates
              session_context: {
                type: 'financial_advisory',
                has_decision: false, // Decision was just processed
                focus_areas: ['Financial planning', 'Money decisions', 'Spending habits', 'Financial stress', 'Investment choices', 'Budgeting'],
                coaching_approach: 'Character-specific financial guidance with era-appropriate perspectives'
              }
            },
            previous_messages: messages.slice(-5).map(msg => ({
              role: msg.type === 'coach' ? 'user' : 'assistant',
              content: msg.content
            }))
          })
        );

        const text2 = twoSentenceCap(extractAssistantText(raw_text2));
        logResponse('finance-decision', { raw_length: raw_text2.length, capped_length: text2.length });

        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'contestant',
          content: text2 || 'Welcome to financial coaching!',
          timestamp: new Date()
        }]);
      };

      sendMessage().catch(error => {
        console.error('❌ Error sending preset decision message:', error);
        setIsLoading(false);
      });
    }

    // Clear pending decision
    setPendingDecision(null);
  };

  // Fetch financial decisions from backend (backend handles roll + generation)
  useEffect(() => {
    const char_id = selected_character?.id;
    console.log('🤖 [DECISION FETCH] Effect firing:', { char_id, has_character: !!selected_character, has_generated: generated_for_char_ref.current === char_id, has_pending: !!pending_decision });
    if (!char_id) return;
    if (generated_for_char_ref.current === char_id || pending_decision) return;
    if (gen_timer_ref.current) clearTimeout(gen_timer_ref.current);
    console.log('🤖 Setting decision fetch timer for character:', char_id);
    gen_timer_ref.current = window.setTimeout(async () => {
      console.log('🤖 Timer fired, fetching decision from backend...');
      try {
        const d = await fetchPendingDecisionFromBackend(char_id);
        if (d) {
          console.log('🤖 Got decision from backend:', d);
          setPendingDecision(d);
          setMessages(p => [...p, {
            id: crypto.randomUUID(), type: 'decision', timestamp: new Date(),
            content: `Oh, by the way coach... I ${d.description} for about $${d.amount.toLocaleString()}. ${d.character_reasoning} What do you think I should do?`,
            decision: { id: d.id, amount: d.amount, options: d.options, reasoning: d.character_reasoning, urgency: d.urgency }
          }]);
          generated_for_char_ref.current = char_id;
        } else {
          console.log('🤖 No decision triggered by backend');
        }
      } catch (error) {
        console.error('🤖 Error fetching decision from backend:', error);
      }
    }, 800);
    return () => { if (gen_timer_ref.current) clearTimeout(gen_timer_ref.current); };
  }, [selected_character?.id, pending_decision]);

  // DISABLED greeting that was causing duplicate scene-setting messages  
  useEffect(() => {
    return;
    if (!session_id || greeted_ref.current) return;
    greeted_ref.current = true; // guarantee one-time greeting per session
    // Send initial greeting via HTTP adapter (sendViaAIChat)
    const initializeChat = async () => {
      try {
        // Using canonical_character_id from component scope
        const conflictService = ConflictContextService.getInstance();
        const event_contextService = EventContextService.getInstance();

        console.log('🆔 Financial greeting using character ID:', canonical_character_id, 'for character:', selected_character.name);

        // STRICT MODE: Living context must be available
        const living_context = await conflictService.generateLivingContext(character_for_chat.id);
        if (!living_context) {
          throw new Error(`STRICT MODE: Living context not available for character ${character_for_chat.id}`);
        }
        console.log('✅ Living context loaded for financial greeting:', living_context);

        // STRICT MODE: Event context must be available
        const context_string = await event_contextService.getPerformanceContext(canonical_character_id);
        if (!context_string) {
          throw new Error(`STRICT MODE: Event context not available for character ${canonical_character_id}`);
        }
        const event_context = {
          recent_events: context_string,
          relationships: '',
          emotional_state: 'meeting_financial_coach',
          domain_specific: 'financial_coaching_greeting'
        };

        // Generate proper financial coaching context for greeting
        const greeting_message = "Hello! I wanted to talk to you about your finances.";
        const greeting_prompt = `You are ${selected_character?.name}, a legendary figure, meeting with your team's financial advisor for the first time.

SESSION TYPE: Financial Advisory Introduction

FINANCIAL COACHING CONTEXT:
- Current wallet: $${selected_character.wallet?.toLocaleString()}
- Monthly earnings: $${selected_character.monthly_earnings?.toLocaleString()}
- Financial stress level: ${selected_character.financial_stress}%
- Trust in coach: ${selected_character.coach_financial_trust}%
- Spending personality: ${selected_character.financial_personality?.spending_style}
- Recent decisions: ${selected_character.recent_decisions?.length} previous financial choices

CHARACTER FINANCIAL PSYCHOLOGY:
- You are a legendary figure from your era, so modern financial concepts might be foreign or fascinating
- React to financial advice based on your background and personality
- Your trust level (${selected_character.coach_financial_trust}%) affects how you receive coaching
- Your financial stress (${selected_character.financial_stress}%) influences your openness
- Your spending personality (${selected_character.financial_personality?.spending_style}) shapes your money attitudes

FINANCIAL COACHING SESSION GUIDELINES:
- This is the start of a financial coaching relationship
- Respond authentically as ${selected_character?.name} would to meeting a financial advisor
- Show your character's initial reaction to financial guidance based on your era and personality
- Consider whether you'd be skeptical, curious, defensive, or eager about financial help
- Your response sets the tone for the financial coaching relationship

Respond as ${selected_character?.name} would when first meeting a financial coach, showing authentic reactions based on your character background and relationship with money.`;

        // Use universal chat library for greeting
        const agent_key3 = mustResolveAgentKey(selected_character?.name, canonical_character_id, 'financial');
        const greeting_promptWithTag = ensureBrevityTag(greeting_prompt, BREVITY_TAGS.finance);

        logAgentKey('finance-greeting', { character_id: canonical_character_id, agent_key: agent_key3, name: selected_character.name });

        const { text: raw_text3 = '' } = await singleFlight(
          chatFlightKey('finance-greeting', session_id || 'default', agent_key3),
          () => sendChat(session_id ?? instanceId, {
            agent_key: agent_key3,
            message: greeting_promptWithTag,
            chat_type: 'financial_advisor',
            topic,
            userchar_id: instanceId,
            character_id: canonical_character_id,          // <-- canonical for DB/agent
            meta: {
              userchar_id: instanceId,                   // <-- instance for UI/session
              character_idCanonical: canonical_character_id,
              wallet: character_for_chat.wallet,
              debt: character_for_chat.debt,
              financial_stress: character_for_chat.financial_stress,
              coach_financial_trust: character_for_chat.coach_financial_trust,
              recent_decisions: character_for_chat.recent_decisions,
              domain: 'financial',
              domain_specific: 'financial',
              // Removed walletCents - backend queries wallet from DB
              monthly_income: 0,  // TODO: Add real income data when available
              employed: false,        // TODO: Add real employment data when available
            },
            character_data: {
              name: selected_character?.name,
              archetype: selected_character.archetype,
              level: selected_character.level,
              personality: selected_character.personality || {
                traits: ['Money-conscious'],
                speech_style: 'Direct',
                motivations: ['Financial security'],
                fears: ['Poverty'],
                relationships: []
              },
              // Add living context for conflict awareness
              living_context: living_context,
              // Add centralized event context
              event_context: event_context,
              // Character stats
              strength: selected_character.strength,
              dexterity: selected_character.dexterity,
              defense: selected_character.defense,
              intelligence: selected_character.intelligence,
              wisdom: selected_character.wisdom,
              charisma: selected_character.charisma,
              spirit: selected_character.spirit,
              // Combat stats - flat
              attack: selected_character.attack,
              speed: selected_character.speed,
              health: selected_character.health,
              max_health: selected_character.max_health,
              // Current status
              current_health: selected_character.health,
              injuries: selected_character.injuries,
              bond_level: selected_character.bond_level || selected_character.display_bond_level,
              // Financial-specific context
              financial_stats: {
                wallet: selected_character.wallet,
                monthly_earnings: selected_character.monthly_earnings,
                financial_stress: selected_character.financial_stress,
                coach_trust_level: selected_character.coach_financial_trust,
                spending_personality: selected_character.financial_personality?.spending_style,
                recent_decisions: selected_character.recent_decisions
              },
              // Add comprehensive financial coaching conversation context like CoachingSessionChat
              conversation_context: `${greeting_prompt}`,

              // Domain-specific coaching context enhanced with proper templates
              session_context: {
                type: 'financial_advisory',
                has_decision: false,
                focus_areas: ['Financial planning', 'Money decisions', 'Initial assessment', 'Trust building'],
                coaching_approach: 'Character-specific financial introduction with era-appropriate perspectives',
                session_stage: 'greeting'
              }
            },
            previous_messages: []
          })
        );

        const text3 = twoSentenceCap(extractAssistantText(raw_text3));
        logResponse('finance-greeting', { raw_length: raw_text3.length, capped_length: text3.length });

        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'contestant',
          content: text3 || 'Welcome to financial coaching!',
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error('Failed to initialize financial chat:', error);
        const error_message: Message = {
          id: crypto.randomUUID(),
          type: 'system',
          content: `Error initializing chat: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        };
        setMessages([error_message]);
      }
    };

    initializeChat().catch((error) => {
      console.error('Failed to initialize financial chat:', error);
      const error_message: Message = {
        id: crypto.randomUUID(),
        type: 'system',
        content: `Error initializing chat: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages([error_message]);
    });

    // Decision fetching is handled by the separate useEffect that calls fetchPendingDecisionFromBackend
    // do NOT reset did_init_ref on unmount; that defeats the guard in StrictMode
  }, [session_id]); // IMPORTANT: only depend on session_id, not selected_character/topic/etc.

  if (!character_for_chat) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>Select a character to start financial coaching</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-green-400" />
          <h3 className="text-xl font-bold text-white">Financial Advisor Chat with {character_for_chat.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400">
            {connected ? 'Connected' : connectionError || 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Financial Status Bar */}
      <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-700/30 rounded-lg">
        <div className="text-center">
          <div className="text-sm text-gray-400">Wallet</div>
          <div className="text-lg font-bold text-green-400">${character_for_chat.wallet.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400">Stress</div>
          <div className={`text-lg font-bold ${character_for_chat.financial_stress > 50 ? 'text-red-400' : 'text-blue-400'}`}>
            {character_for_chat.financial_stress}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400">Trust</div>
          <div className="text-lg font-bold text-purple-400">{character_for_chat.coach_financial_trust}%</div>
        </div>
      </div>

      {/* Budget Allocation Section */}
      <BudgetAllocationUI
        selected_character={selected_character}
        onBudgetUpdate={(equipmentBudget: number, consumables_budget: number) => {
          // Update character's financial data with new budgets
          // Note: equipment_budget and consumables_budget need to be added to Character type
        }}
      />

      {/* Chat Messages */}
      <div className="h-96 overflow-y-auto mb-4 space-y-3 p-4 bg-gray-900/30 rounded-lg">
        {messages.map((message, index) => (
          <SafeMotion
            key={message.messageId || message.id || `${message.timestamp}-${message.type}-${index}`}
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: isMobile ? 0.1 : 0.3 }}
            class_name={`flex ${message.type === 'coach' ? 'justify-end' : message.type === 'system' ? 'justify-center' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${message.type === 'coach'
              ? 'bg-green-600 text-white'
              : message.type === 'decision'
                ? 'bg-yellow-600/80 text-white border-2 border-yellow-400'
                : message.type === 'system'
                  ? 'bg-gray-600/50 text-gray-300 border border-gray-500 text-center'
                  : 'bg-gray-700 text-gray-100'
              }`}>
              {message.type === 'decision' && (
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-semibold">Financial Decision</span>
                </div>
              )}
              <p className="text-sm">{message.content}</p>
              {message.decision && (
                <div className="mt-2 pt-2 border-t border-yellow-300/30">
                  <div className="text-xs text-yellow-200">
                    <strong>Options:</strong> {message.decision.options.join(', ')}
                  </div>
                  <div className="text-xs text-yellow-200 mt-1">
                    <strong>Urgency:</strong> {message.decision.urgency}
                  </div>
                </div>
              )}
            </div>
          </SafeMotion>
        ))}
        {is_loading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messages_end_ref} />
      </div>


      {/* Preset Decision Buttons */}
      {pending_decision && (
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">Coach recommendation:</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handlePresetDecision('bad')}
              disabled={is_committing_decision}
              className={`p-3 bg-red-600/20 border border-red-500 rounded-lg text-sm text-red-300 transition-all flex flex-col items-center gap-1 ${is_committing_decision ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600/30'
                }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Bad Decision</span>
              <span className="text-xs opacity-75">Reject & explain risks</span>
            </button>
            <button
              onClick={() => handlePresetDecision('good')}
              disabled={is_committing_decision}
              className={`p-3 bg-green-600/20 border border-green-500 rounded-lg text-sm text-green-300 transition-all flex flex-col items-center gap-1 ${is_committing_decision ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600/30'
                }`}
            >
              {is_committing_decision ? (
                <div className="w-4 h-4 border-2 border-green-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              <span>{is_committing_decision ? 'Processing...' : 'Good Decision'}</span>
              <span className="text-xs opacity-75">Approve & support</span>
            </button>
            <button
              onClick={() => handlePresetDecision('character_choice')}
              disabled={is_committing_decision}
              className={`p-3 bg-blue-600/20 border border-blue-500 rounded-lg text-sm text-blue-300 transition-all flex flex-col items-center gap-1 ${is_committing_decision ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600/30'
                }`}
            >
              {is_committing_decision ? (
                <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4" />
              )}
              <span>{is_committing_decision ? 'Processing...' : "Character's Choice"}</span>
              <span className="text-xs opacity-75">Let them decide</span>
            </button>
          </div>
        </div>
      )}

      {/* Chat Feedback */}
      {last_feedback && (
        <ChatFeedback feedback_data={last_feedback} />
      )}

      {/* Topic Selector - Hidden, not needed for normal use */}
      {false && (
        <div className="mb-2 flex items-center gap-2">
          <label className="text-sm opacity-80">Topic</label>
          <select
            className="bg-gray-900/40 rounded px-2 py-1"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="">(none)</option>
            {FIN_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      {/* Message Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input_message}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={pending_decision ? "Give financial advice..." : "Chat with your character..."}
          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
          disabled={is_loading || !connected}
        />
        <button
          onClick={handleSendMessage}
          disabled={is_loading || !input_message.trim() || !connected}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FinancialAdvisorChat;
