
export interface User {
  id: string;
  username: string;
  email: string;
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  level: number;
  xp: number;
}

export interface Friendship {
  id: string;
  user_id1: string;
  user_id2: string;
  status: 'pending' | 'accepted' | 'blocked';
}
