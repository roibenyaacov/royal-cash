import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { Profile } from '../types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  pendingJoinTableId: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsInitialized: (initialized: boolean) => void;
  setPendingJoinTableId: (tableId: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  pendingJoinTableId: null,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),
  setPendingJoinTableId: (pendingJoinTableId) => set({ pendingJoinTableId }),
  reset: () => set({
    user: null,
    profile: null,
    session: null,
    isLoading: false,
    pendingJoinTableId: null,
  }),
}));
