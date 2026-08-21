import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Calendar,
  Clock,
  Video,
  MapPin,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { appointments, ApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export default function BookAppointmentStep4Screen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    serviceId?: string;
    serviceName?: string;
    serviceType?: string;
    providerId?: string;
    providerName?: string;
    providerSpecialty?: string;
    providerFee?: string;
    providerInitials?: string;
    consultationFormat?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    scheduledAtIso?: string;
    reason?: string;
  }>();

  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'medical_aid' | 'eft'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  const feeAmount = params.providerFee || '₦15,000.00';

  const handlePayAndConfirm = async () => {
    if (!params.scheduledAtIso) {
      Alert.alert('Missing time slot', 'Please go back and choose an appointment slot.');
      return;
    }
    setIsProcessing(true);
    try {
      const isTelecare = params.consultationFormat === 'virtual' || (params.serviceName || '').includes('TeleCare');
      const res = await appointments.create({
        appointmentType: isTelecare ? 'virtual' : 'in_person',
        serviceType: params.serviceType || 'TeleCare',
        scheduledAt: params.scheduledAtIso,
        durationMinutes: 45,
        chiefComplaint: params.reason || 'General checkup',
        notes: `Payment method: ${selectedPaymentMethod}`,
        ...(params.providerId && { providerId: params.providerId }),
      });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setBookingRef(res.data.hhaRef);
      setIsConfirmed(true);
    } catch (err: unknown) {
      // Booking payment/creation genuinely failed — tell the patient rather
      // than silently showing a fake confirmation for a non-existent booking.
      Alert.alert(
        'Booking failed',
        err instanceof ApiError ? err.message : 'Could not confirm this appointment. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {!isConfirmed ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color={theme.primary} />
            <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}

        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {isConfirmed ? 'Encounter Confirmed' : 'Checkout & Pay'}
        </Text>

        <TopHeaderEmergency />
      </View>

      {/* 4-Step Progress Indicator (Hidden on Success) */}
      {!isConfirmed && (
        <View style={[styles.progressContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.progressBarRow}>
            <View style={[styles.progressSegment, { backgroundColor: theme.primary }]} />
            <View style={[styles.progressSegment, { backgroundColor: theme.primary }]} />
            <View style={[styles.progressSegment, { backgroundColor: theme.primary }]} />
            <View style={[styles.progressSegment, { backgroundColor: theme.primary }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            Step 4 of 4: Finalize & Confirm Booking
          </Text>
        </View>
      )}

      {!isConfirmed ? (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Encounter Summary Card */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>APPOINTMENT DETAILS</Text>

              <View style={styles.doctorHeaderRow}>
                <View style={[styles.avatarBox, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.avatarText, { color: theme.primary }]}>
                    {params.providerInitials || 'ND'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.doctorName, { color: theme.text }]}>
                    {params.providerName || 'Dr. Naledi Dlamini'}
                  </Text>
                  <Text style={[styles.doctorSpecialty, { color: theme.textMuted }]}>
                    {params.providerSpecialty || 'General Practitioner'}
                  </Text>
                  <Text style={[styles.serviceBadgeText, { color: theme.primary }]}>
                    {params.serviceName || 'TeleCare™'}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.detailsTable}>
                <View style={styles.detailItemRow}>
                  <View style={styles.detailLabelCol}>
                    <Calendar size={16} color={theme.textMuted} />
                    <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Date</Text>
                  </View>
                  <Text style={[styles.detailVal, { color: theme.text }]}>
                    {params.appointmentDate || 'Today, 21 Jul 2025'}
                  </Text>
                </View>

                <View style={styles.detailItemRow}>
                  <View style={styles.detailLabelCol}>
                    <Clock size={16} color={theme.textMuted} />
                    <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Time</Text>
                  </View>
                  <Text style={[styles.detailVal, { color: theme.text }]}>
                    {params.appointmentTime || '02:30 PM'}
                  </Text>
                </View>

                <View style={styles.detailItemRow}>
                  <View style={styles.detailLabelCol}>
                    {params.consultationFormat === 'in_person' ? (
                      <MapPin size={16} color={theme.textMuted} />
                    ) : (
                      <Video size={16} color={theme.textMuted} />
                    )}
                    <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Type</Text>
                  </View>
                  <Text style={[styles.detailVal, { color: theme.text }]}>
                    {params.consultationFormat === 'in_person'
                      ? 'In-Person Clinic Visit'
                      : 'HD Video Consultation'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Price Breakdown Card */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>PAYMENT BREAKDOWN</Text>

              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: theme.text }]}>Consultation Fee</Text>
                <Text style={[styles.priceValue, { color: theme.text }]}>{feeAmount}</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: theme.textMuted }]}>
                  Platform & Records Encryption Fee
                </Text>
                <Text style={[styles.priceValue, { color: '#006022' }]}>FREE</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>Total Due</Text>
                <Text style={[styles.totalAmount, { color: theme.primaryDark }]}>{feeAmount}</Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>PAYMENT METHOD</Text>

              <View
                style={[
                  styles.paymentOption,
                  { backgroundColor: theme.surface, borderColor: theme.primary, borderWidth: 2 },
                ]}>
                <CreditCard size={20} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.payTitle, { color: theme.text }]}>Card, via Flutterwave</Text>
                  <Text style={[styles.paySub, { color: theme.textMuted }]}>
                    You'll confirm payment securely on Flutterwave's checkout page.
                  </Text>
                </View>
                <Check size={18} color={theme.primary} />
              </View>
            </View>

            {/* Cancellation Policy */}
            <View style={[styles.policyBox, { backgroundColor: theme.primaryLight }]}>
              <ShieldCheck size={16} color={theme.primary} />
              <Text style={[styles.policyText, { color: theme.primaryDark }]}>
                Free cancellation up to 2 hours before the appointment. 100% money-back guarantee.
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Bar */}
          <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isProcessing}
              onPress={handlePayAndConfirm}
              style={[styles.payBtn, { backgroundColor: theme.primary }]}>
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.payBtnText}>Pay {feeAmount} & Confirm</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Booking Confirmation Success State */
        <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.successIconBox, { backgroundColor: '#EAF5E2' }]}>
            <CheckCircle2 size={64} color="#006022" />
          </View>

          <Text style={[styles.successHeading, { color: theme.text }]}>
            Appointment Booked!
          </Text>
          <Text style={[styles.successSubheading, { color: theme.textMuted }]}>
            Your consultation with {params.providerName || 'Dr. Naledi Dlamini'} is confirmed.
          </Text>

          <View style={[styles.refCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.refLabel, { color: theme.textMuted }]}>BOOKING REFERENCE</Text>
            <Text style={[styles.refNumber, { color: theme.primaryDark }]}>#{bookingRef}</Text>
            <Text style={[styles.refTime, { color: theme.textMuted }]}>
              {params.appointmentDate || 'Today, 21 Aug'} at {params.appointmentTime || '02:30 PM'}
            </Text>
          </View>

          {/* Action CTAs */}
          <View style={styles.successActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/telecare')}
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}>
              <Video size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Open TeleCare Waiting Room</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/appointments')}
              style={[styles.secondaryActionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Calendar size={20} color={theme.text} />
              <Text style={[styles.secondaryActionText, { color: theme.text }]}>
                View in Appointments
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace('/(tabs)')}
              style={styles.homeLinkBtn}>
              <Text style={[styles.homeLinkText, { color: theme.primary }]}>Return to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  progressBarRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
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
  section: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  doctorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 12,
    marginBottom: 4,
  },
  serviceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  detailsTable: {
    gap: 10,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '900',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  payTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  paySub: {
    fontSize: 11,
    marginTop: 2,
  },
  policyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  policyText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  payBtn: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  successContent: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  successIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successHeading: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubheading: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  refCard: {
    width: '100%',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 28,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  refNumber: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  refTime: {
    fontSize: 13,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  primaryActionBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  homeLinkBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  homeLinkText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
