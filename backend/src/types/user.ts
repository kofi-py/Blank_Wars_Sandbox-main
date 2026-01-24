
export interface User {
  id: string;
  username: string;
  email: string;
  coach_name: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  level: number;
  xp: number;
  character_slot_capacity: number;
}

export interface Friendship {
  id: string;
  user_id1: string;
  user_id2: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: Date;
  updated_at: Date;
}
