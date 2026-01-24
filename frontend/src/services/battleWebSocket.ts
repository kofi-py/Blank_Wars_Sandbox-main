import { io, Socket } from 'socket.io-client';
import type { HexPosition } from './battleAPI';

// Types matching the backend
interface BattleUser {
  id: string;
  username: string;
  rating: number;
}

interface BattleCharacter {
  id: string;
  name: string;
  title?: string;
  nickname?: string;
  level: number;
  current_health: number;
  max_health: number;
  abilities: Array<{
    name: string;
    damage_multiplier: number;
    cooldown: number;
    effect?: string;
  }>;
}

interface BattleMatchResult {
  status: 'waiting' | 'found' | 'failed';
  battle_id?: string;
  opponent?: BattleUser;
  character?: BattleCharacter;
  message?: string;
}

interface BattleState {
  id: string;
  status: 'matchmaking' | 'strategy_select' | 'round_combat' | 'chat_break' | 'completed';
  current_round: number;
  player1: BattleUser;
  player2: BattleUser;
  character1: BattleCharacter;
  character2: BattleCharacter;
  timer?: number;
}

// Event handlers type
type BattleEventHandlers = {
  onConnect?: () => void;
  onAuthenticated?: (user: BattleUser) => void;
  onMatchFound?: (result: BattleMatchResult) => void;
  onBattleStateUpdate?: (state: BattleState) => void;
  onBattleStart?: (battleData: any) => void;
  onRoundStart?: (roundData: any) => void;
  onRoundEnd?: (roundData: any) => void;
  onBattleEnd?: (result: any) => void;
  onChatMessage?: (message: any) => void;
  onPowerUsed?: (data: any) => void;
  onSpellCast?: (data: any) => void;
  onPowerFailed?: (error: any) => void;
  onSpellFailed?: (error: any) => void;
  onError?: (error: string) => void;
  onDisconnected?: () => void;
  onLobbyUpdate?: (data: any) => void;
  onLobbyError?: (error: any) => void;
  onLobbyClosed?: (data: any) => void;
  onPublicLobbiesList?: (lobbies: any) => void;
};

class BattleWebSocketService {
  private socket: Socket | null = null;
  private handlers: BattleEventHandlers = {};
  private authenticated = false;
  private currentUser: BattleUser | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    // Only connect in browser environment
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private connect() {
    // Clean up existing socket to prevent listener accumulation on reconnect
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const serverUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

    console.log('🔌 Connecting to WebSocket server:', serverUrl);

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      timeout: 10000,
      forceNew: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Connected to battle server');
      this.reconnectAttempts = 0;
      
      // Authentication will be handled externally via authenticateWithToken()
      // No auto-authentication with mock tokens
    });

    // Listen for auth_success (the event the backend actually emits)
    this.socket.on('auth_success', (data: { user_id: string; username: string }) => {
      console.log('✅ Authenticated as:', data.username);
      this.authenticated = true;
      this.currentUser = { id: data.user_id, username: data.username, rating: 1000 };
      this.handlers.onAuthenticated?.(this.currentUser);
    });

    // Also listen for legacy 'authenticate' event just in case
    this.socket.on('authenticate', (user: BattleUser) => {
      console.log('✅ Authenticated (legacy) as:', user.username);
      this.authenticated = true;
      this.currentUser = user;
      this.handlers.onAuthenticated?.(user);
    });

    this.socket.on('match_result', (result: BattleMatchResult) => {
      console.log('⚔️ Match result:', result);
      // Dispatch custom event so any component can listen
      window.dispatchEvent(new CustomEvent('battle_match_result', { detail: result }));
      this.handlers.onMatchFound?.(result);
    });

    this.socket.on('battle_found', (data: any) => {
      console.log('🎮 Battle found:', data);
      this.handlers.onMatchFound?.(data);
    });

    this.socket.on('battle_state_update', (state: BattleState) => {
      console.log('🔄 Battle state update:', state);
      this.handlers.onBattleStateUpdate?.(state);
    });

    this.socket.on('battle_start', (data: any) => {
      console.log('🚀 Battle starting:', data);
      this.handlers.onBattleStart?.(data);
    });

    this.socket.on('round_start', (data: any) => {
      console.log('⏰ Round starting:', data);
      this.handlers.onRoundStart?.(data);
    });

    this.socket.on('round_end', (data: any) => {
      console.log('🏁 Round ended:', data);
      this.handlers.onRoundEnd?.(data);
    });

    this.socket.on('battle_end', (result: any) => {
      console.log('🎊 Battle ended:', result);
      this.handlers.onBattleEnd?.(result);
    });

    this.socket.on('chat_response', (response: any) => {
      console.log('💬 Chat response received:', response);
      this.handlers.onChatMessage?.(response);
    });

    this.socket.on('chat_message', (message: any) => {
      console.log('💬 Chat message:', message);
      this.handlers.onChatMessage?.(message);
    });

    this.socket.on('power_used', (data: any) => {
      console.log('⚡ Power used:', data);
      this.handlers.onPowerUsed?.(data);
    });

    this.socket.on('spell_cast', (data: any) => {
      console.log('✨ Spell cast:', data);
      this.handlers.onSpellCast?.(data);
    });

    this.socket.on('power_failed', (error: any) => {
      console.error('❌ Power failed:', error);
      this.handlers.onPowerFailed?.(error);
    });

    this.socket.on('spell_failed', (error: any) => {
      console.error('❌ Spell failed:', error);
      this.handlers.onSpellFailed?.(error);
    });

    this.socket.on('battle_error', (error: any) => {
      console.error('❌ Battle error:', error);
      this.handlers.onError?.(error.error || error.message || 'Unknown error');
    });

    this.socket.on('match_error', (error: any) => {
      console.error('❌ Match error:', error);
      this.handlers.onError?.(error.error || error.message || 'Matchmaking failed');
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 Disconnected:', reason);
      this.authenticated = false;
      this.currentUser = null;
      this.handlers.onDisconnected?.();
      
      // Auto-reconnect unless manually disconnected
      if (reason !== 'io client disconnect' && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting attempt ${this.reconnectAttempts}...`);
        setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Connection error:', error.message);
      this.handlers.onError?.(`Connection failed: ${error.message}`);
    });

    this.socket.on('lobby_update', (data: any) => {
      console.log('🛋️ Lobby update:', data);
      this.handlers.onLobbyUpdate?.(data);
    });

    this.socket.on('lobby_error', (error: any) => {
      console.error('❌ Lobby error:', error);
      this.handlers.onLobbyError?.(error);
    });

    this.socket.on('lobby_closed', (data: any) => {
      console.log('🚪 Lobby closed:', data);
      this.handlers.onLobbyClosed?.(data);
    });

    this.socket.on('public_lobbies_list', (lobbies: any) => {
      console.log('📋 Public lobbies list:', lobbies);
      this.handlers.onPublicLobbiesList?.(lobbies);
    });
  }

  // Public methods
  public setEventHandlers(handlers: BattleEventHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  public replaceEventHandlers(handlers: BattleEventHandlers) {
    // Replace instead of merge - prevents handler accumulation
    this.handlers = { ...handlers };
  }

  public clearEventHandlers() {
    this.handlers = {};
  }

  public authenticate(token: string) {
    if (!this.socket) return;
    this.socket.emit('auth', token);
  }

  // Authenticate with JWT token from auth context
  public authenticateWithToken(accessToken: string | null) {
    if (!accessToken) {
      console.warn('⚠️ No access token provided for WebSocket authentication');
      return;
    }
    
    if (!this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot authenticate');
      return;
    }

    console.log('🔐 Authenticating WebSocket with JWT token');
    this.socket.emit('auth', accessToken);
  }

  public findMatch(character_id?: string | null, mode: 'casual' | 'ranked' | 'pve' = 'casual') {
    if (!this.socket || !this.authenticated) {
      this.handlers.onError?.('Not connected or authenticated');
      return;
    }

    console.log('🎮 findMatch called:', { character_id, mode });
    // Always use find_match with mode - backend will handle character selection
    this.socket.emit('find_match', { character_id, mode });
  }

  public joinBattle(battle_id: string) {
    if (!this.socket || !this.authenticated) {
      this.handlers.onError?.('Not connected or authenticated');
      return;
    }
    this.socket.emit('join_battle', { battle_id });
  }

  public selectStrategy(strategy: 'aggressive' | 'defensive' | 'balanced') {
    if (!this.socket || !this.authenticated) {
      this.handlers.onError?.('Not connected or authenticated');
      return;
    }
    this.socket.emit('select_strategy', { strategy });
  }

  public sendChatMessage(data: any) {
    if (!this.socket || !this.authenticated) {
      this.handlers.onError?.('Not connected or authenticated');
      return;
    }
    // Use the correct event name and include character data
    this.socket.emit('chat_message', data);
  }

  public usePower(power_id: string, target_character_id: string) {
    if (!this.socket || !this.authenticated) {
      this.handlers.onError?.('Not connected or authenticated');
      return;
    }
    this.socket.emit('use_power', { power_id, target_character_id });
  }

  public castSpell(spell_id: string, target_character_id: string) {
    if (!this.socket || !this.authenticated) {
      this.handlers.onError?.('Not connected or authenticated');
      return;
    }
    this.socket.emit('cast_spell', { spell_id, target_character_id });
  }

  public endBattle(battle_id: string, result: { winner: 'user' | 'opponent'; user_health: number; opponent_health: number }) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected - using HTTP fallback to unlock characters');
      // HTTP fallback to ensure characters get unlocked even if socket disconnected
      this.unlockCharactersViaHttp(battle_id);
      return;
    }
    console.log('🏁 Emitting battle_end_client event for battle:', battle_id);
    this.socket.emit('battle_end_client', { battle_id, result });
  }

  // HTTP fallback for unlocking characters when socket is unavailable
  private async unlockCharactersViaHttp(battle_id: string): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('Cannot unlock via HTTP: no auth token');
        return;
      }

      const serverUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const response = await fetch(`${serverUrl}/api/battles/${battle_id}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log('🔓 Characters unlocked via HTTP fallback');
      } else {
        const error = await response.json();
        console.error('HTTP unlock failed:', error);
      }
    } catch (error) {
      console.error('HTTP unlock error:', error);
    }
  }

  public disconnect() {
    if (this.socket) {
      // MEMORY LEAK FIX: Remove all listeners before disconnecting
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.authenticated = false;
    this.currentUser = null;
    this.handlers = {}; // Clear handlers to prevent memory leaks
  }

  // Getters
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  public getCurrentUser(): BattleUser | null {
    return this.currentUser;
  }

  // Get socket instance for advanced usage (e.g., custom chat events)
  public getSocket(): Socket | null {
    return this.socket;
  }

  // Proxy method for emitting custom events
  public emit(event: string, ...args: any[]): void {
    if (this.socket) {
      this.socket.emit(event, ...args);
    } else {
      console.warn(`Cannot emit '${event}': socket not connected`);
    }
  }
}

// Singleton instance
let battleWebSocketInstance: BattleWebSocketService | null = null;

export const getBattleWebSocket = (): BattleWebSocketService => {
  if (!battleWebSocketInstance) {
    battleWebSocketInstance = new BattleWebSocketService();
  }
  return battleWebSocketInstance;
};

// Export singleton getter for lazy initialization
export const battleWebSocket = {
  get instance() {
    return getBattleWebSocket();
  },
  // Proxy methods to maintain API compatibility
  setEventHandlers: (handlers: BattleEventHandlers) => getBattleWebSocket().setEventHandlers(handlers),
  replaceEventHandlers: (handlers: BattleEventHandlers) => getBattleWebSocket().replaceEventHandlers(handlers),
  clearEventHandlers: () => getBattleWebSocket().clearEventHandlers(),
  authenticate: (token: string) => getBattleWebSocket().authenticate(token),
  authenticateWithToken: (accessToken: string | null) => getBattleWebSocket().authenticateWithToken(accessToken),
  findMatch: (character_id?: string | null, mode?: 'casual' | 'ranked' | 'pve') => getBattleWebSocket().findMatch(character_id, mode),
  joinBattle: (battle_id: string) => getBattleWebSocket().joinBattle(battle_id),
  selectStrategy: (strategy: 'aggressive' | 'defensive' | 'balanced') => getBattleWebSocket().selectStrategy(strategy),
  sendChatMessage: (message: string) => getBattleWebSocket().sendChatMessage(message),
  usePower: (power_id: string, target_character_id: string) => getBattleWebSocket().usePower(power_id, target_character_id),
  castSpell: (spell_id: string, target_character_id: string) => getBattleWebSocket().castSpell(spell_id, target_character_id),
  endBattle: (battle_id: string, result: { winner: 'user' | 'opponent'; user_health: number; opponent_health: number }) => getBattleWebSocket().endBattle(battle_id, result),
  disconnect: () => getBattleWebSocket().disconnect(),
  isConnected: () => getBattleWebSocket().isConnected(),
  isAuthenticated: () => getBattleWebSocket().isAuthenticated(),
  get_current_user: () => getBattleWebSocket().getCurrentUser(),
  getSocket: () => getBattleWebSocket().getSocket(),
};

export default BattleWebSocketService;
export type { BattleUser, BattleCharacter, BattleMatchResult, BattleState, BattleEventHandlers };