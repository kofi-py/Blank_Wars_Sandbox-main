import { User, UserProfile, Friendship } from '../types/user';

const API_BASE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:4000';
    }
    throw new Error('NEXT_PUBLIC_API_URL environment variable is not set. Cannot initialize userService.');
  }
  return url;
})();

export class UserService {
  async getUserProfile(user_id: string): Promise<UserProfile | undefined> {
    const response = await fetch(`${API_BASE_URL}/api/users/${user_id}/profile`);
    if (response.ok) {
      return response.json();
    }
    return undefined;
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (response.ok) {
      return response.json();
    }
    return undefined;
  }

  async addFriend(targetUserId: string): Promise<Friendship | undefined> {
    const response = await fetch(`${API_BASE_URL}/api/friends/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
    if (response.ok) {
      return response.json();
    }
    return undefined;
  }

  async acceptFriendRequest(friendshipId: string): Promise<Friendship | undefined> {
    const response = await fetch(`${API_BASE_URL}/api/friends/accept/${friendshipId}`, {
      method: 'POST',
    });
    if (response.ok) {
      return response.json();
    }
    return undefined;
  }

  async rejectFriendRequest(friendshipId: string): Promise<Friendship | undefined> {
    const response = await fetch(`${API_BASE_URL}/api/friends/reject/${friendshipId}`, {
      method: 'POST',
    });
    if (response.ok) {
      return response.json();
    }
    return undefined;
  }

  async getFriends(): Promise<UserProfile[]> {
    const response = await fetch(`${API_BASE_URL}/api/friends`);
    if (response.ok) {
      return response.json();
    }
    return [];
  }

  async getPendingFriendRequests(): Promise<Friendship[]> {
    const response = await fetch(`${API_BASE_URL}/api/friends/pending`);
    if (response.ok) {
      return response.json();
    }
    return [];
  }

  async searchUsers(query: string): Promise<UserProfile[]> {
    const response = await fetch(`${API_BASE_URL}/api/users/search?q=${query}`);
    if (response.ok) {
      return response.json();
    }
    return [];
  }
}