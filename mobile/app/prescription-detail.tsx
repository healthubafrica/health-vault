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
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  MoreVertical,
  ChevronRight,
  Phone,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import EmergencyFAB from '@/components/EmergencyFAB';

export default function PrescriptionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const rxName = (params.name as string) || 'Metformin 500mg';
  const rxDosage = (params.dosage as string) || '1 tablet twice daily';
  const rxProvider = (params.provider as string) || 'Dr. T. Mahlangu';
  const rxStatus = ((params.status as string) || 'due') as 'due' | 'active';
  const rxIndication = (params.indication as string) || 'Type 2 Diabetes Management';
  const rxPrescribedDate = (params.prescribedDate as string) || '10 Mar 2025';
  const rxStartDate = (params.startDate as string) || '01 Mar 2025';
  const rxExpiryDate = (params.expiryDate as string) || '01 Sep 2025';
  const rxRefillsLeft = parseInt((params.refillsLeft as string) || (rxStatus === 'due' ? '0' : '2'), 10);
  const rxTotalRefills = 3;
  const rxInstructions =
    (params.instructions as string) ||
    'Take with meals. Avoid alcohol. Monitor blood glucose regularly.';
  const rxSideEffects =
    (params.sideEffects as string) ||
    'Nausea, diarrhea, headache (common and usually resolve)';
  const rxPharmacy = (params.pharmacy as string) || 'Clicks Pharmacy - Midrand';
  const rxWarnings =
    'May cause vitamin B12 deficiency with long-term use. Annual B12 testing recommended.';

  const handleRequestRefill = () => {
    Alert.alert(
      'Refill Requested',
      `Your refill request for ${rxName} has been submitted to ${rxPharmacy} and ${rxProvider}.`
    );
  };

  const handleContactProvider = () => {
    Alert.alert('Contact Clinician', `Connecting you to ${rxProvider}...`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start TeleCare', onPress: () => router.push('/(tabs)/telecare') },
    ]);
  };

  const progressPercent = Math.min(100, Math.max(0, (rxRefillsLeft / rxTotalRefills) * 100));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>Prescription</Text>

        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
          <MoreVertical size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Medication Main Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderInfo}>
              <Text style={[styles.rxTitle, { color: theme.text }]}>{rxName}</Text>
              <Text style={[styles.indicationText, { color: theme.textMuted }]}>{rxIndication}</Text>
            </View>
            <StatusPill
              status={rxStatus === 'due' ? 'amber' : 'green'}
              label={rxStatus === 'due' ? 'Refill Due' : 'Active'}
            />
          </View>

          <View style={[styles.metaTable, { borderTopColor: theme.border }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>DOSAGE</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{rxDosage}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>PRESCRIBED BY</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{rxProvider}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>PRESCRIBED DATE</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{rxPrescribedDate}</Text>
            </View>
          </View>
        </View>

        {/* Refill Status */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>REFILL STATUS</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.refillRow}>
              <Text style={[styles.refillLabel, { color: theme.text }]}>Refills Remaining</Text>
              <Text style={[styles.refillValue, { color: theme.text }]}>
                {rxRefillsLeft}/{rxTotalRefills}
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: rxRefillsLeft === 0 ? '#E8930A' : theme.primary,
                  },
                ]}
              />
            </View>

            <Text style={[styles.refillHint, { color: theme.textMuted }]}>
              {rxRefillsLeft === 0
                ? 'No refills remaining. Contact your provider to renew.'
                : `${rxRefillsLeft} refill${rxRefillsLeft > 1 ? 's' : ''} available`}
            </Text>
          </View>
        </View>

        {/* Coverage Dates */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>COVERAGE DATES</Text>
          <View style={styles.infoCardsList}>
            <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>START DATE</Text>
              <Text style={[styles.infoCardValue, { color: theme.text }]}>{rxStartDate}</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>EXPIRY DATE</Text>
              <Text style={[styles.infoCardValue, { color: theme.text }]}>{rxExpiryDate}</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>INSTRUCTIONS</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.bodyText, { color: theme.text }]}>{rxInstructions}</Text>
          </View>
        </View>

        {/* Side Effects */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>POSSIBLE SIDE EFFECTS</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.bodyText, { color: theme.text }]}>{rxSideEffects}</Text>
          </View>
        </View>

        {/* Important Warnings */}
        {rxWarnings && (
          <View style={styles.section}>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>IMPORTANT WARNINGS</Text>
            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: theme.status.warning.background,
                  borderColor: theme.status.warning.border,
                },
              ]}>
              <Text style={[styles.warningText, { color: theme.status.warning.text }]}>
                {rxWarnings}
              </Text>
            </View>
          </View>
        )}

        {/* Pharmacy */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>PHARMACY</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.pharmacyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.pharmacyName, { color: theme.text }]}>{rxPharmacy}</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          {rxStatus === 'due' && (
            <TouchableOpacity
              onPress={handleRequestRefill}
              activeOpacity={0.85}
              style={[
                styles.refillActionBtn,
                {
                  backgroundColor: theme.status.warning.background,
                  borderColor: theme.status.warning.border,
                },
              ]}>
              <Text style={[styles.refillActionText, { color: theme.status.warning.text }]}>
                Request Refill
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleContactProvider}
            activeOpacity={0.85}
            style={[styles.contactBtn, { backgroundColor: theme.primaryLight }]}>
            <Phone size={18} color={theme.primary} />
            <Text style={[styles.contactBtnText, { color: theme.primaryDark }]}>Contact Provider</Text>
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
  moreBtn: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  rxTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  indicationText: {
    fontSize: 13,
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
  refillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refillLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  refillValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  refillHint: {
    fontSize: 12,
  },
  infoCardsList: {
    gap: 8,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  warningBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  pharmacyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  pharmacyName: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionGroup: {
    gap: 10,
    marginTop: 8,
  },
  refillActionBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  refillActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  contactBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
