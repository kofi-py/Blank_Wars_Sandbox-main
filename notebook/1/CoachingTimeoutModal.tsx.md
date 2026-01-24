// Coaching Timeout Modal - Appears before each character's turn
// 30-second timeout to chat with coach and set strategy
// Includes gameplan adherence system - psychology affects whether character follows strategy

import React, { useState, useEffect, useMemo } from 'react';
import { TeamCharacter, checkGameplanAdherence } from '@/data/teamBattleSystem';
import { MessageCircle, Clock, X, Swords, Shield, Zap, Brain, Heart, Users, AlertTriangle } from 'lucide-react';

interface CoachingTimeoutModalProps {
  character: TeamCharacter;
  onComplete: (strategy?: CharacterStrategy) => void;
  timeLimit?: number; // seconds
  teamMorale?: number; // Current team morale (0-100)
  isCharacterInjured?: boolean; // Is character injured?
  isTeamLosing?: boolean; // Is team currently losing?
}

export interface CharacterStrategy {
  primaryAction: 'aggressive' | 'defensive' | 'balanced';
  targetPriority: 'weakest' | 'strongest' | 'nearest';
  useSpecials: boolean;
}

export const CoachingTimeoutModal: React.FC<CoachingTimeoutModalProps> = ({
  character,
  onComplete,
  timeLimit = 30,
  teamMorale = 75,
  isCharacterInjured = false,
  isTeamLosing = false
}) => {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'coach' | 'player'; message: string }>>([
    { sender: 'coach', message: `Alright, ${character.name}'s turn is coming up. What's the plan?` }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [strategy, setStrategy] = useState<CharacterStrategy>({
    primaryAction: 'balanced',
    targetPriority: 'nearest',
    useSpecials: true
  });

  // Calculate gameplan adherence - will character follow the strategy?
  const adherenceCheck = useMemo(() => {
    return checkGameplanAdherence(character, teamMorale, isCharacterInjured, isTeamLosing);
  }, [character, teamMorale, isCharacterInjured, isTeamLosing]);

  // Determine adherence color
  const getAdherenceColor = (score: number) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get adherence status text
  const getAdherenceStatus = (score: number) => {
    if (score >= 75) return 'Very Likely';
    if (score >= 50) return 'Likely';
    if (score >= 25) return 'Unlikely';
    return 'Very Unlikely';
  };

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete(strategy);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [strategy, onComplete]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    setChatMessages(prev => [...prev, { sender: 'player', message: inputMessage }]);

    // Simple coach response (would be AI in full version)
    setTimeout(() => {
      const responses = [
        "Good thinking. Let's stick with that approach.",
        "Are you sure? Consider their positioning.",
        "Alright, I trust your judgment on this one.",
        "Remember what we practiced in training."
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      setChatMessages(prev => [...prev, { sender: 'coach', message: response }]);
    }, 500);

    setInputMessage('');
  };

  const handleSkip = () => {
    onComplete(strategy);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border-2 border-blue-500 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Coaching Timeout</h2>
            <span className="text-white/80">- {character.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className={`text-lg font-bold ${
                timeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
              }`}>
                {timeRemaining}s
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="text-white/60 hover:text-white transition"
              title="Skip timeout"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 max-h-[calc(90vh-80px)] overflow-y-auto">
          {/* Left Side: Strategy Selection */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Character Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">HP:</span>
                  <span className="text-white">{character.currentHp}/{character.maxHp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Strength:</span>
                  <span className="text-white">{character.traditionalStats?.strength || 50}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Stamina:</span>
                  <span className="text-white">{character.traditionalStats?.stamina || 50}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Speed:</span>
                  <span className="text-white">{character.traditionalStats?.speed || 50}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Intelligence:</span>
                  <span className="text-white">{character.traditionalStats?.intelligence || 50}</span>
                </div>
              </div>
            </div>

            {/* Gameplan Adherence Panel */}
            <div className="bg-gray-800 rounded-lg p-4 border-2 border-purple-500/30">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Gameplan Adherence
              </h3>

              {/* Adherence Score */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Will Follow Strategy:</span>
                  <span className={`text-sm font-bold ${getAdherenceColor(adherenceCheck.adherenceScore)}`}>
                    {getAdherenceStatus(adherenceCheck.adherenceScore)} ({Math.round(adherenceCheck.adherenceScore)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      adherenceCheck.adherenceScore >= 75 ? 'bg-green-500' :
                      adherenceCheck.adherenceScore >= 50 ? 'bg-yellow-500' :
                      adherenceCheck.adherenceScore >= 25 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${adherenceCheck.adherenceScore}%` }}
                  />
                </div>
              </div>

              {/* Warning if low adherence */}
              {!adherenceCheck.willFollow && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-red-400 font-semibold text-sm mb-1">⚠️ Low Adherence Warning</div>
                      <div className="text-red-300 text-xs">{adherenceCheck.reason}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Psychology Factors */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> Training:
                  </span>
                  <span className="text-white">{character.psychStats?.training || 50}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Heart className="w-3 h-3" /> Mental Health:
                  </span>
                  <span className={`${character.psychStats?.mentalHealth < 30 ? 'text-red-400' : 'text-white'}`}>
                    {character.psychStats?.mentalHealth || 80}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Team Player:
                  </span>
                  <span className="text-white">{character.psychStats?.teamPlayer || 50}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Ego:</span>
                  <span className={`${character.psychStats?.ego > 80 ? 'text-red-400' : 'text-white'}`}>
                    {character.psychStats?.ego || 50}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Team Morale:</span>
                  <span className={`${teamMorale < 30 ? 'text-red-400' : 'text-white'}`}>
                    {teamMorale}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Battle Strategy</h3>

              {/* Primary Action */}
              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Approach:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setStrategy(prev => ({ ...prev, primaryAction: 'aggressive' }))}
                    className={`p-3 rounded-lg border-2 transition ${
                      strategy.primaryAction === 'aggressive'
                        ? 'border-red-500 bg-red-500/20'
                        : 'border-gray-600 bg-gray-700 hover:border-red-400'
                    }`}
                  >
                    <Swords className="w-6 h-6 mx-auto mb-1 text-red-400" />
                    <div className="text-xs text-white">Aggressive</div>
                  </button>
                  <button
                    onClick={() => setStrategy(prev => ({ ...prev, primaryAction: 'defensive' }))}
                    className={`p-3 rounded-lg border-2 transition ${
                      strategy.primaryAction === 'defensive'
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600 bg-gray-700 hover:border-blue-400'
                    }`}
                  >
                    <Shield className="w-6 h-6 mx-auto mb-1 text-blue-400" />
                    <div className="text-xs text-white">Defensive</div>
                  </button>
                  <button
                    onClick={() => setStrategy(prev => ({ ...prev, primaryAction: 'balanced' }))}
                    className={`p-3 rounded-lg border-2 transition ${
                      strategy.primaryAction === 'balanced'
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-gray-600 bg-gray-700 hover:border-purple-400'
                    }`}
                  >
                    <Zap className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                    <div className="text-xs text-white">Balanced</div>
                  </button>
                </div>
              </div>

              {/* Target Priority */}
              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Target Priority:</label>
                <select
                  value={strategy.targetPriority}
                  onChange={(e) => setStrategy(prev => ({ ...prev, targetPriority: e.target.value as any }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="weakest">Weakest Enemy</option>
                  <option value="strongest">Strongest Enemy</option>
                  <option value="nearest">Nearest Enemy</option>
                </select>
              </div>

              {/* Special Abilities */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={strategy.useSpecials}
                    onChange={(e) => setStrategy(prev => ({ ...prev, useSpecials: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-white">Use Special Abilities</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleSkip}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
            >
              Confirm Strategy & Start Turn
            </button>
          </div>

          {/* Right Side: Coach Chat */}
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-3">Coach Chat</h3>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2 max-h-96">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.sender === 'coach'
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-gray-700 border border-gray-600'
                  }`}
                >
                  <div className="text-xs text-gray-400 mb-1">
                    {msg.sender === 'coach' ? '🎓 Coach' : '👤 You'}
                  </div>
                  <div className="text-white text-sm">{msg.message}</div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask coach for advice..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
