import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  Clock,
  Video,
  MapPin,
  Check,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { appointments } from '@/lib/api';

interface DateItem {
  dateStr: string;
  dayName: string;
  dayNum: string;
  month: string;
}

// Next 7 real calendar days, starting today — replaces a fixed hardcoded
// week that only ever made sense on the day it was written.
function buildUpcomingDates(): DateItem[] {
  const days: DateItem[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      dateStr: d.toISOString().slice(0, 10),
      dayName: i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayNum: String(d.getDate()),
      month: d.toLocaleDateString('en-GB', { month: 'short' }),
    });
  }
  return days;
}

function slotHour(iso: string): number {
  return new Date(iso).getHours();
}

function formatSlot(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function BookAppointmentStep3Screen() {
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
  }>();

  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const serviceType = params.serviceType || 'TeleCare';

  const DATES = useMemo(buildUpcomingDates, []);

  const [selectedFormat, setSelectedFormat] = useState<'video' | 'in_person'>('video');
  const [selectedDate, setSelectedDate] = useState<string>(DATES[0].dateStr);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string>('');
  const [reasonText, setReasonText] = useState<string>('');

  const { data: slotGroups, isLoading } = useQuery({
    queryKey: ['appointment-slots', serviceType, selectedDate, params.providerId],
    queryFn: () =>
      appointments.getSlots({
        serviceType,
        date: selectedDate,
        providerId: params.providerId || undefined,
      }),
  });

  const availableSlots = useMemo(() => {
    const group = (slotGroups ?? []).find((g) => g.providerId === params.providerId) ?? slotGroups?.[0];
    return group?.slots ?? [];
  }, [slotGroups, params.providerId]);

  const morningSlots = availableSlots.filter((s) => slotHour(s) < 12);
  const afternoonSlots = availableSlots.filter((s) => slotHour(s) >= 12 && slotHour(s) < 17);
  const eveningSlots = availableSlots.filter((s) => slotHour(s) >= 17);

  const selectedDateObj = DATES.find((d) => d.dateStr === selectedDate) || DATES[0];
  const formattedDateSummary = `${selectedDateObj.dayName}, ${selectedDateObj.dayNum} ${selectedDateObj.month}`;

  const handleContinue = () => {
    if (!selectedSlotIso) return;
    router.push({
      pathname: '/book-appointment-step4',
      params: {
        serviceId: params.serviceId || '1',
        serviceName: params.serviceName || 'TeleCare™',
        serviceType,
        providerId: params.providerId || '',
        providerName: params.providerName || 'Dr. Naledi Dlamini',
        providerSpecialty: params.providerSpecialty || 'General Practitioner',
        providerFee: params.providerFee || '₦15,000',
        providerInitials: params.providerInitials || 'ND',
        consultationFormat: selectedFormat,
        appointmentDate: formattedDateSummary,
        appointmentTime: formatSlot(selectedSlotIso),
        scheduledAtIso: selectedSlotIso,
        reason: reasonText,
      },
    });
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>Date & Time</Text>

        <TopHeaderEmergency />
      </View>

      {/* 4-Step Progress Indicator */}
      <View style={[styles.progressContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.progressBarRow}>
          <View style={[styles.progressSegment, { backgroundColor: theme.primary }]} />
          <View style={[styles.progressSegment, { backgroundColor: theme.primary }]} />
          <View style={[styles.progressSegment, { backgroundColor: theme.primary }]} />
          <View style={[styles.progressSegment, { backgroundColor: theme.muted }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textMuted }]}>
          Step 3 of 4: Select Encounter Slot
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Selected Provider Mini Summary Card */}
        <View style={[styles.selectedProviderChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.avatarBox, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {params.providerInitials || 'ND'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.docName, { color: theme.text }]}>
              {params.providerName || 'Dr. Naledi Dlamini'}
            </Text>
            <Text style={[styles.docSub, { color: theme.textMuted }]}>
              {params.providerSpecialty || 'General Practitioner'} · {params.providerFee || '₦15,000'}
            </Text>
          </View>
          <View style={styles.verifiedPill}>
            <Check size={12} color="#006022" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        {/* Consultation Format Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>CONSULTATION TYPE</Text>
          <View style={styles.formatRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedFormat('video')}
              style={[
                styles.formatBtn,
                {
                  backgroundColor: selectedFormat === 'video' ? theme.primaryLight : theme.surface,
                  borderColor: selectedFormat === 'video' ? theme.primary : theme.border,
                  borderWidth: selectedFormat === 'video' ? 2 : 1,
                },
              ]}>
              <Video size={20} color={selectedFormat === 'video' ? theme.primary : theme.textMuted} />
              <View>
                <Text
                  style={[
                    styles.formatTitle,
                    { color: selectedFormat === 'video' ? theme.primaryDark : theme.text },
                  ]}>
                  Video (TeleCare)
                </Text>
                <Text style={[styles.formatSub, { color: theme.textMuted }]}>In-app secure HD call</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedFormat('in_person')}
              style={[
                styles.formatBtn,
                {
                  backgroundColor: selectedFormat === 'in_person' ? theme.primaryLight : theme.surface,
                  borderColor: selectedFormat === 'in_person' ? theme.primary : theme.border,
                  borderWidth: selectedFormat === 'in_person' ? 2 : 1,
                },
              ]}>
              <MapPin size={20} color={selectedFormat === 'in_person' ? theme.primary : theme.textMuted} />
              <View>
                <Text
                  style={[
                    styles.formatTitle,
                    { color: selectedFormat === 'in_person' ? theme.primaryDark : theme.text },
                  ]}>
                  In-Person Visit
                </Text>
                <Text style={[styles.formatSub, { color: theme.textMuted }]}>Partner clinic facility</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Selector Strip */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>SELECT DATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
            {DATES.map((item) => {
              const isSelected = selectedDate === item.dateStr;
              return (
                <TouchableOpacity
                  key={item.dateStr}
                  onPress={() => setSelectedDate(item.dateStr)}
                  activeOpacity={0.85}
                  style={[
                    styles.dateCard,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.dayNameText,
                      { color: isSelected ? '#D0E8D0' : theme.textMuted },
                    ]}>
                    {item.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumText,
                      { color: isSelected ? '#FFFFFF' : theme.text },
                    ]}>
                    {item.dayNum}
                  </Text>
                  <Text
                    style={[
                      styles.monthText,
                      { color: isSelected ? '#D0E8D0' : theme.textMuted },
                    ]}>
                    {item.month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Slot Picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            AVAILABLE TIME SLOTS ({formattedDateSummary})
          </Text>

          {isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 8 }} />
          ) : availableSlots.length === 0 ? (
            <Text style={[styles.slotGroupTitle, { color: theme.textMuted }]}>
              No slots available this day — try another date.
            </Text>
          ) : (
            <>
              {[
                { title: 'Morning', slots: morningSlots },
                { title: 'Afternoon', slots: afternoonSlots },
                { title: 'Evening', slots: eveningSlots },
              ].map(({ title, slots }) =>
                slots.length === 0 ? null : (
                  <View key={title}>
                    <Text style={[styles.slotGroupTitle, { color: theme.textMuted, marginTop: 14 }]}>
                      {title}
                    </Text>
                    <View style={styles.slotsGrid}>
                      {slots.map((iso) => {
                        const isSelected = selectedSlotIso === iso;
                        return (
                          <TouchableOpacity
                            key={iso}
                            onPress={() => setSelectedSlotIso(iso)}
                            activeOpacity={0.85}
                            style={[
                              styles.slotPill,
                              {
                                backgroundColor: isSelected ? theme.primary : theme.surface,
                                borderColor: isSelected ? theme.primary : theme.border,
                              },
                            ]}>
                            <Text
                              style={[
                                styles.slotText,
                                { color: isSelected ? '#FFFFFF' : theme.text },
                              ]}>
                              {formatSlot(iso)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )
              )}
            </>
          )}
        </View>

        {/* Reason for Visit (Optional) */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            REASON FOR VISIT (OPTIONAL)
          </Text>
          <TextInput
            style={[
              styles.reasonInput,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
            ]}
            placeholder="E.g. routine check-up, headache for 3 days, prescription refill..."
            placeholderTextColor={theme.textFaint}
            multiline
            numberOfLines={3}
            value={reasonText}
            onChangeText={setReasonText}
          />
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[styles.cancelBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cancelBtnText, { color: theme.text }]}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!selectedSlotIso}
          onPress={handleContinue}
          style={[styles.continueBtn, { backgroundColor: theme.primary }]}>
          <Text style={styles.continueBtnText}>Continue to Summary</Text>
        </TouchableOpacity>
      </View>
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
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  selectedProviderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  docName: {
    fontSize: 14,
    fontWeight: '800',
  },
  docSub: {
    fontSize: 12,
    marginTop: 2,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF5E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    color: '#006022',
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    marginBottom: 22,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
  },
  formatTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  formatSub: {
    fontSize: 10,
    marginTop: 2,
  },
  dateScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  dateCard: {
    width: 68,
    height: 84,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayNumText: {
    fontSize: 20,
    fontWeight: '900',
  },
  monthText: {
    fontSize: 11,
    fontWeight: '600',
  },
  slotGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotPill: {
    width: '31%',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reasonInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  continueBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
