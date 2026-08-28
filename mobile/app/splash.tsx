import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import BotanicalBackground from '@/components/BotanicalBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Botanical Organic Foliage & Watermark Artwork */}
      <BotanicalBackground showClover={true} opacity={0.9} />

      <SafeAreaView style={styles.contentSafeArea}>
        {/* Centered Brand Emblem and Name */}
        <View style={styles.centerBrandContainer}>
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={styles.logoEmblem}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>MyHealth Vault+</Text>
          <Text style={styles.brandTagline}>Health Hub Africa</Text>
        </View>

        {/* Bottom Navigation CTA */}
        <View style={styles.bottomCtaContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/login')}
            style={styles.loginBtn}>
            <Text style={styles.loginBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/onboarding')}
            style={styles.exploreBtn}>
            <Text style={styles.exploreBtnText}>Get Started</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  centerBrandContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoEmblem: {
    width: 68,
    height: 68,
    tintColor: '#FFFFFF',
    marginBottom: 12,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  brandTagline: {
    color: '#D0E8D0',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bottomCtaContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  loginBtn: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnText: {
    color: '#275E52',
    fontSize: 16,
    fontWeight: '800',
  },
  exploreBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
