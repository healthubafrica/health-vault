import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Check, ShieldCheck, Sparkles } from 'lucide-react-native';
import { welcome as c } from './WelcomeUI';

export default function PasswordResetSuccess() {
  const { width, height } = useWindowDimensions();
  const compact = height < 680;
  const size = Math.min(compact ? 170 : 240, Math.max(compact ? 128 : 160, height * (compact ? 0.21 : 0.26)), width - 80);
  // Start static until the system preference is known; never flash an animation
  // for someone who has requested reduced motion.
  const [reduceMotion, setReduceMotion] = useState(true);
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => { if (mounted) setReduceMotion(value); })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  const animate = !reduceMotion && !imageFailed;
  return <View style={[styles.content, compact && { paddingVertical: 4 }]}>
    <View style={[styles.artwork, { width: size, height: size }, compact && { marginBottom: 12 }]} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.orbit} />
      <View style={styles.halo} />
      <View style={[styles.imageDisc, { width: size * 0.78, height: size * 0.78, borderRadius: size }]}>
        {(!animate || !imageReady) && <View style={styles.staticIcon}><ShieldCheck size={size * 0.37} color={c.green} strokeWidth={1.35} /></View>}
        {animate && <Image source={require('@/assets/lottie/security.gif')} resizeMode="contain"
          accessibilityIgnoresInvertColors accessible={false} fadeDuration={0}
          onLoad={() => setImageReady(true)} onError={() => setImageFailed(true)}
          style={{ width: size * 0.72, height: size * 0.72, opacity: imageReady ? 1 : 0 }} />}
      </View>
      <View style={styles.sparkle}><Sparkles size={23} color={c.green} strokeWidth={1.4} /></View>
      <View style={styles.dot} />
      <View style={styles.smallDot} />
      <View style={styles.badge}><Check size={24} color={c.white} strokeWidth={2.3} /></View>
    </View>
    <Text style={[styles.eyebrow, compact && { marginBottom: 10 }]}>YOU’RE ALL SET</Text>
    <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[styles.title, compact && { fontSize: 36, lineHeight: 40 }]}>Password{'\n'}updated.</Text>
    <Text style={[styles.description, compact && { fontSize: 13, lineHeight: 21, marginTop: 12 }]}>Your new password is ready.{'\n'}Let’s get you back to your vault.</Text>
  </View>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, flexShrink: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  artwork: { alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  orbit: { position: 'absolute', top: '3%', left: '3%', right: '3%', bottom: '3%', borderRadius: 150, borderWidth: 1, borderColor: '#D5E0CC' },
  halo: { position: 'absolute', top: '10%', left: '5%', right: '5%', bottom: '0%', borderRadius: 150, backgroundColor: c.sage, transform: [{ rotate: '-12deg' }] },
  imageDisc: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#FBFBFB' },
  staticIcon: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', top: '5%', right: '2%', backgroundColor: c.paper, padding: 5, borderRadius: 20 },
  dot: { position: 'absolute', top: '12%', left: '8%', width: 13, height: 13, borderRadius: 7, backgroundColor: c.lime, borderWidth: 3, borderColor: c.paper },
  smallDot: { position: 'absolute', bottom: '13%', left: '1%', width: 6, height: 6, borderRadius: 3, backgroundColor: '#8EAD7B' },
  badge: { position: 'absolute', bottom: '3%', right: '4%', width: 50, height: 50, borderRadius: 25, backgroundColor: c.green, borderWidth: 5, borderColor: c.paper, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: '700', color: c.green, marginBottom: 14 },
  title: { color: c.ink, fontSize: 43, lineHeight: 48, fontWeight: '500', fontStyle: 'italic', letterSpacing: -1.8, textAlign: 'center' },
  description: { color: c.muted, fontSize: 14, lineHeight: 23, textAlign: 'center', marginTop: 18 },
});
