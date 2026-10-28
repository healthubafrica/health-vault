import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, Folder, Home, LayoutGrid, User, Video, type LucideIcon } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const icons: Record<string, LucideIcon> = {
  index: Home, vitals: Activity, services: LayoutGrid, 'services-hub': LayoutGrid,
  records: Folder, telecare: Video, profile: User,
};
const labels: Record<string, string> = {
  index: 'Home', vitals: 'Vitals', services: 'Services', 'services-hub': 'Services',
  records: 'Records', telecare: 'TeleCare', profile: 'Profile',
};

/** Inactive destinations stay circular; the current destination expands to reveal its label. */
export default function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
  const [width, setWidth] = useState(390);
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={[styles.surface, { backgroundColor: theme.surface, borderTopColor: theme.border,
      paddingBottom: Math.max(insets.bottom, 8), paddingLeft: insets.left, paddingRight: insets.right }]}>
    <View style={[styles.row, { paddingHorizontal: width < 370 ? 8 : 12, gap: width < 370 ? 0 : 4 }]}>
      {state.routes.map((route, index) => {
        const options = descriptors[route.key].options;
        if ((options as typeof options & { href?: string | null }).href === null) return null;
        const focused = state.index === index;
        const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? labels[route.name] ?? route.name;
        return <TabPill key={route.key} focused={focused} label={label} Icon={icons[route.name] ?? Home}
          compact={width < 350} reduceMotion={reduceMotion} dark={scheme === 'dark'}
          accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
          onPress={() => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          }}
          onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })} />;
      })}
    </View>
  </View>;
}

function TabPill({ focused, label, Icon, compact, reduceMotion, dark, accessibilityLabel, onPress, onLongPress }: {
  focused: boolean; label: string; Icon: LucideIcon; compact: boolean; reduceMotion: boolean;
  dark: boolean; accessibilityLabel: string; onPress: () => void; onLongPress: () => void;
}) {
  const focus = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(focus, {
      toValue: focused ? 1 : 0, duration: reduceMotion ? 0 : 240,
      easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [focused, reduceMotion, focus]);

  return <Animated.View style={[styles.slot, { flexGrow: focus }]}>
    <Pressable accessibilityRole="tab" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected: focused }} aria-selected={focused}
      onPress={onPress} onLongPress={onLongPress}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.78 }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: focus }]}>
        <LinearGradient colors={['#238345', '#0E4A30']} start={{ x: 0.25, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.gradient} />
      </Animated.View>
      <View style={styles.iconSlot} pointerEvents="none">
        <Animated.View style={[styles.disc, {
          width: compact ? 36 : 44, height: compact ? 36 : 44,
          backgroundColor: focus.interpolate({ inputRange: [0, 1], outputRange: [dark ? '#253525' : '#F3F5F2', '#FFFFFF'] }),
          transform: [
            { translateX: focus.interpolate({ inputRange: [0, 1], outputRange: [0, compact ? 2 : 4] }) },
            { scale: focus.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
          ],
        }]}>
          <Icon size={compact ? 20 : 22} color={focused ? '#137333' : dark ? '#A8B7AA' : '#79847D'} strokeWidth={focused ? 2.3 : 1.9} />
        </Animated.View>
      </View>
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.labelSlot, { left: compact ? 39 : 53, right: compact ? 1 : 7, opacity: focus,
          transform: [{ translateX: focus.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.label, compact && { fontSize: 10.5 }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  </Animated.View>;
}

const styles = StyleSheet.create({
  surface: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth, zIndex: 9999 },
  row: { flexDirection: 'row', alignItems: 'center', height: 72, paddingVertical: 8, width: '100%' },
  slot: { flexBasis: 44, flexShrink: 0, minWidth: 44, height: 56, overflow: 'hidden', borderRadius: 28 },
  button: { flex: 1, borderRadius: 28, justifyContent: 'center', overflow: 'hidden' },
  gradient: { flex: 1, borderRadius: 28 },
  iconSlot: { width: 44, height: 56, alignItems: 'center', justifyContent: 'center' },
  disc: { borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  labelSlot: { position: 'absolute', right: 7, top: 0, bottom: 0, justifyContent: 'center' },
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
});
