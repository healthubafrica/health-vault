import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';

import { useColorScheme } from '@/components/useColorScheme';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/lib/stores/authStore';
import Colors from '@/constants/Colors';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

// Must run once, before any LiveKit room is used. @livekit/react-native-webrtc
// has no web implementation, so this is native-only — `expo start --web`
// never touches TeleCare video.
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { registerGlobals } = require('@livekit/react-native');
  registerGlobals();
}



export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const restoreSession = useAuthStore((s) => s.restoreSession);

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
          name="record-heart-rate"
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
          name="telecare-settings"
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
          name="invoices"
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
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Information' }} />
      </Stack>
    </ThemeProvider>
  );
}
