'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Shield,
  Check,
  Clipboard,
  AlertCircle,
  Star,
  Scale,
  Brain,
  Dumbbell,
  Mic,
  Home,
  LucideIcon
} from 'lucide-react';
import { getCharacterImagePath } from '../utils/characterImageUtils';
import { Contestant } from '@blankwars/types';
import { teamAPI, TeamRosterData, SystemCharacterSlots } from '@/services/apiClient';

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

type SystemCharacterType = keyof SystemCharactersByRole;

interface TeamRosterProps {
  contestants: Contestant[];
  systemCharacters: SystemCharactersByRole;
  currentRoster: TeamRosterData | null;
  onRosterSaved?: (roster: TeamRosterData) => void;
}

const SYSTEM_CHAR_CONFIG: Record<SystemCharacterType, { label: string; icon: LucideIcon; iconClass: string }> = {
  mascot: { label: 'Mascot', icon: Star, iconClass: 'w-5 h-5 text-yellow-400' },
  judge: { label: 'Judge', icon: Scale, iconClass: 'w-5 h-5 text-purple-400' },
  therapist: { label: 'Therapist', icon: Brain, iconClass: 'w-5 h-5 text-teal-400' },
  trainer: { label: 'Trainer', icon: Dumbbell, iconClass: 'w-5 h-5 text-orange-400' },
  host: { label: 'Host', icon: Mic, iconClass: 'w-5 h-5 text-pink-400' },
  real_estate_agent: { label: 'Real Estate', icon: Home, iconClass: 'w-5 h-5 text-green-400' }
};

export default function TeamRoster({
  contestants,
  systemCharacters,
  currentRoster,
  onRosterSaved
}: TeamRosterProps) {
  // Active contestants (exactly 3 required)
  const [activeContestants, setActiveContestants] = useState<string[]>([]);
  // Backup contestants (0-3 optional)
  const [backupContestants, setBackupContestants] = useState<string[]>([]);
  // System character selections
  const [systemSlots, setSystemSlots] = useState<SystemCharacterSlots>({
    mascot: { active: '', backup: null },
    judge: { active: '', backup: null },
    therapist: { active: '', backup: null },
    trainer: { active: '', backup: null },
    host: { active: '', backup: null },
    real_estate_agent: { active: '', backup: null }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize from current roster
  useEffect(() => {
    if (currentRoster) {
      setActiveContestants(currentRoster.active_contestants);
      setBackupContestants(currentRoster.backup_contestants);

      // Only set system slots if they exist in the roster
      if (currentRoster.system_characters) {
        setSystemSlots({
          mascot: {
            active: currentRoster.system_characters.mascot?.active ?? '',
            backup: currentRoster.system_characters.mascot?.backup ?? null
          },
          judge: {
            active: currentRoster.system_characters.judge?.active ?? '',
            backup: currentRoster.system_characters.judge?.backup ?? null
          },
          therapist: {
            active: currentRoster.system_characters.therapist?.active ?? '',
            backup: currentRoster.system_characters.therapist?.backup ?? null
          },
          trainer: {
            active: currentRoster.system_characters.trainer?.active ?? '',
            backup: currentRoster.system_characters.trainer?.backup ?? null
          },
          host: {
            active: currentRoster.system_characters.host?.active ?? '',
            backup: currentRoster.system_characters.host?.backup ?? null
          },
          real_estate_agent: {
            active: currentRoster.system_characters.real_estate_agent?.active ?? '',
            backup: currentRoster.system_characters.real_estate_agent?.backup ?? null
          }
        });
      }
    } else {
      // No roster exists - auto-select first available for each required slot
      if (contestants.length >= 3) {
        setActiveContestants(contestants.slice(0, 3).map(c => c.id));
      }

      // Auto-select first available system character for each type
      const autoSlots: SystemCharacterSlots = {
        mascot: { active: systemCharacters.mascot[0]?.id ?? '', backup: null },
        judge: { active: systemCharacters.judge[0]?.id ?? '', backup: null },
        therapist: { active: systemCharacters.therapist[0]?.id ?? '', backup: null },
        trainer: { active: systemCharacters.trainer[0]?.id ?? '', backup: null },
        host: { active: systemCharacters.host[0]?.id ?? '', backup: null },
        real_estate_agent: { active: systemCharacters.real_estate_agent[0]?.id ?? '', backup: null }
      };
      setSystemSlots(autoSlots);
    }
  }, [currentRoster, contestants, systemCharacters]);

  // Get contestant by ID
  const getContestant = (id: string): Contestant | undefined => {
    return contestants.find(c => c.id === id);
  };

  // Get system character by ID
  const getSystemCharacter = (type: SystemCharacterType, id: string): SystemCharacter | undefined => {
    return systemCharacters[type].find(c => c.id === id);
  };

  // Toggle contestant in active team
  const toggleActiveContestant = (id: string) => {
    setActiveContestants(prev => {
      if (prev.includes(id)) {
        return prev.filter(cid => cid !== id);
      } else if (prev.length < 3) {
        return [...prev, id];
      }
      return prev;
    });
    // Remove from backup if adding to active
    if (!activeContestants.includes(id)) {
      setBackupContestants(prev => prev.filter(cid => cid !== id));
    }
  };

  // Toggle contestant in backup bench
  const toggleBackupContestant = (id: string) => {
    if (activeContestants.includes(id)) return; // Can't add active to backup

    setBackupContestants(prev => {
      if (prev.includes(id)) {
        return prev.filter(cid => cid !== id);
      } else if (prev.length < 3) {
        return [...prev, id];
      }
      return prev;
    });
  };

  // Set system character slot
  const setSystemSlot = (type: SystemCharacterType, slot: 'active' | 'backup', id: string) => {
    setSystemSlots(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [slot]: id === '' ? (slot === 'backup' ? null : '') : id
      }
    }));
  };

  // Validate roster
  const isRosterValid = (): boolean => {
    if (activeContestants.length !== 3) return false;

    for (const type of Object.keys(SYSTEM_CHAR_CONFIG) as SystemCharacterType[]) {
      if (!systemSlots[type].active) return false;
    }

    return true;
  };

  // Save roster
  const saveRoster = async () => {
    if (!isRosterValid()) {
      setSaveError('Roster incomplete: 3 active contestants and 1 active of each system character required');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      const payload = {
        active_contestants: activeContestants,
        backup_contestants: backupContestants,
        system_characters: systemSlots
      };

      const result = await teamAPI.save_roster(payload);

      console.log('✅ Team roster saved:', result);
      onRosterSaved?.(result);

    } catch (err) {
      console.error('❌ Error saving roster:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save roster');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Clipboard className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Team Roster Management
            </h1>
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Configure your complete team with active and backup slots for contestants and support staff.
          </p>
        </div>

        {/* Active Team Section */}
        <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 rounded-xl p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Active Team ({activeContestants.length}/3)
            {activeContestants.length !== 3 && (
              <span className="text-red-400 text-sm ml-2">* Required</span>
            )}
          </h2>

          <div className="flex justify-center items-center gap-6 mb-4">
            {[0, 1, 2].map((index) => {
              const contestantId = activeContestants[index];
              const contestant = contestantId ? getContestant(contestantId) : undefined;

              return (
                <div key={`active-${index}`} className="flex flex-col items-center">
                  {contestant ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                    >
                      <div className="rounded-xl overflow-hidden border-4 border-yellow-500 shadow-2xl w-32 h-40">
                        <img
                          src={getCharacterImagePath(contestant.name, 'team')}
                          alt={contestant.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/characters/default-character.jpg';
                          }}
                        />
                      </div>
                      <div className="absolute -top-2 -right-2 bg-yellow-500 text-black rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <button
                        onClick={() => toggleActiveContestant(contestantId)}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </motion.div>
                  ) : (
                    <div className="rounded-xl border-4 border-dashed border-gray-600 bg-gray-800/50 w-32 h-40 flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  <p className="text-center mt-3 text-sm">
                    {contestant ? contestant.name : 'Empty Slot'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Backup Bench Section */}
        <div className="bg-gray-800/60 rounded-xl p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Backup Bench ({backupContestants.length}/3)
            <span className="text-gray-400 text-sm ml-2">Optional</span>
          </h2>

          <div className="flex justify-center items-center gap-6 mb-4">
            {[0, 1, 2].map((index) => {
              const contestantId = backupContestants[index];
              const contestant = contestantId ? getContestant(contestantId) : undefined;

              return (
                <div key={`backup-${index}`} className="flex flex-col items-center">
                  {contestant ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                    >
                      <div className="rounded-xl overflow-hidden border-4 border-blue-500 shadow-xl w-28 h-36 opacity-80">
                        <img
                          src={getCharacterImagePath(contestant.name, 'team')}
                          alt={contestant.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/characters/default-character.jpg';
                          }}
                        />
                      </div>
                      <button
                        onClick={() => toggleBackupContestant(contestantId)}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </motion.div>
                  ) : (
                    <div className="rounded-xl border-4 border-dashed border-gray-600 bg-gray-800/30 w-28 h-36 flex items-center justify-center">
                      <Users className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <p className="text-center mt-3 text-sm text-gray-400">
                    {contestant ? contestant.name : 'Empty'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contestant Selection */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-semibold mb-4">Available Contestants</h2>
          <p className="text-sm text-gray-400 mb-4">
            Click to add to Active Team (yellow border) or Backup Bench (blue border)
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {contestants.map((contestant) => {
              const isActive = activeContestants.includes(contestant.id);
              const isBackup = backupContestants.includes(contestant.id);
              const activeIsFull = activeContestants.length >= 3;
              const backupIsFull = backupContestants.length >= 3;

              return (
                <div key={contestant.id} className="flex flex-col gap-1">
                  <div
                    className={`relative p-2 rounded-lg border-2 ${
                      isActive
                        ? 'border-yellow-500 bg-yellow-500/20'
                        : isBackup
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600 bg-gray-700/50'
                    }`}
                  >
                    <div className="w-16 h-20 mx-auto rounded overflow-hidden mb-2">
                      <img
                        src={getCharacterImagePath(contestant.name, 'team')}
                        alt={contestant.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/characters/default-character.jpg';
                        }}
                      />
                    </div>
                    <p className="text-xs text-center truncate">{contestant.name}</p>

                    {(isActive || isBackup) && (
                      <div className="absolute -top-1 -right-1">
                        <Check className={`w-4 h-4 ${isActive ? 'text-yellow-400' : 'text-blue-400'}`} />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleActiveContestant(contestant.id)}
                      disabled={!isActive && activeIsFull}
                      className={`flex-1 text-xs py-1 rounded ${
                        isActive
                          ? 'bg-yellow-500 text-black'
                          : activeIsFull
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-600 hover:bg-yellow-500 hover:text-black'
                      }`}
                    >
                      {isActive ? 'Active' : 'Add'}
                    </button>
                    <button
                      onClick={() => toggleBackupContestant(contestant.id)}
                      disabled={isActive || (!isBackup && backupIsFull)}
                      className={`flex-1 text-xs py-1 rounded ${
                        isBackup
                          ? 'bg-blue-500 text-white'
                          : isActive || backupIsFull
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-600 hover:bg-blue-500'
                      }`}
                    >
                      {isBackup ? 'Bench' : 'Bench'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Characters Section - Visual Card Layout */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Support Staff
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Each role requires an active assignment. Backup slots are optional.
          </p>

          <div className="space-y-8">
            {(Object.keys(SYSTEM_CHAR_CONFIG) as SystemCharacterType[]).map((type) => {
              const config = SYSTEM_CHAR_CONFIG[type];
              const Icon = config.icon;
              const available = systemCharacters[type];
              const currentActive = systemSlots[type].active;
              const currentBackup = systemSlots[type].backup;
              const activeChar = currentActive ? getSystemCharacter(type, currentActive) : undefined;
              const backupChar = currentBackup ? getSystemCharacter(type, currentBackup) : undefined;

              return (
                <div key={type} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  {/* Role Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className={config.iconClass} />
                    <h3 className="text-lg font-semibold">{config.label}</h3>
                    {!currentActive && (
                      <span className="text-red-400 text-sm ml-2">* Required</span>
                    )}
                  </div>

                  {/* Active & Backup Slots */}
                  <div className="flex gap-6 mb-4">
                    {/* Active Slot */}
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-400 mb-2">Active</span>
                      {activeChar ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative"
                        >
                          <div className={`rounded-xl overflow-hidden border-4 shadow-xl w-24 h-32`}
                            style={{ borderColor: config.iconClass.includes('yellow') ? '#eab308' :
                                                  config.iconClass.includes('purple') ? '#a855f7' :
                                                  config.iconClass.includes('teal') ? '#14b8a6' :
                                                  config.iconClass.includes('orange') ? '#f97316' :
                                                  config.iconClass.includes('pink') ? '#ec4899' :
                                                  '#22c55e' }}>
                            <img
                              src={getCharacterImagePath(activeChar.name, 'team')}
                              alt={activeChar.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/images/characters/default-character.jpg';
                              }}
                            />
                          </div>
                          <button
                            onClick={() => setSystemSlot(type, 'active', '')}
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                          >
                            Remove
                          </button>
                        </motion.div>
                      ) : (
                        <div className="rounded-xl border-4 border-dashed border-red-500/50 bg-gray-800/50 w-24 h-32 flex items-center justify-center">
                          <Icon className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                      <p className="text-center mt-3 text-xs truncate w-24">
                        {activeChar ? activeChar.name : 'Select Below'}
                      </p>
                    </div>

                    {/* Backup Slot */}
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-400 mb-2">Backup</span>
                      {backupChar ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative"
                        >
                          <div className="rounded-xl overflow-hidden border-4 border-gray-500 shadow-xl w-24 h-32 opacity-80">
                            <img
                              src={getCharacterImagePath(backupChar.name, 'team')}
                              alt={backupChar.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/images/characters/default-character.jpg';
                              }}
                            />
                          </div>
                          <button
                            onClick={() => setSystemSlot(type, 'backup', '')}
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                          >
                            Remove
                          </button>
                        </motion.div>
                      ) : (
                        <div className="rounded-xl border-4 border-dashed border-gray-600 bg-gray-800/30 w-24 h-32 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                      <p className="text-center mt-3 text-xs text-gray-400 truncate w-24">
                        {backupChar ? backupChar.name : 'Optional'}
                      </p>
                    </div>
                  </div>

                  {/* Available Characters for this Role */}
                  {available.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Available {config.label}s ({available.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {available.map((char) => {
                          const isActive = char.id === currentActive;
                          const isBackup = char.id === currentBackup;

                          return (
                            <div key={char.id} className="flex flex-col gap-1">
                              <div
                                className={`relative p-1.5 rounded-lg border-2 ${
                                  isActive
                                    ? 'border-yellow-500 bg-yellow-500/20'
                                    : isBackup
                                    ? 'border-blue-500 bg-blue-500/20'
                                    : 'border-gray-600 bg-gray-700/50'
                                }`}
                              >
                                <div className="w-14 h-18 rounded overflow-hidden">
                                  <img
                                    src={getCharacterImagePath(char.name, 'team')}
                                    alt={char.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/images/characters/default-character.jpg';
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-center truncate w-14 mt-1">{char.name}</p>

                                {(isActive || isBackup) && (
                                  <div className="absolute -top-1 -right-1">
                                    <Check className={`w-4 h-4 ${isActive ? 'text-yellow-400' : 'text-blue-400'}`} />
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-1">
                                <button
                                  onClick={() => setSystemSlot(type, 'active', isActive ? '' : char.id)}
                                  className={`flex-1 text-xs py-0.5 rounded ${
                                    isActive
                                      ? 'bg-yellow-500 text-black'
                                      : 'bg-gray-600 hover:bg-yellow-500 hover:text-black'
                                  }`}
                                >
                                  {isActive ? '★' : 'Active'}
                                </button>
                                <button
                                  onClick={() => setSystemSlot(type, 'backup', isBackup ? '' : char.id)}
                                  disabled={isActive}
                                  className={`flex-1 text-xs py-0.5 rounded ${
                                    isBackup
                                      ? 'bg-blue-500 text-white'
                                      : isActive
                                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                      : 'bg-gray-600 hover:bg-blue-500'
                                  }`}
                                >
                                  {isBackup ? '◆' : 'Backup'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {available.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No {config.label.toLowerCase()}s available</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="text-center">
          {saveError && (
            <div className="flex items-center justify-center gap-2 text-red-400 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{saveError}</span>
            </div>
          )}

          <button
            onClick={saveRoster}
            disabled={isSaving || !isRosterValid()}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              isRosterValid() && !isSaving
                ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Team Roster'}
          </button>

          {!isRosterValid() && (
            <p className="text-sm text-red-400 mt-2">
              Complete all required slots to save
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
