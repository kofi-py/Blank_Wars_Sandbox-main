'use client';

import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { ensureDevSession } from '../services/authBootstrap';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  coach_name: string;
  subscription_tier: 'free' | 'premium' | 'legendary';
  level: number;
  experience: number;
  total_battles: number;
  total_wins: number;
  rating: number;
  created_at: string;
  character_slot_capacity: number; // Added for dynamic character slots
  completed_challenges: string[]; // Added for battle system
}

// Coach progression system
export const getCoachTitle = (level: number, wins: number): string => {
  if (level >= 50 && wins >= 500) return 'Grandmaster Coach';
  if (level >= 40 && wins >= 300) return 'Master Coach';
  if (level >= 30 && wins >= 200) return 'Expert Coach';
  if (level >= 20 && wins >= 100) return 'Veteran Coach';
  if (level >= 15 && wins >= 50) return 'Senior Coach';
  if (level >= 10 && wins >= 25) return 'Advanced Coach';
  if (level >= 5 && wins >= 10) return 'Junior Coach';
  return 'Rookie Coach';
};

export const getCoachDisplayName = (user: UserProfile): string => {
  const title = getCoachTitle(user.level, user.total_wins);
  return `${title} Lv.${user.level}`;
};

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  claim_token?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

interface AuthContextType {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  is_authenticated: boolean;
  is_loading: boolean;
  show_onboarding: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  refresh_token: () => Promise<void>;
  update_profile: (profileData: Partial<UserProfile>) => void;
  set_show_onboarding: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}


export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      console.log('🔄 AUTH DEBUG: Initializing authentication...');

      // Ensure dev session exists before any API calls
      await ensureDevSession();

      // Since httpOnly cookies are not visible to document.cookie,
      // we should always try the API call to check authentication status
      console.log('🍪 AUTH DEBUG: All visible cookies:', document.cookie);

      try {
        console.log('🔍 AUTH DEBUG: Attempting to get profile...');
        const profile = await authService.getProfile();
        console.log('✅ AUTH DEBUG: Profile retrieved successfully:', profile.username);
        setUser(profile);
      } catch (error) {
        // Silently handle expected "not logged in" state
        console.log('❌ AUTH DEBUG: Failed to get profile:', error instanceof Error ? error.message : 'Unknown error');
        setUser(null);
        // If we get a token expired error on initial load, try to refresh once
        if (error instanceof Error && error.message.includes('Token expired')) {
          try {
            console.log('🔄 AUTH DEBUG: Attempting token refresh...');
            try {
              await authService.refreshToken();             // always try first
            } catch (err: unknown) {
              const error = err as { message?: string };
              const msg = String(error?.message || '');
              // Only try dev session in development mode
              if (msg.includes('Refresh token') && process.env.NODE_ENV === 'development') {
                console.log('🧪 AUTH DEBUG: No refresh cookie; creating dev session...');
                await authService.createDevSession();
              } else {
                throw err;
              }
            }
            const profile = await authService.getProfile();
            console.log('✅ AUTH DEBUG: Auth recovery successful, profile:', profile.username);
            setUser(profile);
          } catch (refreshError) {
            // Silently handle expected "no refresh token" state
            console.log('❌ AUTH DEBUG: Auth recovery failed:', refreshError instanceof Error ? refreshError.message : 'Unknown error');
            setUser(null);
          }
        }
      } finally {
        console.log('🏁 AUTH DEBUG: Authentication initialization complete');
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      console.log('🔐 AUTH DEBUG: Attempting login...');
      const response = await authService.login(credentials);
      console.log('✅ AUTH DEBUG: Login successful, user:', response.user.username);

      setUser(response.user);
      // SECURITY: Tokens are now in httpOnly cookies, don't store in state
      setTokens(null);

      // SECURITY: Don't store tokens in localStorage anymore
      // Tokens are automatically sent via httpOnly cookies
      console.log('🍪 AUTH DEBUG: Login cookies should now be set by server');

    } catch (error) {
      console.error('❌ AUTH DEBUG: Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.register(credentials);

      setUser(response.user);
      // SECURITY: Tokens are now in httpOnly cookies, don't store in state
      setTokens(null);

      // SECURITY: Don't store tokens in localStorage anymore
      // Tokens are automatically sent via httpOnly cookies

      // Show onboarding for new users
      setShowOnboarding(true);

    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setTokens(null);

    // Clear character cache to prevent stale character data after logout
    const { cache } = require('../services/cacheService');
    cache.characters.clear();
    console.log('🚨 Cleared character cache on logout');

    // Clear therapy sessions to prevent cross-user data leak
    const { therapyChatService } = require('../data/therapyChatService');
    therapyChatService.endAllSessions();
    console.log('🚨 Cleared therapy sessions on logout');

    // SECURITY: Don't need to clear localStorage anymore
    // httpOnly cookies are cleared by the server

    // Call backend logout to clear httpOnly cookies
    authService.logout().catch(console.error);
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      // SECURITY: Refresh token is now in httpOnly cookie
      // No need to pass it explicitly
      await authService.refreshToken();

      // SECURITY: New tokens are set as httpOnly cookies by server
      // No need to store them in state or localStorage

    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear invalid tokens and logout
      logout();
      throw error;
    }
  }, [logout]);

  const updateProfile = useCallback((profileData: Partial<UserProfile>) => {
    setUser(prev => prev ? { ...prev, ...profileData } : null);
  }, []);

  const isAuthenticated = !!user && !is_loading;

  const value: AuthContextType = {
    user,
    tokens,
    is_authenticated: isAuthenticated,
    is_loading,
    show_onboarding: showOnboarding,
    login,
    register,
    logout,
    refresh_token: refreshToken,
    update_profile: updateProfile,
    set_show_onboarding: setShowOnboarding
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
