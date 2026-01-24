'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ChallengeHub from '@/components/ChallengeHub';
import ActiveChallenge from '@/components/ActiveChallenge';
import ChallengeResults from '@/components/ChallengeResults';
import apiClient from '@/services/apiClient';
import { Trophy, ArrowLeft } from 'lucide-react';
import type { UserCharacter } from '@blankwars/types';

type ViewMode = 'hub' | 'active' | 'results';

export default function ChallengesPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('hub');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  const [selectedResultId, setSelectedResultId] = useState<string>('');
  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserCharacters();
  }, [user]);

  const loadUserCharacters = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get('/user/characters');
      setUserCharacters(response.data.characters || []);
    } catch (error) {
      console.error('Error loading user characters:', error);
      setUserCharacters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewActiveChallenge = (challengeId: string) => {
    setSelectedChallengeId(challengeId);
    setViewMode('active');
  };

  const handleViewResults = (resultId: string) => {
    setSelectedResultId(resultId);
    setViewMode('results');
  };

  const handleBackToHub = () => {
    setSelectedChallengeId('');
    setSelectedResultId('');
    setViewMode('hub');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Sign In Required
          </h2>
          <p className="text-gray-300">
            Please sign in to participate in challenges
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading challenges...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header Image */}
      <div className="w-full">
        <img
          src="/images/Challenges/challenges_header.png"
          alt="Challenges"
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Navigation Header */}
      {viewMode !== 'hub' && (
        <div className="p-4 border-b border-gray-700/50 bg-gray-900/30 backdrop-blur-sm">
          <button
            onClick={handleBackToHub}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Challenges Hub
          </button>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'hub' && (
        <ChallengeHub
          user_characters={userCharacters}
          onViewChallenge={handleViewActiveChallenge}
          onViewResults={handleViewResults}
        />
      )}

      {viewMode === 'active' && selectedChallengeId && (
        <ActiveChallenge
          challenge_id={selectedChallengeId}
          user_characters={userCharacters}
          onBack={handleBackToHub}
        />
      )}

      {viewMode === 'results' && (
        <ChallengeResults
          result_id={selectedResultId}
          user_character_id={userCharacters[0]?.id}
          onClose={handleBackToHub}
        />
      )}
    </div>
  );
}
