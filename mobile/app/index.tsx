import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/stores/authStore';
import WelcomeSplash from '@/components/welcome/WelcomeSplash';

export default function AppEntrySplashScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isRestoring = useAuthStore(state => state.isLoading);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Signed-in users skip the minimum splash time; everyone else sees it, then onboarding.
    if (isRestoring) return;
    if (isAuthenticated) router.replace('/(tabs)');
    else if (ready) router.replace('/onboarding');
  }, [ready, isRestoring, isAuthenticated, router]);

  return <WelcomeSplash loading />;
}
