import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  ShieldCheck,
  Video,
  Activity,
  Ambulance,
  FileText,
  Clock,
  Sparkles,
  Heart,
  UserPlus,
  LogIn,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  stepNumber: number;
  title: string;
  tagline: string;
  description: string;
  badgeLabel: string;
  badgeSub: string;
  iconBg: string;
  iconColor: string;
  icon: any;
}

const FEATURE_SLIDES: OnboardingSlide[] = [
  {
    id: 'slide-1',
    stepNumber: 1,
    title: 'Your Complete Health Vault',
    tagline: 'Records & Vitals',
    description:
      'Store, access, and share your complete medical history, verified lab results, and prescriptions securely in one encrypted place.',
    badgeLabel: 'Vitals: Normal',
    badgeSub: '122/78 mmHg · 72 bpm',
    iconBg: '#EAF5E2',
    iconColor: '#006022',
    icon: Activity,
  },
  {
    id: 'slide-2',
    stepNumber: 2,
    title: 'Instant TeleCare & Doctors',
    tagline: '24/7 Clinical Access',
    description:
      'Connect with certified medical specialists in minutes via secure HD video consultations from the comfort of your home.',
    badgeLabel: 'Dr. Maposa • Live Call',
    badgeSub: 'General Practitioner · Connected',
    iconBg: '#EBF5EC',
    iconColor: '#0E4A30',
    icon: Video,
  },
  {
    id: 'slide-3',
    stepNumber: 3,
    title: 'Rapid Emergency Dispatch',
    tagline: 'DispatchCare Response',
    description:
      'One-tap emergency response with instant access to your emergency medical profile and real-time paramedic GPS tracking.',
    badgeLabel: 'Dispatch ETA: 08:30',
    badgeSub: 'Unit #412 En Route · Cape Town',
    iconBg: '#FDECEA',
    iconColor: '#C0392B',
    icon: Ambulance,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const goToSlide = (nextIndex: number) => {
    if (nextIndex >= 0 && nextIndex < FEATURE_SLIDES.length) {
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < FEATURE_SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      router.push('/signup');
    }
  };

  const handleSkip = () => {
    router.push('/signup');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Top Header: Step Segments & Skip */}
      <View style={styles.topHeader}>
        {/* Step Progress Segments */}
        <View style={styles.segmentRow}>
          {FEATURE_SLIDES.map((_, idx) => {
            const isFilled = idx <= currentIndex;
            return (
              <View
                key={idx}
                style={[
                  styles.segment,
                  {
                    backgroundColor: isFilled ? theme.primary : theme.border,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Action Row */}
        <View style={styles.topActionRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step {currentIndex + 1} of {FEATURE_SLIDES.length}</Text>
          </View>

          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feature Carousel */}
      <FlatList
        ref={flatListRef}
        data={FEATURE_SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          }, 50);
        }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => {
          const IconComponent = item.icon;

          return (
            <View style={styles.slideContainer}>
              {/* Typography Header */}
              <View style={styles.featureHeader}>
                <Text style={[styles.featureTag, { color: theme.primary }]}>
                  {item.tagline.toUpperCase()}
                </Text>
                <Text style={[styles.featureTitle, { color: theme.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.featureDesc, { color: theme.textMuted }]}>
                  {item.description}
                </Text>
              </View>

              {/* Center Vector Illustration Box with Floating Badge */}
              <View style={styles.centerIllustrationBox}>
                <View
                  style={[
                    styles.illustrationCircleOuter,
                    { backgroundColor: theme.primaryLight },
                  ]}>
                  <View
                    style={[
                      styles.illustrationCircleInner,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}>
                    <IconComponent size={64} color={item.iconColor} strokeWidth={1.8} />
                  </View>
                </View>

                {/* Floating Status Pill */}
                <View
                  style={[
                    styles.floatingBadgeCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}>
                  <View style={[styles.floatingBadgeIcon, { backgroundColor: item.iconBg }]}>
                    <Heart size={16} color={item.iconColor} />
                  </View>
                  <View>
                    <Text style={[styles.floatingBadgeTitle, { color: theme.text }]}>
                      {item.badgeLabel}
                    </Text>
                    <Text style={[styles.floatingBadgeSub, { color: theme.textMuted }]}>
                      {item.badgeSub}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom Bar Controls */}
      <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
        {/* Step Indicator Dots */}
        <View style={styles.dotsRow}>
          {FEATURE_SLIDES.map((_, idx) => {
            const isDotActive = currentIndex === idx;
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => goToSlide(idx)}>
                <View
                  style={[
                    styles.dot,
                    isDotActive
                      ? [styles.dotActive, { backgroundColor: theme.primary }]
                      : [styles.dotInactive, { backgroundColor: theme.border }],
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Buttons */}
        {currentIndex === FEATURE_SLIDES.length - 1 ? (
          <View style={styles.finalActionsRow}>
            <TouchableOpacity
              onPress={() => router.push('/signup')}
              activeOpacity={0.8}
              style={[styles.primaryCtaBtn, { backgroundColor: theme.primary }]}>
              <UserPlus size={18} color="#FFFFFF" />
              <Text style={styles.primaryCtaText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
              style={styles.secondaryLinkBtn}>
              <Text style={[styles.secondaryLinkText, { color: theme.textMuted }]}>
                Already have an account?{' '}
                <Text style={{ color: theme.primary, fontWeight: '700' }}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.slideNextRow}>
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.8}
              style={[styles.primaryCtaBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.primaryCtaText}>Next</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
              style={styles.secondaryLinkBtn}>
              <Text style={[styles.secondaryLinkText, { color: theme.textMuted }]}>
                Already have an account?{' '}
                <Text style={{ color: theme.primary, fontWeight: '700' }}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBadge: {
    backgroundColor: '#EAF5E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    color: '#006022',
    fontSize: 11,
    fontWeight: '700',
  },
  skipBtn: {
    padding: 6,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  featureHeader: {
    paddingTop: 10,
    marginBottom: 16,
  },
  featureTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  featureTitle: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  featureDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  centerIllustrationBox: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: SCREEN_HEIGHT * 0.38,
    marginVertical: 10,
  },
  illustrationCircleOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationCircleInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  floatingBadgeCard: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  floatingBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBadgeTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  floatingBadgeSub: {
    fontSize: 10,
    marginTop: 1,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
  },
  dotInactive: {
    width: 6,
  },
  slideNextRow: {
    gap: 10,
  },
  finalActionsRow: {
    gap: 10,
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryLinkBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  secondaryLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
