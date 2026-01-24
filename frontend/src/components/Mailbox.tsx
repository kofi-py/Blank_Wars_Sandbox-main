'use client';

import React, { useState, useEffect } from 'react';
import { SafeMotion } from './SafeMotion';
import { Mail, Trash2, Clock, CheckCircle, AlertCircle, Gift, Trophy, Users, Reply } from 'lucide-react';
import { mailApi, convertMailMessage } from '../services/mailApi';

interface MailAttachment {
  type: 'currency' | 'item' | 'equipment';
  item_id?: string;
  quantity: number;
}

interface MailMessage {
  id: string;
  subject: string;
  content: string;
  category: 'system' | 'notification' | 'reward' | 'achievement' | 'coach_message';
  is_read: boolean;
  has_attachment: boolean;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high';
  sender_username?: string;
  sender_user_id?: string;
  message_type?: 'coach_mail' | 'system_mail';
  reply_to_mail_id?: string;
  signature?: string;
  attachment_data?: MailAttachment;
  attachment_claimed?: boolean;
}

// Demo messages for development
const demoMessages: MailMessage[] = [
  {
    id: '1',
    subject: 'Welcome to Blank Wars!',
    content: 'Your coaching journey begins now. Check out the tutorial and start building your legendary team.',
    category: 'system',
    is_read: false,
    has_attachment: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    priority: 'normal'
  },
  {
    id: '2',
    subject: 'Character Level Up: Achilles',
    content: 'Achilles has reached Level 18! New abilities are available in the Skills tab.',
    category: 'notification',
    is_read: false,
    has_attachment: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    priority: 'high'
  },
  {
    id: '3',
    subject: 'Daily Login Reward',
    content: 'You\'ve received 500 coins and a health potion for logging in today!',
    category: 'reward',
    is_read: true,
    has_attachment: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    priority: 'normal'
  },
  {
    id: '4',
    subject: 'Team Performance Report',
    content: 'Your team won 3 out of 5 battles this week. Sun Wukong performed exceptionally well.',
    category: 'notification',
    is_read: true,
    has_attachment: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    priority: 'normal'
  },
  {
    id: '5',
    subject: 'Achievement Unlocked: Strategist',
    content: 'Congratulations! You\'ve unlocked the Strategist achievement for winning 10 battles using tactical planning.',
    category: 'achievement',
    is_read: false,
    has_attachment: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    priority: 'high'
  }
];

const getCategoryIcon = (category: MailMessage['category']) => {
  switch (category) {
    case 'system': return AlertCircle;
    case 'notification': return Mail;
    case 'reward': return Gift;
    case 'achievement': return Trophy;
    case 'coach_message': return Mail;
    default: return Mail;
  }
};

const getCategoryColor = (category: MailMessage['category']) => {
  switch (category) {
    case 'system': return 'text-blue-400';
    case 'notification': return 'text-gray-400';
    case 'reward': return 'text-green-400';
    case 'achievement': return 'text-yellow-400';
    case 'coach_message': return 'text-purple-400';
    default: return 'text-gray-400';
  }
};

const formatTimeAgo = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export default function Mailbox() {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  const [filter, setFilter] = useState<'all' | MailMessage['category']>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeData, setComposeData] = useState({
    recipient_username: '',
    subject: '',
    content: '',
    signature: '',
    reply_to_mail_id: ''
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [usernameValidation, setUsernameValidation] = useState<{
    checking: boolean;
    valid: boolean | null;
    message: string;
  }>({ checking: false, valid: null, message: '' });
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const unreadCount = messages.filter(m => !m.is_read).length;

  // Load messages from API
  useEffect(() => {
    loadMessages();
  }, [filter]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get messages from API
      const response = await mailApi.getMail({
        category: filter === 'all' ? undefined : filter,
        limit: 50
      });

      const convertedMessages = response.messages.map(convertMailMessage);
      setMessages(convertedMessages);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages. Using demo data.');
      // Fallback to demo data if API fails
      setMessages(demoMessages);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(message => 
    filter === 'all' || message.category === filter
  );

  const markAsRead = async (messageId: string) => {
    try {
      await mailApi.markAsRead(messageId);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
    } catch (err) {
      console.error('Failed to mark message as read:', err);
      // Optimistically update UI anyway
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await mailApi.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      // Show error to user but don't optimistically update
    }
  };

  // Note: Rewards are auto-granted when actions occur (login, pack open, level-up)
  // Mail attachments are just notifications - no claiming needed

  const handleSelectMessage = (message: MailMessage) => {
    setSelectedMessage(message);
    setComposing(false);
    if (!message.is_read) {
      markAsRead(message.id);
    }
  };

  const handleComposeClick = () => {
    setComposing(true);
    setSelectedMessage(null);
    setComposeData({
      recipient_username: '',
      subject: '',
      content: '',
      signature: '',
      reply_to_mail_id: ''
    });
    setUsernameValidation({ checking: false, valid: null, message: '' });
  };

  const handleReply = (message: MailMessage) => {
    // Only allow replies to coach messages, not system messages
    if (message.message_type === 'system_mail' || !message.sender_username || message.sender_username === 'System') {
      alert('Cannot reply to system messages');
      return;
    }

    setComposing(true);
    setSelectedMessage(null);

    // Pre-fill the compose form with reply data
    setComposeData({
      recipient_username: message.sender_username,
      subject: message.subject.startsWith('Re: ') ? message.subject : `Re: ${message.subject}`,
      content: '',
      signature: '',
      reply_to_mail_id: message.id
    });

    // Force validation to check if sender still exists
    setUsernameValidation({ checking: true, valid: null, message: 'Checking...' });
  };

  // Debounced username validation and autocomplete suggestions
  useEffect(() => {
    if (!composing || !composeData.recipient_username) {
      setUsernameValidation({ checking: false, valid: null, message: '' });
      setUsernameSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setUsernameValidation({ checking: true, valid: null, message: 'Checking...' });

      try {
        // Fetch both validation and suggestions in parallel
        const [validationResult, suggestions] = await Promise.all([
          mailApi.validateUsername(composeData.recipient_username),
          mailApi.searchUsernames(composeData.recipient_username, 5)
        ]);

        if (validationResult.exists) {
          setUsernameValidation({
            checking: false,
            valid: true,
            message: `✓ User found: ${validationResult.username}`
          });
          setShowSuggestions(false);
        } else {
          setUsernameValidation({
            checking: false,
            valid: false,
            message: suggestions.length > 0 ? '✗ User not found - did you mean:' : '✗ User not found'
          });
        }

        // Show suggestions if user doesn't exist or partial match
        setUsernameSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (err) {
        setUsernameValidation({
          checking: false,
          valid: false,
          message: '⚠ Unable to verify username'
        });
        setUsernameSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [composeData.recipient_username, composing]);

  const handleSelectSuggestion = (username: string) => {
    setComposeData({ ...composeData, recipient_username: username });
    setShowSuggestions(false);
  };

  const handleSendMessage = async () => {
    if (!composeData.recipient_username || !composeData.subject || !composeData.content) {
      alert('Please fill in recipient, subject, and message content');
      return;
    }

    // Check username validity before sending
    if (usernameValidation.valid === false) {
      alert('Cannot send message: Recipient username is not valid. Please enter a valid username.');
      return;
    }

    // If validation is still checking, wait a moment
    if (usernameValidation.checking) {
      alert('Please wait while we verify the username...');
      return;
    }

    try {
      setSendingMessage(true);
      await mailApi.sendMessage(composeData);

      // Clear form and exit compose mode
      setComposing(false);
      setComposeData({
        recipient_username: '',
        subject: '',
        content: '',
        signature: '',
        reply_to_mail_id: ''
      });
      setUsernameValidation({ checking: false, valid: null, message: '' });

      // Reload messages to show sent confirmation
      await loadMessages();

      alert('Message sent successfully!');
    } catch (err) {
      console.error('Failed to send message:', err);
      const error = err as Error;
      alert(`Failed to send message: ${error.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="flex h-full bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-bold">Mailbox</h1>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
              <button
                onClick={handleComposeClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
              >
                <Mail className="w-4 h-4" />
                New Message
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'all' as const, label: 'All', icon: Mail },
              { key: 'system' as const, label: 'System', icon: AlertCircle },
              { key: 'notification' as const, label: 'Notifications', icon: Mail },
              { key: 'reward' as const, label: 'Rewards', icon: Gift },
              { key: 'achievement' as const, label: 'Achievements', icon: Trophy },
              { key: 'coach_message' as const, label: 'Messages', icon: Users }
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  filter === key 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-400">
              <Mail className="w-12 h-12 mx-auto mb-2 opacity-50 animate-pulse" />
              <p>Loading messages...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-yellow-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No messages in this category</p>
            </div>
          ) : (
            filteredMessages.map((message) => {
              const Icon = getCategoryIcon(message.category);
              return (
                <SafeMotion
                  key={message.id}
                  as="div"
                  class_name={`p-3 border-b border-gray-800 cursor-pointer transition-colors ${
                    selectedMessage?.id === message.id 
                      ? 'bg-blue-600/20 border-blue-500' 
                      : 'hover:bg-gray-800'
                  } ${!message.is_read ? 'bg-gray-800/50' : ''}`}
                  onClick={() => handleSelectMessage(message)}
                  while_hover={{ scale: 1.01 }}
                  while_tap={{ scale: 0.99 }}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-1 flex-shrink-0 ${getCategoryColor(message.category)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-medium text-sm truncate ${!message.is_read ? 'text-white' : 'text-gray-300'}`}>
                          {message.subject}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTimeAgo(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {message.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {!message.is_read && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        )}
                        {message.has_attachment && (
                          <Gift className="w-3 h-3 text-green-400" />
                        )}
                        {message.priority === 'high' && (
                          <AlertCircle className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </SafeMotion>
              );
            })
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        {composing ? (
          <>
            {/* Compose Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {composeData.reply_to_mail_id ? 'Reply to Message' : 'New Message'}
                </h2>
                {composeData.reply_to_mail_id && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                    <Reply className="w-3 h-3 inline mr-1" />
                    Replying
                  </span>
                )}
              </div>
              <button
                onClick={() => setComposing(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Compose Form */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4 max-w-2xl">
                {/* Recipient */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">
                    To (Username)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={composeData.recipient_username}
                      onChange={(e) => setComposeData({ ...composeData, recipient_username: e.target.value })}
                      onFocus={() => {
                        if (usernameSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      placeholder="Enter recipient username"
                      className={`w-full px-3 py-2 bg-gray-800 border rounded text-white placeholder-gray-500 focus:outline-none ${
                        usernameValidation.valid === true
                          ? 'border-green-500 focus:border-green-500'
                          : usernameValidation.valid === false
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-gray-600 focus:border-blue-500'
                      }`}
                    />

                    {/* Autocomplete Dropdown */}
                    {showSuggestions && usernameSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg max-h-48 overflow-y-auto">
                        {usernameSuggestions.map((username, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSelectSuggestion(username)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-700 text-white transition-colors flex items-center gap-2"
                          >
                            <span className="text-blue-400">👤</span>
                            <span>{username}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {composeData.recipient_username && (
                      <div className={`mt-1 text-xs ${
                        usernameValidation.checking
                          ? 'text-gray-400'
                          : usernameValidation.valid === true
                          ? 'text-green-400'
                          : usernameValidation.valid === false
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}>
                        {usernameValidation.message}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="Enter message subject"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">
                    Message
                  </label>
                  <textarea
                    value={composeData.content}
                    onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                    placeholder="Write your message..."
                    rows={10}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Signature (Optional) */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">
                    Signature (Optional)
                  </label>
                  <input
                    type="text"
                    value={composeData.signature}
                    onChange={(e) => setComposeData({ ...composeData, signature: e.target.value })}
                    placeholder="e.g., Coach John"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Send Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded transition-colors flex items-center gap-2"
                  >
                    {sendingMessage ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : selectedMessage ? (
          <>
            {/* Message Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {React.createElement(getCategoryIcon(selectedMessage.category), {
                    className: `w-5 h-5 ${getCategoryColor(selectedMessage.category)}`
                  })}
                  <h2 className="text-lg font-bold">{selectedMessage.subject}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {selectedMessage.timestamp.toLocaleString()}
                  </span>
                  {/* Only show Reply button for coach messages, not system messages */}
                  {selectedMessage.message_type === 'coach_mail' &&
                   selectedMessage.sender_username &&
                   selectedMessage.sender_username !== 'System' && (
                    <button
                      onClick={() => handleReply(selectedMessage)}
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                      title="Reply to this message"
                    >
                      <Reply className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {selectedMessage.has_attachment && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <Gift className="w-4 h-4" />
                  <span>This message has rewards attached</span>
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 p-4">
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 leading-relaxed">
                  {selectedMessage.content}
                </p>
              </div>

              {/* Attachment Section - Display rewards already received */}
              {selectedMessage.has_attachment && (
                <SafeMotion
                  as="div"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  class_name="mt-6 p-4 bg-green-900/20 border border-green-700 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-5 h-5 text-green-400" />
                    <h3 className="font-medium text-green-400">Rewards Received</h3>
                  </div>
                  <div className="text-sm text-gray-300">
                    <p className="mb-2 text-green-300">You automatically received:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      {/* Note: Rewards are auto-granted when the triggering action occurs.
                          This mail is just a notification of what you already received. */}
                      <li>Check your currency/inventory for the rewards mentioned above</li>
                    </ul>
                  </div>
                </SafeMotion>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a message to read</h3>
              <p className="text-sm">Choose a message from the list to view its content</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}