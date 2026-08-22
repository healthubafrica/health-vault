import React, { useEffect } from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width = '100%', height = 14, borderRadius = 8, style }: SkeletonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: theme.border }, animatedStyle, style]}
    />
  );
}

export function CardSkeleton() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.row}>
        <Skeleton width={48} height={48} borderRadius={16} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={11} />
        </View>
      </View>
      <Skeleton width="100%" height={70} borderRadius={14} style={{ marginTop: 12 }} />
    </View>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.listRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
          <Skeleton width={36} height={36} borderRadius={12} />
          <Skeleton width="55%" height={12} />
          <Skeleton width={50} height={18} borderRadius={9} style={{ marginLeft: 'auto' }} />
        </View>
      ))}
    </View>
  );
}

export function ProfileSkeleton() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  return (
    <View style={[styles.card, styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Skeleton width={88} height={88} borderRadius={44} />
      <Skeleton width={160} height={18} style={{ marginTop: 14 }} />
      <Skeleton width={110} height={11} style={{ marginTop: 8 }} />
      <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
        <Skeleton width="30%" height={48} borderRadius={12} />
        <Skeleton width="30%" height={48} borderRadius={12} />
        <Skeleton width="30%" height={48} borderRadius={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});
