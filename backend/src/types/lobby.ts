
import { UserProfile } from './user';

export interface Lobby {
  id: string;
  name: string;
  host_id: string;
  members: LobbyMember[];
  max_members: number;
  is_private: boolean;
  created_at: Date;
}

export interface LobbyMember {
  profile: UserProfile;
  is_ready: boolean;
}
