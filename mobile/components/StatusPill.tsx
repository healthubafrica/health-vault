import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export type StatusType =
  | 'confirmed'
  | 'ready'
  | 'amber'
  | 'green'
  | 'red'
  | 'warning'
  | 'error'
  | 'pending'
  | 'success'
  | 'paid'
  | 'new';

interface StatusPillProps {
  status: StatusType | string;
  label?: string;
}

export default function StatusPill({ status, label }: StatusPillProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const getStyle = () => {
    switch (status) {
      case 'confirmed':
      case 'ready':
      case 'success':
      case 'green':
      case 'paid':
        return {
          bg: theme.status.success.background,
          text: theme.status.success.text,
          defaultLabel: status === 'paid' ? 'Paid' : status === 'ready' ? 'Ready' : 'Normal',
        };
      case 'amber':
      case 'warning':
      case 'pending':
        return {
          bg: theme.status.warning.background,
          text: theme.status.warning.text,
          defaultLabel: status === 'pending' ? 'Pending' : 'Elevated',
        };
      case 'red':
      case 'error':
        return {
          bg: theme.status.error.background,
          text: theme.status.error.text,
          defaultLabel: 'High',
        };
      default:
        return {
          bg: theme.primaryLight,
          text: theme.primary,
          defaultLabel: status,
        };
    }
  };

  const { bg, text, defaultLabel } = getStyle();

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label || defaultLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
