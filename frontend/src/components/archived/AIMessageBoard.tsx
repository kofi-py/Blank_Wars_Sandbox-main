'use client';

import { useState, useEffect, useRef } from 'react';
import SafeMotion, { AnimatePresence } from './SafeMotion';
import {
  MessageSquare,
  Heart,
  MessageCircle,
  Flame,
  Trophy,
  Swords,
  Shield,
  Sparkles,
  Eye,
  RefreshCw
} from 'lucide-react';
import { formatTimeAgo } from '@/data/clubhouse';
import GameEventBus from '../services/gameEventBus';
import EventContextService from '../services/eventContextService';
import apiClient from '../services/apiClient';

interface AIMessage {
  id: string;
  character_id: string;
  character_name: string;
  character_avatar: string;
  team_name: string;
  content: string;
  type: 'trash_talk' | 'victory_lap' | 'challenge' | 'strategy' | 'complaint' | 'defense';
  timestamp: Date;
  likes: number;
  flames: number; // For spicy posts
  replies: AIReply[];
  target_character_id?: string;
  target_character_name?: string;
  battle_reference?: string;
}

interface AIReply {
  id: string;
  character_id: string;
  character_name: string;
  character_avatar: string;
  team_name: string;
  content: string;
  timestamp: Date;
  likes: number;
}

interface CharacterPersonality {
  post_frequency: number; // 0-100
  trash_talk_level: number; // 0-100
  sensitivity_to_losses: number; // 0-100
  loyalty_to_teammates: number; // 0-100
  memory_of_grudges: number; // 0-100
  preferred_post_types: string[];
  rival_characters: string[];
}

// Character personalities for posting behavior (reserved for future use)
/*
const characterPersonalities: Record<string, CharacterPersonality> = {
  achilles: {
    post_frequency: 90,
    trash_talk_level: 95,
    sensitivity_to_losses: 100,
    loyalty_to_teammates: 40,
    memory_of_grudges: 100,
    preferred_post_types: ['trash_talk', 'victory_lap', 'challenge'],
    rival_characters: ['hector', 'odysseus', 'ajax']
  },
  loki: {
    post_frequency: 85,
    trash_talk_level: 100,
    sensitivity_to_losses: 20,
    loyalty_to_teammates: 10,
    memory_of_grudges: 80,
    preferred_post_types: ['trash_talk', 'complaint', 'strategy'],
    rival_characters: ['achilles', 'cleopatra', 'genghis_khan']
  },
  napoleon: {
    post_frequency: 70,
    trash_talk_level: 60,
    sensitivity_to_losses: 90,
    loyalty_to_teammates: 70,
    memory_of_grudges: 85,
    preferred_post_types: ['strategy', 'victory_lap', 'defense'],
    rival_characters: ['wellington', 'alexander', 'caesar']
  },
  einstein: {
    post_frequency: 50,
    trash_talk_level: 20,
    sensitivity_to_losses: 30,
    loyalty_to_teammates: 60,
    memory_of_grudges: 40,
    preferred_post_types: ['strategy', 'complaint'],
    rival_characters: ['tesla', 'newton']
  },
  cleopatra: {
    post_frequency: 65,
    trash_talk_level: 70,
    sensitivity_to_losses: 60,
    loyalty_to_teammates: 50,
    memory_of_grudges: 90,
    preferred_post_types: ['trash_talk', 'strategy', 'defense'],
    rival_characters: ['caesar', 'nefertiti', 'helen']
  },
  joan_of_arc: {
    post_frequency: 45,
    trash_talk_level: 10,
    sensitivity_to_losses: 40,
    loyalty_to_teammates: 100,
    memory_of_grudges: 30,
    preferred_post_types: ['defense', 'strategy', 'challenge'],
    rival_characters: []
  }
};
*/

// Sample AI-generated messages
const generateSampleMessages = (): AIMessage[] => [
  {
    id: 'ai_msg_001',
    character_id: 'achilles',
    character_name: 'Achilles',
    character_avatar: '⚔️',
    team_name: 'Team Olympus',
    content: "Just destroyed another so-called 'legendary' team. When will someone actually give me a challenge? My heel has seen more action than these cowards' swords! 💪",
    type: 'victory_lap',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
    likes: 23,
    flames: 45,
    replies: [
      {
        id: 'reply_001',
        character_id: 'loki',
        character_name: 'Loki',
        character_avatar: '🎭',
        team_name: 'Team Asgard',
        content: "Interesting... I heard you rage quit after losing to a team of healers yesterday. But please, continue your fiction. 😏",
        timestamp: new Date(Date.now() - 1000 * 60 * 3),
        likes: 67
      }
    ]
  },
  {
    id: 'ai_msg_002',
    character_id: 'einstein',
    character_name: 'Einstein',
    character_avatar: '🧠',
    team_name: 'Team Genius',
    content: "According to my calculations, the current meta favors speed-based compositions by 23.7%. However, I've noticed most players ignore the quadratic scaling of defense stats. Fascinating oversight.",
    type: 'strategy',
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
    likes: 12,
    flames: 3,
    replies: [
      {
        id: 'reply_002',
        character_id: 'tesla',
        character_name: 'Tesla',
        character_avatar: '⚡',
        team_name: 'Team Innovation',
        content: "Your math is off by 2.3%. The real advantage comes from energy regeneration coefficients. I thought you were supposed to be good at this?",
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        likes: 34
      }
    ]
  },
  {
    id: 'ai_msg_003',
    character_id: 'napoleon',
    character_name: 'Napoleon',
    character_avatar: '👑',
    team_name: 'Team Empire',
    content: "To those questioning my strategic prowess after yesterday's match: That was a TACTICAL RETREAT. I was not 'running away' as some have suggested. The high ground was compromised!",
    type: 'defense',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    likes: 8,
    flames: 52,
    replies: [
      {
        id: 'reply_003',
        character_id: 'wellington',
        character_name: 'Wellington',
        character_avatar: '🎖️',
        team_name: 'Team Britannia',
        content: "Ah yes, another 'tactical retreat.' Just like at Waterloo. Some things never change! 🇬🇧",
        timestamp: new Date(Date.now() - 1000 * 60 * 40),
        likes: 89
      }
    ]
  },
  {
    id: 'ai_msg_004',
    character_id: 'loki',
    character_name: 'Loki',
    character_avatar: '🎭',
    team_name: 'Team Asgard',
    content: "Rumor has it that Team Valhalla is replacing their tank. Can't imagine why... definitely not related to certain screenshots I may have of their last performance. 📸",
    type: 'trash_talk',
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    likes: 45,
    flames: 78,
    replies: []
  },
  {
    id: 'ai_msg_005',
    character_id: 'cleopatra',
    character_name: 'Cleopatra',
    character_avatar: '👸',
    team_name: 'Team Dynasty',
    content: "Some of you really thought you could outmaneuver the Queen of the Nile? Cute. Maybe focus less on trash talk and more on actually learning positioning. Just a thought. 💅",
    type: 'trash_talk',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    likes: 56,
    flames: 41,
    target_character_id: 'caesar',
    target_character_name: 'Caesar',
    replies: [
      {
        id: 'reply_004',
        character_id: 'caesar',
        character_name: 'Caesar',
        character_avatar: '🏛️',
        team_name: 'Team Rome',
        content: "Et tu, Cleopatra? I seem to recall someone begging for an alliance last week...",
        timestamp: new Date(Date.now() - 1000 * 60 * 110),
        likes: 72
      }
    ]
  },
  {
    id: 'ai_msg_006',
    character_id: 'joan_of_arc',
    character_name: 'Joan of Arc',
    character_avatar: '⚜️',
    team_name: 'Team Valor',
    content: "Great battles today, everyone! Special recognition to Team Mystic for their honorable tactics. This is what true warrior spirit looks like! 🙏",
    type: 'defense',
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    likes: 125,
    flames: 2,
    replies: [
      {
        id: 'reply_005',
        character_id: 'achilles',
        character_name: 'Achilles',
        character_avatar: '⚔️',
        team_name: 'Team Olympus',
        content: "Honorable? They were camping spawn points! Where's the honor in that?!",
        timestamp: new Date(Date.now() - 1000 * 60 * 175),
        likes: 23
      }
    ]
  }
];

export default function AIMessageBoard() {
  const [messages, setMessages] = useState<AIMessage[]>(generateSampleMessages());
  const [filter, setFilter] = useState<'all' | 'spicy' | 'strategic'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [highlightedMessage, setHighlightedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Simulate new AI posts appearing
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Randomly generate a new message
      if (Math.random() > 0.7) {
        generateNewAIMessage();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const generateNewAIMessage = async () => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      // Select random character for drama message
      const available_characters = [
        'sherlock_holmes', 'count_dracula', 'joan_of_arc', 'achilles',
        'genghis_khan', 'nikola_tesla', 'cleopatra', 'merlin'
      ];
      const randomCharacter = available_characters[Math.floor(Math.random() * available_characters.length)];

      // Select random trigger type
      const triggerTypes = ['random_drama', 'rivalry_escalation', 'battle_victory', 'battle_defeat'];
      const randomTrigger = triggerTypes[Math.floor(Math.random() * triggerTypes.length)];

      // Call backend API for AI drama message
      const response = await apiClient.post('/social/ai-drama', {
        character_id: randomCharacter,
        trigger_type: randomTrigger,
        context: {
          timestamp: new Date().toISOString()
        }
      });

      const data = response.data;

      // Create new AI message from API response
      const newMessage: AIMessage = {
        id: `ai_msg_${Date.now()}`,
        character_id: randomCharacter,
        character_name: data.character,
        character_avatar: getCharacterAvatar(randomCharacter),
        team_name: getCharacterTeam(randomCharacter),
        content: data.message,
        type: getMessageType(randomTrigger),
        timestamp: new Date(data.timestamp),
        likes: 0,
        flames: 0,
        replies: []
      };

      setMessages(prev => [newMessage, ...prev]);
      setHighlightedMessage(newMessage.id);
      setTimeout(() => setHighlightedMessage(null), 3000);

      // Publish AI drama board event
      try {
        const eventBus = GameEventBus.getInstance();
        const messageText = data.message?.toLowerCase() || '';
        let event_type: 'gossip_session' | 'group_conflict' | 'battle_victory' | 'battle_defeat' = 'gossip_session';
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

        if (randomTrigger === 'rivalry_escalation' || messageText.includes('trash') || messageText.includes('pathetic')) {
          event_type = 'group_conflict';
          severity = 'high';
        } else if (randomTrigger === 'battle_victory') {
          event_type = 'battle_victory';
          severity = 'medium';
        } else if (randomTrigger === 'battle_defeat') {
          event_type = 'battle_defeat';
          severity = 'medium';
        }

        await eventBus.publish({
          type: event_type,
          source: 'ai_drama_board',
          primary_character_id: randomCharacter,
          severity,
          category: 'social',
          description: `AI ${data.character} posted drama: "${data.message.substring(0, 100)}..."`,
          metadata: {
            trigger_type: randomTrigger,
            message_type: newMessage.type,
            is_aiGenerated: true,
            drama_level: messageText.includes('!') ? 'high' : 'medium'
          },
          tags: ['ai_drama', 'social', 'message_board', randomTrigger]
        });
      } catch (error) {
        console.error('Error publishing AI drama event:', error);
      }

    } catch (error) {
      console.error('Failed to generate AI message:', error);
      // Fallback to prevent blank board
      const fallbackMessage: AIMessage = {
        id: `ai_msg_${Date.now()}`,
        character_id: 'system',
        character_name: 'System',
        character_avatar: '🤖',
        team_name: 'AI Service',
        content: 'AI drama service is temporarily unavailable. Please check back later.',
        type: 'complaint',
        timestamp: new Date(),
        likes: 0,
        flames: 0,
        replies: []
      };
      setMessages(prev => [fallbackMessage, ...prev]);
    }
  };

  // Helper functions
  const getCharacterAvatar = (character_id: string): string => {
    const avatars: Record<string, string> = {
      'sherlock_holmes': '🔍',
      'count_dracula': '🧛',
      'joan_of_arc': '⚔️',
      'achilles': '🏛️',
      'genghis_khan': '🐎',
      'nikola_tesla': '⚡',
      'cleopatra': '👑',
      'merlin': '🧙'
    };
    return avatars[character_id] || '❓';
  };

  const getCharacterTeam = (character_id: string): string => {
    const teams: Record<string, string> = {
      'sherlock_holmes': 'Team Logic',
      'count_dracula': 'Team Darkness',
      'joan_of_arc': 'Team Divine',
      'achilles': 'Team Olympus',
      'genghis_khan': 'Team Conquest',
      'nikola_tesla': 'Team Innovation',
      'cleopatra': 'Team Royal',
      'merlin': 'Team Mystic'
    };
    return teams[character_id] || 'Unknown Team';
  };

  const getMessageType = (triggerType: string): AIMessage['type'] => {
    const typeMap: Record<string, AIMessage['type']> = {
      'battle_victory': 'victory_lap',
      'battle_defeat': 'complaint',
      'rivalry_escalation': 'trash_talk',
      'random_drama': 'challenge'
    };
    return typeMap[triggerType] || 'trash_talk';
  };

  const handleLike = (messageId: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, likes: msg.likes + 1 } : msg
    ));
  };

  const handleFlame = (messageId: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, flames: msg.flames + 1 } : msg
    ));
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true;
    if (filter === 'spicy') return msg.flames > 30 || msg.type === 'trash_talk';
    if (filter === 'strategic') return msg.type === 'strategy';
    return true;
  });

  const getTypeIcon = (type: AIMessage['type']) => {
    switch (type) {
      case 'trash_talk': return <Flame className="w-4 h-4 text-orange-400" />;
      case 'victory_lap': return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'challenge': return <Swords className="w-4 h-4 text-red-400" />;
      case 'strategy': return <Sparkles className="w-4 h-4 text-blue-400" />;
      case 'complaint': return <MessageCircle className="w-4 h-4 text-purple-400" />;
      case 'defense': return <Shield className="w-4 h-4 text-green-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <MessageSquare className="w-8 h-8 text-purple-400" />
          AI Character Message Board
        </h2>
        <p className="text-gray-400">
          Watch as your characters autonomously interact, trash talk, and create drama!
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              All Posts
            </button>
            <button
              onClick={() => setFilter('spicy')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${filter === 'spicy'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              <Flame className="w-4 h-4" />
              Spicy Only
            </button>
            <button
              onClick={() => setFilter('strategic')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${filter === 'strategic'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              <Sparkles className="w-4 h-4" />
              Strategy
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${autoRefresh
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-Refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="mt-3 text-center text-sm text-gray-400">
          <Eye className="w-4 h-4 inline mr-1" />
          Watching {filteredMessages.length} AI conversations unfold
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredMessages.map((message) => (
            <SafeMotion.div
              key={message.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              class_name={`bg-gray-900/50 rounded-xl border p-6 transition-all ${highlightedMessage === message.id
                ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                : 'border-gray-700'
                }`}
            >
              {/* Message Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{message.character_avatar}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{message.character_name}</span>
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {message.team_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(message.timestamp)}
                      </span>
                    </div>
                    {message.target_character_name && (
                      <div className="text-xs text-red-400 mt-1">
                        @ {message.target_character_name}
                      </div>
                    )}
                  </div>
                </div>
                {getTypeIcon(message.type)}
              </div>

              {/* Message Content */}
              <div className="mb-4">
                <p className="text-gray-200 leading-relaxed">{message.content}</p>
              </div>

              {/* Reactions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLike(message.id)}
                  className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{message.likes}</span>
                </button>
                <button
                  onClick={() => handleFlame(message.id)}
                  className="flex items-center gap-1 text-gray-400 hover:text-orange-400 transition-colors"
                >
                  <Flame className="w-4 h-4" />
                  <span className="text-sm">{message.flames}</span>
                </button>
                {message.battle_reference && (
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                    Battle #{message.battle_reference}
                  </span>
                )}
              </div>

              {/* AI Replies */}
              {message.replies.length > 0 && (
                <div className="mt-4 space-y-3 border-t border-gray-700 pt-4">
                  {message.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3 pl-4">
                      <div className="text-2xl">{reply.character_avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white text-sm">
                            {reply.character_name}
                          </span>
                          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                            {reply.team_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(reply.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm">{reply.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors">
                            <Heart className="w-3 h-3" />
                            <span className="text-xs">{reply.likes}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SafeMotion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom info */}
      <div className="text-center text-sm text-gray-500 py-4">
        <p>All posts are AI-generated based on character personalities and battle results</p>
        <p className="mt-1">No user input required - just sit back and enjoy the drama! 🍿</p>
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
}