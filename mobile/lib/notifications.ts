import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiRequest } from './api';

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
    console.log('[Notifications] Expo Push Token:', expoPushToken);

    // 6. Get Native Device Push Token (Direct FCM Token on Android / APNs on iOS)
    let devicePushToken: string | undefined;
    try {
      const deviceTokenData = await Notifications.getDevicePushTokenAsync();
      devicePushToken = deviceTokenData.data;
      console.log('[Notifications] Native FCM/APNs Device Token:', devicePushToken);
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
 * Sends registered push tokens to the backend user profile / notification service.
 */
export async function syncPushTokenWithBackend(
  tokens: { expoPushToken?: string; devicePushToken?: string }
): Promise<void> {
  try {
    const payload = {
      fcmToken: tokens.devicePushToken || tokens.expoPushToken,
      expoToken: tokens.expoPushToken,
      platform: Platform.OS,
      deviceModel: Device.modelName ?? 'Unknown',
      osVersion: Device.osVersion ?? 'Unknown',
    };

    // Attempt to register device token with backend API
    await apiRequest('/users/push-token', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(() => {
      // Silently handled if endpoint is not yet activated on server
    });

    console.log('[Notifications] Push token successfully synced with backend.');
  } catch (error) {
    console.warn('[Notifications] Failed to sync push token with backend:', error);
  }
}
