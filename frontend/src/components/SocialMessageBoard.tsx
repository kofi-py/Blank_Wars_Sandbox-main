'use client';

import { useState, useEffect, useCallback } from 'react';
import SafeMotion, { AnimatePresence } from './SafeMotion';
import {
  MessageSquare,
  Heart,
  Flame,
  Send,
  Trophy,
  Swords,
  Users,
  User,
  Reply,
  RefreshCw
} from 'lucide-react';
import apiClient from '@/services/apiClient';

interface SocialMessage {
  id: string;
  author_type: 'coach' | 'contestant' | 'ai';
  author_name: string;
  author_avatar: string;
  content: string;
  message_type: string;
  likes: number;
  flames: number;
  reply_count: number;
  is_pinned: boolean;
  is_ai_generated: boolean;
  target_character_name?: string;
  battle_date?: string;
  created_at: string;
  replies?: SocialReply[];
}

interface SocialReply {
  id: string;
  author_type: 'coach' | 'contestant' | 'ai';
  author_name: string;
  author_avatar: string;
  content: string;
  likes: number;
  created_at: string;
}

interface SocialMessageBoardProps {
  current_user_id: string;
  selected_characterId?: string;
  available_characters?: any[];
}

export default function SocialMessageBoard({
  current_user_id,
  selected_characterId,
  available_characters = []
}: SocialMessageBoardProps) {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [message_type, setMessageType] = useState('general');
  const [filterType, setFilterType] = useState('all');
  const [filterAuthor, setFilterAuthor] = useState('all');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const response = await apiClient.get('/social/board/messages', {
      params: {
        message_type: filterType,
        author_type: filterAuthor,
        limit: '50',
        include_replies: 'true'
      }
    });
    setMessages(response.data.messages);
    setLoading(false);
  }, [filterType, filterAuthor]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;
    await apiClient.post('/social/board/messages', {
      content: newMessage,
      message_type
    });
    setNewMessage('');
    loadMessages();
  };

  const handlePostReply = async (messageId: string) => {
    if (!replyContent.trim()) return;
    await apiClient.post(`/social/board/messages/${messageId}/replies`, {
      content: replyContent
    });
    setReplyContent('');
    setReplyingTo(null);
    loadMessages();
  };

  const handleReact = async (messageId: string, reaction_type: 'like' | 'flame') => {
    await apiClient.post(`/social/board/messages/${messageId}/react`, { reaction_type });
    loadMessages();
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'trash_talk': return 'text-red-400';
      case 'victory_lap': return 'text-yellow-400';
      case 'challenge': return 'text-orange-400';
      case 'coach_announcement': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'trash_talk': return <Flame className="w-4 h-4" />;
      case 'victory_lap': return <Trophy className="w-4 h-4" />;
      case 'challenge': return <Swords className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="ml-3 text-gray-400">Loading social messages...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header & Filters */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Social Message Board
          </h2>

          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="trash_talk">Trash Talk</option>
              <option value="victory_lap">Victory Lap</option>
              <option value="coach_announcement">Announcements</option>
            </select>

            <select
              value={filterAuthor}
              onChange={(e) => setFilterAuthor(e.target.value)}
              className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
            >
              <option value="all">All Authors</option>
              <option value="coach">Coaches</option>
              <option value="character">Characters</option>
              <option value="ai">AI Drama</option>
            </select>
          </div>
        </div>

        {/* New Message Composer - Coaches only */}
        <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-blue-400">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">Post as Coach</span>
            </div>

            <select
              value={message_type}
              onChange={(e) => setMessageType(e.target.value)}
              className="bg-gray-700 text-white rounded px-3 py-1 text-sm ml-auto"
            >
              <option value="general">General</option>
              <option value="coach_announcement">Announcement</option>
            </select>
          </div>

          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Post a message to the community..."
              className="flex-1 bg-gray-800 text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
            />
          </div>

          <button
            onClick={handlePostMessage}
            disabled={!newMessage.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg py-2 font-semibold flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Post Message
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No messages yet. Be the first to post!
          </div>
        ) : (
          messages.map((message) => (
            <SafeMotion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              class_name={`bg-gray-800/50 rounded-lg p-4 ${
                message.is_pinned ? 'border-2 border-yellow-500' : ''
              }`}
            >
              {/* Message Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{message.author_avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{message.author_name}</span>
                    <span className="text-xs text-gray-500">
                      {message.author_type === 'coach' && '🎯 Coach'}
                      {message.author_type === 'contestant' && '⚔️ Character'}
                      {message.author_type === 'ai' && '🤖 AI'}
                    </span>
                    <span className={`text-xs ${getMessageTypeColor(message.message_type)} flex items-center gap-1`}>
                      {getMessageTypeIcon(message.message_type)}
                      {message.message_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="text-gray-300 mb-3 pl-12">
                {message.content}
                {message.target_character_name && (
                  <span className="text-red-400 ml-2">
                    @ {message.target_character_name}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pl-12 text-sm">
                <button
                  onClick={() => handleReact(message.id, 'like')}
                  className="flex items-center gap-1 text-gray-400 hover:text-pink-400"
                >
                  <Heart className="w-4 h-4" />
                  {message.likes}
                </button>
                <button
                  onClick={() => handleReact(message.id, 'flame')}
                  className="flex items-center gap-1 text-gray-400 hover:text-orange-400"
                >
                  <Flame className="w-4 h-4" />
                  {message.flames}
                </button>
                <button
                  onClick={() => setReplyingTo(message.id)}
                  className="flex items-center gap-1 text-gray-400 hover:text-blue-400"
                >
                  <Reply className="w-4 h-4" />
                  Reply ({message.reply_count})
                </button>
              </div>

              {/* Reply Form */}
              {replyingTo === message.id && (
                <div className="mt-4 pl-12 space-y-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full bg-gray-900 text-white rounded p-2 text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePostReply(message.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-sm"
                    >
                      Post Reply
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {message.replies && message.replies.length > 0 && (
                <div className="mt-4 pl-12 space-y-2 border-l-2 border-gray-700 ml-6">
                  {message.replies.map((reply) => (
                    <div key={reply.id} className="pl-4 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{reply.author_avatar}</span>
                        <span className="text-sm font-bold text-white">{reply.author_name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(reply.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 pl-8">{reply.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </SafeMotion.div>
          ))
        )}
      </div>
    </div>
  );
}
