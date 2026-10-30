import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Shield,
  Lock,
  Eye,
  FileCheck2,
  Trash2,
  Download,
} from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back"
          style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* NDPA Pill */}
        <View style={[styles.popiaPill, { backgroundColor: theme.status.success.background, borderColor: theme.status.success.border }]}>
          <Shield size={18} color={theme.status.success.text} />
          <Text style={[styles.popiaPillText, { color: theme.status.success.text }]}>Protected under the Nigeria Data Protection Act 2023</Text>
        </View>

        {/* Section 1 */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>1. Special Personal Health Information</Text>
          <Text style={[styles.paragraph, { color: theme.textMuted }]}>
            Health Hub Africa processes special categories of personal data, including diagnostic lab reports, biometric vitals (blood pressure, pulse, SpO₂), HMO and health insurance identifiers, and clinician consultation notes.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>2. Purpose of Data Processing</Text>
          <Text style={[styles.paragraph, { color: theme.textMuted }]}>
            Your health records are processed strictly to deliver continuous patient care, facilitate remote clinical consultations, provide emergency paramedic triage, and process HMO and insurance claims. We never sell, monetize, or disclose your health data to advertising brokers.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>3. Data Subject Rights</Text>
          <Text style={[styles.paragraph, { color: theme.textMuted }]}>
            Under the Nigeria Data Protection Act 2023, you have the right to request a copy of your health records, withdraw sharing access you have granted at any time, and delete your account. Deleting your account deactivates it; your health records are retained as required for clinical record-keeping.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>4. Information Officer Contact</Text>
          <Text style={[styles.paragraph, { color: theme.textMuted }]}>
            For questions regarding privacy, data protection, or access requests, contact our designated Data Protection Officer at privacy@healthhub.africa.
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
    gap: 14,
  },
  popiaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  popiaPillText: {
    color: '#006022',
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
  },
});
