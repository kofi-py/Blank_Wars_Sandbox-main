'use client';

import { useState, useEffect } from 'react';
import SafeMotion from "./SafeMotion";
import { AnimatePresence } from "framer-motion";
import {
  Trophy,
  Users,
  Star,
  Sword,
  Target,
  Crown,
  AlertCircle,
  Clock,
  Zap,
  Medal,
  Award,
  TrendingUp,
  Info,
  Gamepad2,
  Truck,
  Waves
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import apiClient from '../services/apiClient';
import type { UserCharacter } from '@blankwars/types';

interface ChallengeMechanics {
  rules?: string[];
  scoring_method?: string;
  elimination_style?: string;
  team_based?: boolean;
}

interface ChallengeGameState {
  current_round?: number;
  total_rounds?: number;
  active_players?: string[];
  eliminated_players?: string[];
}

interface ChallengeTemplate {
  id: string;
  name: string;
  description: string;
  challenge_type: string;
  min_participants: number;
  max_participants: number;
  requires_team: boolean;
  mechanics: ChallengeMechanics;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  estimated_duration_minutes: number;
  reality_show_parody: string | null;
  theme_tags: string[];
  base_currency_reward: number;
}

interface ActiveChallenge {
  id: string;
  challenge_template_id: string;
  user_id: string;
  status: 'registration' | 'ready' | 'in_progress' | 'voting' | 'completed' | 'cancelled';
  registration_deadline: string | null;
  start_time: string | null;
  end_time: string | null;
  game_state: ChallengeGameState;
  name?: string;
  description?: string;
  reality_show_parody?: string | null;
}

interface ChallengeHubProps {
  user_characters: UserCharacter[];
  onClose?: () => void;
  onViewChallenge?: (challengeId: string) => void;
  onViewResults?: (resultId: string) => void;
}

const ChallengeHub: React.FC<ChallengeHubProps> = ({ user_characters, onClose, onViewChallenge, onViewResults }) => {
  const router = useRouter();
  const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'active'>('browse');
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      setError(null);

      const [templatesRes, activeChallengesRes] = await Promise.all([
        apiClient.get('/challenges/templates'),
        apiClient.get('/challenges/active')
      ]);

      setTemplates(templatesRes.data.templates || []);
      setActiveChallenges(activeChallengesRes.data.challenges || []);
    } catch (err) {
      console.error('Error loading challenges:', err);
      const apiError = err as { response?: { data?: { error?: string } } };
      setError(apiError.response?.data?.error || 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async (templateId: string) => {
    try {
      setError(null);
      await apiClient.post('/challenges', {
        templateId,
        registration_deadline_minutes: 30
      });

      // Reload active challenges
      await loadChallenges();
      setActiveTab('active');
    } catch (err) {
      console.error('Error creating challenge:', err);
      const apiError = err as { response?: { data?: { error?: string } } };
      setError(apiError.response?.data?.error || 'Failed to create challenge');
    }
  };

  const handleViewDetails = (template: ChallengeTemplate) => {
    setSelectedTemplate(template);
    setShowDetailsModal(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'hard': return 'text-orange-500';
      case 'extreme': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'voting': return 'bg-purple-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-white text-xl">Loading challenges...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Trophy className="w-12 h-12 text-yellow-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">Reality Show Challenges</h1>
              <p className="text-gray-300">Compete in Survivor-style challenges for rewards</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
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

        {/* Featured: Blank Beast Ball */}
        <SafeMotion
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          class_name="mb-8 bg-gradient-to-r from-amber-600/20 via-orange-600/20 to-red-600/20 backdrop-blur-sm rounded-2xl p-8 border-2 border-amber-500/50 hover:border-amber-400 transition-all shadow-xl"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Gamepad2 className="w-10 h-10 text-amber-400" />
                <div>
                  <h2 className="text-3xl font-bold text-white">🦁 Blank Beast Ball 🎾</h2>
                  <p className="text-amber-300 font-semibold">NEW MINI-GAME!</p>
                </div>
              </div>
              <p className="text-gray-200 text-lg mb-4">
                Beast characters navigate through beast obstacles in ball form! Roll, dodge, and bounce through chaotic obstacle courses featuring falling cows, rolling boulders, and more.
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-300 mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>3D Action</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>14+ Characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-400" />
                  <span>Multiple Levels</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/challenges/blank-beast-ball')}
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-amber-500/50 transition-all flex items-center gap-3"
              >
                <Gamepad2 className="w-6 h-6" />
                Play Now
              </button>
            </div>
            <div className="hidden lg:block text-8xl">
              🦁🎾
            </div>
          </div>
        </SafeMotion>

        {/* Featured: Arbor Apocalypse */}
        <SafeMotion
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          class_name="mb-8 bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-teal-600/20 backdrop-blur-sm rounded-2xl p-8 border-2 border-green-500/50 hover:border-green-400 transition-all shadow-xl"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Truck className="w-10 h-10 text-green-400" />
                <div>
                  <h2 className="text-3xl font-bold text-white">🚚 Arbor Apocalypse 🌳</h2>
                  <p className="text-green-300 font-semibold">MINI-GAME</p>
                </div>
              </div>
              <p className="text-gray-200 text-lg mb-4">
                Deliver trees through the apocalypse! Dodge meteors, avoid traffic, flee zombies, and drive through puddles to put out fires on your cargo.
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-300 mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>3D Action</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-red-400" />
                  <span>Meteor Dodging</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-400" />
                  <span>Tree Delivery</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/challenges/arbor-apocalypse')}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-green-500/50 transition-all flex items-center gap-3"
              >
                <Truck className="w-6 h-6" />
                Play Now
              </button>
            </div>
            <div className="hidden lg:block text-8xl">
              🚚🌳
            </div>
          </div>
        </SafeMotion>

        {/* Featured: Rubber Duck River Race */}
        <SafeMotion
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          class_name="mb-8 bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-sky-600/20 backdrop-blur-sm rounded-2xl p-8 border-2 border-blue-500/50 hover:border-blue-400 transition-all shadow-xl"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Waves className="w-10 h-10 text-blue-400" />
                <div>
                  <h2 className="text-3xl font-bold text-white">🦆 Rubber Duck River Race 🌊</h2>
                  <p className="text-blue-300 font-semibold">MINI-GAME</p>
                </div>
              </div>
              <p className="text-gray-200 text-lg mb-4">
                Navigate your rubber duck down a treacherous river! Race against 10 other ducks, dodge obstacles, bump competitors into danger, and jump over hazards.
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-300 mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>3D Action</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  <span>11 Racers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-blue-400" />
                  <span>River Racing</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/challenges/rubber-duck-river-race')}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/50 transition-all flex items-center gap-3"
              >
                <Waves className="w-6 h-6" />
                Play Now
              </button>
            </div>
            <div className="hidden lg:block text-8xl">
              🦆🌊
            </div>
          </div>
        </SafeMotion>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'browse'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Browse Challenges ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Active Challenges ({activeChallenges.length})
          </button>
        </div>

        {/* Browse Templates Tab */}
        {activeTab === 'browse' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <SafeMotion
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                class_name="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{template.name}</h3>
                    {template.reality_show_parody && (
                      <p className="text-sm text-purple-400 italic">{template.reality_show_parody}</p>
                    )}
                  </div>
                  <Award className="w-6 h-6 text-yellow-400" />
                </div>

                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{template.description}</p>

                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300">{template.min_participants}-{template.max_participants}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-green-400" />
                    <span className="text-gray-300">{template.estimated_duration_minutes}m</span>
                  </div>
                  <div className={`font-semibold ${getDifficultyColor(template.difficulty)}`}>
                    {template.difficulty.toUpperCase()}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-lg font-bold text-yellow-400">${template.base_currency_reward}</span>
                  <span className="text-gray-400 text-sm">base reward</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(template)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Info className="w-4 h-4" />
                    Details
                  </button>
                  <button
                    onClick={() => handleCreateChallenge(template.id)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    Create
                  </button>
                </div>
              </SafeMotion>
            ))}
          </div>
        )}

        {/* Active Challenges Tab */}
        {activeTab === 'active' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeChallenges.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No active challenges yet</p>
                <p className="text-gray-500">Create one from the Browse tab!</p>
              </div>
            ) : (
              activeChallenges.map((challenge) => (
                <SafeMotion
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  class_name="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{challenge.name || 'Challenge'}</h3>
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(challenge.status)}`}>
                        {challenge.status.toUpperCase()}
                      </div>
                    </div>
                    <Medal className="w-6 h-6 text-yellow-400" />
                  </div>

                  {challenge.registration_deadline && (
                    <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                      <Clock className="w-4 h-4" />
                      <span>Registration ends: {new Date(challenge.registration_deadline).toLocaleString()}</span>
                    </div>
                  )}

                  <button
                    onClick={() => onViewChallenge?.(challenge.id)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    View Challenge
                  </button>
                </SafeMotion>
              ))
            )}
          </div>
        )}

        {/* Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedTemplate && (
            <SafeMotion
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              class_name="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowDetailsModal(false)}
            >
              <SafeMotion
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                class_name="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <h2 className="text-3xl font-bold text-white mb-4">{selectedTemplate.name}</h2>
                {selectedTemplate.reality_show_parody && (
                  <p className="text-lg text-purple-400 italic mb-4">{selectedTemplate.reality_show_parody}</p>
                )}

                <p className="text-gray-300 mb-6">{selectedTemplate.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Participants</div>
                    <div className="text-white font-bold">{selectedTemplate.min_participants}-{selectedTemplate.max_participants} players</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Duration</div>
                    <div className="text-white font-bold">{selectedTemplate.estimated_duration_minutes} minutes</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Difficulty</div>
                    <div className={`font-bold ${getDifficultyColor(selectedTemplate.difficulty)}`}>
                      {selectedTemplate.difficulty.toUpperCase()}
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Base Reward</div>
                    <div className="text-yellow-400 font-bold">${selectedTemplate.base_currency_reward}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleCreateChallenge(selectedTemplate.id);
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    Create Challenge
                  </button>
                </div>
              </SafeMotion>
            </SafeMotion>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChallengeHub;
