import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  FileText,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function TermsConditionsScreen() {
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
          onPress={() => router.back()}
          style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Terms & Conditions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Version Badge */}
        <View style={[styles.versionBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <FileText size={16} color={theme.primary} />
          <Text style={[styles.versionText, { color: theme.textMuted }]}>
            Terms of Service Version 2.1.0 • Effective March 2025
          </Text>
        </View>

        {/* Section 1 */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>1. Clinical Telehealth Services</Text>
          <Text style={[styles.paragraph, { color: theme.textMuted }]}>
            MyHealth Vault+ provides secure audiovisual telecommunication facilitating remote medical consultations between registered patients and accredited healthcare practitioners licensed under the Health Professions Council of South Africa (HPCSA).
          </Text>
          <Text style={[styles.paragraph, { color: theme.textMuted }]}>
            Telemedicine does not replace comprehensive physical in-clinic examinations for urgent or acute conditions. In the event of a life-threatening crisis, patients must immediately utilize the in-app SOS paramedic beacon or dial 10177.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>2. Electronic Prescriptions & Pharmacy Dispensing</Text>
          <Text style={[styles.paragraph, { color: theme.textMuted }]}>
            Digital prescriptions generated through our platform comply with the Medicines and Related Substances Act. Prescriptions are cryptographically signed by registered practitioners and routed exclusively to certified dispensing pharmacies.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>3. Encrypted Health Data & POPIA Compliance</Text>
          <Text style={[styles.paragraph, { color: theme.textMuted }]}>
            Your health records, lab reports, and vitals are encrypted client-side using AES-256 standards in full adherence with the Protection of Personal Information Act (POPIA No. 4 of 2013). You retain full ownership and discretion over sharing permissions.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>4. Medical Scheme Claims & Billing</Text>
          <Text style={[styles.paragraph, { color: theme.textMuted }]}>
            Health Hub Africa processes direct electronic billing submissions to affiliated medical schemes. Any balance not settled or rejected by your scheme remains the financial responsibility of the principal member.
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
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
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
