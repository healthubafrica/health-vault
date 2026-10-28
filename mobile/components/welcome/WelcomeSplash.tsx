import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Action, welcome as c } from './WelcomeUI';

export default function WelcomeSplash({ loading = false }: { loading?: boolean }) {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [frameHeight, setFrameHeight] = useState(height);
  const compact = frameHeight < 760;
  const tiny = frameHeight < 620;
  const sealSize = Math.min(264, Math.max(132, frameHeight * (tiny ? 0.25 : 0.29)));
  const progress = useRef(new Animated.Value(0)).current;
  const firstLine = useRef(new Animated.Value(0)).current;
  const secondLine = useRef(new Animated.Value(0)).current;
  const details = useRef(new Animated.Value(0)).current;
  const controls = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => { if (mounted) setReduceMotion(value); })
      .catch(() => { if (mounted) setReduceMotion(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      [progress, firstLine, secondLine, details, controls].forEach(value => value.setValue(1));
      [orbit, breath, ripple].forEach(value => value.setValue(0));
      return;
    }
    const reveal = (value: Animated.Value, duration = 420) => Animated.timing(value, {
      toValue: 1, duration, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true, isInteraction: false,
    });
    const entrance = Animated.parallel([
      reveal(progress, 760),
      Animated.sequence([Animated.delay(160), Animated.stagger(130, [
        reveal(firstLine), reveal(secondLine), reveal(details), reveal(controls),
      ])]),
    ]);
    const ambient = Animated.parallel([
      Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true, isInteraction: false })),
      Animated.loop(Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
        Animated.timing(breath, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.delay(800),
        Animated.timing(ripple, { toValue: 1, duration: 3400, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
      ])),
    ]);
    entrance.start();
    ambient.start();
    return () => { entrance.stop(); ambient.stop(); };
  }, [progress, firstLine, secondLine, details, controls, orbit, breath, ripple, reduceMotion]);

  return <View style={styles.screen}>
    <StatusBar barStyle="light-content" backgroundColor={c.ink} />
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.08 }, { translateX: breath.interpolate({ inputRange: [0, 1], outputRange: [-5, 5] }) }] }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
        <Path d="M-105 87C26-46 147-41 271-80" stroke="#37624B" strokeWidth="1" fill="none" />
        <Path d="M-100 112C35-22 162-17 294-60" stroke="#294F3D" strokeWidth="1" fill="none" />
        <Path d="M-90 846C40 665 117 819 297 694C377 639 409 617 478 615L478 950L-90 950Z" fill="#214B39" />
        <Path d="M-73 835C58 657 136 807 310 685C385 633 412 614 463 615" stroke="#789464" strokeOpacity="0.5" strokeWidth="1" fill="none" />
      </Svg>
    </Animated.View>
    <SafeAreaView style={styles.safe}>
      <View style={styles.frame} onLayout={event => setFrameHeight(event.nativeEvent.layout.height)}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, compact && { paddingTop: 12, paddingBottom: 16 }]}>
        <Animated.View style={[styles.hero, compact && { paddingVertical: 8 }, tiny && { paddingVertical: 4 }, { opacity: progress }]}>
          <Animated.View style={[styles.seal, { width: sealSize, height: sealSize, transform: [{ scale: progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.72, 1.035, 1] }) }] }]}>
            <Animated.View pointerEvents="none" style={[styles.ripple, {
              opacity: ripple.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.2, 0] }),
              transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.2] }) }],
            }]} />
            <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Svg width="100%" height="100%" viewBox="0 0 280 280">
                <Path d="M147 24C196 22 247 58 251 110C268 157 237 222 184 242C127 268 53 238 35 187C8 130 33 62 91 39C110 30 126 25 147 24Z" fill="#29543F" />
                <Circle cx="140" cy="139" r="112" stroke="#70966B" strokeOpacity="0.45" strokeWidth="0.8" fill="none" />
                <Path d="M44 205C70 239 111 259 153 253C189 249 220 230 239 202" stroke="#70966B" strokeOpacity="0.6" strokeWidth="1" strokeLinecap="round" fill="none" />
                <Circle cx="35" cy="190" r="3" fill="#9BB884" />
              </Svg>
            </View>
            <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
              <Svg width="100%" height="100%" viewBox="0 0 280 280">
                <Circle cx="140" cy="140" r="124" stroke="#70966B" strokeOpacity="0.22" strokeWidth="0.7" fill="none" />
                <Path d="M140 16A124 124 0 0 1 264 140" stroke={c.lime} strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" fill="none" />
                <Circle cx="264" cy="140" r="3.5" fill={c.lime} />
              </Svg>
            </Animated.View>
            <Animated.View style={{ transform: [
              { translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [1, -5] }) },
              { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
            ] }}>
            <Image source={require('@/assets/images/logo-icon.png')} accessible={false} resizeMode="contain"
              style={[styles.emblem, compact && { width: 100, height: 100 }, tiny && { width: 78, height: 78 }]} />
            </Animated.View>
          </Animated.View>
          <View style={styles.copy}>
            <View accessible accessibilityRole="header" accessibilityLabel="MyHealth Vault+">
              <Animated.Text style={[styles.title, compact && { fontSize: 43, lineHeight: 47 }, tiny && { fontSize: 38, lineHeight: 42 }, {
                opacity: firstLine, transform: [{ translateY: firstLine.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
              }]}>MyHealth</Animated.Text>
              <Animated.Text style={[styles.title, styles.vault, compact && { fontSize: 43, lineHeight: 47 }, tiny && { fontSize: 38, lineHeight: 42 }, {
                opacity: secondLine, transform: [{ translateY: secondLine.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
              }]}>Vault<Text style={styles.plus}>+</Text></Animated.Text>
            </View>
            <Animated.View style={{ alignItems: 'center', opacity: details, transform: [{ translateY: details.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
            <View style={[styles.titleRule, compact && { marginTop: 16, marginBottom: 14 }, tiny && { marginTop: 14, marginBottom: 12 }]} />
            <Text style={[styles.description, compact && { fontSize: 14, lineHeight: 21 }]}>All of your health.{'\n'}Always within reach.</Text>
            </Animated.View>
          </View>
        </Animated.View>
        <Animated.View style={[styles.bottom, { opacity: controls }]}>
          {loading ? <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel="Opening your health vault">
            <View style={styles.loadingIndicator}>
              {reduceMotion === false ? <ActivityIndicator color={c.lime} size="small" /> : <View style={styles.loadingDot} />}
            </View>
            <Text style={styles.loadingText}>Opening your vault</Text>
          </View> : <View style={styles.actions}>
            <Action light label="Get started" onPress={() => router.push('/onboarding')} />
            <Pressable accessibilityRole="button" accessibilityLabel="Sign in" onPress={() => router.push('/login')} style={styles.signIn}>
              <Text style={styles.signInText}>Already have an account? <Text style={styles.signInLink}>Sign in</Text></Text>
            </Pressable>
          </View>}
          <View style={styles.credit}><View style={styles.creditLine} /><Text style={styles.creditText}>BY HEALTH HUB AFRICA</Text><View style={styles.creditLine} /></View>
        </Animated.View>
      </ScrollView>
      </View>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink }, safe: { flex: 1 }, frame: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 30, paddingTop: 24, paddingBottom: 26 },
  hero: { flexGrow: 1, flexShrink: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  seal: { alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ripple: { position: 'absolute', top: '4%', left: '4%', right: '4%', bottom: '4%', borderRadius: 180, borderWidth: 1, borderColor: c.lime },
  emblem: { width: 128, height: 128, tintColor: '#F6F8ED' },
  copy: { alignItems: 'center' },
  title: { color: '#F6F8ED', fontSize: 49, lineHeight: 53, letterSpacing: -2, fontWeight: '500', textAlign: 'center' },
  vault: { fontWeight: '700' }, plus: { color: c.lime },
  titleRule: { width: 28, height: 2, borderRadius: 1, backgroundColor: '#A5BF87', marginTop: 22, marginBottom: 18 },
  description: { color: '#C7D9BD', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  bottom: { paddingTop: 12 }, actions: { width: '100%' },
  signIn: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  signInText: { color: '#C7D9BD', fontSize: 12, textAlign: 'center' }, signInLink: { color: '#F6F8ED', fontWeight: '700' },
  loading: { minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 18 },
  loadingIndicator: { height: 20, justifyContent: 'center', alignItems: 'center' },
  loadingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.lime },
  loadingText: { color: '#C7D9BD', fontSize: 11, letterSpacing: 0.3 },
  credit: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 18 },
  creditText: { color: '#ADC5A1', fontSize: 8, fontWeight: '600', letterSpacing: 2 },
  creditLine: { width: 22, height: StyleSheet.hairlineWidth, backgroundColor: '#5D8057' },
});
