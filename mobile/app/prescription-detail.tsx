import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { records, ApiError } from '@/lib/api';
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

  const rxName = (params.name as string) || 'Prescription';
  const rxDosage = (params.dosage as string) || '';
  const rxProvider = (params.provider as string) || '';
  const rxId = (params.id as string) || '';
  const rxStatus = ((params.status as string) || 'active') as 'due' | 'active' | 'expired';
  const rxPrescribedDate = (params.prescribedDate as string) || '';
  const rxExpiryDate = (params.expiryDate as string) || '';
  const rxRoute = (params.route as string) || '';
  const rxRefillsLeft = parseInt((params.refillsLeft as string) || '0', 10);
  const rxNotes = (params.notes as string) || '';

  const refill = useMutation({
    mutationFn: () => records.requestRefill(rxId),
    onSuccess: (res) =>
      Alert.alert(
        res.alreadyRequested ? 'Already requested' : 'Refill requested',
        res.alreadyRequested
          ? 'Your care team already has a refill request for this prescription.'
          : 'Your care team will review it and get back to you.',
      ),
    onError: (err: unknown) =>
      Alert.alert('Could not send the request', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  // Booking a consultation is the fallback route to a renewal.
  const handleContactProvider = () => {
    router.push('/book-appointment-step1');
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>Prescription</Text>

        <View style={styles.moreBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Medication Main Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderInfo}>
              <Text style={[styles.rxTitle, { color: theme.text }]}>{rxName}</Text>
              {rxRoute ? <Text style={[styles.indicationText, { color: theme.textMuted }]}>Route: {rxRoute}</Text> : null}
            </View>
            <StatusPill
              status={rxStatus === 'expired' ? 'red' : rxStatus === 'due' ? 'amber' : 'green'}
              label={rxStatus === 'expired' ? 'Expired' : rxStatus === 'due' ? 'Refill Due' : 'Active'}
            />
          </View>

          <View style={[styles.metaTable, { borderTopColor: theme.border }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>DOSAGE</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{rxDosage}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>PRESCRIBED BY</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{rxProvider || 'Not recorded'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>PRESCRIBED DATE</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{rxPrescribedDate || 'Not recorded'}</Text>
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
                {rxRefillsLeft}
              </Text>
            </View>

            <Text style={[styles.refillHint, { color: theme.textMuted }]}>
              {rxRefillsLeft === 0
                ? 'No refills remaining'
                : `${rxRefillsLeft} refill${rxRefillsLeft > 1 ? 's' : ''} available`}
            </Text>
          </View>
        </View>

        {rxExpiryDate ? (
          <View style={styles.section}>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>EXPIRES</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.bodyText, { color: theme.text }]}>{rxExpiryDate}</Text>
            </View>
          </View>
        ) : null}

        {rxNotes ? (
          <View style={styles.section}>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>NOTES FROM YOUR CLINICIAN</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.bodyText, { color: theme.text }]}>{rxNotes}</Text>
            </View>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          {rxId ? (
            <TouchableOpacity
              onPress={() => refill.mutate()}
              disabled={refill.isPending}
              activeOpacity={0.85}
              style={[styles.contactBtn, { backgroundColor: theme.primary, opacity: refill.isPending ? 0.6 : 1 }]}>
              <Text style={[styles.contactBtnText, { color: '#FFFFFF' }]}>
                {refill.isPending ? 'Sending…' : 'Request a refill'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={handleContactProvider}
            activeOpacity={0.85}
            style={[styles.contactBtn, { backgroundColor: theme.primaryLight }]}>
            <Phone size={18} color={theme.primary} />
            <Text style={[styles.contactBtnText, { color: theme.primaryDark }]}>Book a consultation to renew</Text>
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
