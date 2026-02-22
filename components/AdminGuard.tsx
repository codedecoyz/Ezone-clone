import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../lib/supabase';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  async function checkAdminStatus() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    // Check role in public.users table
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !data || data.role !== 'admin') {
      console.log('User is not admin:', data?.role);
      // Redirect to appropriate dashboard based on actual role or back to login
      if (data?.role === 'student') router.replace('/(student)/(tabs)/dashboard');
      else if (data?.role === 'faculty') router.replace('/(faculty)/(tabs)/dashboard');
      else router.replace('/(auth)/login');
      
      setIsAdmin(false);
    } else {
      setIsAdmin(true);
    }
  }

  if (isAdmin === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return isAdmin ? <>{children}</> : null;
}
