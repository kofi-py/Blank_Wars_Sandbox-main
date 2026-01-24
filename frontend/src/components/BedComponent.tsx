'use client';

import { Bed, Sofa, User } from 'lucide-react';

interface BedComponentProps {
  bed: {
    id: string;
    type: 'bed' | 'bunk_bed' | 'couch' | 'air_mattress' | 'floor';
    capacity: number;
    comfort_bonus: number;
    character_id?: string; // Specific assignment
  };
  occupied_slots: number; // How many characters are using this bed (legacy/overflow)
  show_details?: boolean;
  assigned_character?: { name: string; avatar: string } | null;
  onAssign?: () => void;
  is_selectable?: boolean;
}

export default function BedComponent({
  bed,
  occupied_slots,
  show_details = false,
  assigned_character,
  onAssign,
  is_selectable = false
}: BedComponentProps) {
  const getBedIcon = () => {
    switch (bed.type) {
      case 'bed':
        return <Bed className="w-6 h-6 text-blue-400" />;
      case 'bunk_bed':
        return (
          <div className="relative">
            <Bed className="w-6 h-6 text-gray-400" />
            <Bed className="w-4 h-4 text-gray-400 absolute -top-1 -right-1" />
          </div>
        );
      case 'couch':
        return <Sofa className="w-6 h-6 text-orange-400" />;
      case 'air_mattress':
        return (
          <div className="w-6 h-6 bg-blue-300 rounded-lg opacity-70 flex items-center justify-center">
            <span className="text-xs text-blue-800">💨</span>
          </div>
        );
      case 'floor':
        return (
          <div className="w-6 h-6 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center">
            <span className="text-xs text-gray-400">⬜</span>
          </div>
        );
      default:
        return <Bed className="w-6 h-6 text-gray-400" />;
    }
  };

  const getBedName = () => {
    switch (bed.type) {
      case 'bed':
        return 'Single Bed';
      case 'bunk_bed':
        return 'Bunk Bed';
      case 'couch':
        return 'Couch';
      case 'air_mattress':
        return 'Air Mattress';
      case 'floor':
        return 'Floor Spot';
      default:
        return 'Unknown';
    }
  };

  const getComfortLevel = () => {
    if (bed.comfort_bonus >= 15) return { text: 'Excellent', color: 'text-green-400' };
    if (bed.comfort_bonus >= 10) return { text: 'Good', color: 'text-blue-400' };
    if (bed.comfort_bonus >= 5) return { text: 'Fair', color: 'text-yellow-400' };
    if (bed.comfort_bonus >= 0) return { text: 'Poor', color: 'text-orange-400' };
    return { text: 'Terrible', color: 'text-red-400' };
  };

  const comfort = getComfortLevel();
  const isFullyOccupied = occupied_slots >= bed.capacity;
  const hasOverflow = occupied_slots > bed.capacity;

  return (
    <div
      className={`flex flex-col items-center p-2 rounded-lg transition-all relative ${isFullyOccupied ? 'bg-gray-700/50' : 'bg-gray-800/50'
        } ${hasOverflow ? 'border border-red-500/50' : ''} ${is_selectable ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:bg-blue-900/20' : ''
        }`}
      onClick={is_selectable && onAssign ? onAssign : undefined}
    >

      {/* Bed Icon */}
      <div className="relative mb-1">
        {assigned_character ? (
          <div className="text-2xl animate-bounce-in">
            {assigned_character.avatar}
          </div>
        ) : (
          getBedIcon()
        )}

        {/* Occupancy indicator (Legacy/Overflow) */}
        {!assigned_character && occupied_slots > 0 && (
          <div className={`absolute -top-1 -right-1 text-xs rounded-full w-4 h-4 flex items-center justify-center ${hasOverflow ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
            }`}>
            {occupied_slots}
          </div>
        )}

        {/* Selectable Indicator */}
        {is_selectable && !assigned_character && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full animate-pulse">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          </div>
        )}
      </div>

      {/* Bed Info */}
      {show_details && (
        <div className="text-center">
          <div className="text-xs text-gray-300 font-medium">{getBedName()}</div>
          <div className="text-xs text-gray-400">
            {assigned_character ? assigned_character.name : `Sleeps ${bed.capacity}`}
          </div>
          <div className={`text-xs ${comfort.color}`}>
            {comfort.text} (+{bed.comfort_bonus})
          </div>
        </div>
      )}

      {/* Simple view */}
      {!show_details && (
        <div className="text-xs text-gray-400 text-center max-w-[60px] truncate">
          {assigned_character ? assigned_character.name.split(' ')[0] : (bed.capacity > 1 ? `${bed.capacity} beds` : 'Empty')}
        </div>
      )}

      {/* Overflow warning */}
      {hasOverflow && (
        <div className="text-xs text-red-400 text-center mt-1">
          Overcrowded!
        </div>
      )}
    </div>
  );
}