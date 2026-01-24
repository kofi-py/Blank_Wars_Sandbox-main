'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SafeMotion } from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { 
  Home, Building, MessageCircle, Send, Zap, TrendingUp, 
  Shield, Users, Crown, AlertTriangle, CheckCircle, Clock,
  DollarSign, Star, Trophy
} from 'lucide-react';
import { realEstateAgents as agentPersonalityData } from '../data/realEstateAgents_UPDATED';
import RealEstateAgentBonusService from '../services/realEstateAgentBonusService';
import { RealEstateAgent } from '../data/realEstateAgentTypes';
import { realEstateAgentChatService } from '../services/realEstateAgentChatService';
import { apiClient, characterAPI } from '../services/apiClient';

// Extended type that includes userchar_id from database
interface OwnedRealEstateAgent extends RealEstateAgent {
  userchar_id: string;
}

interface ChatMessage {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  message: string;
  timestamp: Date;
  is_user?: boolean;
  is_competitor_interruption?: boolean;
}

interface TeamStats {
  // Legacy fields
  level: number;
  total_characters: number;
  current_facilities: string[];
  budget: number;

  // HQ data
  current_hq_tier: string;
  current_balance: number;
  current_gems: number;
  current_room_count: number;
  current_bed_count: number;
  current_character_count: number;
  characters_without_beds: number;
  available_tiers: Array<{
    tier_id: string;
    tier_name: string;
    tier_level: number;
    max_rooms: number;
    max_beds: number;
    upgrade_cost: number;
  }>;

  // Coach/User data
  coach_name: string;

  // Team data
  team_name: string;
  team_total_wins: number;
  team_total_losses: number;
  team_win_percentage: number;
  team_monthly_earnings: number;
  team_total_earnings: number;

  // Account-wide earnings
  account_total_earnings: number;
  account_monthly_earnings: number;
}

const FACILITY_TYPES = [
  { id: 'basic_gym', name: 'Basic Gym', cost: 5000, icon: '🏋️', description: 'Standard training equipment' },
  { id: 'advanced_gym', name: 'Advanced Gym', cost: 15000, icon: '💪', description: 'Professional grade equipment' },
  { id: 'castle', name: 'Castle', cost: 100000, icon: '🏰', description: 'Majestic fortress with royal amenities' },
  { id: 'fortress', name: 'Fortress', cost: 80000, icon: '🏛️', description: 'Impenetrable military stronghold' },
  { id: 'yacht', name: 'Luxury Yacht', cost: 120000, icon: '🛥️', description: 'Mobile luxury base on the seas' },
  { id: 'medical_bay', name: 'Medical Bay', cost: 25000, icon: '🏥', description: 'Advanced healing and recovery center' }
];

const AGENT_BONUSES = {
  'barry': {
    name: 'Speed Deals',
    effects: ['15% facility cost reduction', '10% training speed boost'],
    icon: '⚡',
    color: 'text-yellow-400'
  },
  'lmb_3000': {
    name: 'Dramatic Ambition',
    effects: ['20% XP gain increase', 'Team "Ambition" trait unlock'],
    icon: '👑',
    color: 'text-purple-400'
  },
  'zyxthala': {
    name: 'Optimal Efficiency',
    effects: ['15% energy regeneration', 'Climate immunity for team'],
    icon: '🦎',
    color: 'text-green-400'
  }
};

export default function RealEstateAgentChat() {
  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();
  const [ownedAgents, setOwnedAgents] = useState<OwnedRealEstateAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<OwnedRealEstateAgent | null>(null);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [chat_messages, setChatMessages] = useState<ChatMessage[]>([]);
  const [user_message, setUserMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);

  // Helper function to render agent avatar (emoji or image)
  const renderAvatar = (avatar: string, size: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | 'massive' = 'medium') => {
    const isImagePath = avatar.startsWith('/images/') || avatar.startsWith('http');
    
    if (isImagePath) {
      const sizeClasses = {
        small: 'w-8 h-8',
        medium: 'w-12 h-12', 
        large: 'w-24 h-24',
        xlarge: 'w-32 h-32',
        xxlarge: 'w-48 h-48',
        massive: 'w-80 h-80'
      };
      
      return (
        <img
          src={avatar}
          alt="Agent Avatar"
          className={`${sizeClasses[size]} rounded-lg object-cover`}
          onError={() => {
            throw new Error(`STRICT MODE: Failed to load agent image: ${avatar}`);
          }}
        />
      );
    } else {
      // It's an emoji
      const textSizes = {
        small: 'text-2xl',
        medium: 'text-3xl',
        large: 'text-6xl',
        xlarge: 'text-8xl',
        xxlarge: 'text-[12rem]',
        massive: 'text-[20rem]'
      };
      
      return <div className={textSizes[size]}>{avatar}</div>;
    }
  };

  // Fetch user's owned real estate agents
  useEffect(() => {
    const fetchOwnedAgents = async () => {
      try {
        setIsLoadingAgents(true);
        const systemChars = await characterAPI.get_system_characters('real_estate_agent');

        // Merge API data with personality data from the static file
        const mergedAgents: OwnedRealEstateAgent[] = systemChars.map(char => {
          const personality = agentPersonalityData.find(p => p.id === char.character_id);
          if (!personality) {
            throw new Error(`STRICT MODE: No personality data found for agent: ${char.character_id}. Add personality data to realEstateAgents_UPDATED.ts`);
          }
          return {
            ...personality,
            userchar_id: char.id, // The UUID from user_characters table
          };
        });

        if (mergedAgents.length === 0) {
          throw new Error('STRICT MODE: User has no real estate agent assigned. Registration bug - user should have exactly 1 real estate agent.');
        }

        setOwnedAgents(mergedAgents);
        setSelectedAgent(mergedAgents[0]);
        const bonusService = RealEstateAgentBonusService.getInstance();
        bonusService.setSelectedAgent(mergedAgents[0].id);
      } catch (error) {
        console.error('Failed to fetch owned agents:', error);
        throw error;
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchOwnedAgents();
  }, []);

  useEffect(() => {
    const fetchTeamStats = async () => {
      const response = await apiClient.get('/user/team-stats');
      if (!response.data) {
        throw new Error('STRICT MODE: Team stats response missing data');
      }
      setTeamStats(response.data);
    };

    fetchTeamStats();
  }, []);

  // Only show competing agents if user owns 2+ agents
  const competingAgents = ownedAgents.length >= 2 && selectedAgent
    ? ownedAgents.filter(agent => agent.id !== selectedAgent!.id)
    : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat_messages]);

  const startConsultation = async () => {
    if (!teamStats) {
      throw new Error('STRICT MODE: startConsultation called without teamStats');
    }
    if (!selectedAgent) {
      throw new Error('STRICT MODE: startConsultation called without selectedAgent');
    }

    setIsGenerating(true);
    setHasStarted(true);
    setChatMessages([]);

    try {
      const response = await realEstateAgentChatService.startFacilityConsultation(
        selectedAgent,
        competingAgents,
        teamStats,
        selectedAgent.userchar_id
      );

      const welcomeMessage: ChatMessage = {
        id: `welcome_${Date.now()}`,
        agent_id: selectedAgent.id,
        agent_name: selectedAgent.name,
        agent_avatar: selectedAgent.avatar,
        message: response,
        timestamp: new Date(),
        is_competitor_interruption: false
      };

      setChatMessages([welcomeMessage]);
    } catch (error) {
      setIsGenerating(false);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const sendMessage = async () => {
    if (!user_message.trim() || isGenerating) return;
    if (!teamStats) {
      throw new Error('STRICT MODE: sendMessage called without teamStats');
    }

    const userChatMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      agent_id: 'user',
      agent_name: 'You',
      agent_avatar: '👤',
      message: user_message,
      timestamp: new Date(),
      is_user: true
    };

    setChatMessages(prev => [...prev, userChatMessage]);
    const currentMessage = user_message;
    setUserMessage('');
    setIsGenerating(true);

    try {
      const conversationHistory = chat_messages.map(msg => ({
        agent_id: msg.agent_id,
        message: msg.message,
        timestamp: msg.timestamp
      }));

      const responses = await realEstateAgentChatService.sendUserMessage(
        selectedAgent!,
        competingAgents,
        currentMessage,
        teamStats,
        conversationHistory,
        selectedAgent!.userchar_id
      );

      const newMessages: ChatMessage[] = responses.map(response => {
        const agent = ownedAgents.find(a => a.id === response.agent_id);
        if (!agent) {
          throw new Error(`STRICT MODE: Agent ${response.agent_id} not found in owned agents`);
        }
        return {
          id: `response_${Date.now()}_${response.agent_id}`,
          agent_id: response.agent_id,
          agent_name: response.agent_name,
          agent_avatar: agent.avatar,
          message: response.message,
          timestamp: new Date(response.timestamp),
          is_competitor_interruption: response.is_competitor_interruption
        };
      });

      setChatMessages(prev => [...prev, ...newMessages]);
    } catch (error) {
      setIsGenerating(false);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const switchAgent = (agent: OwnedRealEstateAgent) => {
    setSelectedAgent(agent);
    setHasStarted(false);
    setChatMessages([]);
    setSelectedFacility(null);
    
    // Update the bonus service with the selected agent
    const bonusService = RealEstateAgentBonusService.getInstance();
    bonusService.setSelectedAgent(agent.id);
  };

  const getAgentBonus = (agent_id: string) => {
    return AGENT_BONUSES[agent_id as keyof typeof AGENT_BONUSES];
  };

  return (
    <div className="h-full bg-gradient-to-br from-amber-900/20 to-orange-900/20 p-6">
      <div className="max-w-7xl mx-auto h-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Building className="w-8 h-8" />
            HQ Facilities - Real Estate Consultation
          </h1>
          <p className="text-gray-300">
            Choose your agent and upgrade your team headquarters with permanent bonuses
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-10rem)]">
          {/* Agent Selection Sidebar */}
          <div className="bg-black/40 rounded-lg p-4 h-full overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Choose Your Agent
            </h2>
            
            <div className="space-y-4">
              {isLoadingAgents ? (
                <div className="text-center text-gray-400">Loading agents...</div>
              ) : ownedAgents.map((agent) => {
                const bonus = getAgentBonus(agent.id);
                const isSelected = selectedAgent!.id === agent.id;
                
                return (
                  <SafeMotion
                    key={agent.id}
                    on_click={() => switchAgent(agent)}
                    class_name={`w-full p-4 rounded-lg text-left transition-all border ${
                      isSelected
                        ? 'bg-amber-600/40 border-amber-500'
                        : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-600'
                    }`}
                    while_hover={isMobile ? {} : { scale: 1.02 }}
                    while_tap={isMobile ? { scale: 0.98 } : { scale: 0.98 }}
                    transition={{ duration: isMobile ? 0.1 : 0.2, type: isMobile ? 'tween' : 'spring' }}
                    as="button"
                  >
                    <div className="flex flex-col items-center gap-3">
                      {renderAvatar(agent.avatar, 'xlarge')}
                      <div className="text-center">
                        <div className="font-semibold text-white text-lg">{agent.name}</div>
                      </div>
                      {isSelected && <CheckCircle className="w-6 h-6 text-amber-400" />}
                    </div>
                  </SafeMotion>
                );
              })}
            </div>

            {/* Team Stats */}
            <div className="mt-6 bg-black/30 rounded-lg p-3">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Team Status
              </h3>
              {teamStats ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Level:</span>
                    <span className="text-white">{teamStats.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Characters:</span>
                    <span className="text-white">{teamStats.total_characters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Budget:</span>
                    <span className="text-green-400">${teamStats.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Facilities:</span>
                    <span className="text-blue-400">{teamStats.current_facilities.length}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">Loading...</div>
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3 bg-black/40 rounded-lg p-4 h-full flex flex-col">
            {isLoadingAgents ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-400">Loading agent...</div>
              </div>
            ) : !hasStarted ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="mb-8">{renderAvatar(selectedAgent.avatar, 'massive')}</div>
                <h2 className="text-2xl font-bold text-white mb-2">{selectedAgent.name}</h2>
                <p className="text-gray-400 mb-4 max-w-md">
                  {selectedAgent.tagline} ready to help you find the perfect headquarters upgrades
                </p>

                {/* Active Agent Bonus Display */}
                {(() => {
                  const bonus = getAgentBonus(selectedAgent.id);
                  if (!bonus) {
                    throw new Error(`STRICT MODE: No bonus defined for agent ${selectedAgent.id}. Add bonus to AGENT_BONUSES.`);
                  }
                  return (
                    <div className="bg-black/50 border border-amber-500/30 rounded-lg p-3 mb-4 max-w-md">
                      <div className={`font-semibold mb-2 ${bonus.color} flex items-center gap-2 justify-center`}>
                        <span>{bonus.icon}</span>
                        Active Bonus: {bonus.name}
                      </div>
                      <div className="text-xs text-gray-300 space-y-1">
                        {bonus.effects.map((effect, idx) => (
                          <div key={idx} className="text-center">• {effect}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                
                <button
                  onClick={startConsultation}
                  disabled={isGenerating || !teamStats}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      Start Consultation
                    </>
                  )}
                </button>

              </div>
            ) : (
              <>
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  <AnimatePresence>
                    {chat_messages.map((message) => (
                      <SafeMotion
                        key={message.id}
                        initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: isMobile ? 0.1 : 0.3, type: isMobile ? 'tween' : 'spring' }}
                        class_name={`flex gap-3 ${message.is_user ? 'justify-end' : 'justify-start'}`}
                        as="div"
                      >
                        {!message.is_user && (
                          <div>{renderAvatar(message.agent_avatar, 'small')}</div>
                        )}
                        <div
                          className={`max-w-md p-3 rounded-lg ${
                            message.is_user
                              ? 'bg-amber-600 text-white'
                              : message.is_competitor_interruption
                              ? 'bg-red-600/30 border border-red-500/50 text-red-100'
                              : 'bg-gray-700 text-gray-100'
                          }`}
                        >
                          {!message.is_user && (
                            <div className="font-semibold text-sm mb-1">
                              {message.agent_name}
                              {message.is_competitor_interruption && (
                                <span className="ml-2 text-xs text-red-400">[INTERRUPTING]</span>
                              )}
                            </div>
                          )}
                          <div className="text-sm">{message.message}</div>
                          <div className="text-xs opacity-60 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        {message.is_user && (
                          <div>{renderAvatar(message.agent_avatar, 'small')}</div>
                        )}
                      </SafeMotion>
                    ))}
                  </AnimatePresence>
                  {isGenerating && (
                    <div className="flex gap-3">
                      {renderAvatar(selectedAgent.avatar, 'small')}
                      <div className="bg-gray-700 text-gray-300 p-3 rounded-lg">
                        <div className="text-sm">{selectedAgent.name.split(' ')[0]} is typing...</div>
                        <div className="flex gap-1 mt-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={user_message}
                    onChange={(e) => setUserMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Ask ${selectedAgent.name.split(' ')[0]} about facilities...`}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                    disabled={isGenerating}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!user_message.trim() || isGenerating}
                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
