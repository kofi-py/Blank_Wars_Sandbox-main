import { useEffect, useMemo, useState } from 'react';
import { User } from 'lucide-react';
import AttributesManager from './AttributesManager';
import { characterAPI } from '../services/apiClient';
import type { Contestant } from '@blankwars/types';
import { useAuth } from '../contexts/AuthContext';

interface AttributesManagerWrapperProps {
  global_selected_character_id?: string;
  set_global_selected_character_id?: (id: string) => void;
  is_mobile?: boolean;
  // camelCase variants
  globalSelectedCharacterId?: string;
  setGlobalSelectedCharacterId?: (id: string) => void;
  isMobile?: boolean;
}

interface EnhancedCharacter extends Contestant {
  base_name: string;
}

export default function AttributesManagerWrapper({
  global_selected_character_id,
  set_global_selected_character_id,
  globalSelectedCharacterId,
  setGlobalSelectedCharacterId,
  isMobile = false,
  is_mobile
}: AttributesManagerWrapperProps) {
  const { user } = useAuth();
  const [available_characters, setAvailableCharacters] = useState<EnhancedCharacter[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedId = globalSelectedCharacterId || global_selected_character_id;
  const setSelectedId = setGlobalSelectedCharacterId || set_global_selected_character_id;

  useEffect(() => {
    const load = async () => {
      try {
        const chars = await characterAPI.get_user_characters();
        const enhanced: EnhancedCharacter[] = chars.map((char) => ({
          ...char,
          base_name: char.name?.toLowerCase() || char.id || 'unknown',
          avatar: char.avatar || '🛡️'
        }));
        setAvailableCharacters(enhanced);
      } catch (err) {
        console.error('Failed to load characters for attributes manager:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selected_character = useMemo(() => {
    if (!available_characters.length) return null;
    return available_characters.find((c) => c.base_name === selectedId || c.id === selectedId) || available_characters[0];
  }, [available_characters, selectedId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-gray-300">Loading characters...</div>
      </div>
    );
  }

  if (!selected_character) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-gray-400">No characters found for attributes.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex ${isMobile || is_mobile ? 'flex-col gap-4' : 'gap-6'}`}>
        <div className={`${isMobile || is_mobile ? 'w-full' : 'w-full md:w-80'} bg-gray-800/80 rounded-xl p-3 h-fit`}>
          <div className="flex items-center gap-2 text-white font-semibold mb-3">
            <User className="w-5 h-5" />
            Characters
          </div>
          <div className={`${isMobile || is_mobile ? 'character-cards-mobile' : 'space-y-2 max-h-96 overflow-y-auto'}`}>
            {(available_characters || []).map((character) => (
              <button
                key={character.id}
                onClick={() => setSelectedId && setSelectedId(character.base_name)}
                className={`w-full p-3 rounded-lg border transition-all text-left ${selected_character.base_name === character.base_name
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{character.avatar}</div>
                  <div>
                    <div className="font-semibold">{character.name}</div>
                    <div className="text-xs opacity-75">Lv.{character.level} {character.archetype}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <AttributesManager
            character_id={selected_character.id}
            character_name={selected_character.name}
            coach_name={user.coach_name}
          />
        </div>
      </div>
    </div>
  );
}
