'use client';

import { useState, useEffect, useCallback } from 'react';
import SafeMotion, { AnimatePresence } from './SafeMotion';
import {
  MessageSquare,
  Heart,
  MessageCircle,
  Share2,
  Pin,
  Search,
  Send,
  ThumbsUp,
  Flag,
  Plus,
  X,
  Crown,
  Loader2
} from 'lucide-react';
import { formatTimeAgo } from '@/data/clubhouse';
import { getCharacterImagePath } from '@/utils/characterImageUtils';
import { apiClient } from '@/services/apiClient';

interface CharacterData {
  id: string;
  character_id: string;
  name: string;
  avatar_emoji: string;
}

interface BoardMessage {
  id: string;
  author_type: 'coach' | 'character' | 'ai';
  author_user_id: string;
  author_character_id: string;
  author_name: string;
  author_avatar: string;
  content: string;
  message_type: string;
  tags: string[];
  likes: number;
  flames: number;
  reply_count: number;
  is_pinned: boolean;
  is_ai_generated: boolean;
  created_at: string;
  replies: BoardReply[];
}

interface BoardReply {
  id: string;
  author_type: string;
  author_name: string;
  author_avatar: string;
  content: string;
  likes: number;
  created_at: string;
}

type MessageType = 'general' | 'battle' | 'strategy' | 'trade' | 'guild' | 'announcement' | 'trash_talk' | 'victory_lap' | 'challenge' | 'complaint' | 'defense' | 'coach_announcement';

interface CommunityBoardProps {
  current_user_id: string;
  current_user_name: string;
  available_characters: CharacterData[];
}

export default function CommunityBoard({
  current_user_id,
  current_user_name,
  available_characters
}: CommunityBoardProps) {
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MessageType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [newMessageType, setNewMessageType] = useState<MessageType>('general');
  const [newMessageTags, setNewMessageTags] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  // Load messages from API
  const loadMessages = useCallback(async () => {
    const params: Record<string, string> = { limit: '50', include_replies: 'true' };
    if (activeFilter !== 'all') {
      params.message_type = activeFilter;
    }

    const response = await apiClient.get<{ ok: boolean; messages: BoardMessage[] }>('/social/board/messages', { params });
    if (response.data.ok) {
      setMessages(response.data.messages);
    }
  }, [activeFilter]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadMessages();
      setLoading(false);
    };
    init();
  }, [loadMessages]);

  // Filter and search messages
  const filteredMessages = messages.filter(msg => {
    const searchMatch = searchTerm === '' ||
      msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.author_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return searchMatch;
  });

  // Sort messages (pinned first, then by timestamp)
  const sortedMessages = filteredMessages.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleSubmitMessage = async () => {
    if (!newMessageContent.trim()) return;

    const tags = newMessageTags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    setPosting(true);
    await apiClient.post('/social/board/messages', {
      content: newMessageContent,
      message_type: newMessageType,
      tags
    });
    setPosting(false);

    // Reset form and reload messages
    setNewMessageContent('');
    setNewMessageTags('');
    setShowNewMessage(false);
    await loadMessages();
  };

  const handleLikeMessage = async (messageId: string) => {
    await apiClient.post(`/social/board/messages/${messageId}/react`, {
      reaction_type: 'like'
    });
    await loadMessages();
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      general: 'from-gray-500 to-gray-600',
      battle: 'from-red-500 to-red-600',
      strategy: 'from-blue-500 to-blue-600',
      trade: 'from-green-500 to-green-600',
      guild: 'from-purple-500 to-purple-600',
      announcement: 'from-yellow-500 to-orange-500',
      trash_talk: 'from-orange-500 to-red-500',
      victory_lap: 'from-green-400 to-emerald-500',
      challenge: 'from-pink-500 to-rose-500',
      complaint: 'from-gray-600 to-gray-700',
      defense: 'from-cyan-500 to-blue-500',
      coach_announcement: 'from-indigo-500 to-purple-500'
    };
    return colors[type] || colors.general;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      general: '💬',
      battle: '⚔️',
      strategy: '🎯',
      trade: '💰',
      guild: '🏰',
      announcement: '📢',
      trash_talk: '🔥',
      victory_lap: '🏆',
      challenge: '⚡',
      complaint: '😤',
      defense: '🛡️',
      coach_announcement: '📣'
    };
    return icons[type] || icons.general;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <span className="ml-3 text-gray-400">Loading messages...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Character Showcase */}
      {available_characters.length > 0 && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Your Characters at the Board
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {available_characters.map((char) => (
              <div key={char.id} className="relative rounded-lg overflow-hidden bg-gray-800 group">
                <img
                  src={getCharacterImagePath(char.character_id, 'community_board')}
                  alt={`${char.name} at community board`}
                  className="w-full h-48 object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
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

      {/* Header & Controls */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            Community Message Board
          </h2>
          <button
            onClick={() => setShowNewMessage(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Message
          </button>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as MessageType | 'all')}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Messages</option>
            <option value="general">💬 General</option>
            <option value="battle">⚔️ Battle</option>
            <option value="strategy">🎯 Strategy</option>
            <option value="trade">💰 Trade</option>
            <option value="guild">🏰 Guild</option>
            <option value="announcement">📢 Announcements</option>
            <option value="trash_talk">🔥 Trash Talk</option>
            <option value="victory_lap">🏆 Victory Lap</option>
          </select>

          <div className="flex items-center text-gray-400">
            <span>{sortedMessages.length} messages found</span>
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      <AnimatePresence>
        {showNewMessage && (
          <SafeMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowNewMessage(false)}
          >
            <SafeMotion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              class_name="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">New Message</h3>
                <button
                  onClick={() => setShowNewMessage(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message Type</label>
                  <select
                    value={newMessageType}
                    onChange={(e) => setNewMessageType(e.target.value as MessageType)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="general">💬 General Discussion</option>
                    <option value="battle">⚔️ Battle Reports</option>
                    <option value="strategy">🎯 Strategy & Tips</option>
                    <option value="trade">💰 Trading</option>
                    <option value="guild">🏰 Guild Recruitment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message Content</label>
                  <textarea
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    placeholder="Share your thoughts with the community..."
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newMessageTags}
                    onChange={(e) => setNewMessageTags(e.target.value)}
                    placeholder="strategy, tips, achilles, synergy"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowNewMessage(false)}
                    className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitMessage}
                    disabled={!newMessageContent.trim() || posting}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Post Message
                  </button>
                </div>
              </div>
            </SafeMotion.div>
          </SafeMotion.div>
        )}
      </AnimatePresence>

      {/* Messages List */}
      <div className="space-y-4">
        {sortedMessages.map((message) => (
          <SafeMotion.div
            key={message.id}
            layout
            class_name={`bg-gray-900/50 rounded-xl border p-6 transition-all ${
              message.is_pinned ? 'border-yellow-500 bg-yellow-500/5' : 'border-gray-700'
            } ${
              selectedMessage === message.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {/* Message Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{message.author_avatar}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{message.author_name}</span>
                    {message.author_type === 'coach' && (
                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                        Coach
                      </span>
                    )}
                    {message.author_type === 'ai' && (
                      <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                        AI
                      </span>
                    )}
                    {message.is_pinned && (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-gradient-to-r ${getTypeColor(message.message_type)} text-white`}>
                      {getTypeIcon(message.message_type)}
                      {message.message_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-xs text-gray-400">{formatTimeAgo(new Date(message.created_at))}</span>
                    {message.is_pinned && (
                      <Pin className="w-3 h-3 text-yellow-400" />
                    )}
                  </div>
                </div>
              </div>

              <button className="text-gray-400 hover:text-white transition-colors">
                <Flag className="w-4 h-4" />
              </button>
            </div>

            {/* Message Content */}
            <div className="mb-4">
              <p className="text-gray-300 leading-relaxed">{message.content}</p>

              {/* Tags */}
              {message.tags && message.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {message.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600 cursor-pointer transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Message Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLikeMessage(message.id)}
                  className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{message.likes}</span>
                </button>

                <button
                  onClick={() => setSelectedMessage(selectedMessage === message.id ? null : message.id)}
                  className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">{message.reply_count}</span>
                </button>

                {message.flames > 0 && (
                  <span className="flex items-center gap-1 text-orange-400">
                    🔥 <span className="text-sm">{message.flames}</span>
                  </span>
                )}

                <button className="flex items-center gap-1 text-gray-400 hover:text-green-400 transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm">Share</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">Helpful</span>
              </div>
            </div>

            {/* Replies Section */}
            <AnimatePresence>
              {selectedMessage === message.id && message.replies && message.replies.length > 0 && (
                <SafeMotion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  class_name="mt-4 pt-4 border-t border-gray-700 space-y-3"
                >
                  {message.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3 pl-4">
                      <div className="text-lg">{reply.author_avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{reply.author_name}</span>
                          <span className="text-xs text-gray-500">{formatTimeAgo(new Date(reply.created_at))}</span>
                        </div>
                        <p className="text-gray-300 text-sm mt-1">{reply.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors">
                            <Heart className="w-3 h-3" />
                            <span className="text-xs">{reply.likes}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </SafeMotion.div>
              )}
            </AnimatePresence>
          </SafeMotion.div>
        ))}
      </div>

      {/* Empty State */}
      {sortedMessages.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Messages Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || activeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Be the first to start a conversation!'
            }
          </p>
          {!searchTerm && activeFilter === 'all' && (
            <button
              onClick={() => setShowNewMessage(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Create First Message
            </button>
          )}
        </div>
      )}
    </div>
  );
}
