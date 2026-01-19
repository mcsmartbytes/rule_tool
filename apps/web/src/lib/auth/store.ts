import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/lib/supabase/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth initialization error:', error);
        set({ isLoading: false, isInitialized: true, error: error.message });
        return;
      }

      if (session?.user) {
        set({ user: session.user, session });
        await get().fetchProfile();
      }

      set({ isLoading: false, isInitialized: true });

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          set({ user: session.user, session });
          await get().fetchProfile();
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, session: null, profile: null });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          set({ session });
        }
      });
    } catch (err) {
      console.error('Auth initialization error:', err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    if (data.user) {
      set({ user: data.user, session: data.session });
      await get().fetchProfile();
    }

    set({ isLoading: false });
    return { error: null };
  },

  signUp: async (email: string, password: string, fullName: string) => {
    set({ isLoading: true, error: null });

    // Get the current origin for the redirect URL
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    // If email confirmation is required, user won't have a session yet
    if (data.user && data.session) {
      set({ user: data.user, session: data.session });
      await get().fetchProfile();
    }

    set({ isLoading: false });
    return { error: null };
  },

  signOut: async () => {
    set({ isLoading: true });

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
    }

    set({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
    });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Fetch profile error:', error);
        return;
      }

      set({ profile: data as Profile });
    } catch (err) {
      console.error('Fetch profile error:', err);
    }
  },

  clearError: () => set({ error: null }),
}));

// Selector hooks for common derived state
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user);
export const useUser = () => useAuthStore((state) => state.user);
export const useProfile = () => useAuthStore((state) => state.profile);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
