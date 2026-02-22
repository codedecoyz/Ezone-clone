import { supabase } from '../lib/supabase';
import type { LoginCredentials } from '../types/models';

export const authService = {
  async signIn(credentials: LoginCredentials) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      // Fetch user role via RPC (bypasses RLS recursion)
      const { data: rpcData, error: userError } = await supabase
        .rpc('get_user_details', { p_user_id: data.user.id });

      const userData = rpcData && rpcData.length > 0 ? rpcData[0] : null;

      if (userError) throw userError;

      return { user: userData, session: data.session, error: null };
    } catch (error: any) {
      return { user: null, session: null, error: error.message };
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'myapp://reset-password',
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  async getCurrentUser() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) return { user: null, error: null };

      const { data: rpcData, error: userError } = await supabase
        .rpc('get_user_details', { p_user_id: session.user.id });

      const userData = rpcData && rpcData.length > 0 ? rpcData[0] : null;

      if (userError) throw userError;
      return { user: userData, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },
};

export default authService;
