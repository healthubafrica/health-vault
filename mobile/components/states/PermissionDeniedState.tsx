import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lock, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface PermissionDeniedStateProps {
  title?: string;
  message?: string;
  onGoBack?: () => void;
}

// Mobile is patient-only today (no role hierarchy to elevate into), so this
// is a straightforward "you can't be here" state rather than the web
// portal's role-request workflow — kept for parity and for the day a
// subscription-gated or provider-role feature needs it.
export function PermissionDeniedState({
  title = 'Access Restricted',
  message = "You don't have permission to view this.",
  onGoBack,
}: PermissionDeniedStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.status.warning.background }]}>
        <Lock size={26} color={theme.status.warning.text} />
        <View style={[styles.badge, { backgroundColor: theme.emergency }]}>
          <Text style={styles.badgeText}>403</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>

      {onGoBack && (
        <TouchableOpacity activeOpacity={0.8} onPress={onGoBack} style={[styles.backBtn, { borderColor: theme.border }]}>
          <ArrowLeft size={14} color={theme.text} />
          <Text style={[styles.backBtnText, { color: theme.text }]}>Go Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18,
    maxWidth: 260,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
