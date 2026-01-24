'use client';

import { useState, useEffect, useMemo } from 'react';
import { User } from 'lucide-react';
import SpellManager from './SpellManager';
import SpellDevelopmentChat from './SpellDevelopmentChat';
import { characterAPI } from '../services/apiClient';
import type { Contestant } from '@blankwars/types';

interface SpellManagerWrapperProps {
  global_selected_character_id: string;
  set_global_selected_character_id: (id: string) => void;
  is_mobile?: boolean;
  // CamelCase variants
  globalSelectedCharacterId?: string;
  setGlobalSelectedCharacterId?: (id: string) => void;
  isMobile?: boolean;
}

interface EnhancedContestant extends Contestant {
  base_name: string;
}

export default function SpellManagerWrapper({
  globalSelectedCharacterId,
  setGlobalSelectedCharacterId,
  isMobile = false
}: SpellManagerWrapperProps) {
  const [available_characters, setAvailableCharacters] = useState<EnhancedContestant[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(true);

  // Load real characters from API
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        const characters = await characterAPI.get_user_characters();

        const enhancedCharacters = characters.map((char: Contestant) => {
          const base_name = char.name.toLowerCase();
          return {
            ...char,
            base_name,
            name: char.name,
            level: char.level,
            archetype: char.archetype,
            avatar: char.avatar,
          };
        });

        setAvailableCharacters(enhancedCharacters);
        setCharactersLoading(false);
      } catch (error) {
        console.error('Error loading characters:', error);
        setCharactersLoading(false);
      }
    };

    loadCharacters();
  }, []);

  const selected_character = useMemo(() => {
    if (!available_characters || !Array.isArray(available_characters) || available_characters.length === 0) return null;
    return available_characters.find(c => c && c.base_name === globalSelectedCharacterId) || available_characters[0];
  }, [available_characters, globalSelectedCharacterId]);

  console.log('Spells - Real character data:', selected_character?.name, 'Level:', selected_character?.level);

  if (charactersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading real character data...</p>
        </div>
      </div>
    );
  }

  if (!selected_character) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-400">No characters found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'gap-6'}`}>
        {/* Character Sidebar */}
        <div className={`${isMobile ? 'w-full mb-4' : 'w-full md:w-80'} ${isMobile ? 'bg-gray-800/80 rounded-xl p-2' : 'bg-gray-800/80 rounded-xl p-4'} h-fit`}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Characters
          </h3>
          <div className={`${isMobile ? 'character-cards-mobile' : 'space-y-2 max-h-96 overflow-y-auto'}`}>
            {(available_characters && Array.isArray(available_characters) ? available_characters : []).map((character) => (
              <button
                key={character.id}
                onClick={() => {
                  console.log('Spells - Clicking character:', character.name, character.base_name);
                  setGlobalSelectedCharacterId(character.base_name);
                }}
                className={`${isMobile ? 'character-card-mobile' : 'w-full p-3'} rounded-lg border transition-all text-left ${
                  globalSelectedCharacterId === character.base_name
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                }`}
              >
                <div className={`flex ${isMobile ? 'flex-col items-center text-center gap-1' : 'items-center gap-3'}`}>
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'}`}>{character.avatar}</div>
                  <div className={isMobile ? 'character-info' : ''}>
                    <div className={`font-semibold ${isMobile ? 'character-name' : ''}`}>{character.name}</div>
                    <div className={`text-xs opacity-75 ${isMobile ? 'character-details' : ''}`}>Lv.{character.level} {character.archetype}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-8">
          {/* Character Image Display */}
          <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 sm:rounded-xl p-2 sm:p-8 text-center mb-8">
            <div className="flex flex-col items-center gap-6">
              {/* Character Spells Image Display - Triangle Layout */}
              {selected_character && (
                <div className="w-full sm:max-w-md md:max-w-lg lg:w-[40rem] h-[90vh] sm:h-[90vh] md:h-[90vh] lg:h-[86rem] sm:rounded-xl sm:border-4 border-purple-600 shadow-2xl bg-gray-800 sm:p-1 sm:p-2">
                  <div className="flex flex-col h-full gap-2">
                    {/* Top image - image 2 (middle/unique image) displayed larger */}
                    <div className="h-[65%] rounded-lg overflow-hidden border-2 border-purple-500/30">
                      <img
                        src={(window as any).getSpellsCharacterImages?.(selected_character.character_id)?.[1] || ''}
                        alt={`${selected_character.name} spells showcase`}
                        className="w-full h-full object-contain bg-gray-900 object-top mobile-image-fix"
                        onError={(e) => {
                          console.error(`❌ Spells character showcase image failed to load:`, e.currentTarget.src);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    {/* Bottom row - images 1 and 3 (matching series) side by side */}
                    <div className="h-[35%] grid grid-cols-2 gap-2">
                      {[0, 2].map((imageIndex, gridIndex) => (
                        <div key={gridIndex} className="rounded-lg overflow-hidden border-2 border-purple-500/30">
                          <img
                            src={(window as any).getSpellsCharacterImages?.(selected_character.character_id)?.[imageIndex] || ''}
                            alt={`${selected_character.name} spells ${imageIndex + 1}`}
                            className="w-full h-full object-contain bg-gray-900 mobile-image-fix"
                            onError={(e) => {
                              console.error(`❌ Spells character image ${imageIndex + 1} failed to load:`, e.currentTarget.src);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Character Info */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                  <div className="text-3xl">{selected_character?.avatar || '✨'}</div>
                  <div>
                    <div>{selected_character?.name || 'Loading...'}</div>
                    <div className="text-sm text-gray-400">Level {selected_character?.level || 1} {selected_character?.archetype || 'Unknown Class'}</div>
                  </div>
                </h2>
              </div>
            </div>
          </div>

          {/* Spell Development Chat */}
          <SpellDevelopmentChat
            selected_characterId={globalSelectedCharacterId}
            onCharacterChange={setGlobalSelectedCharacterId}
            selected_character={selected_character}
            available_characters={available_characters}
          />

          {/* Spell Manager */}
          <SpellManager
            character_id={selected_character.id}
            character_name={selected_character.name}
          />
        </div>
      </div>
    </div>
  );
}
