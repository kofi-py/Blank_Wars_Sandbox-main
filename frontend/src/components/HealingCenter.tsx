'use client';

import React, { useState, useEffect } from 'react';
import SafeMotion, { AnimatePresence } from './SafeMotion';
import {
  Heart,
  Clock,
  Zap,
  Shield,
  Star,
  Users,
  AlertTriangle,
  CheckCircle,
  X,
  Play,
  Pause,
  SkullIcon,
  Crown,
  DollarSign,
  Gem,
  Timer,
  Activity,
  Sparkles,
  Building,
  Info
} from 'lucide-react';
import { characterAPI, apiClient } from '@/services/apiClient';
import CharacterHealthService from '@/services/characterHealthService';
import {
  CharacterAPIResponse,
  HealingFacilityAPIResponse,
  HealingSessionAPIResponse,
  ResurrectionOptionAPIResponse,
  isCharacterAPIResponse
} from '@/types/api';
import { Contestant } from '@blankwars/types';

// Using centralized types from @/types/api
type HealingFacility = HealingFacilityAPIResponse;
type Character = CharacterAPIResponse;
type HealingSession = HealingSessionAPIResponse;
type ResurrectionOption = ResurrectionOptionAPIResponse;

export default function HealingCenter() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected_character, setSelectedCharacter] = useState<Character | null>(null);
  const [healingOptions, setHealingOptions] = useState<HealingFacility[]>([]);
  const [active_sessions, setActiveSessions] = useState<HealingSession[]>([]);
  const [resurrectionOptions, setResurrectionOptions] = useState<ResurrectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [activeTab, setActiveTab] = useState<'overview' | 'healing' | 'resurrection' | 'sessions'>('overview');

  // Retry utility function
  const retryOperation = async (operation: () => Promise<void>, operation_name: string, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await operation();
        return; // Success
      } catch (error) {
        console.error(`${operation_name} attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          // Final attempt failed
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setError(`Failed to ${operation_name.toLowerCase()} after ${maxRetries} attempts: ${errorMessage}`);
          throw error;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // Manual retry function for user-triggered retries
  const handleRetry = async () => {
    setIsRetrying(true);
    setError(null);
    setRetryCount(prev => prev + 1);

    try {
      await loadAllData();
    } catch (error) {
      // Error already handled in loadAllData
    } finally {
      setIsRetrying(false);
    }
  };

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (error && error.includes('Network')) {
        handleRetry();
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error]);

  // Load data on component mount
  useEffect(() => {
    loadAllData();
    // Set up polling for active sessions
    const interval = setInterval(loadActiveSessions, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      await retryOperation(async () => {
        await Promise.all([
          loadCharacters(),
          loadActiveSessions()
        ]);
      }, 'Load healing center data');
    } catch (err) {
      // Error already handled in retryOperation
    } finally {
      setLoading(false);
    }
  };

  const loadCharacters = async () => {
    try {
      const charactersData = await characterAPI.get_user_characters();

      if (charactersData.length === 0) {
        setError('No characters found. Please create a character first.');
        return;
      }

      // Get health status for each character with type validation
      const charactersWithHealth: Character[] = charactersData
        .map((char: Contestant): Character => {
          return {
            id: char.id,
            name: char.name,
            avatar: char.avatar,
            level: char.level,
            current_health: char.current_health,
            max_health: char.max_health,
            is_injured: char.is_injured,
            is_dead: char.is_dead,
            injury_severity: char.injury_severity,
            recovery_time: char.recovery_time,
            resurrection_available_at: char.resurrection_available_at,
            death_count: char.death_count
          };
        });

      setCharacters(charactersWithHealth);
      if (charactersWithHealth.length > 0 && !selected_character) {
        setSelectedCharacter(charactersWithHealth[0]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Unable to load characters: ${errorMessage}`);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await apiClient.get('/healing/sessions');
      setActiveSessions(response.data.sessions || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error loading healing sessions:', error);
      // Don't throw for sessions - this is non-critical data
      setActiveSessions([]);
    }
  };

  const loadHealingOptions = async (character_id: string) => {
    try {
      const response = await apiClient.get(`/healing/options/${character_id}`);
      setHealingOptions(response.data.healingOptions || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error loading healing options:', error);
      setError(`Unable to load healing options: ${errorMessage}. Try selecting a different character or retry.`);
      setHealingOptions([]);
    }
  };

  const loadResurrectionOptions = async (character_id: string) => {
    try {
      const response = await apiClient.get(`/healing/resurrection/options/${character_id}`);
      setResurrectionOptions(response.data.resurrectionOptions || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error loading resurrection options:', error);
      setError(`Unable to load resurrection options: ${errorMessage}. Try selecting a different character or retry.`);
      setResurrectionOptions([]);
    }
  };

  // Load options when character changes
  useEffect(() => {
    if (selected_character) {
      if (selected_character.is_dead) {
        loadResurrectionOptions(selected_character.id);
        setHealingOptions([]);
      } else if (selected_character.is_injured || selected_character.current_health < selected_character.max_health) {
        loadHealingOptions(selected_character.id);
        setResurrectionOptions([]);
      } else {
        setHealingOptions([]);
        setResurrectionOptions([]);
      }
    }
  }, [selected_character]);

  const startHealingSession = async (healingType: string, facility_id?: string) => {
    if (!selected_character) return;

    setActionLoading(true);
    try {
      const response = await apiClient.post(`/healing/start/${selected_character.id}`, {
        healingType,
        facility_id: facility_id,
        payment_method: 'currency' // Default to currency
      });

      setError(null);
      // Reload data to reflect changes
      await loadAllData();
      setActiveTab('sessions');
    } catch (error) {
      console.error('Error starting healing session:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to start healing session';
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const executeResurrection = async (resurrectionType: 'premium_instant' | 'wait_penalty' | 'level_reset') => {
    if (!selected_character) return;

    setActionLoading(true);
    try {
      const response = await apiClient.post(`/healing/resurrection/${selected_character.id}`, {
        resurrectionType
      });

      setError(null);
      // Reload data to reflect changes
      await loadAllData();
      setActiveTab('overview');
    } catch (error) {
      console.error('Error executing resurrection:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to resurrect character';
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const getHealthPercentage = (character: Character): number => {
    if (character.max_health === 0) return 0;
    return Math.round((character.current_health / character.max_health) * 100);
  };

  const getHealthColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    if (percentage >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getBorderColor = (character: Character): string => {
    if (character.is_dead) return 'border-red-500';
    if (character.is_injured) return 'border-orange-500';
    if (character.current_health < character.max_health) return 'border-yellow-500';
    return 'border-green-500';
  };

  const getStatusText = (character: Character): string => {
    if (character.is_dead) return 'Dead - Needs Resurrection';
    if (character.is_injured) return `Injured (${character.injury_severity}) - Needs Medical Attention`;
    if (character.current_health < character.max_health) return 'Wounded - Could Use Healing';
    return 'Healthy - Ready for Battle';
  };

  const formatTime = (timeString: string): string => {
    try {
      const time = new Date(timeString);
      const now = new Date();
      const diffMs = time.getTime() - now.getTime();

      if (diffMs <= 0) return 'Completed';

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m remaining`;
      } else {
        return `${diffMinutes}m remaining`;
      }
    } catch (error) {
      return 'Invalid time';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Healing Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <Heart className="w-8 h-8 text-red-400" />
          Healing Center
          {isOffline && (
            <div className="bg-yellow-600 text-yellow-100 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse" />
              Offline
            </div>
          )}
        </h1>
        <p className="text-gray-400 text-lg">
          Restore your characters to fighting condition
          {isOffline && <span className="text-yellow-400"> (Limited functionality - reconnecting...)</span>}
        </p>
      </div>

      {/* Error Display with Retry */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-red-300 mb-3">{error}</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  {isRetrying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Try Again
                    </>
                  )}
                </button>
                {retryCount > 0 && (
                  <span className="text-red-400 text-sm">
                    Attempt {retryCount + 1}
                  </span>
                )}
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Character Selection Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Your Characters
            </h2>

            <div className="space-y-3">
              {(characters && Array.isArray(characters) ? characters : []).map((character) => {
                const healthPercentage = getHealthPercentage(character);
                const needsAttention = character.is_dead || character.is_injured || character.current_health < character.max_health;

                return (
                  <SafeMotion
                    key={character.id}
                    class_name={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selected_character?.id === character.id
                        ? 'border-blue-500 bg-blue-900/20'
                        : `${getBorderColor(character)} ${needsAttention ? 'bg-gray-800/50' : 'bg-gray-800/30'
                        } hover:bg-gray-800/60`
                      }`}
                    while_hover={{ scale: 1.02 }}
                    onClick={() => setSelectedCharacter(character)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{character.avatar}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-white">{character.name}</div>
                        <div className="text-sm text-gray-400">Level {character.level}</div>
                        <div className="text-sm mt-1">
                          <span className={getHealthColor(healthPercentage)}>
                            {character.current_health}/{character.max_health} HP ({healthPercentage}%)
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {getStatusText(character)}
                        </div>
                      </div>
                    </div>
                  </SafeMotion>
                );
              })}
            </div>

            {characters.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No characters found</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {!selected_character ? (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-12 text-center">
              <Heart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-400 mb-2">Select a Character</h2>
              <p className="text-gray-500">Choose a character from the sidebar to view their healing options</p>
            </div>
          ) : (
            <>
              {/* Character Status Header */}
              <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{selected_character.avatar}</div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selected_character.name}</h2>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>Level {selected_character.level}</span>
                        <span>•</span>
                        <span>{getStatusText(selected_character)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getHealthColor(getHealthPercentage(selected_character))}`}>
                      {selected_character.current_health}/{selected_character.max_health}
                    </div>
                    <div className="text-sm text-gray-400">
                      Health Points ({getHealthPercentage(selected_character)}%)
                    </div>
                  </div>
                </div>

                {/* Health Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${getHealthPercentage(selected_character) >= 80 ? 'bg-green-500' :
                          getHealthPercentage(selected_character) >= 60 ? 'bg-yellow-500' :
                            getHealthPercentage(selected_character) >= 30 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                      style={{ width: `${getHealthPercentage(selected_character)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="bg-gray-900/50 rounded-xl border border-gray-700 mb-6">
                <div className="flex border-b border-gray-600">
                  {([
                    { id: 'overview' as const, label: 'Overview', icon: Activity, disabled: false },
                    { id: 'healing' as const, label: 'Healing', icon: Heart, disabled: selected_character.is_dead },
                    { id: 'resurrection' as const, label: 'Resurrection', icon: SkullIcon, disabled: !selected_character.is_dead },
                    { id: 'sessions' as const, label: 'Active Sessions', icon: Timer, disabled: false }
                  ] as const).map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setActiveTab(tab.id)}
                        disabled={tab.disabled}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all ${activeTab === tab.id
                            ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                            : tab.disabled
                              ? 'border-transparent text-gray-600 cursor-not-allowed'
                              : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold text-white">Character Status Overview</h3>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <h4 className="font-semibold text-white mb-2">Current Condition</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Health:</span>
                              <span className={getHealthColor(getHealthPercentage(selected_character))}>
                                {selected_character.current_health}/{selected_character.max_health} ({getHealthPercentage(selected_character)}%)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Status:</span>
                              <span className="text-white">{getStatusText(selected_character)}</span>
                            </div>
                            {selected_character.injury_severity && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Injury Level:</span>
                                <span className="text-orange-400 capitalize">{selected_character.injury_severity}</span>
                              </div>
                            )}
                            {selected_character.is_dead && selected_character.death_count && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Death Count:</span>
                                <span className="text-red-400">{selected_character.death_count}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <h4 className="font-semibold text-white mb-2">Recommended Action</h4>
                          <div className="text-sm">
                            {selected_character.is_dead ? (
                              <div className="text-red-300">
                                Character needs resurrection
                              </div>
                            ) : selected_character.is_injured ? (
                              <div className="text-orange-300">
                                Character needs medical attention
                              </div>
                            ) : selected_character.current_health < selected_character.max_health ? (
                              <div className="text-yellow-300">
                                Character could use healing
                              </div>
                            ) : (
                              <div className="text-green-300">
                                Character is in perfect health
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-500/30">
                        <h4 className="font-semibold text-blue-300 mb-3">Quick Actions</h4>
                        <div className="flex gap-3">
                          {selected_character.is_dead ? (
                            <button
                              onClick={() => setActiveTab('resurrection')}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                              Resurrect Character
                            </button>
                          ) : (selected_character.is_injured || selected_character.current_health < selected_character.max_health) ? (
                            <button
                              onClick={() => setActiveTab('healing')}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            >
                              Start Healing
                            </button>
                          ) : (
                            <div className="text-green-300 text-sm">
                              Character is healthy - no action needed!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Healing Tab */}
                  {activeTab === 'healing' && !selected_character.is_dead && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold text-white">Healing Options</h3>

                      {healingOptions.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-4">
                          {healingOptions.map((option, index) => (
                            <SafeMotion
                              key={option.type + index}
                              class_name="bg-gray-800/50 rounded-xl p-6 border border-gray-600 hover:border-blue-500 transition-all"
                              while_hover={{ scale: 1.02 }}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-white">{option.name}</h4>
                                <Building className="w-5 h-5 text-blue-400" />
                              </div>

                              <p className="text-gray-400 text-sm mb-4">{option.description}</p>

                              <div className="space-y-2 text-sm mb-4">
                                {option.time_reduction !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Estimated Time:</span>
                                    <span className="text-green-400">
                                      {Math.max(0, Math.ceil((selected_character.max_health - selected_character.current_health) / 10))} hours
                                    </span>
                                  </div>
                                )}
                                {option.cost?.currency && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Cost:</span>
                                    <span className="text-yellow-400">
                                      {option.cost.currency} coins
                                    </span>
                                  </div>
                                )}
                                {option.cost?.premium && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Premium Cost:</span>
                                    <span className="text-purple-400">
                                      {option.cost.premium} gems
                                    </span>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => startHealingSession(option.type, option.facilityId)}
                                disabled={actionLoading}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                              >
                                {actionLoading ? 'Starting...' : 'Start Healing Session'}
                              </button>
                            </SafeMotion>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No healing options available for this character</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resurrection Tab */}
                  {activeTab === 'resurrection' && selected_character.is_dead && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold text-white">Resurrection Options</h3>

                      {resurrectionOptions.length > 0 ? (
                        <div className="space-y-4">
                          {resurrectionOptions.map((option) => (
                            <SafeMotion
                              key={option.type}
                              class_name="bg-gray-800/50 rounded-xl p-6 border border-gray-600 hover:border-red-500 transition-all"
                              while_hover={{ scale: 1.01 }}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-white">{option.name}</h4>
                                <SkullIcon className="w-5 h-5 text-red-400" />
                              </div>

                              <p className="text-gray-400 text-sm mb-4">{option.description}</p>

                              <div className="space-y-2 text-sm mb-4">
                                {option.cost.currency && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Currency Cost:</span>
                                    <span className="text-yellow-400">
                                      {option.cost.currency} coins
                                    </span>
                                  </div>
                                )}
                                {option.cost.premium && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Premium Cost:</span>
                                    <span className="text-purple-400">
                                      {option.cost.premium} gems
                                    </span>
                                  </div>
                                )}
                                {option.wait_time && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Wait Time:</span>
                                    <span className="text-orange-400">{option.wait_time} hours</span>
                                  </div>
                                )}
                                {option.xp_penalty && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">XP Penalty:</span>
                                    <span className="text-red-400">{option.xp_penalty}%</span>
                                  </div>
                                )}
                                {option.level_reset && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Level Reset:</span>
                                    <span className="text-red-400">Back to Level 1</span>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => executeResurrection(option.type)}
                                disabled={actionLoading}
                                className={`w-full px-4 py-2 rounded-lg transition-colors ${option.type === 'premium_instant'
                                    ? 'bg-purple-600 hover:bg-purple-700'
                                    : option.type === 'level_reset'
                                      ? 'bg-red-600 hover:bg-red-700'
                                      : 'bg-orange-600 hover:bg-orange-700'
                                  } disabled:bg-gray-600 text-white`}
                              >
                                {actionLoading ? 'Processing...' : `Choose ${option.name}`}
                              </button>
                            </SafeMotion>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <SkullIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No resurrection options available</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Sessions Tab */}
                  {activeTab === 'sessions' && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold text-white">Active Healing Sessions</h3>

                      {active_sessions.length > 0 ? (
                        <div className="space-y-4">
                          {active_sessions.map((session) => {
                            const character = (characters && Array.isArray(characters))
                              ? characters.find(c => c.id === session.character_id)
                              : null;
                            if (!character) return null;

                            return (
                              <div
                                key={session.id}
                                className="bg-gray-800/50 rounded-xl p-6 border border-blue-500/50"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="text-2xl">{character.avatar}</div>
                                    <div>
                                      <h4 className="text-lg font-semibold text-white">{character.name}</h4>
                                      <p className="text-gray-400 capitalize">{session.healing_type} healing</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center gap-2 text-blue-400">
                                      <Timer className="w-4 h-4" />
                                      <span className="font-semibold">{formatTime(session.completion_time)}</span>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                      Status: <span className="text-blue-400 capitalize">{session.status}</span>
                                    </div>
                                  </div>
                                </div>

                                {(session.currency_paid > 0 || session.premium_paid > 0) && (
                                  <div className="text-sm text-gray-400 border-t border-gray-600 pt-2">
                                    Cost paid: {session.currency_paid > 0 && (
                                      <span className="text-yellow-400">
                                        {session.currency_paid} coins
                                      </span>
                                    )}
                                    {session.premium_paid > 0 && (
                                      <span className="text-purple-400 ml-2">
                                        {session.premium_paid} gems
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <Timer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No active healing sessions</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}