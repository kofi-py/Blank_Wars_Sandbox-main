'use client';

import { useEffect, useRef, useState } from 'react';
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
    authData = { tokens: null, is_authenticated: false };
  }

  const { tokens, is_authenticated: isAuthenticated } = authData;

  // Use state for both connected and authenticated so they trigger re-renders
  const [wsConnected, setWsConnected] = useState(false);
  const [wsAuthenticated, setWsAuthenticated] = useState(false);

  // Store handlers in ref to avoid effect re-runs on every render
  const handlersRef = useRef<Partial<BattleEventHandlers> | undefined>(handlers);

  // Update ref when handlers change (but don't trigger effect)
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Main effect - set up WebSocket and handlers
  useEffect(() => {
    if (!isAuthenticated || !tokens?.accessToken) {
      return;
    }

    // Set up all handlers including auth
    const wrappedHandlers: Partial<BattleEventHandlers> = {
      onConnect: () => {
        console.log('🔌 WebSocket connected, authenticating...');
        setWsConnected(true);
        battleWebSocket.authenticateWithToken(tokens.accessToken);
      },
      onAuthenticated: (data: any) => {
        console.log('✅ WebSocket authenticated:', data);
        setWsAuthenticated(true);
        handlersRef.current?.onAuthenticated?.(data);
      },
      onError: (error: string) => {
        console.error('❌ WebSocket error:', error);
        handlersRef.current?.onError?.(error);
      },
      onMatchFound: (result: any) => {
        console.log('🎯 Hook onMatchFound called:', result);
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
        setWsConnected(false);
        setWsAuthenticated(false);
        handlersRef.current?.onDisconnected?.();
      }
    };

    // Set handlers
    battleWebSocket.replaceEventHandlers(wrappedHandlers);

    // If already connected, authenticate immediately
    if (battleWebSocket.isConnected()) {
      setWsConnected(true);
      battleWebSocket.authenticateWithToken(tokens.accessToken);
    }

    // If already authenticated, update state
    if (battleWebSocket.isAuthenticated()) {
      setWsAuthenticated(true);
    }

    return () => {
      // Cleanup on unmount
      battleWebSocket.clearEventHandlers();
    };
  }, [isAuthenticated, tokens?.accessToken]);

  // Provide WebSocket interface
  return {
    isConnected: wsConnected,
    isAuthenticated: wsAuthenticated,
    findMatch: battleWebSocket.findMatch.bind(battleWebSocket),
    joinBattle: battleWebSocket.joinBattle.bind(battleWebSocket),
    selectStrategy: battleWebSocket.selectStrategy.bind(battleWebSocket),
    send_chat: battleWebSocket.sendChatMessage.bind(battleWebSocket),
    endBattle: battleWebSocket.endBattle.bind(battleWebSocket),
    socket: battleWebSocket.getSocket(),
    disconnect: () => {
      battleWebSocket.disconnect();
      setWsConnected(false);
      setWsAuthenticated(false);
    }
  };
}
