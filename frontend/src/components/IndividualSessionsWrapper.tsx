'use client';

/**
 * IndividualSessionsWrapper - Loads characters and renders full-screen PersonalProblemsChatScene
 *
 * The scene handles its own character selection, chat UI, and 3D rendering internally.
 */

import { useState, useEffect } from 'react';
import { characterAPI } from '@/services/apiClient';
import PersonalProblemsChatScene from './PersonalProblemsChatScene';
import type { Contestant } from '@blankwars/types';

export default function IndividualSessionsWrapper() {
  const [characters, setCharacters] = useState<Contestant[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(true);

  useEffect(() => {
    const loadCharacters = async () => {
      setCharactersLoading(true);
      try {
        const charactersData = await characterAPI.get_user_characters();
        setCharacters(charactersData);
      } catch (error) {
        console.error('Failed to load characters:', error);
      } finally {
        setCharactersLoading(false);
      }
    };

    loadCharacters();
  }, []);

  if (charactersLoading) {
    return (
      <div className="w-full h-[calc(100vh-200px)] min-h-[600px] flex items-center justify-center bg-gray-900 rounded-xl">
        <div className="text-white text-lg">Loading characters...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-200px)] min-h-[600px] rounded-xl overflow-hidden">
      <PersonalProblemsChatScene
        availableCharacters={characters}
      />
    </div>
  );
}
