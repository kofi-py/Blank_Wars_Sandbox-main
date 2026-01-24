'use client';

import { useState, useEffect } from 'react';
import TeamRoster from './TeamRoster';
import { characterAPI, teamAPI, TeamRosterData, SystemCharacterSlots } from '@/services/apiClient';
import { Contestant } from '@blankwars/types';

interface SystemCharacter {
  id: string;
  character_id: string;
  name: string;
  role: string;
  species: string;
  archetype: string;
}

interface SystemCharactersByRole {
  mascot: SystemCharacter[];
  judge: SystemCharacter[];
  therapist: SystemCharacter[];
  trainer: SystemCharacter[];
  host: SystemCharacter[];
  real_estate_agent: SystemCharacter[];
}

export default function TeamRosterWrapper() {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [systemCharacters, setSystemCharacters] = useState<SystemCharactersByRole>({
    mascot: [],
    judge: [],
    therapist: [],
    trainer: [],
    host: [],
    real_estate_agent: []
  });
  const [currentRoster, setCurrentRoster] = useState<TeamRosterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load all data in parallel
        const [
          userCharacters,
          rosterData,
          mascots,
          judges,
          therapists,
          trainers,
          hosts,
          realEstateAgents
        ] = await Promise.all([
          characterAPI.get_user_characters(),
          teamAPI.get_roster(),
          characterAPI.get_system_characters('mascot'),
          characterAPI.get_system_characters('judge'),
          characterAPI.get_system_characters('therapist'),
          characterAPI.get_system_characters('trainer'),
          characterAPI.get_system_characters('host'),
          characterAPI.get_system_characters('real_estate_agent')
        ]);

        // Filter to only contestants (not system characters)
        const contestantsOnly = userCharacters.filter(
          (char: Contestant) => char.role === 'contestant'
        );
        setContestants(contestantsOnly);

        setSystemCharacters({
          mascot: mascots,
          judge: judges,
          therapist: therapists,
          trainer: trainers,
          host: hosts,
          real_estate_agent: realEstateAgents
        });

        setCurrentRoster(rosterData);

      } catch (err) {
        console.error('Error loading team data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load team data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading team roster...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <TeamRoster
      contestants={contestants}
      systemCharacters={systemCharacters}
      currentRoster={currentRoster}
      onRosterSaved={(newRoster) => {
        setCurrentRoster(newRoster);
      }}
    />
  );
}
