import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Inbox, Plus, type LucideIcon } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** 'card' — standalone centered block. 'inline' — compact row, e.g. inside a list header. */
  variant?: 'card' | 'inline';
}

export function EmptyState({
  title = 'No records found',
  description = 'There are no items to display right now.',
  icon: Icon = Inbox,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'card',
}: EmptyStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  if (variant === 'inline') {
    return (
      <View style={[styles.inlineContainer, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <View style={styles.inlineLeft}>
          <View style={[styles.iconBoxSm, { backgroundColor: theme.primaryLight }]}>
            <Icon size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.inlineTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.inlineDesc, { color: theme.textMuted }]} numberOfLines={1}>{description}</Text>
          </View>
        </View>
        {onPrimaryAction && (
          <TouchableOpacity activeOpacity={0.8} onPress={onPrimaryAction} style={[styles.smallBtn, { backgroundColor: theme.primary }]}>
            <Plus size={13} color="#FFFFFF" />
            <Text style={styles.smallBtnText}>{primaryActionLabel ?? 'Add'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
        <Icon size={28} color={theme.primary} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.desc, { color: theme.textMuted }]}>{description}</Text>

      {(onPrimaryAction || onSecondaryAction) && (
        <View style={styles.actionsRow}>
          {onSecondaryAction && secondaryActionLabel && (
            <TouchableOpacity activeOpacity={0.8} onPress={onSecondaryAction} style={[styles.btn, styles.secondaryBtn, { borderColor: theme.border }]}>
              <Text style={[styles.btnText, { color: theme.text }]}>{secondaryActionLabel}</Text>
            </TouchableOpacity>
          )}
          {onPrimaryAction && primaryActionLabel && (
            <TouchableOpacity activeOpacity={0.8} onPress={onPrimaryAction} style={[styles.btn, { backgroundColor: theme.primary }]}>
              <Plus size={14} color="#FFFFFF" />
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{primaryActionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  desc: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryBtn: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  inlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBoxSm: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  inlineDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  smallBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
