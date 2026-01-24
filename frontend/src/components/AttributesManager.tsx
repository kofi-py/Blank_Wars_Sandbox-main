'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  Shield,
  Zap
} from 'lucide-react';
import {
  allocateAttributes,
  AttributeAdherenceResult,
  AttributeAllocation,
  AttributeStat,
  CharacterAttributesResponse,
  submitAttributeSurveyChoice,
  AttributeSurveyOption,
  getCharacterAttributes
} from '../services/attributesAPI';
import { sendViaAIChat } from '../services/chatAdapter';

interface AttributesManagerProps {
  character_id: string;
  character_name: string;
  coach_name: string;
}

interface ChatMessage {
  id: number;
  sender: 'coach' | 'character' | 'system';
  message: string;
  timestamp: number;
  speaker_name: string;
  speaker_id: string;
}

const ATTRIBUTE_ORDER = ['strength', 'attack', 'defense', 'speed', 'intelligence', 'wisdom', 'charisma', 'spirit', 'energy', 'stamina'];

export default function AttributesManager({ character_id, character_name, coach_name }: AttributesManagerProps) {
  const [data, setData] = useState<CharacterAttributesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [adherenceResult, setAdherenceResult] = useState<AttributeAdherenceResult | null>(null);
  const [surveyOptions, setSurveyOptions] = useState<AttributeSurveyOption[] | undefined>(undefined);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    loadAttributes();
  }, [character_id]);

  const orderedAttributes: AttributeStat[] = useMemo(() => {
    if (!data?.attributes) return [];
    const map = new Map<string, AttributeStat>();
    data.attributes.forEach(attr => map.set(attr.id, attr));
    const ordered: AttributeStat[] = [];
    ATTRIBUTE_ORDER.forEach(id => {
      const attr = map.get(id);
      if (attr) ordered.push(attr);
    });
    data.attributes.forEach(attr => {
      if (!ATTRIBUTE_ORDER.includes(attr.id)) {
        ordered.push(attr);
      }
    });
    return ordered;
  }, [data?.attributes]);

  const totalAllocated = useMemo(() => Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0), [allocations]);
  const availablePoints = data?.character.unspent_attribute_points ?? 0;
  const pointsRemaining = availablePoints - totalAllocated;
  const overAllocated = pointsRemaining < 0;

  const loadAttributes = async () => {
    setLoading(true);
    setError(null);
    setAdherenceResult(null);
    setSurveyOptions(undefined);
    try {
      const response = await getCharacterAttributes(character_id);
      setData(response);
      setAllocations({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attributes');
    } finally {
      setLoading(false);
    }
  };

  const adjustAllocation = (attribute_id: string, delta: number) => {
    setAllocations(prev => {
      const current = prev[attribute_id] || 0;
      const next = Math.max(0, current + delta);
      const draft = { ...prev, [attribute_id]: next };
      return draft;
    });
  };

  const setAllocationValue = (attribute_id: string, value: number) => {
    if (Number.isNaN(value) || value < 0) return;
    setAllocations(prev => ({ ...prev, [attribute_id]: value }));
  };

  const submitAllocations = async () => {
    if (!data) return;
    if (totalAllocated <= 0) {
      setError('Allocate at least one point before submitting.');
      return;
    }
    if (overAllocated) {
      setError('Reduce allocations to match available points.');
      return;
    }

    const payload: AttributeAllocation[] = Object.entries(allocations)
      .filter(([, points]) => points > 0)
      .map(([attribute_id, points]) => ({ attribute_id, points }));

    if (payload.length === 0) {
      setError('No attribute points allocated.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const result = await allocateAttributes({
        character_id,
        allocations: payload,
        source: 'coach'
      });
      setAdherenceResult(result);
      setSurveyOptions(result.survey_options);

      if (result.success && result.adhered && !result.survey_required) {
        await loadAttributes();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit allocation');
    } finally {
      setActionLoading(false);
    }
  };

  const submitSurvey = async (option: AttributeSurveyOption) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await submitAttributeSurveyChoice({
        character_id,
        survey_option_id: option.id
      });
      setAdherenceResult(result);
      setSurveyOptions(undefined);
      await loadAttributes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit survey choice');
    } finally {
      setActionLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const text = chatInput.trim();
    const coachMessage: ChatMessage = {
      id: Date.now(),
      sender: 'coach',
      message: text,
      timestamp: Date.now(),
      speaker_name: coach_name,
      speaker_id: 'coach'
    };
    setChatMessages(prev => [...prev, coachMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const reply = await sendViaAIChat('attributes', {
        domain: 'attributes',
        message: text,
        userchar_id: character_id,
        character: character_id,
        agent_key: character_id,
        messages: chatMessages.slice(-5),
        meta: {
          userchar_id: character_id,
          character_name: character_name
        }
      });

      const characterMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: 'character',
        message: reply.text,
        timestamp: Date.now(),
        speaker_name: character_name,
        speaker_id: character_id
      };
      setChatMessages(prev => [...prev, characterMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-300">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading attributes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/40 border border-red-700 text-red-200 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {data.character.name} — Attributes
          </h2>
          <p className="text-gray-400 text-sm">
            Level {data.character.level} • Unspent points: {availablePoints}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-2 rounded-lg text-sm ${pointsRemaining >= 0 ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
            {pointsRemaining >= 0 ? `${pointsRemaining} points remaining` : `Over by ${Math.abs(pointsRemaining)}`}
          </div>
          <button
            onClick={() => setAllocations({})}
            className="px-3 py-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 text-sm"
          >
            Reset
          </button>
          <button
            onClick={submitAllocations}
            disabled={actionLoading || overAllocated || totalAllocated <= 0}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${actionLoading || overAllocated || totalAllocated <= 0
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
          >
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Plan
          </button>
        </div>
      </div>

      {adherenceResult && (
        <div className={`p-4 rounded-lg border ${adherenceResult.adhered ? 'border-green-500/50 bg-green-900/30' : 'border-amber-500/50 bg-amber-900/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            {adherenceResult.adhered ? <CheckCircle2 className="w-5 h-5 text-green-300" /> : <AlertTriangle className="w-5 h-5 text-amber-300" />}
            <div className="text-sm text-white font-semibold">
              {adherenceResult.adhered ? 'Coach plan accepted' : 'Adherence failed — character will decide'}
            </div>
          </div>
          <p className="text-gray-200 text-sm mb-3">{adherenceResult.message || (adherenceResult.adhered ? 'Allocation approved.' : 'Character is contesting the plan.')}</p>
          {!adherenceResult.adhered && adherenceResult.survey_required && surveyOptions && (
            <div className="space-y-2">
              <div className="text-sm text-gray-300 font-semibold">Character survey options</div>
              <div className="grid md:grid-cols-2 gap-3">
                {surveyOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => submitSurvey(option)}
                    className="p-3 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-left text-gray-200 border border-gray-700 flex flex-col gap-2"
                    disabled={actionLoading}
                  >
                    <div className="font-semibold">{option.label}</div>
                    {option.rationale && <div className="text-xs text-gray-400">{option.rationale}</div>}
                    <div className="text-xs text-gray-300">
                      {option.allocations.map(a => `${a.attribute_id}+${a.points}`).join(' • ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orderedAttributes.map(attr => {
          const allocation = allocations[attr.id] || 0;
          const projected = attr.value + allocation;
          return (
            <div key={attr.id} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold capitalize flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-300" />
                    {attr.name}
                  </div>
                  <div className="text-xs text-gray-400">{attr.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Current</div>
                  <div className="text-xl text-white font-bold">{attr.value}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustAllocation(attr.id, -1)}
                  className="px-2 py-1 rounded bg-gray-800 text-gray-200 hover:bg-gray-700"
                  disabled={allocation <= 0}
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={allocation}
                  onChange={(e) => setAllocationValue(attr.id, Number(e.target.value))}
                  className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-center"
                />
                <button
                  onClick={() => adjustAllocation(attr.id, 1)}
                  className="px-2 py-1 rounded bg-gray-800 text-gray-200 hover:bg-gray-700"
                >
                  +
                </button>
                <div className="ml-auto text-sm text-gray-300">
                  → <span className="font-semibold text-white">{projected}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Zap className="w-4 h-4 text-yellow-300" />
            Adherence & Rationale
          </div>
          <p className="text-sm text-gray-300">
            Coach submits the plan. If adherence fails, the system prompts the character with survey options. Character choices are permanent.
          </p>
          <div className="text-sm text-gray-400">
            Coach notes (optional) are pulled from the latest chat message.
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white font-semibold">
              <MessageCircle className="w-4 h-4 text-blue-300" />
              Character Pitch / Coach Discussion
            </div>
            {chatLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-300" />}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-64">
            {chatMessages.length === 0 && (
              <div className="text-sm text-gray-500">
                Start the conversation to hear the character&apos;s pitch for attribute allocation.
              </div>
            )}
            {chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`p-2 rounded-lg text-sm ${msg.sender === 'coach'
                  ? 'bg-blue-900/40 text-blue-100'
                  : msg.sender === 'character'
                    ? 'bg-purple-900/40 text-purple-100'
                    : 'bg-gray-800 text-gray-200'
                  }`}
              >
                <div className="font-semibold capitalize text-xs mb-1">
                  {msg.sender}
                </div>
                <div>{msg.message}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask the character how they want to spend points..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
            <button
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${chatLoading || !chatInput.trim()
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
