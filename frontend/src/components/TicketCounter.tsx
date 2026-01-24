'use client';

import React from 'react';
import { Ticket, Crown, Star, Plus, AlertCircle } from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import SafeMotion from './SafeMotion';

interface TicketCounterProps {
  size?: 'small' | 'medium' | 'large';
  show_label?: boolean;
  show_purchase_button?: boolean;
  class_name?: string;
  onClick?: () => void;
  // CamelCase variants
  showLabel?: boolean;
  showPurchaseButton?: boolean;
  className?: string;
}

export default function TicketCounter({ 
  size = 'medium',
  showLabel = true,
  showPurchaseButton = false,
  className = '',
  onClick
}: TicketCounterProps) {
  const { current_tickets, loading, error, getTicketStatus } = useTickets();
  
  const ticketStatus = getTicketStatus();
  
  const sizeClasses = {
    small: {
      container: 'px-2 py-1 text-sm',
      icon: 'w-3 h-3',
      text: 'text-sm',
      count: 'text-sm font-medium'
    },
    medium: {
      container: 'px-3 py-2',
      icon: 'w-4 h-4',
      text: 'text-sm',
      count: 'text-lg font-bold'
    },
    large: {
      container: 'px-4 py-3',
      icon: 'w-5 h-5',
      text: 'text-base',
      count: 'text-xl font-bold'
    }
  };

  const classes = sizeClasses[size];

  const getTicketIcon = (count: number) => {
    const iconClass = classes.icon;
    if (count >= 50) return <Crown className={`${iconClass} text-yellow-400`} />;
    if (count >= 20) return <Star className={`${iconClass} text-blue-400`} />;
    return <Ticket className={`${iconClass} text-green-400`} />;
  };

  const getBackgroundColor = (count: number) => {
    if (loading) return 'bg-gray-700/50';
    if (error) return 'bg-red-500/20 border-red-500/30';
    if (count === 0) return 'bg-red-500/20 border-red-500/30';
    if (count <= 5) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-gray-800/50 border-gray-600/30';
  };

  if (error && !current_tickets) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border ${classes.container} ${getBackgroundColor(0)} ${className}`}>
        <AlertCircle className={`${classes.icon} text-red-400`} />
        {showLabel && <span className={`${classes.text} text-red-400`}>Error</span>}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <SafeMotion.div
        animate={{
          scale: loading ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 1.5,
          repeat: loading ? Infinity : 0,
        }}
        class_name={`
          flex items-center gap-2 rounded-lg border transition-all cursor-pointer hover:bg-opacity-80
          ${classes.container} 
          ${getBackgroundColor(current_tickets)}
          ${onClick ? 'hover:scale-105' : ''}
        `}
        onClick={onClick}
      >
        {loading ? (
          <div className={`${classes.icon} border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin`} />
        ) : (
          getTicketIcon(current_tickets)
        )}
        
        <div className="flex items-center gap-1">
          <span className={`${classes.count} text-white`}>
            {loading ? '...' : current_tickets}
          </span>
          {showLabel && (
            <span className={`${classes.text} text-gray-400`}>
              {current_tickets === 1 ? 'ticket' : 'tickets'}
            </span>
          )}
        </div>

        {/* Low ticket warning indicator */}
        {!loading && current_tickets <= 3 && current_tickets > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
        )}

        {/* No tickets warning */}
        {!loading && current_tickets === 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </SafeMotion.div>

      {/* Purchase button (if enabled and user is low on tickets) */}
      {showPurchaseButton && !loading && current_tickets <= 5 && (
        <SafeMotion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          class_name="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Open purchase modal
          }}
        >
          <Plus className="w-3 h-3 text-white" />
        </SafeMotion.button>
      )}
    </div>
  );
}

// Compact version for navigation bars
export function TicketCounterCompact({ onClick }: { onClick?: () => void }) {
  return (
    <TicketCounter
      size="small"
      showLabel={false}
      className="hover:bg-gray-700/50"
      onClick={onClick}
    />
  );
}

// Large version for dashboard/main areas
export function TicketCounterLarge({ onClick }: { onClick?: () => void }) {
  return (
    <TicketCounter 
      size="large" 
      showLabel={true} 
      showPurchaseButton={true}
      onClick={onClick}
    />
  );
}
