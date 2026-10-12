import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Clock, Video, MapPin } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from './StatusPill';
import Avatar from './Avatar';

interface AppointmentCardProps {
  providerName: string;
  specialty?: string;
  time: string;
  type?: 'TeleCare' | 'In-Person' | string;
  status?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  /** Provider photo, when the API provides one. */
  photoUri?: string | null;
}

export default function AppointmentCard({
  providerName,
  specialty,
  time,
  type = 'TeleCare',
  status = 'confirmed',
  actionLabel = 'Join Call',
  onActionPress,
  photoUri,
}: AppointmentCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isTele = type === 'TeleCare';

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.topRow}>
        {/* Avatar */}
        <Avatar uri={photoUri} name={providerName} size={44} />

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
              {providerName}
            </Text>
            <StatusPill status={status} />
          </View>
          {specialty ? <Text style={[styles.specialty, { color: theme.textMuted }]}>{specialty}</Text> : null}

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={13} color={theme.textMuted} />
              <Text style={[styles.metaText, { color: theme.textMuted }]}>{time}</Text>
            </View>
            <View style={styles.metaItem}>
              {isTele ? (
                <Video size={13} color={theme.primary} />
              ) : (
                <MapPin size={13} color={theme.textMuted} />
              )}
              <Text
                style={[
                  styles.metaText,
                  { color: isTele ? theme.primary : theme.textMuted, fontWeight: isTele ? '600' : '400' },
                ]}>
                {type}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onActionPress}
        style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
        <Text style={styles.actionBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  specialty: {
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  actionBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
