'use client';

import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { calculateGameplanAdherence } from '@/services/gameplan_adherenceService';

interface GameplanAdherenceWidgetProps {
  class_name?: string;
}

export default function GameplanAdherenceWidget({ class_name = '' }: GameplanAdherenceWidgetProps) {
  const [adherence, setAdherence] = useState<number | null>(null);
  const [risk_level, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [is_loading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdherence = async () => {
      try {
        const result = await calculateGameplanAdherence();
        setAdherence(result.team_adherence);
        setRiskLevel(result.risk_level);
      } catch (error) {
        console.error('Failed to fetch gameplan adherence:', error);
        setAdherence(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdherence();
  }, []);

  const getColorClasses = () => {
    switch (risk_level) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getBgColorClasses = () => {
    switch (risk_level) {
      case 'critical': return 'bg-red-900/30 border-red-700/30';
      case 'high': return 'bg-orange-900/30 border-orange-700/30';
      case 'medium': return 'bg-yellow-900/30 border-yellow-700/30';
      case 'low': return 'bg-green-900/30 border-green-700/30';
      default: return 'bg-gray-900/30 border-gray-700/30';
    }
  };

  if (is_loading) {
    return (
      <div className={`bg-gray-800/50 rounded-lg p-4 text-center ${class_name}`}>
        <Activity className="w-12 h-12 text-gray-400 mb-4 mx-auto animate-pulse" />
        <div className="text-lg font-bold text-gray-400">--</div>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${getBgColorClasses()} rounded-xl p-6 border ${class_name}`}>
      <Activity className={`w-12 h-12 ${getColorClasses()} mb-4`} />
      <h3 className={`text-3xl font-bold ${getColorClasses()}`}>
        {adherence !== null ? `${adherence}%` : '--'}
      </h3>
      <p className="text-gray-400">Gameplan Adherence</p>
      {adherence !== null && (
        <div className={`text-xs ${getColorClasses()} mt-1 capitalize font-medium`}>
          {risk_level} Risk
        </div>
      )}
    </div>
  );
}