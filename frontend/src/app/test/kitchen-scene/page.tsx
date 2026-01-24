'use client';

import { useState, useEffect } from 'react';
import KitchenChatScene, { CharacterConfig } from '@/components/KitchenChatScene';
import { Contestant } from '@blankwars/types';
import { HeadquartersState } from '@/types/headquarters';
import { characterAPI } from '@/services/apiClient';
import { loadHeadquarters } from '@/services/bedService';
import { getCharacter3DModelPath } from '@/utils/characterImageUtils';

export default function TestKitchenScenePage() {
  const [available_characters, setAvailableCharacters] = useState<Contestant[]>([]);
  const [headquarters, setHeadquarters] = useState<HeadquartersState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch real characters from database
        const chars = await characterAPI.get_user_characters();
        const mapped_characters = chars.map((char: Contestant) => ({
          ...char,
          base_name: char.character_id
        }));

        setAvailableCharacters(mapped_characters);

        // Fetch real headquarters data
        const hq = await loadHeadquarters();
        setHeadquarters(hq);

        console.log('✅ Loaded real data:', {
          characters: mapped_characters.length,
          rooms: hq.rooms.length
        });
      } catch (err) {
        console.error('❌ Failed to load data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1a1a2e',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading real data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1a1a2e',
        color: '#ff4444',
        fontSize: '18px'
      }}>
        Error: {error}
      </div>
    );
  }

  if (!headquarters) {
    throw new Error('Headquarters data is null after loading');
  }

  // Build CharacterConfig array from real character data
  const characters: CharacterConfig[] = available_characters.slice(0, 2).map((char, index) => ({
    id: char.character_id,
    modelPath: getCharacter3DModelPath(char.character_id),
    position: index === 0 ? [-1.5, 0, 0] : [1.5, 0, 0],
    rotation: index === 0 ? [0, Math.PI / 4, 0] : [0, -Math.PI / 4, 0]
  }));

  return (
    <KitchenChatScene
      characters={characters}
      available_characters={available_characters}
      headquarters={headquarters}
      coach_name="Coach"
    />
  );
}
