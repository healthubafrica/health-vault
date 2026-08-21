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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Video,
  Clock,
  FlaskConical,
  ShieldCheck,
  Home,
  HeartHandshake,
  Brain,
  Plane,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';

interface PatientPortalService {
  id: number;
  name: string;
  badge: string;
  icon: any;
  description: string;
  iconColor: string;
  iconBg: string;
  // Value of the backend's ServiceType enum — sent to
  // appointments.listProviders() as-is, no extra mapping layer.
  serviceType: string;
}

export default function BookAppointmentStep1Screen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [selectedService, setSelectedService] = useState<number | null>(1);

  const services: PatientPortalService[] = [
    {
      id: 1,
      name: 'TeleCare™',
      badge: 'Video Visit',
      icon: Video,
      description: 'Remote video consultations with verified doctors & specialists',
      iconColor: theme.primary,
      iconBg: theme.primaryLight,
      serviceType: 'TeleCare',
    },
    {
      id: 2,
      name: 'MinuteCare™',
      badge: 'Fast-Track',
      icon: Clock,
      description: 'Guaranteed walk-in clinic slots at 200+ partner clinics (skip queue)',
      iconColor: theme.status.warning.text,
      iconBg: theme.status.warning.background,
      serviceType: 'MinuteCare',
    },
    {
      id: 3,
      name: 'CareTest™',
      badge: 'Lab & Diagnostics',
      icon: FlaskConical,
      description: 'Book 200+ diagnostic tests with home collection or lab visit',
      iconColor: theme.status.success.text,
      iconBg: theme.status.success.background,
      serviceType: 'CareTest',
    },
    {
      id: 4,
      name: 'Expert Review™',
      badge: '2nd Opinion',
      icon: ShieldCheck,
      description: 'Specialist clinical second opinions across 18+ medical fields',
      iconColor: theme.status.emergency.text,
      iconBg: theme.status.emergency.background,
      serviceType: 'ExpertReview',
    },
    {
      id: 5,
      name: 'DispatchCare™',
      badge: 'Home Health',
      icon: Home,
      description: 'On-demand home health aide visits and urgent care dispatch',
      iconColor: theme.primaryDark,
      iconBg: theme.primaryLight,
      serviceType: 'DispatchCare',
    },
    {
      id: 6,
      name: 'HealthConsult™',
      badge: 'Preventive Care',
      icon: HeartHandshake,
      description: 'Personalised preventive care programmes and wellness plan reviews',
      iconColor: '#1565C0',
      iconBg: '#E3F2FD',
      serviceType: 'HealthConsult',
    },
    {
      id: 7,
      name: 'NeuroFlex™',
      badge: 'Specialist',
      icon: Brain,
      description: 'Dedicated neurology specialist access, consultation, and follow-up',
      iconColor: '#6B21A8',
      iconBg: '#F3E8FF',
      serviceType: 'NeuroFlex',
    },
    {
      id: 8,
      name: 'TravelSafe™',
      badge: 'Travel Health',
      icon: Plane,
      description: 'Pre-trip health requirements, vaccines, and travel support profile',
      iconColor: '#0D9488',
      iconBg: '#CCFBF1',
      serviceType: 'TravelSafe',
    },
  ];

  const handleContinue = () => {
    const service = services.find((s) => s.id === selectedService);
    router.push({
      pathname: '/book-appointment-step2',
      params: {
        serviceId: selectedService?.toString() || '1',
        serviceName: service?.name || 'TeleCare™',
        serviceType: service?.serviceType || 'TeleCare',
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

        {/* 2-Column Services Grid */}
        <View style={styles.grid}>
          {services.map((service) => {
            const isSelected = selectedService === service.id;
            const IconComp = service.icon;

            return (
              <TouchableOpacity
                key={service.id}
                activeOpacity={0.8}
                onPress={() => setSelectedService(service.id)}
                style={[
                  styles.card,
                  {
                    backgroundColor: isSelected ? theme.primaryLight : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}>
                <View style={[styles.iconBox, { backgroundColor: service.iconBg }]}>
                  <IconComp size={22} color={service.iconColor} />
                </View>
                
                <View style={[styles.badgePill, { backgroundColor: isSelected ? theme.primary : theme.muted }]}>
                  <Text style={[styles.badgeText, { color: isSelected ? '#FFFFFF' : theme.textMuted }]}>
                    {service.badge}
                  </Text>
                </View>

                <Text style={[styles.serviceName, { color: theme.text }]}>{service.name}</Text>
                <Text style={[styles.serviceDesc, { color: theme.textMuted }]} numberOfLines={3}>
                  {service.description}
                </Text>
              </TouchableOpacity>
            );
          })}
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
          disabled={!selectedService}
          onPress={handleContinue}
          style={[
            styles.continueBtn,
            { backgroundColor: selectedService ? theme.primary : theme.muted },
          ]}>
          <Text
            style={[
              styles.continueBtnText,
              { color: selectedService ? '#FFFFFF' : theme.textMuted },
            ]}>
            Continue
          </Text>
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
    gap: 12,
  },
  card: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    textAlign: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
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
    fontSize: 14,
    fontWeight: '700',
  },
});
