import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { FileText, Pill, CreditCard, Activity } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from './StatusPill';

interface ActivityCardProps {
  icon?: 'file-text' | 'pill' | 'credit-card' | string;
  iconBg?: string;
  iconColor?: string;
  title: string;
  meta: string;
  status: string;
  statusLabel?: string;
  onPress?: () => void;
}

export default function ActivityCard({
  icon = 'file-text',
  iconBg,
  iconColor,
  title,
  meta,
  status,
  statusLabel,
  onPress,
}: ActivityCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const renderIcon = () => {
    const resolvedColor = iconColor ?? theme.primary;
    switch (icon) {
      case 'file-text':
        return <FileText size={18} color={resolvedColor} />;
      case 'pill':
        return <Pill size={18} color={resolvedColor} />;
      case 'credit-card':
        return <CreditCard size={18} color={resolvedColor} />;
      default:
        return <Activity size={18} color={resolvedColor} />;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.iconWrapper, { backgroundColor: iconBg ?? theme.primaryLight }]}>
        {renderIcon()}
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: theme.textMuted }]}>
          {meta}
        </Text>
      </View>
      <StatusPill status={status} label={statusLabel} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  meta: {
    fontSize: 11,
    marginTop: 2,
  },
});
