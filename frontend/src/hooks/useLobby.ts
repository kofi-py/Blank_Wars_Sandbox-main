import { useState, useEffect, useCallback } from 'react';
import { battleWebSocket } from '@/services/battleWebSocket';
import { Lobby, LobbyMember } from '@/types/lobby';
import { UserProfile } from '@/types/user';

interface UseLobbyProps {
  user_profile: UserProfile | null;
}

export function useLobby({ user_profile }: UseLobbyProps) {
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [publicLobbies, setPublicLobbies] = useState<Lobby[]>([]);

  const handleLobbyUpdate = useCallback((lobby: Lobby) => {
    setCurrentLobby(lobby);
    setLobbyError(null);
  }, []);

  const handleLobbyError = useCallback((error: string) => {
    setLobbyError(error);
  }, []);

  const handleLobbyClosed = useCallback((data: { lobby_id: string }) => {
    if (currentLobby?.id === data.lobby_id) {
      setCurrentLobby(null);
      setLobbyError('Lobby closed by host.');
    }
    setPublicLobbies(prev => prev.filter(lobby => lobby.id !== data.lobby_id));
  }, [currentLobby]);

  const handlePublicLobbiesList = useCallback((lobbies: Lobby[]) => {
    setPublicLobbies(lobbies);
  }, []);

  useEffect(() => {
    battleWebSocket.setEventHandlers({
      onLobbyUpdate: handleLobbyUpdate,
      onLobbyError: handleLobbyError,
      onLobbyClosed: handleLobbyClosed,
      onPublicLobbiesList: handlePublicLobbiesList,
    });

    // Request public lobbies list on mount
    battleWebSocket.instance.emit('list_public_lobbies');

    return () => {
      battleWebSocket.clearEventHandlers();
    };
  }, [handleLobbyUpdate, handleLobbyError, handleLobbyClosed, handlePublicLobbiesList]);

  const createLobby = useCallback((name: string, max_members: number, is_private: boolean) => {
    if (!user_profile) {
      setLobbyError('User profile not available');
      return;
    }
    battleWebSocket.instance.emit('create_lobby', { name, max_members: max_members, is_private: is_private });
  }, [user_profile]);

  const joinLobby = useCallback((lobbyId: string) => {
    if (!user_profile) {
      setLobbyError('User profile not available');
      return;
    }
    battleWebSocket.instance.emit('join_lobby', { lobbyId });
  }, [user_profile]);

  const leaveLobby = useCallback(() => {
    if (currentLobby) {
      battleWebSocket.instance.emit('leave_lobby', currentLobby.id);
      setCurrentLobby(null);
    }
  }, [currentLobby]);

  const setReady = useCallback((isReady: boolean) => {
    if (currentLobby) {
      battleWebSocket.instance.emit('set_ready', { lobby_id: currentLobby.id, isReady });
    }
  }, [currentLobby]);

  const startBattle = useCallback(() => {
    if (currentLobby && user_profile && currentLobby.host_id === user_profile.user_id) {
      battleWebSocket.instance.emit('start_battle', currentLobby.id);
    }
  }, [currentLobby, user_profile]);

  const updateLobbySettings = useCallback((updates: Partial<Lobby>) => {
    if (currentLobby && user_profile && currentLobby.host_id === user_profile.user_id) {
      battleWebSocket.instance.emit('update_lobby_settings', { lobby_id: currentLobby.id, updates });
    }
  }, [currentLobby, user_profile]);

  const kickMember = useCallback((memberId: string) => {
    if (currentLobby && user_profile && currentLobby.host_id === user_profile.user_id) {
      battleWebSocket.instance.emit('kick_member', { lobby_id: currentLobby.id, memberId });
    }
  }, [currentLobby, user_profile]);

  return {
    currentLobby,
    lobbyError,
    publicLobbies,
    createLobby,
    joinLobby,
    leaveLobby,
    setReady,
    startBattle,
    updateLobbySettings,
    kickMember,
  };
}