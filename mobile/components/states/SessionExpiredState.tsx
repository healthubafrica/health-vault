import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lock, LogIn } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface SessionExpiredStateProps {
  /**
   * Mobile has no in-place passcode-unlock flow (unlike the web portal's
   * modal) — a cleared token means a real re-login via /auth/login, so this
   * just points at that instead of faking a reauth form with nothing behind
   * it.
   */
  onLoginAgain: () => void;
}

export function SessionExpiredState({ onLoginAgain }: SessionExpiredStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.status.warning.background }]}>
        <Lock size={28} color={theme.status.warning.text} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>Session Expired</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>
        For your security, you've been signed out. Please sign in again to continue.
      </Text>

      <TouchableOpacity activeOpacity={0.85} onPress={onLoginAgain} style={[styles.loginBtn, { backgroundColor: theme.primary }]}>
        <LogIn size={15} color="#FFFFFF" />
        <Text style={styles.loginBtnText}>Sign In Again</Text>
      </TouchableOpacity>
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
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
