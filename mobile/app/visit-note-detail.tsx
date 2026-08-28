import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Share2,
  Download,
  Calendar,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import EmergencyFAB from '@/components/EmergencyFAB';

export default function VisitNoteDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const noteType = (params.type as string) || 'After-Visit Summary';
  const noteDate = (params.date as string) || '14 Jul 2025';
  const noteProvider = (params.provider as string) || 'Dr. Naledi Dlamini';
  const noteSummary = (params.summary as string) || 'Follow-up for hypertension management';
  const facility = 'Medi Health Clinic - Midrand';
  const visitType = 'TeleCare (Virtual)';
  const followUpDate = '14 Oct 2025';

  const findings = [
    'Vital Signs: BP 124/80 mmHg, HR 72 bpm, RR 16/min',
    'Physical Exam: Patient alert and oriented, no acute distress',
    'Lab Review: Full Blood Panel from 14 Jul 2025 within normal limits',
  ];

  const medications = [
    'Lisinopril 10mg - continue once daily',
    'Metformin 500mg - continue twice daily',
  ];

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${noteType} - ${noteDate}`,
        message: `Clinical Encounter Summary: ${noteType} with ${noteProvider} on ${noteDate}. Secured via MyHealth Vault+.`,
      });
    } catch {}
  };

  const handleDownload = () => {
    Alert.alert('Download Note', `Downloading official signed clinical summary from ${noteProvider}.`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>Visit Note</Text>

        <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.7}>
          <Share2 size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Visit Header Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{noteType}</Text>
            <Text style={[styles.cardFacility, { color: theme.textMuted }]}>{facility}</Text>
          </View>

          <View style={[styles.metaTable, { borderTopColor: theme.border }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>PROVIDER</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{noteProvider}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>DATE & TIME</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{noteDate} at 2:45 PM</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>VISIT TYPE</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{visitType}</Text>
            </View>
          </View>
        </View>

        {/* Chief Complaint */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>CHIEF COMPLAINT</Text>
          <Text style={[styles.bodyText, { color: theme.text }]}>{noteSummary}</Text>
        </View>

        {/* Assessment */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>ASSESSMENT</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.bodyText, { color: theme.text }]}>
              Patient presents for routine follow-up of hypertension. BP readings have been stable over the past month, averaging 128/82 mmHg. Patient reports good compliance with medication.
            </Text>
          </View>
        </View>

        {/* Clinical Findings */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>CLINICAL FINDINGS</Text>
          <View style={styles.findingsList}>
            {findings.map((finding, idx) => (
              <View
                key={idx}
                style={[styles.findingItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.bulletDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.findingText, { color: theme.text }]}>{finding}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Current Medications */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>CURRENT MEDICATIONS</Text>
          <View style={styles.medsList}>
            {medications.map((med, idx) => (
              <View
                key={idx}
                style={[styles.medCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.medName, { color: theme.text }]}>{med}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Treatment Plan & Follow-Up */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>TREATMENT PLAN</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 14 }]}>
            <Text style={[styles.bodyText, { color: theme.text }]}>
              Continue current medications. Schedule follow-up appointment in 3 months. Patient advised to maintain sodium-restricted diet and regular exercise. Provided with blood pressure tracking app recommendation.
            </Text>
          </View>

          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>FOLLOW-UP</Text>
          <View style={[styles.followUpCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
            <Text style={[styles.followUpText, { color: theme.primaryDark }]}>
              Next appointment scheduled for <Text style={{ fontWeight: '800' }}>{followUpDate}</Text>
            </Text>
          </View>

          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>NEXT STEPS</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.bodyText, { color: theme.text }]}>
              Monitor BP weekly. Report any unusual symptoms. Contact clinic if BP exceeds 140/90 mmHg.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={handleDownload}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Download size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Download Note</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/telecare')}
            activeOpacity={0.85}
            style={[styles.secondaryBtn, { backgroundColor: theme.primaryLight }]}>
            <Calendar size={18} color={theme.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.primaryDark }]}>Schedule Follow-up</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Emergency FAB */}
      <EmergencyFAB />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  shareBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTop: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  cardFacility: {
    fontSize: 12,
    marginTop: 2,
  },
  metaTable: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  findingsList: {
    gap: 8,
  },
  findingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  findingText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  medsList: {
    gap: 8,
  },
  medCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  medName: {
    fontSize: 14,
    fontWeight: '600',
  },
  followUpCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  followUpText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionGroup: {
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
