import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient.ts';
import { Profile } from '../types/database.types.ts';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: 'STUDENT' | 'ADMIN' | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (fullName: string, email: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; role?: string; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  updateProfile: (data: Partial<Omit<Profile, 'id' | 'role' | 'created_at' | 'updated_at'>>) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string, currentUser?: User | null): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error.message);
        return null;
      }

      if (data) {
        return data as Profile;
      }

      // If trigger hasn't fired or profile row is missing, insert student profile safely
      const fallbackName = currentUser?.user_metadata?.full_name || currentUser?.email || 'Apex Student';
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            full_name: fallbackName,
            role: 'STUDENT',
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('[AuthContext] Profile fallback insert error:', insertError.message);
        return null;
      }

      return newProfile as Profile;
    } catch (err: any) {
      console.error('[AuthContext] Exception fetching profile:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const p = await fetchProfile(user.id, user);
      setProfile(p);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          const p = await fetchProfile(currentSession.user.id, currentSession.user);
          if (mounted) setProfile(p);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('[AuthContext] Init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        const p = await fetchProfile(currentSession.user.id, currentSession.user);
        if (mounted) setProfile(p);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (fullName: string, email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Fetch or create profile
        const p = await fetchProfile(data.user.id, data.user);
        if (p) setProfile(p);

        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          return { success: true, message: 'Account registered successfully! Welcome to Apex Academy.' };
        } else {
          return {
            success: true,
            message: 'Check your email to verify your Apex Academy account before signing in.',
          };
        }
      }

      return { success: true, message: 'Registration submitted. Please check your email for confirmation.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create account.' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        const p = await fetchProfile(data.user.id, data.user);
        setProfile(p);
        const role = p?.role || 'STUDENT';
        return { success: true, role };
      }

      return { success: false, error: 'Invalid user session returned.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login failed. Please check credentials.' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AuthContext] SignOut error:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: `Reset instructions sent! Check your email inbox (${email}) for instructions to reset your password.`,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to send password reset request.' };
    }
  };

  const updateProfile = async (
    data: Partial<Omit<Profile, 'id' | 'role' | 'created_at' | 'updated_at'>>
  ) => {
    if (!user) {
      return { success: false, error: 'User is not authenticated.' };
    }

    try {
      // Strictly sanitize data: prevent changing role, id, created_at, updated_at
      const safeData = {
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        bio: data.bio,
        education: data.education,
        experience_level: data.experience_level,
        updated_at: new Date().toISOString(),
      };

      // Filter out undefined keys
      Object.keys(safeData).forEach(
        (key) => (safeData as any)[key] === undefined && delete (safeData as any)[key]
      );

      const { data: updated, error } = await supabase
        .from('profiles')
        .update(safeData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (updated) {
        setProfile(updated as Profile);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update profile.' };
    }
  };

  const role = profile?.role || null;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        isAuthenticated,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
