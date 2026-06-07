// ==========================================
// Royal Cash - Auth Service
// ==========================================
// Logic copied AS-IS from original HTML file
// ==========================================

import { supabase } from '../config/supabase';
import { Profile } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  username: string;
  phone: string;
}

/**
 * Check current auth session
 * Copied from original checkAuth() function
 */
export async function checkAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      return { session: null, profile: null, error };
    }

    if (!session) {
      return { session: null, profile: null, error: null };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return { session, profile: null, error: profileError };
    }

    return { session, profile: profile as Profile, error: null };
  } catch (error) {
    console.error('Error in checkAuth:', error);
    return { session: null, profile: null, error };
  }
}

/**
 * Login with email and password
 * Copied from original handleLogin() function
 */
export async function login({ email, password }: LoginCredentials) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return { user: null, session: null, profile: null, error };
    }

    if (!data.user) {
      return { user: null, session: null, profile: null, error: new Error('No user returned') };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile after login:', profileError);
    }

    return {
      user: data.user,
      session: data.session,
      profile: profile as Profile | null,
      error: null,
    };
  } catch (error) {
    console.error('Error in login:', error);
    return { user: null, session: null, profile: null, error };
  }
}

/**
 * Sign up new user
 * Copied from original handleSignup() function
 */
export async function signup({ email, password, username, phone }: SignupCredentials) {
  try {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          phone_number: phone,
        },
      },
    });

    if (authError) {
      console.error('Signup auth error:', authError);
      return { user: null, profile: null, error: authError };
    }

    if (!authData.user) {
      return { user: null, profile: null, error: new Error('No user returned') };
    }

    // Step 2: Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          username,
          email,
          phone_number: phone,
          total_profit: 0,
          games_played: 0,
        },
      ])
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Profile might already exist via trigger, try to fetch it
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      return {
        user: authData.user,
        profile: existingProfile as Profile | null,
        error: null,
      };
    }

    return {
      user: authData.user,
      profile: profile as Profile,
      error: null,
    };
  } catch (error) {
    console.error('Error in signup:', error);
    return { user: null, profile: null, error };
  }
}

/**
 * Logout current user
 * Copied from original handleLogout() function
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      return { error };
    }
    return { error: null };
  } catch (error) {
    console.error('Error in logout:', error);
    return { error };
  }
}

/**
 * Get user profile by ID
 */
export async function getProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return { profile: null, error };
    }

    return { profile: data as Profile, error: null };
  } catch (error) {
    console.error('Error in getProfile:', error);
    return { profile: null, error };
  }
}

/**
 * Search profile by username
 */
export async function searchProfileByUsername(username: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .single();

    if (error) {
      return { profile: null, error };
    }

    return { profile: data as Pick<Profile, 'id' | 'username'>, error: null };
  } catch (error) {
    return { profile: null, error };
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
