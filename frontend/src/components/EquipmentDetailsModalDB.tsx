'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Zap,
  Shield,
  Sword,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader
} from 'lucide-react';
import { equipmentCache } from '@/services/equipmentCache';
import type { Equipment, EquipmentStats, EquipmentEffect } from '@blankwars/types';

// Database-compatible interfaces
interface DBEquipment {
  id: string;
  name: string;
  description: string;
  slot: string;
  type: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  level: number;
  required_level: number;
  preferred_character?: string;
  stats: EquipmentStats;
  effects: EquipmentEffect[];
  icon: string;
  price: number;
  lore: string;
  prompt_addition: string;
}

interface Character {
  id: string;
  name: string;
  // Add character interface as needed
}

interface EquipmentDetailsModalDBProps {
  is_open: boolean;
  onClose: () => void;
  equipment_id: string | null; // Changed from equipment object to ID for database lookup
  character_id?: string;
  onEquip?: (equipment: DBEquipment) => void;
  onUnequip?: () => void;
  show_comparison?: boolean;
}

const rarityConfig = {
  common: {
    border_color: 'border-gray-400',
    bg_gradient: 'from-gray-50 to-gray-100',
    text_color: 'text-gray-600',
    icon: '⚪'
  },
  uncommon: {
    border_color: 'border-green-400',
    bg_gradient: 'from-green-50 to-green-100',
    text_color: 'text-green-600',
    icon: '🟢'
  },
  rare: {
    border_color: 'border-blue-400',
    bg_gradient: 'from-blue-50 to-blue-100',
    text_color: 'text-blue-600',
    icon: '🔵'
  },
  epic: {
    border_color: 'border-purple-400',
    bg_gradient: 'from-purple-50 to-purple-100',
    text_color: 'text-purple-600',
    icon: '🟣'
  },
  legendary: {
    border_color: 'border-yellow-400',
    bg_gradient: 'from-yellow-50 to-orange-100',
    text_color: 'text-orange-600',
    icon: '🟡'
  },
  mythic: {
    border_color: 'border-pink-400',
    bg_gradient: 'from-pink-50 to-purple-100',
    text_color: 'text-pink-600',
    icon: '🌟'
  }
};

export default function EquipmentDetailsModalDB({
  is_open,
  onClose,
  equipment_id,
  character_id,
  onEquip,
  onUnequip,
  show_comparison = true
}: EquipmentDetailsModalDBProps) {
  const [equipment, setEquipment] = useState<DBEquipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load equipment data when modal opens
  useEffect(() => {
    if (is_open && equipment_id) {
      loadEquipment();
    }
  }, [is_open, equipment_id]);

  const loadEquipment = async () => {
    if (!equipment_id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Loading equipment: ${equipment_id}`);
      const equipmentData = await equipmentCache.getEquipmentById(equipment_id);
      
      if (equipmentData) {
        setEquipment(equipmentData);
        console.log(`✅ Loaded equipment: ${equipmentData.name}`);
      } else {
        throw new Error(`Equipment ${equipment_id} not found`);
      }
    } catch (err: unknown) {
      console.error('❌ Failed to load equipment:', err);
      if (typeof err !== 'object' || err === null || !('message' in err)) {
        throw new Error('Unexpected error type in equipment load');
      }
      if (!err.message) {
        throw new Error('Error missing message property');
      }
      setError(err.message as string);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <AnimatePresence>
        {is_open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading equipment details...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Error state
  if (error) {
    return (
      <AnimatePresence>
        {is_open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-800">Error Loading Equipment</h3>
              <p className="text-gray-600 text-center">{error}</p>
              <div className="flex gap-3">
                <button
                  onClick={loadEquipment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (!equipment) return null;

  const config = rarityConfig[equipment.rarity];

  const StatDisplay: React.FC<{
    label: string;
    value: number;
    icon?: React.ReactNode;
  }> = ({
    label,
    value,
    icon
  }) => (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{value > 0 ? `+${value}` : value}</span>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {is_open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${config.bg_gradient} p-6 border-b ${config.border_color} border-2`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{equipment.icon}</span>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{equipment.name}</h2>
                      <div className="flex items-center gap-2">
                        <span className={`${config.text_color} text-sm font-medium`}>
                          {config.icon} {equipment.rarity.toUpperCase()}
                        </span>
                        <span className="text-gray-500 text-sm">
                          Level {equipment.required_level}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {equipment.description}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Statistics
              </h3>
              <div className="space-y-2">
                {equipment.stats.atk && (
                  <StatDisplay 
                    label="Attack" 
                    value={equipment.stats.atk}
                    icon={<Sword className="w-4 h-4 text-red-500" />}
                  />
                )}
                {equipment.stats.def && (
                  <StatDisplay 
                    label="Defense" 
                    value={equipment.stats.def}
                    icon={<Shield className="w-4 h-4 text-blue-500" />}
                  />
                )}
                {equipment.stats.spd && (
                  <StatDisplay 
                    label="Speed" 
                    value={equipment.stats.spd}
                    icon={<Zap className="w-4 h-4 text-green-500" />}
                  />
                )}
                {equipment.stats.hp && (
                  <StatDisplay 
                    label="Health" 
                    value={equipment.stats.hp}
                    icon={<Shield className="w-4 h-4 text-green-600" />}
                  />
                )}
                {equipment.stats.crit_rate && (
                  <StatDisplay
                    label="Critical Rate"
                    value={equipment.stats.crit_rate}
                    icon={<Star className="w-4 h-4 text-yellow-500" />}
                  />
                )}
                {equipment.stats.accuracy && (
                  <StatDisplay 
                    label="Accuracy" 
                    value={equipment.stats.accuracy}
                    icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
                  />
                )}
                {/* Display other dynamic stats */}
                {Object.entries(equipment.stats).map(([key, value]) => {
                  if (['atk', 'def', 'spd', 'hp', 'critRate', 'accuracy'].includes(key) || typeof value !== 'number') {
                    return null;
                  }
                  return (
                    <StatDisplay 
                      key={key}
                      label={key.charAt(0).toUpperCase() + key.slice(1)} 
                      value={value}
                      icon={<TrendingUp className="w-4 h-4 text-gray-500" />}
                    />
                  );
                })}
              </div>
            </div>

            {/* Effects */}
            {equipment.effects.length > 0 && (
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Special Effects
                </h3>
                <div className="space-y-3">
                  {equipment.effects.map((effect, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800">{effect.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {effect.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{effect.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Character Restriction */}
            {equipment.preferred_character && (
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Character Restriction
                </h3>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    This equipment is specifically designed for <strong>{equipment.preferred_character}</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Lore */}
            {equipment.lore && (
              <div className="p-6 border-b border-gray-200">
                <blockquote className="italic text-gray-600 text-center">
                  &quot;{equipment.lore}&quot;
                </blockquote>
              </div>
            )}

            {/* Combat Description */}
            {equipment.prompt_addition && (
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">In Combat</h3>
                <p className="text-sm text-gray-600 italic">
                  {equipment.prompt_addition}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="p-6 flex gap-3">
              {onEquip && (
                <button
                  onClick={() => onEquip(equipment)}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Equip
                </button>
              )}
              {onUnequip && (
                <button
                  onClick={onUnequip}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Unequip Current
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Database Info (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="p-4 bg-gray-50 text-xs text-gray-500 border-t">
                <div className="flex justify-between items-center">
                  <span>📊 Database Mode</span>
                  <span>ID: {equipment.id}</span>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}