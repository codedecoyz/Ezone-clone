import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AuthUser, LoginCredentials } from '../types/models';

interface AuthContextType {
  user: AuthUser | null;
  userRole: 'faculty' | 'student' | 'admin' | null;
  loading: boolean;
  signIn: (credentials: LoginCredentials) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<'faculty' | 'student' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserDetails(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await fetchUserDetails(session.user.id);
        } else {
          setUser(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserDetails = async (userId: string) => {
    console.log('[Auth] Fetching user details for:', userId);

    try {
      // Attempt 1: Try RPC function
      try {
        const { data, error } = await supabase
          .rpc('get_user_details', { p_user_id: userId });

        console.log('[Auth] RPC result:', JSON.stringify({ data, error }));

        if (!error && data && data.length > 0) {
          const u = data[0];
          setUser({
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role as 'faculty' | 'student' | 'admin',
          });
          setUserRole(u.role as 'faculty' | 'student' | 'admin');
          console.log('[Auth] User set via RPC:', u.role);
          return;
        }
      } catch (err) {
        console.warn('[Auth] RPC failed, trying direct query:', err);
      }

      // Attempt 2: Try direct table query
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, full_name, role')
          .eq('id', userId)
          .single();

        console.log('[Auth] Direct query result:', JSON.stringify({ data, error }));

        if (!error && data) {
          setUser({
            id: data.id,
            email: data.email,
            full_name: data.full_name,
            role: data.role as 'faculty' | 'student' | 'admin',
          });
          setUserRole(data.role as 'faculty' | 'student' | 'admin');
          console.log('[Auth] User set via direct query:', data.role);
          return;
        }
      } catch (err) {
        console.warn('[Auth] Direct query also failed:', err);
      }

      // Attempt 3: Use auth session as last resort
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.warn('[Auth] Falling back to auth session data');
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.email?.split('@')[0] || 'User',
            role: 'student', // default role
          });
          setUserRole('student');
          return;
        }
      } catch (err) {
        console.error('[Auth] All attempts failed:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (credentials: LoginCredentials): Promise<{ error?: string }> => {
    try {
      console.log('[Auth] Signing in:', credentials.email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        console.error('[Auth] Sign in error:', error.message);
        return { error: error.message };
      }

      console.log('[Auth] Sign in successful, user ID:', data.user?.id);

      if (data.user) {
        await fetchUserDetails(data.user.id);
      }

      return {};
    } catch (error) {
      console.error('[Auth] Unexpected error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'myapp://reset-password',
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Failed to send reset email' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
