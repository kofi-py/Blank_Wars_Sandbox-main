'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import SafeMotion from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import {
  Home,
  MessageSquare,
  Trophy,
  Palette,
  Users,
  Calendar,
  TrendingUp,
  Heart,
  MessageCircle,
  Award,
  Clock,
  Hash,
  Plus,
  X,
  Coffee,
  Eye
} from 'lucide-react';
import CommunityBoard from './CommunityBoard';
import ClubhouseLounge from './ClubhouseLounge';
import GraffitiWall from './GraffitiWall';
import Leaderboards from './Leaderboards';
import {
  SocialEvent,
  CommunityStats,
  formatTimeAgo
} from '@/data/clubhouse';
import { getCharacterImagePath } from '@/utils/characterImageUtils';
import { apiClient } from '@/services/apiClient';

interface CharacterData {
  id: string;
  character_id: string;
  name: string;
  avatar_emoji: string;
}

interface ClubhouseProps {
  current_user_id: string;
  current_user_name: string;
  current_user_avatar: string;
  current_user_level: number;
  available_characters: CharacterData[];
}

export default function Clubhouse({
  current_user_id,
  current_user_name,
  current_user_avatar,
  current_user_level,
  available_characters
}: ClubhouseProps) {
  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();
  const [activeTab, setActiveTab] = useState<'home' | 'board' | 'lounge' | 'wall' | 'leaderboard' | 'events'>('home');
  const [stats, setStats] = useState<CommunityStats>({
    active_today: 0,
    total_users: 0,
    messages_posted: 0,
    graffiti_created: 0,
    guilds_active: 0,
    battles_completed: 0,
    trending_tags: [],
    top_guilds: [],
    featured_art: []
  });
  const [events, setEvents] = useState<SocialEvent[]>([]);
  const [recentMessages, setRecentMessages] = useState<Array<{
    id: string;
    author_name: string;
    author_avatar: string;
    content: string;
    message_type: string;
    likes: number;
    reply_count: number;
    created_at: string;
  }>>([]);

  // Load community stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await apiClient.get<{ ok: boolean; stats: CommunityStats }>('/social/stats');
        if (response.data.ok) {
          setStats(response.data.stats);
        }
      } catch (error) {
        console.error('Failed to load community stats:', error);
      }
    };
    loadStats();
  }, []);

  // Load community events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await apiClient.get<{ ok: boolean; events: SocialEvent[] }>('/social/events');
        if (response.data.ok) {
          setEvents(response.data.events);
        }
      } catch (error) {
        console.error('Failed to load community events:', error);
      }
    };
    loadEvents();
  }, []);

  // Load recent messages for the home feed
  useEffect(() => {
    const loadRecentMessages = async () => {
      try {
        const response = await apiClient.get<{ ok: boolean; messages: typeof recentMessages }>('/social/board/messages', {
          params: { limit: '5' }
        });
        if (response.data.ok) {
          setRecentMessages(response.data.messages);
        }
      } catch (error) {
        console.error('Failed to load recent messages:', error);
      }
    };
    loadRecentMessages();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <Home className="w-8 h-8 text-purple-400" />
          The Clubhouse
        </h1>
        <p className="text-gray-400 text-lg">
          Connect with warriors, share strategies, and showcase your creativity
        </p>
      </div>

      {/* Community Stats Bar */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-green-400">{stats.active_today.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Active Today</div>
          </div>
          <div>
            <div className="text-xl font-bold text-blue-400">{stats.total_users.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Total Warriors</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-400">{stats.messages_posted.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Messages</div>
          </div>
          <div>
            <div className="text-xl font-bold text-orange-400">{stats.graffiti_created.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Graffiti Art</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-400">{stats.guilds_active}</div>
            <div className="text-xs text-gray-400">Active Guilds</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-400">{stats.battles_completed.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Battles Today</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-gray-800/50 rounded-xl p-1 flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'home'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>
          <button
            onClick={() => setActiveTab('board')}
            className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'board'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Message Board</span>
          </button>
          <button
            onClick={() => setActiveTab('lounge')}
            className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'lounge'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
          >
            <Coffee className="w-5 h-5" />
            <span>Social Lounge</span>
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
              CROSS-TEAM
            </span>
          </button>
          <button
            onClick={() => setActiveTab('wall')}
            className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'wall'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
          >
            <Palette className="w-5 h-5" />
            <span>Graffiti Wall</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
          >
            <Trophy className="w-5 h-5" />
            <span>Leaderboards</span>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'events'
                ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Events</span>
            {events.filter(e => e.status === 'active').length > 0 && (
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                {events.filter(e => e.status === 'active').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <SafeMotion
            as="div"
            key="home"
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 0 : -20 }}
            transition={{
              duration: isMobile ? 0.15 : 0.2,
              type: isMobile ? 'tween' : 'spring'
            }}
          >
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Welcome & Quick Stats */}
              <div className="lg:col-span-2 space-y-6">
                {/* Welcome Message */}
                {/* Character Showcase */}
                {available_characters.length > 0 && (
                  <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Home className="w-6 h-6 text-purple-400" />
                      Your Characters in the Clubhouse
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {available_characters.map((char) => (
                        <div key={char.id} className="relative rounded-lg overflow-hidden bg-gray-800">
                          <img
                            src={getCharacterImagePath(char.character_id, 'clubhouse')}
                            alt={`${char.name} in clubhouse`}
                            className="w-full h-48 object-cover object-top"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{char.avatar_emoji}</span>
                              <span className="font-bold text-white">{char.name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Welcome Message */}
                <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl">{current_user_avatar}</div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Welcome back, {current_user_name}!</h2>
                      <p className="text-gray-400">Level {current_user_level} Coach</p>
                    </div>
                  </div>
                  <p className="text-gray-300">
                    The community is buzzing with activity! Check out the latest strategies on the message board,
                    discover amazing art on the graffiti wall, or compete for the top spots on the leaderboards.
                  </p>
                </div>

                {/* Recent Activity Feed */}
                <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    Recent Community Activity
                  </h3>

                  <div className="space-y-4">
                    {recentMessages.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">No recent messages</p>
                    ) : (
                      recentMessages.slice(0, 3).map((message) => (
                        <div key={message.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                          <div className="text-2xl">{message.author_avatar || '👤'}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white">{message.author_name}</span>
                              <span className="text-xs text-gray-400">{formatTimeAgo(new Date(message.created_at))}</span>
                            </div>
                            <p className="text-gray-300 text-sm">{message.content.substring(0, 120)}...</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {message.likes}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {message.reply_count}
                              </span>
                              <span className="text-blue-400 capitalize">{message.message_type.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setActiveTab('board')}
                    className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    View All Messages
                  </button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Trending Tags */}
                <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-purple-400" />
                    Trending Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.trending_tags.map((tag, index) => (
                      <span
                        key={tag}
                        className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition-colors ${index === 0 ? 'bg-red-500/20 text-red-400' :
                            index === 1 ? 'bg-orange-500/20 text-orange-400' :
                              index === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Active Events */}
                <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-400" />
                    Active Events
                  </h3>
                  <div className="space-y-3">
                    {events.filter(e => e.status === 'active').slice(0, 2).map((event) => (
                      <div key={event.id} className="p-3 bg-gray-800/50 rounded-lg">
                        <h4 className="font-semibold text-white text-sm">{event.title}</h4>
                        <p className="text-xs text-gray-400 mb-2">{event.description.substring(0, 80)}...</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-green-400">{event.participants} participants</span>
                          <span className="text-gray-400">
                            Ends {formatTimeAgo(new Date(event.end_date))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('events')}
                    className="w-full mt-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    View All Events
                  </button>
                </div>

                {/* Graffiti Wall Promo */}
                <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-orange-400" />
                    Graffiti Wall
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Create and share your artwork with the community. View featured pieces and leave your mark!
                  </p>
                  <button
                    onClick={() => setActiveTab('wall')}
                    className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Visit Graffiti Wall
                  </button>
                </div>
              </div>
            </div>
          </SafeMotion>
        )}

        {activeTab === 'board' && (
          <SafeMotion
            as="div"
            key="board"
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 0 : -20 }}
            transition={{
              duration: isMobile ? 0.15 : 0.2,
              type: isMobile ? 'tween' : 'spring'
            }}
          >
            <CommunityBoard
              current_user_id={current_user_id}
              current_user_name={current_user_name}
              available_characters={available_characters}
            />
          </SafeMotion>
        )}

        {activeTab === 'lounge' && (
          <SafeMotion
            as="div"
            key="lounge"
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 0 : -20 }}
            transition={{
              duration: isMobile ? 0.15 : 0.2,
              type: isMobile ? 'tween' : 'spring'
            }}
          >
            <ClubhouseLounge
              available_characters={available_characters}
              current_user_id={current_user_id}
              current_user_name={current_user_name}
            />
          </SafeMotion>
        )}

        {activeTab === 'wall' && (
          <SafeMotion
            as="div"
            key="wall"
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 0 : -20 }}
            transition={{
              duration: isMobile ? 0.15 : 0.2,
              type: isMobile ? 'tween' : 'spring'
            }}
          >
            <GraffitiWall
              current_user_id={current_user_id}
              current_user_name={current_user_name}
              current_user_level={current_user_level}
            />
          </SafeMotion>
        )}

        {activeTab === 'leaderboard' && (
          <SafeMotion
            as="div"
            key="leaderboard"
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 0 : -20 }}
            transition={{
              duration: isMobile ? 0.15 : 0.2,
              type: isMobile ? 'tween' : 'spring'
            }}
          >
            <Leaderboards />
          </SafeMotion>
        )}

        {activeTab === 'events' && (
          <SafeMotion
            as="div"
            key="events"
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 0 : -20 }}
            transition={{
              duration: isMobile ? 0.15 : 0.2,
              type: isMobile ? 'tween' : 'spring'
            }}
          >
            <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-green-400" />
                Community Events
              </h2>

              <div className="grid gap-6">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`border rounded-xl p-6 ${event.status === 'active'
                        ? 'border-green-500 bg-green-500/10'
                        : event.status === 'upcoming'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 bg-gray-800/20'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{event.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${event.status === 'active' ? 'bg-green-500 text-white' :
                              event.status === 'upcoming' ? 'bg-blue-500 text-white' :
                                'bg-gray-500 text-white'
                            }`}>
                            {event.status}
                          </span>
                        </div>
                        <p className="text-gray-300">{event.description}</p>
                      </div>
                      <div className="text-3xl">
                        {event.type === 'tournament' ? '🏆' :
                          event.type === 'art_contest' ? '🎨' :
                            event.type === 'guild_war' ? '⚔️' : '🎉'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-gray-400 text-sm">Duration:</span>
                        <div className="text-white font-semibold">
                          {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Participants:</span>
                        <div className="text-white font-semibold">
                          {event.participants.toLocaleString()}
                          {event.max_participants && ` / ${event.max_participants.toLocaleString()}`}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Type:</span>
                        <div className="text-white font-semibold capitalize">
                          {event.type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    {event.rewards.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-white font-semibold mb-2">Rewards:</h4>
                        <div className="space-y-1">
                          {event.rewards.slice(0, 2).map((reward, index) => (
                            <div key={index} className="text-sm text-gray-300">
                              <span className="text-yellow-400 font-semibold">{reward.rank}:</span> {reward.rewards.map(r => r.type).join(', ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {event.status === 'active' && (
                      <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                        Join Event
                      </button>
                    )}

                    {event.status === 'upcoming' && (
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                        Register
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </SafeMotion>
        )}
      </AnimatePresence>
    </div>
  );
}
