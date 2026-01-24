import React, { useState, useEffect } from 'react';
import {
  getCharacterSpells,
  equipSpell,
  unequipSpell,
  Spell,
  CharacterSpellsResponse
} from '../services/spellAPI';

interface SpellLoadoutProps {
  character_id: string;
  character_name?: string;
  user_id?: string;
}

interface LoadoutSlot {
  slot_number: number;
  spell?: Spell;
}

interface RebellionDialogue {
  message: string;
  timestamp: number;
}

export default function SpellLoadout({ character_id, character_name, user_id }: SpellLoadoutProps) {
  const [data, setData] = useState<CharacterSpellsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [rebellionDialogue, setRebellionDialogue] = useState<RebellionDialogue | null>(null);

  const MAX_SLOTS = 8;

  useEffect(() => {
    loadData();
  }, [character_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCharacterSpells(character_id);
      setData(response);
    } catch (err) {
      console.error('Failed to load spells:', err);
      setError(err instanceof Error ? err.message : 'Failed to load spells');
    } finally {
      setLoading(false);
    }
  };

  const handleEquipToSlot = async (slotNumber: number) => {
    if (!selectedSpell || !user_id) return;

    try {
      setActionLoading(slotNumber);
      const result = await equipSpell(user_id, character_id, selectedSpell.id, slotNumber);

      // Check if character rebelled
      if (!result.adhered && result.reasoning) {
        setRebellionDialogue({
          message: result.reasoning,
          timestamp: Date.now()
        });

        // Auto-dismiss after 8 seconds
        setTimeout(() => setRebellionDialogue(null), 8000);
      }

      await loadData(); // Reload to get updated data
      setSelectedSpell(null); // Clear selection after equipping
    } catch (err) {
      console.error('Failed to equip spell:', err);
      alert(err instanceof Error ? err.message : 'Failed to equip spell');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnequipFromSlot = async (slotNumber: number) => {
    try {
      setActionLoading(slotNumber);
      await unequipSpell(character_id, slotNumber);
      await loadData(); // Reload to get updated data
    } catch (err) {
      console.error('Failed to unequip spell:', err);
      alert(err instanceof Error ? err.message : 'Failed to unequip spell');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-cyan-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">❌ {error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Build loadout slots array
  const loadoutSlots: LoadoutSlot[] = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const equippedSpell = data.spells.find(
      s => s.is_equipped && data.loadout.find(l => l.spell_id === s.id && l.slot_number === i)
    );
    loadoutSlots.push({
      slot_number: i,
      spell: equippedSpell
    });
  }

  // Filter only unlocked spells for selection
  const unlockedSpells = data.spells.filter(s => s.is_unlocked);

  const adherence = data.character.gameplan_adherence;
  const ADHERENCE_THRESHOLD = 70;

  return (
    <div className="p-8 bg-gray-900 text-white relative">
      {/* Rebellion Dialogue Overlay */}
      {rebellionDialogue && (
        <div className="fixed top-20 right-8 z-50 max-w-md bg-red-900 border-2 border-red-500 rounded-lg p-4 shadow-2xl animate-pulse">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🚨</div>
            <div className="flex-1">
              <div className="font-bold text-red-200 mb-1">
                {character_name || 'Character'} Rejected Your Choice!
              </div>
              <div className="text-white italic">
                "{rebellionDialogue.message}"
              </div>
              <div className="text-xs text-red-300 mt-2">
                Adherence: {adherence}/100 (-2 penalty applied)
              </div>
            </div>
            <button
              onClick={() => setRebellionDialogue(null)}
              className="text-red-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-cyan-400 mb-2 flex items-center gap-3">
          <span>⚔️</span>
          <span>Battle Spell Loadout</span>
        </h1>
        <p className="text-gray-400">
          {character_name ? `${character_name}'s ` : ''}Combat Spells (Max {MAX_SLOTS})
        </p>
        {adherence < ADHERENCE_THRESHOLD && (
          <div className="mt-3 p-3 bg-yellow-900 border border-yellow-600 rounded-lg">
            <div className="text-yellow-200 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>Low Adherence Warning</span>
            </div>
            <div className="text-yellow-100 text-sm mt-1">
              {character_name || 'Character'} may reject your loadout choices (Adherence: {adherence}/100, -2 per rebellion)
            </div>
          </div>
        )}
      </div>

      {/* Loadout Slots */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-cyan-400">Equipped Spells</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loadoutSlots.map((slot) => (
            <div
              key={slot.slot_number}
              className={`
                relative rounded-lg border-2 p-4 transition-all
                ${slot.spell
                  ? 'border-cyan-500 bg-gradient-to-br from-cyan-500/20 to-blue-600/30'
                  : 'border-gray-700 bg-gray-800/50'}
                ${selectedSpell && !slot.spell ? 'ring-2 ring-yellow-500/50 cursor-pointer hover:scale-105' : ''}
                ${actionLoading === slot.slot_number ? 'opacity-50' : ''}
              `}
              onClick={() => {
                if (selectedSpell && !slot.spell && actionLoading !== slot.slot_number) {
                  handleEquipToSlot(slot.slot_number);
                }
              }}
            >
              {/* Slot Number */}
              <div className="text-xs text-gray-500 mb-2">Slot {slot.slot_number}</div>

              {slot.spell ? (
                // Equipped Spell
                <>
                  <div className="mb-2">
                    <h3 className="font-bold text-cyan-400 text-sm">{slot.spell.name}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2">{slot.spell.description}</p>
                  </div>

                  {/* Spell Stats */}
                  <div className="flex gap-2 text-xs mb-2">
                    <span className="text-blue-400">💧 {slot.spell.mana_cost}</span>
                    <span className="text-purple-400">⏱️ {slot.spell.cooldown_turns}</span>
                  </div>

                  {/* Unequip Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnequipFromSlot(slot.slot_number);
                    }}
                    disabled={actionLoading === slot.slot_number}
                    className="w-full px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs transition-colors"
                  >
                    {actionLoading === slot.slot_number ? 'Removing...' : 'Remove'}
                  </button>
                </>
              ) : (
                // Empty Slot
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">⬜</div>
                  <p className="text-xs text-gray-500">
                    {selectedSpell ? 'Click to equip' : 'Empty'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Spell Selection */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-cyan-400">
          Available Spells
          {selectedSpell && (
            <span className="text-sm text-yellow-400 ml-3">
              ← Select a slot to equip "{selectedSpell.name}"
            </span>
          )}
        </h2>

        {unlockedSpells.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">You haven't unlocked any spells yet!</p>
            <p className="text-sm">Visit the Spell Manager to unlock spells with your character points.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlockedSpells.map((spell) => (
              <div
                key={spell.id}
                onClick={() => setSelectedSpell(spell.id === selectedSpell?.id ? null : spell)}
                className={`
                  relative rounded-lg border-2 p-4 cursor-pointer transition-all
                  ${selectedSpell?.id === spell.id
                    ? 'border-yellow-500 bg-yellow-500/20 scale-105'
                    : spell.is_equipped
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-cyan-500/50'}
                `}
              >
                {/* Spell Info */}
                <div className="mb-2">
                  <h3 className="font-bold text-cyan-400">
                    {spell.name}
                    {spell.is_equipped && <span className="text-blue-400 ml-2">✓</span>}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2">{spell.description}</p>
                </div>

                {/* Spell Stats */}
                <div className="flex gap-3 text-xs mb-2">
                  <span className="text-blue-400">💧 {spell.mana_cost} mana</span>
                  <span className="text-purple-400">⏱️ {spell.cooldown_turns} turns</span>
                </div>

                {/* Rank */}
                <div className="text-xs text-gray-500">
                  Rank {spell.current_rank}/{spell.max_rank}
                </div>

                {/* Selected Indicator */}
                {selectedSpell?.id === spell.id && (
                  <div className="absolute top-2 right-2 text-yellow-400 text-xl">
                    ⭐
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Helper Text */}
      {selectedSpell && (
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm">
            💡 <strong>Tip:</strong> Click an empty slot above to equip "{selectedSpell.name}".
            You can change your loadout anytime before battle.
          </p>
        </div>
      )}
    </div>
  );
}
