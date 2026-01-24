'use client';

import { useState, useEffect } from 'react';
import SafeMotion from "./SafeMotion";
import {
  Users,
  Trophy,
  Clock,
  Target,
  Shield,
  Zap,
  AlertCircle,
  UserPlus,
  Crown,
  Star
} from 'lucide-react';
import apiClient from '../services/apiClient';
import type { UserCharacter } from '@blankwars/types';

interface PerformanceMetrics {
  score: number;
  completion_time?: number;
  accuracy?: number;
  tasks_completed?: number;
}

interface ChallengeParticipant {
  id: string;
  active_challenge_id: string;
  user_character_id: string;
  team_assignment: string | null;
  performance_metrics: PerformanceMetrics;
  final_score: number | null;
  placement: number | null;
  is_eliminated: boolean;
  character_name?: string;
}

interface Alliance {
  id: string;
  active_challenge_id: string;
  alliance_name: string | null;
  leader_character_id: string;
  member_character_ids: string[];
  is_active: boolean;
}

interface ActiveChallengeProps {
  challenge_id: string;
  user_characters: UserCharacter[];
  onBack?: () => void;
}

const ActiveChallenge: React.FC<ActiveChallengeProps> = ({ challenge_id, user_characters, onBack }) => {
  const [participants, setParticipants] = useState<ChallengeParticipant[]>([]);
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected_character, setSelectedCharacter] = useState<string>('');
  const [showAllianceForm, setShowAllianceForm] = useState(false);
  const [allianceMembers, setAllianceMembers] = useState<string[]>([]);

  useEffect(() => {
    loadChallengeData();
  }, [challenge_id]);

  const loadChallengeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [participantsRes, alliancesRes] = await Promise.all([
        apiClient.get(`/challenges/${challenge_id}/participants`),
        apiClient.get(`/challenges/${challenge_id}/alliances`)
      ]);

      setParticipants(participantsRes.data.participants || []);
      setAlliances(alliancesRes.data.alliances || []);
    } catch (err) {
      console.error('Error loading challenge data:', err);
      const apiError = err as { response?: { data?: { error?: string } } };
      setError(apiError.response?.data?.error || 'Failed to load challenge data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!selected_character) {
      setError('Please select a character');
      return;
    }

    try {
      setError(null);
      await apiClient.post(`/challenges/${challenge_id}/register`, {
        user_character_id: selected_character
      });

      await loadChallengeData();
      setSelectedCharacter('');
    } catch (err) {
      console.error('Error registering character:', err);
      const apiError = err as { response?: { data?: { error?: string } } };
      setError(apiError.response?.data?.error || 'Failed to register character');
    }
  };

  const handleFormAlliance = async () => {
    if (allianceMembers.length < 2) {
      setError('Alliance needs at least 2 members');
      return;
    }

    try {
      setError(null);
      await apiClient.post(`/challenges/${challenge_id}/alliance`, {
        leader_character_id: allianceMembers[0],
        member_character_ids: allianceMembers,
        alliance_name: `Alliance ${alliances.length + 1}`
      });

      await loadChallengeData();
      setShowAllianceForm(false);
      setAllianceMembers([]);
    } catch (err) {
      console.error('Error forming alliance:', err);
      const apiError = err as { response?: { data?: { error?: string } } };
      setError(apiError.response?.data?.error || 'Failed to form alliance');
    }
  };

  const handleDissolveAlliance = async (allianceId: string) => {
    try {
      setError(null);
      await apiClient.delete(`/challenges/${challenge_id}/alliances/${allianceId}`);
      await loadChallengeData();
    } catch (err) {
      console.error('Error dissolving alliance:', err);
      const apiError = err as { response?: { data?: { error?: string } } };
      setError(apiError.response?.data?.error || 'Failed to dissolve alliance');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-white text-xl">Loading challenge...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Target className="w-12 h-12 text-yellow-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">Active Challenge</h1>
              <p className="text-gray-300">Manage participants and alliances</p>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Back
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Register Character */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-400" />
              Register Character
            </h2>
            <select
              value={selected_character}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg mb-4"
            >
              <option value="">Select a character...</option>
              {user_characters.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name || char.id}
                </option>
              ))}
            </select>
            <button
              onClick={handleRegister}
              disabled={!selected_character}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Register for Challenge
            </button>
          </div>

          {/* Form Alliance */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-400" />
              Form Alliance
            </h2>
            {!showAllianceForm ? (
              <button
                onClick={() => setShowAllianceForm(true)}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
              >
                Create New Alliance
              </button>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="text-gray-300 text-sm mb-2 block">Select Members</label>
                  {participants.filter(p => !p.is_eliminated).map((participant) => (
                    <label key={participant.id} className="flex items-center gap-2 mb-2 text-white">
                      <input
                        type="checkbox"
                        checked={allianceMembers.includes(participant.user_character_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAllianceMembers([...allianceMembers, participant.user_character_id]);
                          } else {
                            setAllianceMembers(allianceMembers.filter(id => id !== participant.user_character_id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      {participant.character_name || participant.user_character_id}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAllianceForm(false);
                      setAllianceMembers([]);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFormAlliance}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    Form Alliance
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Participants List */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Participants ({participants.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((participant, index) => (
              <div
                key={participant.id}
                className={`p-4 rounded-lg border ${
                  participant.is_eliminated
                    ? 'bg-red-900/20 border-red-500'
                    : 'bg-gray-700/50 border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">
                    {participant.character_name || `Participant ${index + 1}`}
                  </span>
                  {participant.placement === 1 && (
                    <Crown className="w-5 h-5 text-yellow-400" />
                  )}
                </div>
                {participant.final_score !== null && (
                  <div className="text-gray-300 text-sm">
                    Score: {participant.final_score}
                  </div>
                )}
                {participant.placement && (
                  <div className="text-gray-300 text-sm">
                    Placement: #{participant.placement}
                  </div>
                )}
                {participant.is_eliminated && (
                  <div className="text-red-400 text-sm font-semibold mt-2">
                    ELIMINATED
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alliances List */}
        {alliances.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-400" />
              Alliances ({alliances.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alliances.map((alliance) => (
                <div
                  key={alliance.id}
                  className="p-4 bg-purple-900/20 border border-purple-500 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold">
                      {alliance.alliance_name || 'Unnamed Alliance'}
                    </h3>
                    {alliance.is_active && (
                      <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-gray-300 text-sm mb-2">
                    Members: {alliance.member_character_ids.length}
                  </div>
                  {alliance.is_active && (
                    <button
                      onClick={() => handleDissolveAlliance(alliance.id)}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
                    >
                      Dissolve Alliance
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveChallenge;
