import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, ArrowRight } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface SuccessStateProps {
  title?: string;
  message?: string;
  referenceId?: string;
  details?: { label: string; value: string }[];
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function SuccessState({
  title = 'Success!',
  message = 'Your request has been completed.',
  referenceId,
  details = [],
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: SuccessStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.status.success.solid + '4D' }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.status.success.background }]}>
        <CheckCircle2 size={32} color={theme.status.success.solid} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>

      {referenceId && (
        <View style={[styles.refChip, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.refLabel, { color: theme.textMuted }]}>REF: </Text>
          <Text selectable style={[styles.refValue, { color: theme.text }]}>{referenceId}</Text>
        </View>
      )}

      {details.length > 0 && (
        <View style={[styles.detailsBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          {details.map((item) => (
            <View key={item.label} style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>{item.label}</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}

      {(onPrimaryAction || onSecondaryAction) && (
        <View style={styles.actionsRow}>
          {onSecondaryAction && secondaryActionLabel && (
            <TouchableOpacity activeOpacity={0.8} onPress={onSecondaryAction} style={[styles.btn, styles.secondaryBtn, { borderColor: theme.border }]}>
              <Text style={[styles.btnText, { color: theme.text }]}>{secondaryActionLabel}</Text>
            </TouchableOpacity>
          )}
          {onPrimaryAction && primaryActionLabel && (
            <TouchableOpacity activeOpacity={0.8} onPress={onPrimaryAction} style={[styles.btn, { backgroundColor: theme.primary }]}>
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{primaryActionLabel}</Text>
              <ArrowRight size={13} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}
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
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 260,
  },
  refChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  refLabel: {
    fontSize: 11,
  },
  refValue: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  detailsBox: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryBtn: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
