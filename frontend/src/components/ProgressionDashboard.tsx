'use client';

import { useState, useEffect } from 'react';
import SafeMotion, { AnimatePresence } from './SafeMotion';
import {
  TrendingUp,
  Star,
  Target,
  Zap,
  Award,
  BarChart3,
  Users,
  Brain,
  Heart,
  Shield,
  Sword,
  Crown,
  Flame,
  Eye,
  Calendar,
  Clock,
  ArrowUp,
  ChevronRight,
  Sparkles,
  Trophy,
  Gem,
  Plus,
  Minus,
  Info,
  CheckCircle,
  Lock,
  Unlock,
  MessageCircle,
  Send,
  User
} from 'lucide-react';
import { Contestant as Character } from '@blankwars/types';
import { CharacterSkills } from '@/data/characterProgression';
import { CharacterExperience } from '@/data/experience';
import { calculateEquipmentBonuses, getStatDisplayName } from '@/utils/statCalculator';
import { Equipment } from '@/data/equipment';

interface ProgressionDashboardProps {
  character: Character;
  onAllocateSkillPoint?: (skill: string) => void;
  onAllocateStatPoint?: (stat: string) => void;
  onViewDetails?: (section: string) => void;
}

interface ProgressionMilestone {
  id: string;
  name: string;
  description: string;
  requirement: string;
  progress: number;
  max_progress: number;
  is_completed: boolean;
  reward: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export default function ProgressionDashboard({
  character,
  onAllocateSkillPoint,
  onAllocateStatPoint,
  onViewDetails
}: ProgressionDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'stats' | 'milestones' | 'journey'>('overview');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationType, setAllocationType] = useState<'skill' | 'stat'>('skill');
  const [allocationTarget, setAllocationTarget] = useState<string>('');

  // Performance Chat State
  const [showPerformanceChat, setShowPerformanceChat] = useState(false);
  const [chat_messages, setChatMessages] = useState<Array<{
    id: number;
    sender: 'coach' | 'contestant';
    message: string;
    timestamp: Date;
    character_name?: string;
  }>>([]);
  const [currentChatMessage, setCurrentChatMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Mock progression data based on character - unlimited levels
  const skillData = {
    combat: { level: Math.floor(character.level * 0.8), experience: 450, max_experience: 800, max_level: 999 },
    survival: { level: Math.floor(character.level * 0.6), experience: 320, max_experience: 600, max_level: 999 },
    mental: { level: Math.floor(character.level * 0.7), experience: 380, max_experience: 700, max_level: 999 },
    social: { level: Math.floor(character.level * 0.5), experience: 210, max_experience: 500, max_level: 999 },
    spiritual: { level: Math.floor(character.level * 0.4), experience: 150, max_experience: 400, max_level: 999 }
  };

  const milestones: ProgressionMilestone[] = [
    {
      id: 'combat_master',
      name: 'Combat Master',
      description: 'Reach Combat skill level 25',
      requirement: 'Combat Level 25',
      progress: skillData.combat.level,
      max_progress: 25,
      is_completed: skillData.combat.level >= 25,
      reward: 'Legendary Combat Ability',
      icon: '⚔️',
      rarity: 'legendary'
    },
    {
      id: 'balanced_warrior',
      name: 'Balanced Warrior',
      description: 'Reach level 15 in all core skills',
      requirement: 'All Skills Level 15+',
      progress: Math.min(...Object.values(skillData).map(s => s.level)),
      max_progress: 15,
      is_completed: Object.values(skillData).every(s => s.level >= 15),
      reward: 'Universal Skill Interaction',
      icon: '⚖️',
      rarity: 'epic'
    },
    {
      id: 'level_milestone',
      name: 'Veteran Status',
      description: 'Reach character level 30',
      requirement: 'Character Level 30',
      progress: character.level,
      max_progress: 30,
      is_completed: character.level >= 30,
      reward: 'Prestige Point System',
      icon: '🏅',
      rarity: 'rare'
    },
    {
      id: 'social_leader',
      name: 'Natural Leader',
      description: 'Reach Social skill level 20',
      requirement: 'Social Level 20',
      progress: skillData.social.level,
      max_progress: 20,
      is_completed: skillData.social.level >= 20,
      reward: 'Leadership Abilities',
      icon: '👑',
      rarity: 'epic'
    }
  ];

  const skillIcons = {
    combat: Sword,
    survival: Shield,
    mental: Brain,
    social: Users,
    spiritual: Heart
  };

  const skillColors = {
    combat: 'from-red-500 to-orange-500',
    survival: 'from-green-500 to-emerald-500',
    mental: 'from-blue-500 to-cyan-500',
    social: 'from-purple-500 to-pink-500',
    spiritual: 'from-yellow-500 to-amber-500'
  };

  const rarity_colors = {
    common: 'border-gray-500 bg-gray-500/10',
    rare: 'border-blue-500 bg-blue-500/10',
    epic: 'border-purple-500 bg-purple-500/10',
    legendary: 'border-yellow-500 bg-yellow-500/10'
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'stats', label: 'Stats', icon: TrendingUp },
    { id: 'milestones', label: 'Milestones', icon: Trophy },
    { id: 'journey', label: 'Journey', icon: Star }
  ];

  const handleAllocation = (type: 'skill' | 'stat', target: string) => {
    setAllocationType(type);
    setAllocationTarget(target);
    setShowAllocationModal(true);
  };

  const confirmAllocation = () => {
    if (allocationType === 'skill' && onAllocateSkillPoint) {
      onAllocateSkillPoint(allocationTarget);
    } else if (allocationType === 'stat' && onAllocateStatPoint) {
      onAllocateStatPoint(allocationTarget);
    }
    setShowAllocationModal(false);
  };

  // Performance Chat Functions
  const sendPerformanceChatMessage = async () => {
    if (!currentChatMessage.trim() || isChatLoading) return;

    const user_message = {
      id: Date.now(),
      sender: 'coach' as const,
      message: currentChatMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, user_message]);
    setCurrentChatMessage('');
    setIsChatLoading(true);

    try {
      // Real API call to performance coaching service
      const token = localStorage.getItem('accessToken');
      const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

      const response = await fetch(`${BACKEND_URL}/coaching/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          character_id: character.id,
          user_message: currentChatMessage,
          context: {
            level: character.level,
            stats: character.stats,
            bond_level: character.bond_level,
            previous_messages: chat_messages.slice(-5).map(msg => ({
              role: msg.sender,
              content: msg.message
            }))
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const aiResponse = {
        id: Date.now() + 1,
        sender: 'contestant' as const,
        message: data.message,
        timestamp: new Date(),
        character_name: data.character
      };

      setChatMessages(prev => [...prev, aiResponse]);
      setIsChatLoading(false);
    } catch (error) {
      console.error('Performance chat error:', error);
      const errorResponse = {
        id: Date.now() + 1,
        sender: 'contestant' as const,
        message: 'I apologize, but I\'m having trouble responding right now. Please try again.',
        timestamp: new Date(),
        character_name: character.name
      };
      setChatMessages(prev => [...prev, errorResponse]);
      setIsChatLoading(false);
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPerformanceChatMessage();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <TrendingUp className="w-8 h-8 text-green-400" />
          Progression Dashboard
        </h1>
        <p className="text-gray-400 text-lg">
          Track your character&apos;s growth and unlock their true potential
        </p>
      </div>

      {/* Character Summary */}
      <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center gap-6">
          <div className="text-8xl">{character.avatar}</div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">{character.name}</h2>
            {character.title && (
              <p className="text-lg text-yellow-400 mb-3">{character.title}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{character.level}</div>
                <div className="text-sm text-gray-400">Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{character.character_points || 0}</div>
                <div className="text-sm text-gray-400">Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{character.experience || 0}</div>
                <div className="text-sm text-gray-400">Experience</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{milestones.filter(m => m.is_completed).length}</div>
                <div className="text-sm text-gray-400">Milestones</div>
              </div>
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Experience to Next Level</span>
            <span>{character.experience || 0}/{character.experience_to_next || 1000}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
              style={{
                width: `${((character.experience || 0) / (character.experience_to_next || 1000)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>


      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-gray-800/50 rounded-xl p-1 flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Character Overview</h2>

            {/* Points to Spend */}
            {((character.attribute_points ?? 0) > 0 || (character.resource_points ?? 0) > 0 || (character.character_points ?? 0) > 0) && (
              <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl border border-yellow-600/50 p-4 mb-4">
                <h3 className="text-lg font-bold text-yellow-300 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Points Available to Spend
                </h3>
                <div className="flex flex-wrap gap-4">
                  {(character.attribute_points ?? 0) > 0 && (
                    <div className="bg-blue-900/40 rounded-lg px-4 py-2 border border-blue-500/30">
                      <span className="text-blue-200 text-sm">Attribute Points:</span>
                      <span className="text-white font-bold ml-2">{character.attribute_points}</span>
                    </div>
                  )}
                  {(character.resource_points ?? 0) > 0 && (
                    <div className="bg-green-900/40 rounded-lg px-4 py-2 border border-green-500/30">
                      <span className="text-green-200 text-sm">Resource Points:</span>
                      <span className="text-white font-bold ml-2">{character.resource_points}</span>
                    </div>
                  )}
                  {(character.character_points ?? 0) > 0 && (
                    <div className="bg-purple-900/40 rounded-lg px-4 py-2 border border-purple-500/30">
                      <span className="text-purple-200 text-sm">Character Points:</span>
                      <span className="text-white font-bold ml-2">{character.character_points}</span>
                    </div>
                  )}
                </div>
                <p className="text-yellow-200/70 text-sm mt-3">
                  Spend Attribute Points in the Attributes tab, Resource Points in the Resources tab, and Character Points on Powers/Spells.
                </p>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Core Skills Summary */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Core Skills
                </h3>
                <div className="space-y-3">
                  {Object.entries(skillData).map(([skill, data]) => {
                    const SkillIcon = skillIcons[skill as keyof typeof skillIcons];
                    if (!SkillIcon || !data) return null;
                    return (
                      <div key={skill} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SkillIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-300 capitalize">{skill}</span>
                        </div>
                        <span className="text-sm font-bold text-white">{data.level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Achievements */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  Recent Progress
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="text-green-400">✓ Completed advanced training</div>
                  <div className="text-blue-400">✓ Skill interaction unlocked</div>
                  <div className="text-yellow-400">✓ Level milestone reached</div>
                  <div className="text-purple-400">✓ New ability acquired</div>
                </div>
              </div>

              {/* Next Goals */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-400" />
                  Next Goals
                </h3>
                <div className="space-y-2 text-sm">
                  {milestones.filter(m => !m.is_completed).slice(0, 3).map((milestone, index) => (
                    <div key={index} className="text-gray-300">
                      • {milestone.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Progression Chart */}
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Skill Distribution</h3>
              <div className="space-y-4">
                {Object.entries(skillData).map(([skill, data]) => {
                  const SkillIcon = skillIcons[skill as keyof typeof skillIcons];
                  if (!SkillIcon || !data) return null;
                  const percentage = (data.level / data.max_level) * 100;
                  return (
                    <div key={skill} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SkillIcon className="w-5 h-5 text-gray-400" />
                          <span className="text-white capitalize">{skill}</span>
                        </div>
                        <span className="text-gray-300">{data.level}/{data.max_level}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div
                          className={`bg-gradient-to-r ${skillColors[skill as keyof typeof skillColors] || 'from-gray-500 to-gray-600'} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Skill Development</h2>
              <div className="text-sm text-gray-400">
                Available Points: <span className="text-yellow-400 font-bold">{character.character_points || 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(skillData).map(([skill, data]) => {
                const SkillIcon = skillIcons[skill as keyof typeof skillIcons];
                if (!SkillIcon || !data) return null;
                const percentage = (data.experience / data.max_experience) * 100;

                return (
                  <SafeMotion
                    key={skill}
                    class_name="bg-gray-800/50 rounded-xl p-6 border border-gray-600 hover:border-blue-500 transition-all cursor-pointer"
                    while_hover={{ scale: 1.02 }}
                    onClick={() => setSelectedSkill(selectedSkill === skill ? null : skill)}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${skillColors[skill as keyof typeof skillColors] || 'from-gray-500 to-gray-600'}`}>
                        <SkillIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white capitalize">{skill}</h3>
                        <p className="text-gray-400">Level {data.level}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{data.level}</div>
                        <div className="text-sm text-gray-400">/ {data.max_level}</div>
                      </div>
                    </div>

                    {/* Experience Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>Experience</span>
                        <span>{data.experience}/{data.max_experience}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`bg-gradient-to-r ${skillColors[skill as keyof typeof skillColors] || 'from-gray-500 to-gray-600'} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAllocation('skill', skill);
                        }}
                        disabled={(character.character_points || 0) === 0}
                        className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-all text-sm"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Allocate Point
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails?.(skill);
                        }}
                        className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all text-sm"
                      >
                        <Info className="w-4 h-4 inline" />
                      </button>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {selectedSkill === skill && (
                        <SafeMotion
                          class_name="mt-4 pt-4 border-t border-gray-600"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <div className="text-sm text-gray-300">
                            <div className="mb-2">
                              <span className="font-semibold">Benefits:</span>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                {skill === 'combat' && (
                                  <>
                                    <li>Increased damage output</li>
                                    <li>Better critical hit chance</li>
                                    <li>Unlock combat abilities</li>
                                  </>
                                )}
                                {skill === 'survival' && (
                                  <>
                                    <li>Higher damage resistance</li>
                                    <li>Improved dodge chance</li>
                                    <li>Environmental adaptation</li>
                                  </>
                                )}
                                {skill === 'mental' && (
                                  <>
                                    <li>Strategic advantages</li>
                                    <li>Faster ability cooldowns</li>
                                    <li>Problem-solving bonuses</li>
                                  </>
                                )}
                                {skill === 'social' && (
                                  <>
                                    <li>Team coordination bonuses</li>
                                    <li>Leadership abilities</li>
                                    <li>NPC interaction improvements</li>
                                  </>
                                )}
                                {skill === 'spiritual' && (
                                  <>
                                    <li>Enhanced healing abilities</li>
                                    <li>Mana regeneration bonus</li>
                                    <li>Resistance to mental effects</li>
                                  </>
                                )}
                              </ul>
                            </div>
                            <div className="text-xs text-gray-400">
                              Next milestone at level {Math.floor((data.level + 5) / 5) * 5}
                            </div>
                          </div>
                        </SafeMotion>
                      )}
                    </AnimatePresence>
                  </SafeMotion>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (() => {
          // Calculate equipment bonuses
          const equipmentBonuses = calculateEquipmentBonuses(character.inventory || []);

          // Define all stats to display with categories
          const statCategories = {
            combat: {
              title: 'Combat Stats',
              stats: {
                health: { base: character.current_health, icon: '❤️', color: 'text-red-400' },
                attack: { base: character.current_attack, icon: '⚔️', color: 'text-orange-400' },
                defense: { base: character.current_defense, icon: '🛡️', color: 'text-blue-400' },
                speed: { base: character.current_speed, icon: '⚡', color: 'text-green-400' },
                magic_attack: { base: character.magic_attack || 0, icon: '✨', color: 'text-purple-400' },
                magic_defense: { base: character.magic_defense || 0, icon: '🔮', color: 'text-indigo-400' },
              }
            },
            attributes: {
              title: 'Attribute Stats',
              stats: {
                strength: { base: character.strength || 0, icon: '💪', color: 'text-amber-400' },
                dexterity: { base: character.dexterity || 0, icon: '🎯', color: 'text-cyan-400' },
                intelligence: { base: character.intelligence || 0, icon: '🧠', color: 'text-violet-400' },
                wisdom: { base: character.wisdom || 0, icon: '🦉', color: 'text-teal-400' },
                charisma: { base: character.charisma || 0, icon: '👑', color: 'text-yellow-400' },
                spirit: { base: character.spirit || 0, icon: '🌟', color: 'text-pink-400' },
              }
            },
            advanced: {
              title: 'Advanced Combat',
              stats: {
                critical_chance: { base: character.critical_chance || 0, icon: '💥', color: 'text-red-500' },
                critical_damage: { base: character.critical_damage || 0, icon: '💢', color: 'text-orange-500' },
                accuracy: { base: character.accuracy || 0, icon: '🎲', color: 'text-sky-400' },
                evasion: { base: character.evasion || 0, icon: '💨', color: 'text-slate-400' },
                max_mana: { base: character.current_max_mana || 0, icon: '🔵', color: 'text-blue-500' },
                energy_regen: { base: character.energy_regen || 0, icon: '⚡', color: 'text-emerald-400' },
              }
            },
            psychological: {
              title: 'Psychological Stats',
              stats: {
                training: { base: character.psych_stats.training, icon: '🎓', color: 'text-green-500' },
                team_player: { base: character.psych_stats.team_player, icon: '🤝', color: 'text-blue-500' },
                ego: { base: character.psych_stats.ego, icon: '🦚', color: 'text-purple-500' },
                max_health: { base: character.current_max_health, icon: '🧘', color: 'text-teal-500' },
                communication: { base: character.psych_stats.communication, icon: '💬', color: 'text-cyan-500' },
                gameplan_adherence: { base: character.gameplan_adherence, icon: '📋', color: 'text-indigo-500' },
                current_stress: { base: character.current_stress, icon: '😰', color: 'text-red-600', inverse: true },
                team_trust: { base: character.team_trust, icon: '🤗', color: 'text-emerald-500' },
              }
            }
          };

          const totalEquipmentBonuses = Object.values(equipmentBonuses).reduce((sum, val) => sum + Math.abs(val), 0);

          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Character Statistics</h2>
                <div className="text-sm text-gray-400">
                  Available Points: <span className="text-purple-400 font-bold">{character.character_points || 0}</span>
                </div>
              </div>

              {/* Equipment Effects Notice */}
              <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-xl p-4 border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-orange-400" />
                  <span className="text-orange-300 font-semibold">Equipment Effects</span>
                </div>
                <div className="text-orange-200 text-sm">
                  {totalEquipmentBonuses > 0 ? (
                    <div>
                      <div className="font-semibold text-orange-300 mb-1">
                        🎯 Total Equipment Bonuses: +{totalEquipmentBonuses} stat points
                      </div>
                      <div>Each stat displays: Base Stat + Equipment Bonus = Final Total</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-green-300 mb-1">
                        💪 Ready for equipment upgrades
                      </div>
                      <div>Equip items to boost your stats across all categories</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Render each stat category */}
              {Object.entries(statCategories).map(([categoryKey, category]) => (
                <div key={categoryKey} className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-b border-gray-600 pb-2">{category.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(category.stats).map(([statKey, statData]) => {
                      const bonus = equipmentBonuses[statKey] || 0;
                      const finalValue = statData.base + bonus;
                      const hasBonus = bonus !== 0;
                      const isInverse = 'inverse' in statData && statData.inverse; // For stats like stress where lower is better

                      return (
                        <div key={statKey} className={`bg-gray-800/50 rounded-xl p-4 border ${hasBonus ? 'border-orange-500/50 bg-gradient-to-br from-gray-800/50 to-orange-900/20' : 'border-gray-600'
                          }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{statData.icon}</span>
                              <h4 className="text-sm font-semibold text-white">{getStatDisplayName(statKey)}</h4>
                            </div>
                            <div className="text-right">
                              <div className={`text-xl font-bold ${statData.color}`}>{finalValue}</div>
                              {hasBonus && (
                                <div className="text-xs text-orange-400">
                                  {bonus > 0 ? `+${bonus}` : bonus} gear
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stats Breakdown */}
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Base:</span>
                              <span className="text-white">{statData.base}</span>
                            </div>
                            {hasBonus && (
                              <div className="flex justify-between">
                                <span className="text-orange-400">Equipment:</span>
                                <span className="text-orange-300">{bonus > 0 ? `+${bonus}` : bonus}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold border-t border-gray-600 pt-1">
                              <span className="text-gray-300">Total:</span>
                              <span className={statData.color}>{finalValue}</span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-gray-700 rounded-full h-2 mt-3 overflow-hidden relative">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min((statData.base / Math.max(finalValue, 100)) * 100, 100)}%` }}
                            />
                            {hasBonus && (
                              <div
                                className={`bg-gradient-to-r ${bonus > 0 ? 'from-orange-400 to-yellow-500' : 'from-red-400 to-red-600'} h-2 rounded-full transition-all duration-500 absolute top-0`}
                                style={{
                                  width: `${Math.min((Math.abs(bonus) / Math.max(finalValue, 100)) * 100, 100)}%`,
                                  left: `${Math.min((statData.base / Math.max(finalValue, 100)) * 100, 100)}%`
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Achievement Milestones</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {milestones.map((milestone) => (
                <SafeMotion
                  key={milestone.id}
                  class_name={`p-6 rounded-xl border-2 ${rarity_colors[milestone.rarity]} ${milestone.is_completed ? 'opacity-100' : 'opacity-80'
                    }`}
                  while_hover={{ scale: 1.02 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{milestone.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-white">{milestone.name}</h3>
                        {milestone.is_completed ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <p className="text-gray-300 text-sm mb-3">{milestone.description}</p>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm text-gray-400 mb-1">
                          <span>{milestone.requirement}</span>
                          <span>{milestone.progress}/{milestone.max_progress}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className={`bg-gradient-to-r ${milestone.is_completed
                              ? 'from-green-500 to-emerald-500'
                              : 'from-blue-500 to-purple-500'
                              } h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min((milestone.progress / milestone.max_progress) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Reward */}
                      <div className="text-sm">
                        <span className="text-gray-400">Reward: </span>
                        <span className={milestone.is_completed ? 'text-green-400' : 'text-yellow-400'}>
                          {milestone.reward}
                        </span>
                      </div>
                    </div>
                  </div>
                </SafeMotion>
              ))}
            </div>
          </div>
        )}

        {/* Journey Tab */}
        {activeTab === 'journey' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Character Journey</h2>

            <div className="relative">
              {/* Timeline */}
              <div className="space-y-8">
                {[
                  { level: 1, title: 'The Beginning', description: 'Character awakens to their destiny', date: '7 days ago' },
                  { level: 5, title: 'First Victory', description: 'Won first arena battle', date: '5 days ago' },
                  { level: 10, title: 'Skill Unlock', description: 'Unlocked first skill interaction', date: '3 days ago' },
                  { level: 15, title: 'Training Master', description: 'Completed advanced training', date: '2 days ago' },
                  { level: character.level, title: 'Current State', description: 'Continuing the journey', date: 'Now', is_current: true }
                ].map((event, index) => (
                  <div key={index} className="flex gap-6">
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${event.is_current
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'bg-gray-700 text-gray-300'
                        }`}>
                        {event.level}
                      </div>
                      {index < 4 && <div className="w-0.5 h-8 bg-gray-600 mt-2" />}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                        <span className="text-sm text-gray-400">{event.date}</span>
                      </div>
                      <p className="text-gray-300">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Allocation Modal */}
      <AnimatePresence>
        {showAllocationModal && (
          <SafeMotion
            class_name="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SafeMotion
              class_name="bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-md w-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <h3 className="text-xl font-bold text-white mb-4">
                Allocate {allocationType === 'skill' ? 'Skill' : 'Stat'} Point
              </h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to allocate a point to <span className="capitalize font-semibold text-blue-400">{allocationTarget}</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmAllocation}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowAllocationModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>
    </div>
  );
}