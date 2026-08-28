import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import BotanicalBackground from '@/components/BotanicalBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AppEntrySplashScreen() {
  const router = useRouter();

  // Subtle pulsing animations for logo emblem and progress indicator
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }),
    ]).start();

    // Auto-advance to onboarding after splash duration
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  const handleManualAdvance = () => {
    router.replace('/onboarding');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Botanical Organic Foliage & Translucent Watermark */}
      <BotanicalBackground showClover={true} opacity={0.88} />

      <SafeAreaView style={styles.contentSafeArea}>
        {/* Centered Brand Emblem and Name */}
        <Animated.View
          style={[
            styles.centerBrandContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          <View style={styles.emblemGlow}>
            <Image
              source={require('@/assets/images/splash-icon.png')}
              style={styles.logoEmblem}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>MyHealth Vault+</Text>
          <Text style={styles.brandTagline}>Health Hub Africa</Text>
        </Animated.View>

        {/* Bottom Loading / Action Buttons */}
        <View style={styles.bottomActionsContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.replace('/onboarding')}
            style={styles.primaryCtaBtn}>
            <Text style={styles.primaryCtaText}>Get Started</Text>
          </TouchableOpacity>

          <View style={styles.secondaryRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace('/login')}>
              <Text style={styles.secondaryLinkText}>Sign In</Text>
            </TouchableOpacity>

            <Text style={{ color: 'rgba(255, 255, 255, 0.4)' }}>•</Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace('/signup')}>
              <Text style={styles.secondaryLinkText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#275E52',
  },
  contentSafeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  centerBrandContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emblemGlow: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmblem: {
    width: 60,
    height: 60,
    tintColor: '#FFFFFF',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  brandTagline: {
    color: '#D0E8D0',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  bottomActionsContainer: {
    width: '100%',
    gap: 14,
    alignItems: 'center',
  },
  primaryCtaBtn: {
    width: '100%',
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryCtaText: {
    color: '#275E52',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryLinkText: {
    color: '#D0E8D0',
    fontSize: 14,
    fontWeight: '600',
  },
});
