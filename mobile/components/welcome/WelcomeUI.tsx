import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

export const welcome = {
  ink: '#183E32', green: '#246B4C', sage: '#E5EDDF', paper: '#F8F7F0',
  muted: '#64756B', line: '#D6DED2', white: '#FFFFFF', lime: '#D9EBAC',
};

// Shared by the entry flow so spacing, brand, and actions stay consistent.
export function Brand({ light = false }: { light?: boolean }) {
  return <View style={styles.brand}>
    <Image source={require('@/assets/images/logo-icon.png')} resizeMode="contain"
      style={[styles.mark, { tintColor: light ? welcome.white : welcome.green }]} />
    <View><Text style={[styles.name, light && { color: welcome.white }]}>MyHealth Vault+</Text>
      <Text style={[styles.byline, light && { color: '#D0E2D0' }]}>BY HEALTH HUB AFRICA</Text></View>
  </View>;
}

export function Action({ label, onPress, light = false, disabled = false, children }: {
  label: string; onPress: () => void; light?: boolean; disabled?: boolean; children?: React.ReactNode;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy: disabled }}
    disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.action, { backgroundColor: light ? welcome.lime : welcome.ink },
      pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }, disabled && { opacity: 0.65 }]}>
    {children || <><Text style={[styles.actionText, light && { color: welcome.ink }]}>{label}</Text>
      <ArrowRight size={20} color={light ? welcome.ink : welcome.white} strokeWidth={1.7} /></>}
  </Pressable>;
}

export function Entrance({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion === null) return;
    const animation = Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 480, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, progress]);
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: { width: 32, height: 36 },
  name: { fontSize: 16, fontWeight: '700', letterSpacing: -0.5, color: welcome.ink },
  byline: { fontSize: 7, fontWeight: '600', letterSpacing: 1.3, marginTop: 3, color: welcome.muted },
  action: { minHeight: 58, borderRadius: 18, paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  actionText: { color: welcome.white, fontSize: 16, fontWeight: '600' },
});
