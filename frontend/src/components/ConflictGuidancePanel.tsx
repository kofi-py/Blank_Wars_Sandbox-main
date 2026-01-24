// ConflictGuidancePanel - provides strategic guidance for conflict engagement
// Integrates with GameBalanceSystem to help players make informed decisions

'use client';

import { useState, useEffect } from 'react';
import SafeMotion from './SafeMotion';
import { 
  AlertTriangle, CheckCircle, Info, Target, TrendingUp, 
  Heart, Zap, Users, Clock, Star
} from 'lucide-react';
import GameBalanceSystem from '@/services/gameBalanceSystem';
import ConflictRewardSystem from '@/services/conflictRewardSystem';

interface ConflictOpportunity {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  characters_involved: string[];
  description: string;
  time_remaining?: string;
}

interface ConflictGuidancePanelProps {
  character_id: string;
  available_conflicts: ConflictOpportunity[];
  onConflictSelect?: (conflictId: string, approach: string) => void;
}

export default function ConflictGuidancePanel({ 
  character_id, 
  available_conflicts = [], 
  onConflictSelect 
}: ConflictGuidancePanelProps) {
  const [gameBalance] = useState(() => GameBalanceSystem.getInstance());
  const [conflictReward] = useState(() => ConflictRewardSystem.getInstance());
  const [selectedConflict, setSelectedConflict] = useState<ConflictOpportunity | null>(null);
  const [guidanceData, setGuidanceData] = useState<{
    recommendation: string;
    engagement_value: number;
    avoidance_value: number;
    reasoning: string[];
    potential_rewards: {
      immediate: Array<{ type: string; stat_name: string; name: string; description: string; value: number }>;
      long_term: Array<{ type: string; stat_name: string; name: string; description: string; value: number }>;
      relationship_changes: Record<string, number>;
      experience_bonus: number;
    };
    optimalStrategy?: {
      recommended_approach: 'aggressive' | 'diplomatic' | 'collaborative' | 'avoidant';
      expected_outcome: string;
      reward_potential: 'low' | 'medium' | 'high' | 'exceptional';
      risk_level: 'low' | 'medium' | 'high';
    };
  } | null>(null);
  const [playerGuidance, setPlayerGuidance] = useState<{
    current_status: string;
    next_best_action: string;
    longterm_strategy: string;
    warning_flags: string[];
  } | null>(null);

  useEffect(() => {
    const loadPlayerGuidance = async () => {
      try {
        const guidance = gameBalance.generatePlayerGuidance(character_id);
        setPlayerGuidance(guidance);
      } catch (error) {
        console.error('Failed to load player guidance:', error);
      }
    };

    loadPlayerGuidance();
  }, [character_id, gameBalance]);

  const analyzeConflict = async (conflict: ConflictOpportunity) => {
    try {
      const analysis = gameBalance.analyzeConflictEngagementValue(
        character_id,
        conflict.type,
        conflict.severity
      );
      
      const optimalStrategy = gameBalance.getOptimalStrategy(
        conflict.type,
        conflict.characters_involved,
        {} // Current team dynamics would go here
      );

      setGuidanceData({
        recommendation: analysis.recommendation,
        engagement_value: analysis.engagement_value,
        avoidance_value: analysis.avoidance_value,
        reasoning: analysis.reasoning,
        potential_rewards: analysis.potential_rewards,
        optimalStrategy
      });
      setSelectedConflict(conflict);
    } catch (error) {
      console.error('Failed to analyze conflict:', error);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'ENGAGE': return 'text-green-400 bg-green-900/20 border-green-500';
      case 'AVOID': return 'text-red-400 bg-red-900/20 border-red-500';
      case 'NEUTRAL': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'high': return <Zap className="w-4 h-4 text-orange-400" />;
      case 'medium': return <Info className="w-4 h-4 text-yellow-400" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-400" />;
      default: return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Player Status Overview */}
      {playerGuidance && (
        <SafeMotion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          class_name="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-4"
        >
          <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Strategic Guidance
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-300 mb-1">Current Status</div>
              <div className="text-white font-medium">{playerGuidance.current_status}</div>
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-1">Next Best Action</div>
              <div className="text-blue-300">{playerGuidance.next_best_action}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-gray-300 mb-1">Long-term Strategy</div>
              <div className="text-purple-300">{playerGuidance.longterm_strategy}</div>
            </div>
          </div>
          
          {playerGuidance.warning_flags.length > 0 && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
              <div className="text-sm text-red-300 font-medium mb-2">⚠️ Warnings:</div>
              {playerGuidance.warning_flags.map((warning: string, index: number) => (
                <div key={index} className="text-sm text-red-200">• {warning}</div>
              ))}
            </div>
          )}
        </SafeMotion.div>
      )}

      {/* Available Conflicts */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Available Conflicts
        </h3>
        
        {available_conflicts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <div>No active conflicts. All is peaceful... for now.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {available_conflicts.map((conflict, index) => (
              <SafeMotion.div
                key={index}
                while_hover={{ scale: 1.02 }}
                class_name="bg-gray-700/50 border border-gray-600 rounded-lg p-4 cursor-pointer"
                on_click={() => analyzeConflict(conflict)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getSeverityIcon(conflict.severity)}
                    <span className="font-medium text-white capitalize">
                      {conflict.type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-400">
                      ({conflict.severity})
                    </span>
                  </div>
                  {conflict.time_remaining && (
                    <div className="flex items-center text-sm text-yellow-400">
                      <Clock className="w-4 h-4 mr-1" />
                      {conflict.time_remaining}
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-gray-300 mb-2">
                  {conflict.description}
                </div>
                
                <div className="flex items-center text-sm text-blue-300">
                  <Users className="w-4 h-4 mr-1" />
                  {conflict.characters_involved.length} characters involved
                </div>
              </SafeMotion.div>
            ))}
          </div>
        )}
      </div>

      {/* Conflict Analysis */}
      {selectedConflict && guidanceData && (
        <SafeMotion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          class_name="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2" />
            Conflict Analysis: {selectedConflict.type.replace('_', ' ')}
          </h3>
          
          {/* Recommendation */}
          <div className={`inline-flex items-center px-4 py-2 rounded-lg border mb-4 ${getRecommendationColor(guidanceData.recommendation)}`}>
            <span className="font-bold mr-2">RECOMMENDATION:</span>
            <span>{guidanceData.recommendation}</span>
          </div>

          {/* Risk vs Reward */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="text-green-300 font-medium mb-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Engagement Value
              </div>
              <div className="text-2xl font-bold text-green-400">
                {guidanceData.engagement_value}/100
              </div>
            </div>
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="text-red-300 font-medium mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Avoidance Value
              </div>
              <div className="text-2xl font-bold text-red-400">
                {guidanceData.avoidance_value}/100
              </div>
            </div>
          </div>

          {/* Reasoning */}
          <div className="mb-4">
            <div className="text-sm text-gray-300 mb-2">Strategic Reasoning:</div>
            <div className="space-y-1">
              {guidanceData.reasoning.map((reason: string, index: number) => (
                <div key={index} className="text-sm text-gray-200">
                  {reason}
                </div>
              ))}
            </div>
          </div>

          {/* Optimal Strategy */}
          {guidanceData.optimalStrategy && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
              <div className="text-blue-300 font-medium mb-2">Optimal Approach:</div>
              <div className="text-blue-200 capitalize mb-2">
                {guidanceData.optimalStrategy.recommended_approach.replace('_', ' ')}
              </div>
              <div className="text-sm text-blue-100">
                {guidanceData.optimalStrategy.expected_outcome}
              </div>
            </div>
          )}

          {/* Potential Rewards Preview */}
          {guidanceData.potential_rewards && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="text-yellow-300 font-medium mb-2">Potential Rewards:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-yellow-200">
                  Experience: +{guidanceData.potential_rewards.experience_bonus}
                </div>
                <div className="text-yellow-200">
                  Immediate Rewards: {guidanceData.potential_rewards.immediate.length}
                </div>
                <div className="text-yellow-200">
                  Long-term Benefits: {guidanceData.potential_rewards.long_term.length}
                </div>
                <div className="text-yellow-200">
                  Relationship Changes: {Object.keys(guidanceData.potential_rewards.relationship_changes).length}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {onConflictSelect && (
            <div className="flex space-x-3 mt-6">
              {['aggressive', 'diplomatic', 'collaborative', 'avoidant'].map((approach) => (
                <button
                  key={approach}
                  onClick={() => onConflictSelect(selectedConflict.type, approach)}
                  className={`px-4 py-2 rounded transition-colors ${
                    approach === guidanceData.optimalStrategy?.recommended_approach
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-gray-200'
                  }`}
                >
                  {approach.charAt(0).toUpperCase() + approach.slice(1)}
                </button>
              ))}
            </div>
          )}
        </SafeMotion.div>
      )}
    </div>
  );
}
