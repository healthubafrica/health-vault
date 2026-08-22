import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { ChevronRight, Check } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { ServiceCatalogItem } from '@/lib/services';

interface ServiceCardProps {
  service: ServiceCatalogItem;
  width: number;
  onPress: () => void;
  /** Selection mode (used by Book Care step 1) instead of a chevron affordance. */
  selected?: boolean;
}

// Shared by Services Hub and Book Care step 1 — same logo-header card
// design in both places instead of two hand-diverged layouts.
export default function ServiceCard({ service, width, onPress, selected }: ServiceCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const Icon = service.icon;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width,
          backgroundColor: theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}>
      <View style={styles.logoContainer}>
        {service.logo ? (
          <Image source={service.logo} style={styles.logoImage} resizeMode="contain" />
        ) : (
          <View style={[styles.iconPill, { backgroundColor: service.iconBg }]}>
            <Icon size={20} color={service.iconColor} />
          </View>
        )}
      </View>

      <Text style={[styles.tagline, { color: theme.textMuted }]} numberOfLines={2} ellipsizeMode="tail">
        {service.tagline}
      </Text>

      <View style={styles.bottomRow}>
        <View style={[styles.categoryIconPill, { backgroundColor: service.iconBg }]}>
          <Icon size={18} color={service.iconColor} />
        </View>
        {selected !== undefined ? (
          <View
            style={[
              styles.radioCircle,
              { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : 'transparent' },
            ]}>
            {selected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
          </View>
        ) : (
          <ChevronRight size={18} color={theme.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 14,
    minHeight: 165,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  logoContainer: {
    height: 42,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logoImage: {
    width: '100%',
    height: 38,
    alignSelf: 'flex-start',
  },
  iconPill: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  categoryIconPill: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
