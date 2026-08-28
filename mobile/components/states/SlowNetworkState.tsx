import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { SignalLow, Gauge, Zap, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface SlowNetworkStateProps {
  latencyMs?: number;
  onEnableLiteMode?: (enabled: boolean) => void;
  onRetry?: () => void;
  /** 'banner' — thin inline strip above content. 'card' — standalone block. */
  variant?: 'banner' | 'card';
}

export function SlowNetworkState({ latencyMs = 2840, onEnableLiteMode, onRetry, variant = 'card' }: SlowNetworkStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [liteMode, setLiteMode] = useState(false);

  const toggleLiteMode = (value: boolean) => {
    setLiteMode(value);
    onEnableLiteMode?.(value);
  };

  if (variant === 'banner') {
    return (
      <View style={[styles.banner, { backgroundColor: theme.status.warning.background, borderColor: theme.status.warning.solid + '55' }]}>
        <SignalLow size={16} color={theme.status.warning.solid} />
        <Text style={[styles.bannerText, { color: theme.status.warning.text }]} numberOfLines={2}>
          Slow connection detected ({latencyMs}ms) — data may take longer to load.
        </Text>
        <TouchableOpacity activeOpacity={0.8} onPress={() => toggleLiteMode(!liteMode)}>
          <Text style={[styles.bannerAction, { color: theme.status.warning.text }]}>
            {liteMode ? 'Disable Lite' : 'Enable Lite'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.status.warning.solid + '4D' }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.status.warning.background }]}>
        <SignalLow size={24} color={theme.status.warning.text} />
      </View>

      <View style={[styles.latencyPill, { backgroundColor: theme.status.warning.background }]}>
        <Gauge size={12} color={theme.status.warning.text} />
        <Text style={[styles.latencyText, { color: theme.status.warning.text }]}>High Latency: {latencyMs}ms</Text>
      </View>

      <Text style={[styles.title, { color: theme.text }]}>Slow Connection Detected</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>
        Loading is taking longer than expected. Switch to Lite Mode to load text content first.
      </Text>

      <View style={[styles.liteRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <View style={styles.liteLeft}>
          <Zap size={16} color={theme.gold} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.liteTitle, { color: theme.text }]}>Lite Bandwidth Mode</Text>
            <Text style={[styles.liteSub, { color: theme.textMuted }]}>Defers high-res images</Text>
          </View>
        </View>
        <Switch
          value={liteMode}
          onValueChange={toggleLiteMode}
          trackColor={{ false: theme.border, true: theme.primaryLight }}
          thumbColor={liteMode ? theme.primary : '#F2F4F7'}
        />
      </View>

      {onRetry && (
        <TouchableOpacity activeOpacity={0.85} onPress={onRetry} style={[styles.retryBtn, { borderColor: theme.border }]}>
          <RefreshCw size={13} color={theme.text} />
          <Text style={[styles.retryBtnText, { color: theme.text }]}>Reload Data</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  bannerAction: {
    fontSize: 11,
    fontWeight: '800',
  },
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 26,
    alignItems: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  latencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  latencyText: {
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18,
    maxWidth: 260,
  },
  liteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  liteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  liteTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  liteSub: {
    fontSize: 10,
    marginTop: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
