import { PermissionsAndroid, Platform } from 'react-native';

// Android only: a foreground service (with its required ongoing notification)
// keeps TeleCare audio alive while the app is backgrounded. iOS uses the
// `audio` UIBackgroundMode instead. Notifee is required lazily so iOS, web and
// Jest never load its native module.
const notifee = () => require('@notifee/react-native') as typeof import('@notifee/react-native');

const CHANNEL_ID = 'telecare-ongoing';

let registered = false;

export async function startCallService(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    // Android 14+ throws a native SecurityException (an app crash, not a JS
    // error) if a microphone-type service starts without mic permission —
    // possible when the patient denied the mic but still joined the call.
    if (!(await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO))) return;
    const { default: n, AndroidForegroundServiceType, AndroidImportance } = notifee();
    if (!registered) {
      // The service lives until stopForegroundService(); this promise never resolves.
      n.registerForegroundService(() => new Promise(() => {}));
      registered = true;
    }
    await n.createChannel({ id: CHANNEL_ID, name: 'Ongoing TeleCare call', importance: AndroidImportance.LOW });
    await n.displayNotification({
      id: CHANNEL_ID,
      title: 'TeleCare call in progress',
      body: 'Tap to return to your consultation.',
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MICROPHONE],
        ongoing: true,
        smallIcon: 'notification_icon',
        pressAction: { id: 'default' },
      },
    });
  } catch (err) {
    // Never block a call on this: without it the call still works in the foreground.
    console.warn('[TeleCare] Could not start the background call service:', err);
  }
}

export async function stopCallService(): Promise<void> {
  if (Platform.OS !== 'android' || !registered) return;
  try {
    await notifee().default.stopForegroundService();
  } catch {
    // Already stopped.
  }
}
