import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';

import { useColorScheme } from '@/components/useColorScheme';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore, registerSessionExpiryHandler } from '@/lib/stores/authStore';
import { registerForPushNotificationsAsync, syncPushTokenWithBackend } from '@/lib/notifications';
import Colors from '@/constants/Colors';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

const BIOMETRIC_RELOCK_MS = 5 * 60_000;

// Top-level routes reachable without a session. `payments` is the gateway's
// return deep link (its verify call is public); everything else needs sign-in.
const PUBLIC_ROUTES = new Set([
  'index',
  'splash',
  'onboarding',
  'login',
  'signup',
  'reset-password',
  'payments',
  'privacy-policy',
  'terms-conditions',
  '+not-found',
]);

SplashScreen.preventAutoHideAsync();

// Must run once, at module scope, before the app renders. Disabled (no-op)
// in local dev builds without a DSN configured — same pattern as the API
// and portal's Sentry setup.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
});

// Must run once, before any LiveKit room is used. @livekit/react-native-webrtc
// has no web implementation, so this is native-only — `expo start --web`
// never touches TeleCare video.
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { registerGlobals } = require('@livekit/react-native');
  registerGlobals();
}



function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    registerSessionExpiryHandler();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Attempt to restore session from stored refresh token before hiding splash
      restoreSession().finally(() => SplashScreen.hideAsync());
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1 }}>
          <RootLayoutNav />
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isRestoring = useAuthStore((s) => s.isLoading);

  // Route guard: anything outside the public screens needs a session. Covers a
  // dead session (refresh rejected), sign-out/deletion, and deep links or
  // notification taps that land on a protected screen while signed out.
  const topSegment = segments[0] ?? 'index';
  useEffect(() => {
    if (!isRestoring && !isAuthenticated && !PUBLIC_ROUTES.has(topSegment)) router.replace('/login');
  }, [isRestoring, isAuthenticated, topSegment]);

  // Re-lock with biometrics after the app has been in the background for a
  // while, same rule as cold start (only when biometrics are enrolled).
  const [locked, setLocked] = useState(false);
  const authenticateWithBiometrics = useAuthStore((s) => s.authenticateWithBiometrics);
  const unlock = () => authenticateWithBiometrics().then((ok) => ok && setLocked(false));
  const backgroundedAt = useRef<number | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state !== 'active' || backgroundedAt.current === null) return;
      const away = Date.now() - backgroundedAt.current;
      backgroundedAt.current = null;
      if (useAuthStore.getState().isAuthenticated && away >= BIOMETRIC_RELOCK_MS && (await useAuthStore.getState().checkBiometrics())) {
        setLocked(true);
        unlock();
      }
    });
    return () => sub.remove();
  }, []);

  // Ask for push permission only once signed in, never on the first-launch splash.
  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotificationsAsync().then((result) => {
      if (result.success && (result.expoPushToken || result.devicePushToken)) {
        syncPushTokenWithBackend({
          expoPushToken: result.expoPushToken,
          devicePushToken: result.devicePushToken,
        });
      }
    });
  }, [isAuthenticated]);

  // Notification taps, including the one that cold-started the app. Only
  // in-app paths are followed; each response is handled once.
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponseId = useRef<string | null>(null);
  useEffect(() => {
    if (!lastResponse || !isAuthenticated) return;
    const id = lastResponse.notification.request.identifier;
    if (handledResponseId.current === id) return;
    handledResponseId.current = id;
    const data = lastResponse.notification.request.content.data ?? {};
    const target = data.route ?? data.url;
    if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
      router.push(target as never);
    }
  }, [lastResponse, isAuthenticated]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerShadowVisible: false,
        }}>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="payments/verify" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="emergency"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="vitals-detail"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="blood-pressure-detail"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="record-vital"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="reading-confirmation"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="document-detail"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="prescription-detail"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="lab-result-detail"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="visit-note-detail"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="telecare-call"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="telecare-rating"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="my-profile"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="medical-history"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="my-care-team"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="appointments"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="book-appointment-step1"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="book-appointment-step2"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="book-appointment-step3"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="book-appointment-step4"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="splash"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="signup"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="share-records"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="payment-methods"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="make-payment"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="invoices"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="subscription"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="notification-preferences"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="consents"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="travelsafe"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="privacy-security"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="language-region"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="help-support"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="terms-conditions"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="privacy-policy"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="about-app"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="support-ticket" options={{ headerShown: false }} />
        <Stack.Screen name="dispatch-history" options={{ headerShown: false }} />
        <Stack.Screen name="dispatch-case" options={{ headerShown: false }} />
        <Stack.Screen name="expert-review" options={{ headerShown: false }} />
        <Stack.Screen name="expert-review-case" options={{ headerShown: false }} />
        <Stack.Screen name="expert-review-new" options={{ headerShown: false }} />
      </Stack>
      {locked ? (
        <View style={[StyleSheet.absoluteFill, styles.lockScreen, { backgroundColor: theme.background }]}>
          <Text style={[styles.lockTitle, { color: theme.text }]}>MyHealth Vault+ is locked</Text>
          <TouchableOpacity
            onPress={unlock}
            accessibilityRole="button"
            style={[styles.lockBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.lockBtnText}>Unlock</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  lockScreen: { alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  lockTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  lockBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  lockBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

export default Sentry.wrap(RootLayout);
