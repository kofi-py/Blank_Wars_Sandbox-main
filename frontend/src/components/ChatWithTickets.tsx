'use client';

import React, { useState, useCallback } from 'react';
import { useTickets } from '@/hooks/useTickets';
import TicketConfirmationModal from './TicketConfirmationModal';
import { apiClient } from '@/services/apiClient';
import type { ChatResponseData } from '@/types/socket';

interface ChatContext {
  conversation_context?: string;
  living_context?: string;
  event_context?: string;
  session_context?: {
    topic?: string;
    previous_decisions?: string[];
  };
  reaction_context?: string;
  battle_context?: {
    emotional_state?: string;
    trigger_event?: string;
    performance_level?: string;
  };
}

interface ChatPayload {
  character_id?: string;
  user_message: string;
  context?: ChatContext;
}

interface ChatWithTicketsProps {
  character_name?: string;
  character_id?: string;
  chat_type?: 'character_chat' | 'coaching' | 'training' | 'real_estate' | 'level_up';
  endpoint: string;
  payload: ChatPayload;
  onSuccess: (response: ChatResponseData) => void;
  onError: (error: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function ChatWithTickets({
  character_name,
  character_id,
  chat_type = 'character_chat',
  endpoint,
  payload,
  onSuccess,
  onError,
  children,
  disabled = false
}: ChatWithTicketsProps) {
  const { current_tickets, has_tickets, fetchBalance } = useTickets();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChatRequest = useCallback(async () => {
    try {
      setLoading(true);
      
      // Make the actual chat API call
      const response = await apiClient.post(endpoint, payload);
      
      // Refresh ticket balance after successful chat
      await fetchBalance();
      
      // Call success handler
      onSuccess(response.data);
      
      // Close confirmation modal
      setShowConfirmation(false);
      
    } catch (error: unknown) {
      console.error('Chat request error:', error);

      // Type guard: ensure error is an axios error with response
      if (typeof error !== 'object' || error === null || !('response' in error)) {
        throw new Error('Unexpected error type in chat request');
      }

      const axiosError = error as { response?: { status?: number; data?: { error?: string } } };

      // Handle specific ticket-related errors
      if (axiosError.response?.status === 402) {
        onError('Insufficient tickets for chat interaction. Please purchase more tickets or wait for daily refresh.');
      } else if (axiosError.response?.status === 409) {
        onError('Ticket was consumed by another request. Please try again.');
      } else {
        if (!axiosError.response?.data?.error) {
          throw new Error('API error response missing error message');
        }
        onError(axiosError.response.data.error);
      }
      
      // Refresh balance to get current state
      await fetchBalance();
      
      // Close confirmation modal
      setShowConfirmation(false);
      
    } finally {
      setLoading(false);
    }
  }, [endpoint, payload, onSuccess, onError, fetchBalance]);

  const handleInitiateChat = useCallback(() => {
    if (disabled) return;
    
    // Check if user has tickets
    if (!has_tickets) {
      onError('You need tickets to start a chat. Purchase more tickets or wait for daily refresh.');
      return;
    }
    
    // Show confirmation modal
    setShowConfirmation(true);
  }, [disabled, has_tickets, onError]);

  const handleConfirm = useCallback(() => {
    handleChatRequest();
  }, [handleChatRequest]);

  const handleCancel = useCallback(() => {
    setShowConfirmation(false);
    setLoading(false);
  }, []);

  // Clone children and add onClick handler
  const childrenWithHandler = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // Type assertion: we know the child accepts onClick and disabled
      return React.cloneElement(child as React.ReactElement<{onClick?: () => void; disabled?: boolean}>, {
        onClick: handleInitiateChat,
        disabled: disabled || loading || !has_tickets
      });
    }
    return child;
  });

  return (
    <>
      {childrenWithHandler}

      <TicketConfirmationModal
        is_open={showConfirmation}
        on_close={handleCancel}
        on_confirm={handleConfirm}
        current_tickets={current_tickets}
        character_name={character_name}
        chat_type={chat_type}
        loading={loading}
      />
    </>
  );
}

// Specialized wrapper for character chats
export function CharacterChatWithTickets({
  character_name,
  character_id,
  user_message,
  onSuccess,
  onError,
  children,
  disabled = false
}: {
  character_name: string;
  character_id: string;
  user_message: string;
  onSuccess: (response: ChatResponseData) => void;
  onError: (error: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <ChatWithTickets
      character_name={character_name}
      character_id={character_id}
      chat_type="character_chat"
      endpoint="/social/ai-drama"
      payload={{
        character_id,
        user_message,
        context: {}
      }}
      onSuccess={onSuccess}
      onError={onError}
      disabled={disabled}
    >
      {children}
    </ChatWithTickets>
  );
}

// Specialized wrapper for coaching sessions
export function CoachingChatWithTickets({
  character_name,
  character_id,
  user_message,
  coaching_type = 'performance',
  context = {},
  onSuccess,
  onError,
  children,
  disabled = false
}: {
  character_name: string;
  character_id: string;
  user_message: string;
  coaching_type?: 'performance' | 'individual' | 'team-management' | 'equipment' | 'skills' | 'group-activity';
  context?: ChatContext;
  onSuccess: (response: ChatResponseData) => void;
  onError: (error: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <ChatWithTickets
      character_name={character_name}
      character_id={character_id}
      chat_type="coaching"
      endpoint={`/coaching/${coaching_type}`}
      payload={{
        character_id,
        user_message,
        context
      }}
      onSuccess={onSuccess}
      onError={onError}
      disabled={disabled}
    >
      {children}
    </ChatWithTickets>
  );
}

// Specialized wrapper for level-up chats
export function LevelUpChatWithTickets({
  character_name,
  character_id,
  user_message,
  onSuccess,
  onError,
  children,
  disabled = false
}: {
  character_name: string;
  character_id: string;
  user_message: string;
  onSuccess: (response: ChatResponseData) => void;
  onError: (error: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <ChatWithTickets
      character_name={character_name}
      character_id={character_id}
      chat_type="level_up"
      endpoint={`/characters/${character_id}/level-up-chat`}
      payload={{ user_message }}
      onSuccess={onSuccess}
      onError={onError}
      disabled={disabled}
    >
      {children}
    </ChatWithTickets>
  );
}