import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WifiOff, RefreshCw, Radio, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface NoInternetStateProps {
  /**
   * Native `fetch` has no reliable connectivity API of its own — the caller
   * already knows it's offline (an ApiError with status 0 from apiRequest's
   * network-failure branch), so this is purely presentational rather than
   * polling `navigator.onLine`, which doesn't exist on native anyway.
   */
  onRetry?: () => Promise<void> | void;
}

export function NoInternetState({ onRetry }: NoInternetStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [isChecking, setIsChecking] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setIsChecking(true);
    await onRetry();
    setIsChecking(false);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.emergencyLight }]}>
        <WifiOff size={32} color={theme.emergency} />
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.dot, { backgroundColor: theme.emergency }]} />
        <Text style={[styles.badgeText, { color: theme.emergency }]}>NO INTERNET CONNECTION</Text>
      </View>

      <Text style={[styles.title, { color: theme.text }]}>You're currently offline</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>
        MyHealth Vault+ needs an active connection to sync your records and vitals.
      </Text>

      <View style={[styles.tipsBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <Text style={[styles.tipsLabel, { color: theme.textMuted }]}>Troubleshooting steps:</Text>
        <View style={styles.tipRow}>
          <Radio size={13} color={theme.primary} />
          <Text style={[styles.tipText, { color: theme.textMuted }]}>Check your Wi-Fi or cellular signal</Text>
        </View>
        <View style={styles.tipRow}>
          <AlertTriangle size={13} color={theme.status.warning.solid} />
          <Text style={[styles.tipText, { color: theme.textMuted }]}>Toggle Airplane Mode off and on</Text>
        </View>
        <View style={styles.tipRow}>
          <CheckCircle2 size={13} color={theme.status.success.solid} />
          <Text style={[styles.tipText, { color: theme.textMuted }]}>Anything you drafted will sync once reconnected</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={isChecking}
        onPress={handleRetry}
        style={[styles.retryBtn, { backgroundColor: theme.primary, opacity: isChecking ? 0.7 : 1 }]}>
        <RefreshCw size={15} color="#FFFFFF" />
        <Text style={styles.retryBtnText}>{isChecking ? 'Checking status…' : 'Check Connection'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18,
    maxWidth: 280,
  },
  tipsBox: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginBottom: 18,
  },
  tipsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontSize: 12,
    flex: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
