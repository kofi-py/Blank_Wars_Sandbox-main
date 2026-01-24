import React, { useState, useEffect } from 'react';
import PowerCard from './PowerCard';
import PowerPointsDisplay from './PowerPointsDisplay';
import PowerRebellionMeter from './PowerRebellionMeter';
import {
  getCharacterPowers,
  unlockPower,
  rankUpPower,
  Power,
  CharacterPowersResponse,
  Power as PowerDefinition
} from '../services/powerAPI';
import RebellionAlert from './RebellionAlert';
import { Lock } from 'lucide-react';

interface PowerManagerProps {
  character_id: string;
  character_name?: string;
}

type TierFilter = 'all' | 'skill' | 'ability' | 'species' | 'signature';

export default function PowerManager({ character_id, character_name }: PowerManagerProps) {
  const [data, setData] = useState<CharacterPowersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [showLocked, setShowLocked] = useState(true);
  const [rebellionAlert, setRebellionAlert] = useState<{
    isOpen: boolean;
    characterName: string;
    coachChoiceName: string;
    rebellionChoiceName: string;
    rebellionChoiceType: 'power' | 'spell';
    lockoutUntil: string;
    reasoning: string;
  } | null>(null);

  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);

  useEffect(() => {
    if (data?.character.coach_lockout_until) {
      const lockout = new Date(data.character.coach_lockout_until);
      if (lockout > new Date()) {
        setLockoutUntil(lockout);
      }
    }
  }, [data]);

  // Check lockout timer every minute
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      if (new Date() > lockoutUntil) {
        setLockoutUntil(null); // Lockout expired
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Load character powers
  useEffect(() => {
    loadPowers();
  }, [character_id]);

  const loadPowers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCharacterPowers(character_id);
      setData(response);
    } catch (err) {
      console.error('Failed to load powers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load powers');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (powerId: string) => {
    if (lockoutUntil && new Date() < lockoutUntil) {
      alert(`Coach Lockout Active! You cannot make decisions for this character until ${lockoutUntil.toLocaleTimeString()}.`);
      return;
    }

    try {
      setActionLoading(powerId);
      const result = await unlockPower(character_id, powerId);

      // Handle Rebellion
      if (!result.adhered && result.rebellion_result && result.lockout_until) {
        const coachChoice = data?.powers.find(p => p.id === powerId);

        setRebellionAlert({
          isOpen: true,
          characterName: data?.character.name || 'Character',
          coachChoiceName: coachChoice?.name || 'Unknown Power',
          rebellionChoiceName: result.rebellion_result.name,
          rebellionChoiceType: result.rebellion_result.type,
          lockoutUntil: result.lockout_until,
          reasoning: result.rebellion_result.reason || 'I made my own choice.'
        });

        setLockoutUntil(new Date(result.lockout_until));
        await loadPowers(); // Reload to see new unlock
        return;
      }

      await loadPowers(); // Reload to get updated data
    } catch (err) {
      console.error('Failed to unlock power:', err);
      alert(err instanceof Error ? err.message : 'Failed to unlock power');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRankUp = async (powerId: string) => {
    try {
      setActionLoading(powerId);
      await rankUpPower(character_id, powerId);
      await loadPowers(); // Reload to get updated data
    } catch (err) {
      console.error('Failed to rank up power:', err);
      alert(err instanceof Error ? err.message : 'Failed to rank up power');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">💪</div>
          <div className="text-gray-400">Loading powers...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-red-400 mb-2">{error}</div>
          <button
            onClick={loadPowers}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Filter powers
  const filteredPowers = data.powers.filter(power => {
    if (tierFilter !== 'all' && power.tier !== tierFilter) return false;
    if (!showLocked && !power.is_unlocked) return false;
    return true;
  });

  // Sort powers by: 1) unlock_cost (ascending), 2) power_level (ascending), 3) name
  const sortedPowers = [...filteredPowers].sort((a, b) => {
    // First sort by cost (cheapest first)
    if (a.unlock_cost !== b.unlock_cost) {
      return a.unlock_cost - b.unlock_cost;
    }
    // Then by power_level (common → uncommon → rare)
    if (a.power_level === undefined || a.power_level === null) {
      throw new Error(`Power ${a.name} missing power_level property`);
    }
    if (b.power_level === undefined || b.power_level === null) {
      throw new Error(`Power ${b.name} missing power_level property`);
    }
    if (a.power_level !== b.power_level) {
      return a.power_level - b.power_level;
    }
    // Finally alphabetically
    return a.name.localeCompare(b.name);
  });

  // Group sorted powers by tier
  const powersByTier = {
    skill: sortedPowers.filter(p => p.tier === 'skill'),
    ability: sortedPowers.filter(p => p.tier === 'ability'),
    species: sortedPowers.filter(p => p.tier === 'species'),
    signature: sortedPowers.filter(p => p.tier === 'signature')
  };

  const tierInfo = {
    skill: { icon: '⚔️', label: 'SKILL POWERS', color: 'text-blue-400' },
    ability: { icon: '🛡️', label: 'ARCHETYPE POWERS', color: 'text-purple-400' },
    species: { icon: '🧬', label: 'SPECIES POWERS', color: 'text-green-400' },
    signature: { icon: '⭐', label: 'SIGNATURE POWERS', color: 'text-yellow-400' }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {/* Lockout Banner */}
      {lockoutUntil && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3 animate-pulse">
          <Lock className="text-red-500 w-6 h-6" />
          <div>
            <div className="text-red-400 font-bold uppercase text-sm">Coach Lockout Active</div>
            <div className="text-gray-300 text-xs">
              Character is refusing orders until {lockoutUntil.toLocaleTimeString()}.
            </div>
          </div>
        </div>
      )}

      {/* Rebellion Alert Modal */}
      {rebellionAlert && (
        <RebellionAlert
          {...rebellionAlert}
          onClose={() => setRebellionAlert(null)}
        />
      )}
      {/* Character Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          {data.character.name} - Powers
        </h1>
        <p className="text-gray-400">Level {data.character.level}</p>
      </div>

      {/* Power Points Display */}
      <PowerPointsDisplay
        character_points={data.character.character_points}
        character_name={data.character.name}
      />

      {/* Rebellion Meter (only shows when adherence 60-80) */}
      <PowerRebellionMeter adherence={data.character.gameplan_adherence} />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Tier Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setTierFilter('all')}
            className={`px-4 py-2 rounded ${tierFilter === 'all'
              ? 'bg-white text-black'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
          >
            All Tiers
          </button>
          <button
            onClick={() => setTierFilter('skill')}
            className={`px-4 py-2 rounded ${tierFilter === 'skill'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
          >
            ⚔️ Skills
          </button>
          <button
            onClick={() => setTierFilter('ability')}
            className={`px-4 py-2 rounded ${tierFilter === 'ability'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
          >
            🛡️ Abilities
          </button>
          <button
            onClick={() => setTierFilter('species')}
            className={`px-4 py-2 rounded ${tierFilter === 'species'
              ? 'bg-green-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
          >
            🧬 Species
          </button>
          <button
            onClick={() => setTierFilter('signature')}
            className={`px-4 py-2 rounded ${tierFilter === 'signature'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
          >
            ⭐ Signature
          </button>
        </div>

        {/* Show Locked Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showLocked}
            onChange={(e) => setShowLocked(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-gray-400">Show Locked Powers</span>
        </label>
      </div>

      {/* Powers Grid by Tier */}
      {tierFilter === 'all' ? (
        // Show all tiers in sections
        Object.entries(powersByTier).map(([tier, powers]) => {
          if (powers.length === 0) return null;
          const info = tierInfo[tier as keyof typeof tierInfo];

          return (
            <div key={tier} className="mb-8">
              <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${info.color}`}>
                <span>{info.icon}</span>
                <span>{info.label}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {powers.map(power => (
                  <PowerCard
                    key={power.id}
                    power={power}
                    onUnlock={() => handleUnlock(power.id)}
                    onRankUp={() => handleRankUp(power.id)}
                    is_loading={actionLoading === power.id}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        // Show filtered tier
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPowers.map(power => (
            <PowerCard
              key={power.id}
              power={power}
              onUnlock={() => handleUnlock(power.id)}
              onRankUp={() => handleRankUp(power.id)}
              is_loading={actionLoading === power.id}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredPowers.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-4">🔍</div>
          <p>No powers found with current filters</p>
          <button
            onClick={() => {
              setTierFilter('all');
              setShowLocked(true);
            }}
            className="mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
