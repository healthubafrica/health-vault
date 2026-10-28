// Notifee declares its ForegroundService as `shortService`, which Android 14+
// stops after ~3 minutes — a backgrounded TeleCare call would drop. Re-declare
// it as a microphone service so audio keeps flowing while the app is in the
// background.
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const SERVICE = 'app.notifee.core.ForegroundService';

module.exports = function withCallForegroundService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.service = (app.service ?? []).filter((s) => s.$['android:name'] !== SERVICE);
    app.service.push({
      $: {
        'android:name': SERVICE,
        'android:exported': 'false',
        'android:foregroundServiceType': 'microphone',
        'tools:replace': 'android:foregroundServiceType',
      },
    });
    return cfg;
  });
};
