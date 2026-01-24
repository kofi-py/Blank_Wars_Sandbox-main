'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Heart,
  Loader2,
  Sparkles,
  Zap,
  type LucideIcon
} from 'lucide-react';
import {
  allocateResources,
  getCharacterResources,
  ResourceAdherenceResult,
  ResourceAllocation,
  ResourceStat,
  CharacterResourcesResponse,
  ResourceSurveyOption,
  submitResourceSurveyChoice
} from '../services/resourcesAPI';

interface ResourcesManagerProps {
  character_id: string;
  character_name?: string;
}

const RESOURCE_ICONS: Record<string, LucideIcon> = {
  current_max_health: Heart,
  current_max_energy: Zap,
  current_max_mana: Sparkles
};

const RESOURCE_COLORS: Record<string, string> = {
  current_max_health: 'text-red-400',
  current_max_energy: 'text-yellow-400',
  current_max_mana: 'text-blue-400'
};

const RESOURCE_BG: Record<string, string> = {
  current_max_health: 'bg-red-900/30 border-red-700/50',
  current_max_energy: 'bg-yellow-900/30 border-yellow-700/50',
  current_max_mana: 'bg-blue-900/30 border-blue-700/50'
};

export default function ResourcesManager({ character_id, character_name }: ResourcesManagerProps) {
  const [data, setData] = useState<CharacterResourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [adherenceResult, setAdherenceResult] = useState<ResourceAdherenceResult | null>(null);
  const [surveyOptions, setSurveyOptions] = useState<ResourceSurveyOption[] | undefined>(undefined);

  useEffect(() => {
    loadResources();
  }, [character_id]);

  const totalAllocated = useMemo(() => Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0), [allocations]);
  const availablePoints = data?.character.unspent_resource_points ?? 0;
  const pointsRemaining = availablePoints - totalAllocated;
  const overAllocated = pointsRemaining < 0;

  const loadResources = async () => {
    setLoading(true);
    setError(null);
    setAdherenceResult(null);
    setSurveyOptions(undefined);
    try {
      const response = await getCharacterResources(character_id);
      setData(response);
      setAllocations({});
      if (response.pending_survey && response.pending_survey.length > 0) {
        setSurveyOptions(response.pending_survey);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const adjustAllocation = (resource_id: string, delta: number) => {
    setAllocations(prev => {
      const current = prev[resource_id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [resource_id]: next };
    });
  };

  const setAllocationValue = (resource_id: string, value: number) => {
    if (Number.isNaN(value) || value < 0) return;
    setAllocations(prev => ({ ...prev, [resource_id]: value }));
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

    const payload: ResourceAllocation[] = Object.entries(allocations)
      .filter(([, points]) => points > 0)
      .map(([resource_id, points]) => ({ resource_id, points }));

    if (payload.length === 0) {
      setError('No resource points allocated.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const result = await allocateResources({
        character_id,
        allocations: payload
      });
      setAdherenceResult(result);
      setSurveyOptions(result.survey_options);

      if (result.success && result.adhered && !result.survey_required) {
        await loadResources();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit allocation');
    } finally {
      setActionLoading(false);
    }
  };

  const submitSurvey = async (option: ResourceSurveyOption) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await submitResourceSurveyChoice({
        character_id,
        survey_option_id: option.id
      });
      setAdherenceResult(result);
      setSurveyOptions(undefined);
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit survey choice');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-300">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading resources...
      </div>
    );
  }

  if (error && !data) {
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
            {character_name || data.character.name} — Resources
          </h2>
          <p className="text-gray-400 text-sm">
            Level {data.character.level} • Unspent resource points: {availablePoints}
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
              : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Allocation
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-200 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {adherenceResult && (
        <div className={`p-4 rounded-lg border ${adherenceResult.adhered ? 'border-green-500/50 bg-green-900/30' : 'border-amber-500/50 bg-amber-900/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            {adherenceResult.adhered ? <CheckCircle2 className="w-5 h-5 text-green-300" /> : <AlertTriangle className="w-5 h-5 text-amber-300" />}
            <div className="text-sm text-white font-semibold">
              {adherenceResult.adhered ? 'Coach allocation accepted' : 'Adherence failed — character will decide'}
            </div>
            {adherenceResult.roll !== undefined && (
              <div className="ml-auto text-xs text-gray-400">
                Roll: {adherenceResult.roll} vs Adherence: {adherenceResult.adherence_score}
              </div>
            )}
          </div>
          <p className="text-gray-200 text-sm mb-3">{adherenceResult.message}</p>
        </div>
      )}

      {surveyOptions && surveyOptions.length > 0 && (
        <div className="p-4 rounded-lg border border-amber-500/50 bg-amber-900/30">
          <div className="text-sm text-gray-300 font-semibold mb-3">Character must choose how to allocate resources:</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
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
                  {option.allocations.map(a => `${a.resource_id.replace('max_', '')}+${a.points}`).join(' • ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.resources.map(resource => {
          const allocation = allocations[resource.id] || 0;
          const projected = resource.value + allocation;
          const Icon = RESOURCE_ICONS[resource.id] || Heart;
          const colorClass = RESOURCE_COLORS[resource.id] || 'text-gray-400';
          const bgClass = RESOURCE_BG[resource.id] || 'bg-gray-900/60 border-gray-800';

          return (
            <div key={resource.id} className={`rounded-xl border p-5 space-y-4 ${bgClass}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`w-8 h-8 ${colorClass}`} />
                  <div>
                    <div className="text-white font-semibold text-lg">{resource.name}</div>
                    <div className="text-xs text-gray-400">
                      {resource.id === 'max_health' && 'Total hit points before defeat'}
                      {resource.id === 'max_energy' && 'Physical action pool'}
                      {resource.id === 'max_mana' && 'Magical power reserve'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl text-white font-bold">{resource.value}</div>
                  <div className="text-xs text-gray-400">current</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustAllocation(resource.id, -1)}
                  className="px-3 py-2 rounded bg-gray-800 text-gray-200 hover:bg-gray-700 text-lg font-bold"
                  disabled={allocation <= 0}
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={allocation}
                  onChange={(e) => setAllocationValue(resource.id, Number(e.target.value))}
                  className="w-20 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-center text-lg"
                />
                <button
                  onClick={() => adjustAllocation(resource.id, 1)}
                  className="px-3 py-2 rounded bg-gray-800 text-gray-200 hover:bg-gray-700 text-lg font-bold"
                >
                  +
                </button>
                <div className="ml-auto text-lg text-gray-300">
                  → <span className="font-bold text-white text-xl">{projected}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <div className="flex items-center gap-2 text-white font-semibold mb-2">
          <Zap className="w-4 h-4 text-yellow-300" />
          Resource Allocation Info
        </div>
        <p className="text-sm text-gray-300">
          Resource points determine your character's vital pools. When you submit an allocation,
          an adherence check (d100 roll vs character's gameplan adherence) determines if your choice
          is accepted or if the character chooses their own distribution.
        </p>
      </div>
    </div>
  );
}
