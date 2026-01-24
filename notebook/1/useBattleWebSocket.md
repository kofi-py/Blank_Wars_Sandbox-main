'use client';

import { useEffect, useRef } from 'react';
import { battleWebSocket } from '@/services/battleWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import type { BattleEventHandlers } from '@/services/battleWebSocket';

export function useBattleWebSocket(handlers?: Partial<BattleEventHandlers>) {
  // Safely access auth context with error boundary
  let authData;
  try {
    authData = useAuth();
  } catch (error) {
    console.warn('useBattleWebSocket: AuthContext not available, running in standalone mode');
    authData = { tokens: null, isAuthenticated: false };
  }

  const { tokens, isAuthenticated } = authData;
  const isConnected = useRef(false);

  // Store handlers in ref to avoid effect re-runs on every render
  const handlersRef = useRef<Partial<BattleEventHandlers> | undefined>(handlers);

  // Update ref when handlers change (but don't trigger effect)
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (isAuthenticated && tokens?.accessToken && !isConnected.current) {
      // Set up event handlers if provided
      // Connect handler for authentication
      const connectHandler = () => {
        console.log('🔌 WebSocket connected, authenticating...');
        // Authenticate with JWT token
        battleWebSocket.authenticateWithToken(tokens.accessToken);
      };

      // Set up basic connection handler only
      battleWebSocket.setEventHandlers({
        onConnect: connectHandler
      });

      // If already connected, authenticate immediately
      if (battleWebSocket.isConnected()) {
        battleWebSocket.authenticateWithToken(tokens.accessToken);
      }

      isConnected.current = true;
    }

    return () => {
      // Cleanup on unmount or when auth changes
      if (!isAuthenticated && isConnected.current) {
        battleWebSocket.disconnect();
        isConnected.current = false;
      }
    };
  }, [isAuthenticated, tokens?.accessToken]);

  // Set up handlers ONCE on mount, use ref for latest handlers
  useEffect(() => {
    if (!isConnected.current) return;

    // Wrapper handlers that read from ref (always get latest handlers)
    const wrappedHandlers: Partial<BattleEventHandlers> = {
      onAuthenticated: (data: any) => {
        console.log('✅ WebSocket authenticated:', data);
        handlersRef.current?.onAuthenticated?.(data);
      },
      onError: (error: string) => {
        console.error('❌ WebSocket error:', error);
        handlersRef.current?.onError?.(error);
      },
      onMatchFound: (result: any) => {
        handlersRef.current?.onMatchFound?.(result);
      },
      onBattleStateUpdate: (state: any) => {
        handlersRef.current?.onBattleStateUpdate?.(state);
      },
      onBattleStart: (data: any) => {
        handlersRef.current?.onBattleStart?.(data);
      },
      onRoundStart: (data: any) => {
        handlersRef.current?.onRoundStart?.(data);
      },
      onRoundEnd: (data: any) => {
        handlersRef.current?.onRoundEnd?.(data);
      },
      onBattleEnd: (result: any) => {
        handlersRef.current?.onBattleEnd?.(result);
      },
      onChatMessage: (message: any) => {
        handlersRef.current?.onChatMessage?.(message);
      },
      onDisconnected: () => {
        handlersRef.current?.onDisconnected?.();
      }
    };

    // Set handlers ONCE (replace, don't merge)
    battleWebSocket.replaceEventHandlers(wrappedHandlers);

    return () => {
      // Cleanup: Clear handlers only on unmount
      battleWebSocket.clearEventHandlers();
    };
  }, [isConnected.current]); // Only run when connection status changes

  // Provide WebSocket interface
  return {
    isConnected: isConnected.current && battleWebSocket.isConnected(),
    isAuthenticated: battleWebSocket.isAuthenticated(),
    findMatch: battleWebSocket.findMatch.bind(battleWebSocket),
    joinBattle: battleWebSocket.joinBattle.bind(battleWebSocket),
    selectStrategy: battleWebSocket.selectStrategy.bind(battleWebSocket),
    sendChat: battleWebSocket.sendChatMessage.bind(battleWebSocket),
    socket: battleWebSocket.getSocket(), // Expose socket for custom chat functionality
    disconnect: () => {
      battleWebSocket.disconnect();
      isConnected.current = false;
    }
  };
}