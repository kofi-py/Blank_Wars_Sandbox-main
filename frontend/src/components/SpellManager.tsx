import React, { useState, useEffect } from 'react';
import SpellCard from './SpellCard';
import PowerPointsDisplay from './PowerPointsDisplay';
import {
  getCharacterSpells,
  unlockSpell,
  rankUpSpell,
  Spell,
  CharacterSpellsResponse
} from '../services/spellAPI';


interface SpellManagerProps {
  character_id: string;
  character_name?: string;
}

type CategoryFilter = 'all' | 'universal' | 'archetype' | 'species' | 'signature';

export default function SpellManager({ character_id, character_name }: SpellManagerProps) {
  const [data, setData] = useState<CharacterSpellsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showLocked, setShowLocked] = useState(true);


  console.log('🔮 SpellManager rendered with character_id:', character_id, 'name:', character_name);

  // Load character spells
  useEffect(() => {
    console.log('🔮 SpellManager useEffect triggered, loading spells for:', character_id);
    loadSpells();
  }, [character_id]);

  const loadSpells = async () => {
    try {
      console.log('🔮 loadSpells: Starting API call for character_id:', character_id);
      setLoading(true);
      setError(null);
      const response = await getCharacterSpells(character_id);
      console.log('🔮 loadSpells: API response received:', response);
      setData(response);
    } catch (err) {
      console.error('🔮 loadSpells: ERROR:', err);
      setError(err instanceof Error ? err.message : 'Failed to load spells');
    } finally {
      setLoading(false);
      console.log('🔮 loadSpells: Complete');
    }
  };

  const handleUnlock = async (spellId: string) => {
    try {
      setActionLoading(spellId);
      await unlockSpell(character_id, spellId);
      await loadSpells(); // Reload to get updated data
    } catch (err) {
      console.error('Failed to unlock spell:', err);
      alert(err instanceof Error ? err.message : 'Failed to unlock spell');
    } finally {
      setActionLoading(null);
    }
  };


  const handleRankUp = async (spellId: string) => {
    try {
      setActionLoading(spellId);
      await rankUpSpell(character_id, spellId);
      await loadSpells(); // Reload to get updated data
    } catch (err) {
      console.error('Failed to rank up spell:', err);
      alert(err instanceof Error ? err.message : 'Failed to rank up spell');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-500 mb-4 mx-auto"></div>
          <p className="text-gray-400">Loading spells...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12 text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">❌ {error}</p>
          <button
            onClick={loadSpells}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Filter spells
  const filteredSpells = data.spells.filter(spell => {
    // Filter by tier
    if (categoryFilter !== 'all' && spell.tier !== categoryFilter) {
      return false;
    }

    // Filter locked/unlocked
    if (!showLocked && !spell.is_unlocked) {
      return false;
    }

    return true;
  });

  // Sort spells by: 1) unlock_cost (ascending), 2) power_level (ascending), 3) name
  const sortedSpells = [...filteredSpells].sort((a, b) => {
    // First sort by cost (cheapest first)
    if (a.unlock_cost !== b.unlock_cost) {
      return a.unlock_cost - b.unlock_cost;
    }
    // Then by power_level (common → uncommon → rare)
    if (a.power_level === undefined || a.power_level === null) {
      throw new Error(`Spell ${a.name} missing power_level property`);
    }
    if (b.power_level === undefined || b.power_level === null) {
      throw new Error(`Spell ${b.name} missing power_level property`);
    }
    if (a.power_level !== b.power_level) {
      return a.power_level - b.power_level;
    }
    // Finally alphabetically
    return a.name.localeCompare(b.name);
  });

  // Group sorted spells by tier
  const spellsByCategory = sortedSpells.reduce((acc, spell) => {
    const cat = spell.tier;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(spell);
    return acc;
  }, {} as Record<string, Spell[]>);

  const categoryInfo = {
    universal: { label: 'Universal Spells', icon: '🌟', color: 'text-cyan-400' },
    archetype: { label: 'Archetype Spells', icon: '🛡️', color: 'text-purple-400' },
    species: { label: 'Species Spells', icon: '🧬', color: 'text-green-400' },
    signature: { label: 'Signature Spells', icon: '✨', color: 'text-orange-400' }
  };

  return (
    <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-xl p-6 border border-cyan-500/30 mb-6 relative">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <span>✨</span>
          {character_name} - Spells
        </h1>
        <p className="text-gray-400">Level {data.character.level} • {data.spells.length} spells available</p>
      </div>

      {/* Character Points Display */}
      <PowerPointsDisplay
        character_points={data.character.character_points}
        character_name={character_name}
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Category Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded ${categoryFilter === 'all'
              ? 'bg-white text-black'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
          >
            All Categories
          </button>
          <button
            onClick={() => setCategoryFilter('universal')}
            className={`px-4 py-2 rounded ${categoryFilter === 'universal'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
          >
            🌟 Universal
          </button>
          <button
            onClick={() => setCategoryFilter('archetype')}
            className={`px-4 py-2 rounded ${categoryFilter === 'archetype'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
          >
            🛡️ Archetype
          </button>
          <button
            onClick={() => setCategoryFilter('species')}
            className={`px-4 py-2 rounded ${categoryFilter === 'species'
              ? 'bg-green-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
          >
            🧬 Species
          </button>
          <button
            onClick={() => setCategoryFilter('signature')}
            className={`px-4 py-2 rounded ${categoryFilter === 'signature'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
          >
            ✨ Signature
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
          <span className="text-gray-400">Show Locked Spells</span>
        </label>
      </div>

      {/* Spells Grid by Category */}
      {categoryFilter === 'all' ? (
        // Show all categories in sections
        Object.entries(spellsByCategory).map(([category, spells]) => {
          if (spells.length === 0) return null;
          const info = categoryInfo[category as keyof typeof categoryInfo];

          return (
            <div key={category} className="mb-8">
              <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${info.color}`}>
                <span>{info.icon}</span>
                <span>{info.label}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spells.map(spell => (
                  <SpellCard
                    key={spell.id}
                    spell={spell}
                    onUnlock={() => handleUnlock(spell.id)}
                    onRankUp={() => handleRankUp(spell.id)}
                    is_loading={actionLoading === spell.id}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        // Show filtered category
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpells.map(spell => (
            <SpellCard
              key={spell.id}
              spell={spell}
              onUnlock={() => handleUnlock(spell.id)}
              onRankUp={() => handleRankUp(spell.id)}
              is_loading={actionLoading === spell.id}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredSpells.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">
            {showLocked
              ? 'No spells available in this category'
              : 'No unlocked spells in this category yet'}
          </p>
          {!showLocked && (
            <button
              onClick={() => setShowLocked(true)}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded transition-colors"
            >
              Show All Spells
            </button>
          )}
        </div>
      )}

      {/* Stats Summary */}
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Spell Collection</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Spells:</span>
            <span className="text-white ml-2 font-bold">{data.spells.length}</span>
          </div>
          <div>
            <span className="text-gray-400">Unlocked:</span>
            <span className="text-green-400 ml-2 font-bold">
              {data.spells.filter(s => s.is_unlocked).length}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Equipped:</span>
            <span className="text-blue-400 ml-2 font-bold">
              {data.spells.filter(s => s.is_equipped).length} / 8
            </span>
          </div>
          <div>
            <span className="text-gray-400">Character Points:</span>
            <span className="text-cyan-400 ml-2 font-bold">{data.character.character_points}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
