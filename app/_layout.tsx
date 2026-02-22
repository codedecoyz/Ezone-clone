import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { OfflineProvider } from '../contexts/OfflineContext';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, userRole, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inFacultyGroup = segments[0] === '(faculty)';
    const inStudentGroup = segments[0] === '(student)';

    const inAdminGroup = segments[0] === '(admin)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user) {
      // User is authenticated, check role-based navigation
      if (userRole === 'faculty' && !inFacultyGroup) {
        router.replace('/(faculty)/(tabs)');
      } else if (userRole === 'student' && !inStudentGroup) {
        router.replace('/(student)/(tabs)');
      } else if (userRole === 'admin' && !inAdminGroup) {
        router.replace('/(admin)/dashboard');
      }
    }
  }, [user, userRole, loading, segments]);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(faculty)" />
      <Stack.Screen name="(student)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <OfflineProvider>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </OfflineProvider>
    </AuthProvider>
  );
}
