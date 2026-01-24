'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  Zap,
  Shield,

  Sword,
  Crown,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Contestant as Character } from '@blankwars/types';
import { Equipment } from '@/data/equipment';
import { equipmentCache } from '@/services/equipmentCache';
import {
  createEquippedCharacter,
  getCharacterPowerLevel,

} from '@/data/characterEquipment';
// Database-backed function to get character weapon progression
const getCharacterWeaponProgression = async (character_id: string): Promise<{
  basic: Equipment | null;
  elite: Equipment | null;
  legendary: Equipment | null;
}> => {
  try {
    const characterEquipment = await equipmentCache.getCharacterEquipment(character_id.toLowerCase());
    const weapons = characterEquipment.filter(item => item.slot === 'weapon');

    return {
      basic: weapons.find(w => w.rarity === 'common') || null,
      elite: weapons.find(w => w.rarity === 'rare') || null,
      legendary: weapons.find(w => w.rarity === 'legendary') || null
    };
  } catch (error) {
    console.error('Failed to get character weapon progression:', error);
    return { basic: null, elite: null, legendary: null };
  }
};

interface CharacterCardWithEquipmentProps {
  character: Character;
  size?: 'small' | 'medium' | 'large';
  show_equipment?: boolean;
  show_stats?: boolean;
  show_progression?: boolean;
  is_hovered?: boolean;
  is_selected?: boolean;
  onClick?: () => void;
  onEquipmentClick?: (slot: 'weapon' | 'armor' | 'accessory') => void;
  class_name?: string;
  // CamelCase variants
  showEquipment?: boolean;
  showStats?: boolean;
  showProgression?: boolean;
  isHovered?: boolean;
  isSelected?: boolean;
  className?: string;
}

const rarityConfig = {
  common: {
    border_gradient: 'from-gray-400 to-gray-600',
    bg_gradient: 'from-gray-50 to-gray-100',
    glow_color: 'shadow-gray-300/50',
    stars: 1,
    rarity_color: 'text-gray-600'
  },
  uncommon: {
    border_gradient: 'from-green-400 to-green-600',
    bg_gradient: 'from-green-50 to-green-100',
    glow_color: 'shadow-green-300/50',
    stars: 2,
    rarity_color: 'text-green-600'
  },
  rare: {
    border_gradient: 'from-blue-400 to-blue-600',
    bg_gradient: 'from-blue-50 to-blue-100',
    glow_color: 'shadow-blue-300/50',
    stars: 3,
    rarity_color: 'text-blue-600'
  },
  epic: {
    border_gradient: 'from-purple-400 to-purple-600',
    bg_gradient: 'from-purple-50 to-purple-100',
    glow_color: 'shadow-purple-300/50',
    stars: 4,
    rarity_color: 'text-purple-600'
  },
  legendary: {
    border_gradient: 'from-yellow-400 to-orange-500',
    bg_gradient: 'from-yellow-50 to-orange-100',
    glow_color: 'shadow-yellow-300/50',
    stars: 5,
    rarity_color: 'text-orange-600'
  },
  mythic: {
    border_gradient: 'from-red-500 via-pink-500 to-purple-500',
    bg_gradient: 'from-red-50 to-purple-100',
    glow_color: 'shadow-pink-300/50',
    stars: 6,
    rarity_color: 'text-pink-600'
  }
};

const sizeConfig = {
  small: {
    card_width: 'w-48',
    card_height: 'h-64',
    avatar_size: 'text-3xl',
    title_size: 'text-sm',
    subtitle_size: 'text-xs',
    equipment_size: 'text-lg',
    padding: 'p-3'
  },
  medium: {
    card_width: 'w-64',
    card_height: 'h-80',
    avatar_size: 'text-4xl',
    title_size: 'text-base',
    subtitle_size: 'text-sm',
    equipment_size: 'text-xl',
    padding: 'p-4'
  },
  large: {
    card_width: 'w-80',
    card_height: 'h-96',
    avatar_size: 'text-5xl',
    title_size: 'text-lg',
    subtitle_size: 'text-base',
    equipment_size: 'text-2xl',
    padding: 'p-6'
  }
};

export default function CharacterCardWithEquipment({
  character,
  size = 'medium',
  showEquipment = true,
  showStats = true,
  showProgression = false,
  isHovered = false,
  isSelected = false,
  onClick,
  onEquipmentClick,
  className = ''
}: CharacterCardWithEquipmentProps) {
  const [weaponProgression, setWeaponProgression] = useState<{
    basic: Equipment | null;
    elite: Equipment | null;
    legendary: Equipment | null;
  }>({ basic: null, elite: null, legendary: null });
  const [is_loadingProgression, setIsLoadingProgression] = useState(showProgression);

  const equippedCharacter = createEquippedCharacter(character);
  const powerLevel = getCharacterPowerLevel(character);

  // Load weapon progression from database
  useEffect(() => {
    if (!showProgression) return;
    
    const loadProgression = async () => {
      try {
        setIsLoadingProgression(true);
        const progression = await getCharacterWeaponProgression(character.id);
        setWeaponProgression(progression);
      } catch (error) {
        console.error('Failed to load weapon progression:', error);
        setWeaponProgression({ basic: null, elite: null, legendary: null });
      } finally {
        setIsLoadingProgression(false);
      }
    };

    loadProgression();
  }, [character.id, showProgression]);

  const config = rarityConfig[character.rarity];
  const sizeConfig_ = sizeConfig[size];

  const renderStars = (count: number) => {
    return Array.from({ length: count }).map((_, i) => (
      <Star key={i} className="w-3 h-3 fill-current" />
    ));
  };

  const EquipmentSlot = ({
    slot,
    equipment,
    icon: Icon
  }: {
    slot: 'weapon' | 'armor' | 'accessory';
    equipment: Equipment | null;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        relative border-2 rounded-lg p-2 cursor-pointer transition-all
        ${equipment
          ? `border-${equipment.rarity === 'legendary' ? 'yellow' : equipment.rarity === 'epic' ? 'purple' : equipment.rarity === 'rare' ? 'blue' : 'gray'}-400 bg-gradient-to-br from-white to-gray-50`
          : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
        }
      `}
      onClick={() => onEquipmentClick?.(slot)}
      title={equipment ? equipment.name : `Equip ${slot}`}
    >
      {equipment ? (
        <div className="text-center">
          <div className={sizeConfig_.equipment_size}>{equipment.icon}</div>
          {size !== 'small' && (
            <div className="text-xs text-gray-600 mt-1 truncate">
              {equipment.name}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-400">
          <Icon className={`w-5 h-5 mx-auto`} />
          {size === 'large' && (
            <Plus className="w-3 h-3 mx-auto mt-1" />
          )}
        </div>
      )}
    </motion.div>
  );

  const StatBar = ({
    label,
    value,
    max_value,
    color = 'blue',
    show_equipment_bonus = false,
    equipment_bonus = 0
  }: {
    label: string;
    value: number;
    max_value: number;
    color?: string;
    show_equipment_bonus?: boolean;
    equipment_bonus?: number;
  }) => {
    const percentage = Math.min((value / max_value) * 100, 100);
    const bonusPercentage = Math.min(((equipment_bonus) / max_value) * 100, 100);

    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-8 text-gray-600">{label}</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2 relative overflow-hidden">
          <div
            className={`bg-${color}-500 h-full rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
          {show_equipment_bonus && equipment_bonus > 0 && (
            <div
              className={`bg-${color}-300 h-full rounded-full absolute top-0 transition-all duration-300`}
              style={{
                left: `${percentage}%`,
                width: `${bonusPercentage}%`
              }}
            />
          )}
        </div>
        <span className="w-8 text-right font-mono">
          {value}
          {show_equipment_bonus && equipment_bonus > 0 && (
            <span className="text-green-600">+{equipment_bonus}</span>
          )}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      whileHover={{ scale: isHovered ? 1.02 : 1 }}
      whileTap={{ scale: 0.98 }}
      className={`
        ${sizeConfig_.card_width} ${sizeConfig_.card_height}
        bg-gradient-to-br ${config.bg_gradient}
        border-4 bg-gradient-to-br ${config.border_gradient}
        rounded-xl ${sizeConfig_.padding} cursor-pointer relative overflow-hidden
        ${isSelected ? 'ring-4 ring-blue-400' : ''}
        ${isHovered ? `${config.glow_color} shadow-xl` : 'shadow-lg'}
        transition-all duration-300
        ${className}
      `}
      onClick={onClick}
    >
      {/* Rarity stars */}
      <div className={`absolute top-2 right-2 flex ${config.rarity_color}`}>
        {renderStars(config.stars)}
      </div>

      {/* Character avatar and basic info */}
      <div className="text-center mb-3">
        <div className={`${sizeConfig_.avatar_size} mb-2`}>{character.avatar}</div>
        <h3 className={`${sizeConfig_.title_size} font-bold text-gray-800 truncate`}>
          {character.name}
        </h3>
        <p className={`${sizeConfig_.subtitle_size} text-gray-600 truncate`}>
          {character.title || character.archetype}
        </p>
        <p className={`text-xs text-gray-500`}>
          Level {character.level} • Power: {powerLevel}
        </p>
      </div>

      {/* Equipment slots */}
      {showEquipment && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-2 font-semibold">Equipment</div>
          <div className="grid grid-cols-3 gap-2">
            <EquipmentSlot
              slot="weapon"
              equipment={character.equipped_items.weapon}
              icon={Sword}
            />
            <EquipmentSlot
              slot="armor"
              equipment={character.equipped_items.armor}
              icon={Shield}
            />
            <EquipmentSlot
              slot="accessory"
              equipment={character.equipped_items.accessory}
              icon={Crown}
            />
          </div>
        </div>
      )}

      {/* Character stats */}
      {showStats && size !== 'small' && (
        <div className="space-y-1">
          <StatBar
            label="ATK"
            value={equippedCharacter.final_stats.attack}
            max_value={200}
            color="red"
            show_equipment_bonus={true}
            equipment_bonus={equippedCharacter.equipment_bonuses.atk || 0}
          />
          <StatBar
            label="DEF"
            value={equippedCharacter.final_stats.defense}
            max_value={150}
            color="blue"
            show_equipment_bonus={true}
            equipment_bonus={equippedCharacter.equipment_bonuses.def || 0}
          />
          <StatBar
            label="SPD"
            value={equippedCharacter.final_stats.speed}
            max_value={180}
            color="green"
            show_equipment_bonus={true}
            equipment_bonus={equippedCharacter.equipment_bonuses.spd || 0}
          />
        </div>
      )}

      {/* Weapon progression indicator */}
      {showProgression && size === 'large' && (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600 mb-2">Weapon Progression</div>
          <div className="flex items-center justify-between text-xs">
            <div className={`text-center ${weaponProgression.basic ? 'text-gray-600' : 'text-gray-400'}`}>
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-1">
                {weaponProgression.basic ? '✓' : '○'}
              </div>
              Basic
            </div>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <div className={`text-center ${weaponProgression.elite ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center mx-auto mb-1">
                {weaponProgression.elite ? '✓' : '○'}
              </div>
              Elite
            </div>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <div className={`text-center ${weaponProgression.legendary ? 'text-yellow-600' : 'text-gray-400'}`}>
              <div className="w-6 h-6 rounded-full bg-yellow-200 flex items-center justify-center mx-auto mb-1">
                {weaponProgression.legendary ? '✓' : '○'}
              </div>
              Legend
            </div>
          </div>
        </div>
      )}

      {/* Equipment effects indicator */}
      {equippedCharacter.active_effects.length > 0 && size !== 'small' && (
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center gap-1 text-xs text-gray-600 bg-white/80 rounded px-2 py-1">
            <Zap className="w-3 h-3" />
            <span className="truncate">
              {equippedCharacter.active_effects.length} effect{equippedCharacter.active_effects.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
