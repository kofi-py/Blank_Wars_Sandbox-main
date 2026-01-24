'use client';

import React from 'react';
import SafeMotion, { AnimatePresence } from './SafeMotion';
import { 
  Ticket, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Coins,
  Crown,
  Star
} from 'lucide-react';

interface TicketConfirmationModalProps {
  is_open: boolean;
  on_close: () => void;
  on_confirm: () => void;
  current_tickets: number;
  character_name?: string;
  chat_type?: string;
  loading?: boolean;
}

export default function TicketConfirmationModal({
  is_open,
  on_close,
  on_confirm,
  current_tickets,
  character_name,
  chat_type = 'chat',
  loading = false
}: TicketConfirmationModalProps) {
  
  const getTicketIcon = (count: number) => {
    if (count >= 50) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (count >= 20) return <Star className="w-5 h-5 text-blue-400" />;
    return <Ticket className="w-5 h-5 text-green-400" />;
  };

  const getTicketStatus = (count: number) => {
    if (count >= 20) return { color: 'text-green-400', status: 'Plenty of tickets' };
    if (count >= 10) return { color: 'text-yellow-400', status: 'Good amount' };
    if (count >= 5) return { color: 'text-orange-400', status: 'Running low' };
    return { color: 'text-red-400', status: 'Very low' };
  };

  const ticketStatus = getTicketStatus(current_tickets);

  return (
    <AnimatePresence>
      {is_open && (
        <>
          {/* Backdrop */}
          <SafeMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={on_close}
          />
          
          {/* Modal */}
          <SafeMotion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            class_name="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    {getTicketIcon(current_tickets)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Use Chat Ticket</h3>
                    <p className="text-sm text-gray-400">This interaction will consume 1 ticket</p>
                  </div>
                </div>
                <button
                  onClick={on_close}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  disabled={loading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Current Balance */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5 text-green-400" />
                    <div>
                      <div className="text-white font-medium">Current Balance</div>
                      <div className={`text-sm ${ticketStatus.color}`}>{ticketStatus.status}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{current_tickets}</div>
                    <div className="text-xs text-gray-400">tickets</div>
                  </div>
                </div>

                {/* Chat Info */}
                {character_name && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <div className="text-sm">
                      <span className="text-gray-300">Starting </span>
                      <span className="text-blue-400 font-medium">{chat_type}</span>
                      <span className="text-gray-300"> with </span>
                      <span className="text-white font-medium">{character_name}</span>
                    </div>
                  </div>
                )}

                {/* Warning for low tickets */}
                {current_tickets <= 5 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5" />
                    <div className="text-sm">
                      <div className="text-orange-400 font-medium mb-1">Running Low on Tickets</div>
                      <div className="text-gray-300">
                        Consider earning more through gameplay or upgrading your membership for more daily tickets.
                      </div>
                    </div>
                  </div>
                )}

                {/* After consumption preview */}
                <div className="text-center p-3 rounded-lg bg-gray-800/30 border border-gray-600/30">
                  <div className="text-sm text-gray-400 mb-1">After this chat:</div>
                  <div className="text-lg text-white font-medium">
                    {current_tickets - 1} tickets remaining
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-6 border-t border-gray-700 bg-gray-800/30">
                <button
                  onClick={on_close}
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={on_confirm}
                  disabled={loading || current_tickets <= 0}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Starting Chat...
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4" />
                      Use Ticket & Chat
                    </>
                  )}
                </button>
              </div>
            </div>
          </SafeMotion.div>
        </>
      )}
    </AnimatePresence>
  );
}
