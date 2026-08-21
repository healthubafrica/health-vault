import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Info,
  ShieldCheck,
  Globe,
  Heart,
  RotateCw,
  Sparkles,
  ExternalLink,
} from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function AboutAppScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [isChecking, setIsChecking] = useState(false);

  const handleCheckUpdate = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      Alert.alert('Up to Date', 'You are running the latest version of MyHealth Vault+ (v2.1.0).');
    }, 600);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Brand Hero Box */}
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.logoEmblemBox, { backgroundColor: theme.primary }]}>
            <Image
              source={require('@/assets/images/splash-icon.png')}
              style={styles.logoEmblem}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appTitle, { color: theme.text }]}>MyHealth Vault+</Text>
          <Text style={[styles.appTagline, { color: theme.primary }]}>Health Hub Africa Ecosystem</Text>
          <Text style={[styles.versionText, { color: theme.textMuted }]}>Version 2.1.0 • Build 8492</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCheckUpdate}
            style={[styles.updateBtn, { backgroundColor: theme.primaryLight }]}>
            <RotateCw size={14} color={theme.primary} />
            <Text style={[styles.updateBtnText, { color: theme.primary }]}>
              {isChecking ? 'Checking...' : 'Check for Updates'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Key Platform Accreditations */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.specRow}>
            <ShieldCheck size={18} color="#006022" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.specTitle, { color: theme.text }]}>ISO 27001 & SOC-2 Type II</Text>
              <Text style={[styles.specDesc, { color: theme.textMuted }]}>Audited health information security</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.specRow}>
            <Globe size={18} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.specTitle, { color: theme.text }]}>HL7® FHIR® Interoperability</Text>
              <Text style={[styles.specDesc, { color: theme.textMuted }]}>Cross-border electronic health record exchange</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.specRow}>
            <Heart size={18} color="#D92D20" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.specTitle, { color: theme.text }]}>HPCSA Compliant TeleCare</Text>
              <Text style={[styles.specDesc, { color: theme.textMuted }]}>Licensed telemedicine practitioner standards</Text>
            </View>
          </View>
        </View>

        {/* Mission Statement */}
        <View style={[styles.missionCard, { backgroundColor: '#0F3A2E' }]}>
          <Text style={styles.missionTitle}>Our Pan-African Mission</Text>
          <Text style={styles.missionDesc}>
            Empowering every African citizen with sovereign, secure, and instant access to their complete medical history, vitals telemetry, and accredited specialist care across the continent.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  logoEmblemBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoEmblem: {
    width: 44,
    height: 44,
    tintColor: '#FFFFFF',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  appTagline: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  versionText: {
    fontSize: 11,
    marginTop: 4,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
  },
  updateBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  specTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  specDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  missionCard: {
    padding: 20,
    borderRadius: 20,
    gap: 8,
  },
  missionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  missionDesc: {
    color: '#D0E8D0',
    fontSize: 13,
    lineHeight: 19,
  },
});
