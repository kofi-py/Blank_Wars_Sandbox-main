import { Lobby, LobbyMember } from '../types/lobby';
import { UserProfile } from '../types/user';

const lobbies: Lobby[] = [];

export class LobbyService {
  createLobby(name: string, host_profile: UserProfile, max_members: number, is_private: boolean): Lobby {
    const new_lobby: Lobby = {
      id: `lobby_${Date.now()}`,
      name,
      host_id: host_profile.user_id,
      members: [{ profile: host_profile, is_ready: false }],
      max_members,
      is_private,
      created_at: new Date(),
    };
    lobbies.push(new_lobby);
    return new_lobby;
  }

  getLobbyById(lobby_id: string): Lobby | undefined {
    return lobbies.find(l => l.id === lobby_id);
  }

  listPublicLobbies(): Lobby[] {
    return lobbies.filter(l => !l.is_private);
  }

  joinLobby(lobby_id: string, user_profile: UserProfile): Lobby | undefined {
    const lobby = this.getLobbyById(lobby_id);
    if (lobby && lobby.members.length < lobby.max_members && !lobby.members.some(m => m.profile.user_id === user_profile.user_id)) {
      const new_member: LobbyMember = { profile: user_profile, is_ready: false };
      lobby.members.push(new_member);
      return lobby;
    }
    return undefined;
  }

  leaveLobby(lobby_id: string, user_id: string): Lobby | undefined {
    const lobby = this.getLobbyById(lobby_id);
    if (lobby) {
      lobby.members = lobby.members.filter(member => member.profile.user_id !== user_id);
      // If host leaves, transfer host or close lobby
      if (lobby.host_id === user_id) {
        if (lobby.members.length > 0) {
          lobby.host_id = lobby.members[0].profile.user_id; // Transfer host to first member
        } else {
          // No members left, remove lobby
          const index = lobbies.findIndex(l => l.id === lobby_id);
          if (index > -1) { lobbies.splice(index, 1); }
          return undefined; // Lobby closed
        }
      }
      return lobby;
    }
    return undefined;
  }

  setMemberReady(lobby_id: string, user_id: string, is_ready: boolean): Lobby | undefined {
    const lobby = this.getLobbyById(lobby_id);
    if (lobby) {
      const member = lobby.members.find(m => m.profile.user_id === user_id);
      if (member) {
        member.is_ready = is_ready;
        return lobby;
      }
    }
    return undefined;
  }

  updateLobbySettings(lobby_id: string, host_id: string, updates: Partial<Lobby>): Lobby | undefined {
    const lobby = this.getLobbyById(lobby_id);
    if (lobby && lobby.host_id === host_id) {
      if (updates.name !== undefined) lobby.name = updates.name;
      if (updates.max_members !== undefined) lobby.max_members = updates.max_members;
      if (updates.is_private !== undefined) lobby.is_private = updates.is_private;
      return lobby;
    }
    return undefined;
  }

  removeMember(lobby_id: string, host_id: string, member_id_to_remove: string): Lobby | undefined {
    const lobby = this.getLobbyById(lobby_id);
    if (lobby && lobby.host_id === host_id && lobby.host_id !== member_id_to_remove) {
      lobby.members = lobby.members.filter(m => m.profile.user_id !== member_id_to_remove);
      return lobby;
    }
    return undefined;
  }

  // Placeholder for battle start logic
  canStartBattle(lobby_id: string, host_id: string): boolean {
    const lobby = this.getLobbyById(lobby_id);
    if (!lobby || lobby.host_id !== host_id) return false;
    // All members must be ready and at least 2 members
    return lobby.members.length >= 2 && lobby.members.every(m => m.is_ready);
  }
}