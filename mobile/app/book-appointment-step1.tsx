import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import ServiceCard from '@/components/ServiceCard';
import { BOOKABLE_SERVICES } from '@/lib/services';
import { getScreenCardWidth } from '@/lib/layout';

export default function BookAppointmentStep1Screen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const cardWidth = getScreenCardWidth();
  // Services Hub tiles land here with the service already known (e.g. the
  // TeleCare tile) — same picker either way, just pre-selected.
  const params = useLocalSearchParams<{ preselect?: string }>();

  const [selectedId, setSelectedId] = useState<string>(params.preselect ?? BOOKABLE_SERVICES[0].id);

  const handleContinue = () => {
    const service = BOOKABLE_SERVICES.find((s) => s.id === selectedId) ?? BOOKABLE_SERVICES[0];
    router.push({
      pathname: '/book-appointment-step2',
      params: {
        serviceId: service.id,
        serviceName: service.name,
        serviceType: service.serviceType ?? 'TeleCare',
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>Book Care</Text>

        <TopHeaderEmergency />
      </View>

      {/* 4-Step Progress Indicator */}
      <View style={[styles.progressContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.progressBarRow}>
          <View style={[styles.progressSegment, { backgroundColor: theme.primary }]} />
          <View style={[styles.progressSegment, { backgroundColor: theme.muted }]} />
          <View style={[styles.progressSegment, { backgroundColor: theme.muted }]} />
          <View style={[styles.progressSegment, { backgroundColor: theme.muted }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textMuted }]}>
          Step 1 of 4: Select Service
        </Text>
      </View>

      {/* Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={[styles.instructionTitle, { color: theme.text }]}>What service do you need?</Text>
          <Text style={[styles.instructionSubtitle, { color: theme.textMuted }]}>
            Select an interconnected MyHealth Vault+ service to schedule appointments or tests.
          </Text>
        </View>

        {/* 2-Column Services Grid — same card design as Services Hub */}
        <View style={styles.grid}>
          {BOOKABLE_SERVICES.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              width={cardWidth}
              selected={selectedId === service.id}
              onPress={() => setSelectedId(service.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[styles.cancelBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleContinue}
          style={[styles.continueBtn, { backgroundColor: theme.primary }]}>
          <Text style={styles.continueBtnText}>Continue</Text>
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
  instructionsSection: {
    marginBottom: 16,
  },
  instructionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  instructionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  continueBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
