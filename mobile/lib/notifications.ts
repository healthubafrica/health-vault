import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from './api';

const PUSH_TOKEN_KEY = 'hha_push_token';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushRegistrationResult {
  success: boolean;
  expoPushToken?: string;
  devicePushToken?: string;
  error?: string;
}

/**
 * Registers device for push notifications (FCM on Android / APNs on iOS)
 * Sets up Android notification channels and returns tokens.
 */
export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Push notifications are not supported on web.' };
  }

  if (!Device.isDevice) {
    console.log('[Notifications] Must use physical device for Push Notifications');
    return { success: false, error: 'Push notifications require a physical device.' };
  }

  try {
    // 1. Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 2. Request if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Push notification permission not granted');
      return { success: false, error: 'Push notification permission was denied.' };
    }

    // 3. Configure Android Notification Channels
    if (Platform.OS === 'android') {
      // General Notifications Channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#137333',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      // TeleCare Consultations & Urgent Calls Channel
      await Notifications.setNotificationChannelAsync('telecare-calls', {
        name: 'TeleCare Consultations',
        description: 'Incoming calls and appointments from doctors',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#137333',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      // Emergency & Critical Vitals Alerts Channel
      await Notifications.setNotificationChannelAsync('critical-alerts', {
        name: 'Critical Health Alerts',
        description: 'Emergency dispatches and critical vitals warnings',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000],
        lightColor: '#D93025',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    // 4. Get Project ID from EAS / app.json
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      '87ae595a-aad6-4c25-b0e4-69331153944c';

    // 5. Get Expo Push Token
    const expoTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const expoPushToken = expoTokenData.data;

    // 6. Get Native Device Push Token (Direct FCM Token on Android / APNs on iOS)
    let devicePushToken: string | undefined;
    try {
      const deviceTokenData = await Notifications.getDevicePushTokenAsync();
      devicePushToken = deviceTokenData.data;
    } catch (e) {
      console.warn('[Notifications] Could not retrieve native device push token:', e);
    }

    return {
      success: true,
      expoPushToken,
      devicePushToken,
    };
  } catch (err: any) {
    console.error('[Notifications] Error registering for push notifications:', err);
    return {
      success: false,
      error: err?.message || 'Unknown error occurred while registering push token.',
    };
  }
}

/**
 * Registers this device's push token with the backend (POST /notifications/push-token)
 * so server-side alerts can reach the phone. The token is kept in SecureStore so it
 * can be unregistered at sign-out even after an app restart.
 */
export async function syncPushTokenWithBackend(
  tokens: { expoPushToken?: string; devicePushToken?: string }
): Promise<void> {
  // The backend sends through FCM, so prefer the native device token.
  const token = tokens.devicePushToken || tokens.expoPushToken;
  if (!token || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  try {
    await apiRequest('/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch (error) {
    console.warn('[Notifications] Failed to register push token:', error);
  }
}

/** Stops pushes to this device. Call while the access token is still valid (before logout). */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (!token) return;
    await apiRequest('/notifications/push-token', { method: 'DELETE', body: JSON.stringify({ token }) }, false);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch {
    // Best effort: a failed unregister must never block signing out.
  }
}
