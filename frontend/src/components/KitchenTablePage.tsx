'use client';

import { useState, useEffect } from 'react';
import KitchenChatScene, { CharacterConfig } from '@/components/KitchenChatScene';
import { Contestant } from '@blankwars/types';
import { HeadquartersState } from '@/types/headquarters';
import { characterAPI } from '@/services/apiClient';
import { loadHeadquarters } from '@/services/bedService';
import { getCharacter3DModelPath } from '@/utils/characterImageUtils';

/**
 * Kitchen Table Page - Standalone component for Kitchen Table 3D conversations
 * Extracted from TeamHeadquarters to prevent useEffect conflicts and WebGL crashes
 * Based on working test page: frontend/src/app/test/kitchen-scene/page.tsx
 */
export default function KitchenTablePage() {
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

        console.log('🍽️ Kitchen Table - Loaded data:', {
          characters: mapped_characters.length,
          rooms: hq.rooms.length
        });
      } catch (err) {
        console.error('❌ Kitchen Table - Failed to load data:', err);
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
        Loading Kitchen Table...
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
  // Position characters in arc formation facing camera
  // STRICT MODE: Only supports 1-3 characters
  if (available_characters.length === 0 || available_characters.length > 3) {
    throw new Error(`STRICT MODE: Kitchen Table requires 1-3 characters, got ${available_characters.length}`);
  }

  const POSITIONS: { [key: number]: [number, number, number][] } = {
    1: [[0, 0, 0]],
    2: [[-1.5, 0, 0], [1.5, 0, 0]],
    3: [[-1.8, 0, 0.2], [0, 0, 0.5], [1.8, 0, 0.2]]
  };

  const ROTATIONS: { [key: number]: [number, number, number][] } = {
    1: [[0, 0, 0]],
    2: [[0, Math.PI / 4, 0], [0, -Math.PI / 4, 0]],
    3: [[0, Math.PI / 5, 0], [0, 0, 0], [0, -Math.PI / 5, 0]]
  };

  const characters: CharacterConfig[] = available_characters.map((char, index) => ({
    id: char.character_id,
    modelPath: getCharacter3DModelPath(char.character_id),
    position: POSITIONS[available_characters.length][index],
    rotation: ROTATIONS[available_characters.length][index]
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
