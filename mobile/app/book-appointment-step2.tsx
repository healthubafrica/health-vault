import React, { useState } from 'react';
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
  Search,
  Star,
  Clock,
  Globe,
  Check,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { appointments, ServiceProvider } from '@/lib/api';

const AVATAR_BGS = ['#EBF5EC', '#E3F2FD', '#FFF4E0', '#FDECEA'];

function initialsOf(provider: ServiceProvider) {
  return `${provider.firstName[0] ?? ''}${provider.lastName[0] ?? ''}`.toUpperCase();
}

const SPECIALTY_FILTERS = ['All', 'General Practice', 'Cardiology', 'Endocrinology', 'Pediatrics'];

export default function BookAppointmentStep2Screen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ serviceId?: string; serviceName?: string; serviceType?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const serviceType = params.serviceType || 'TeleCare';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');

  const { data: providers, isLoading } = useQuery({
    queryKey: ['appointment-providers', serviceType],
    queryFn: () => appointments.listProviders(serviceType),
  });

  const allProviders = providers ?? [];

  const filteredProviders = allProviders.filter((provider) => {
    const name = `${provider.firstName} ${provider.lastName}`;
    const specialty = provider.specialty ?? '';
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty =
      selectedSpecialty === 'All' || specialty.toLowerCase().includes(selectedSpecialty.toLowerCase());
    return matchesSearch && matchesSpecialty;
  });

  const handleContinue = () => {
    const provider = allProviders.find((p) => p.id === selectedProviderId) || allProviders[0];
    if (!provider) return;
    router.push({
      pathname: '/book-appointment-step3',
      params: {
        serviceId: params.serviceId || '1',
        serviceName: params.serviceName || 'TeleCare™',
        serviceType,
        providerId: provider.id,
        providerName: `${provider.title ?? 'Dr.'} ${provider.firstName} ${provider.lastName}`,
        providerSpecialty: provider.specialty || 'General Practitioner',
        providerInitials: initialsOf(provider),
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>Select Doctor</Text>

        <TopHeaderEmergency />
      </View>

      {/* 4-Step Progress Indicator */}
      <View style={[styles.progressContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.progressBarRow}>
          <View style={[styles.progressSegment, { backgroundColor: theme.primary }]} />
          <View style={[styles.progressSegment, { backgroundColor: theme.primary }]} />
          <View style={[styles.progressSegment, { backgroundColor: theme.muted }]} />
          <View style={[styles.progressSegment, { backgroundColor: theme.muted }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textMuted }]}>
          Step 2 of 4: Choose Clinician ({params.serviceName || 'TeleCare™'})
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Search size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by doctor or specialty..."
            placeholderTextColor={theme.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}>
          {SPECIALTY_FILTERS.map((spec) => {
            const isSelected = selectedSpecialty === spec;
            return (
              <TouchableOpacity
                key={spec}
                onPress={() => setSelectedSpecialty(spec)}
                activeOpacity={0.8}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : theme.textMuted },
                  ]}>
                  {spec}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Providers List */}
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ marginTop: 12, color: theme.textMuted, fontSize: 14 }}>Loading clinicians...</Text>
          </View>
        ) : filteredProviders.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No clinicians available</Text>
            <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
              No providers are currently listed for {params.serviceName || 'this service'}.
            </Text>
          </View>
        ) : (
        <View style={styles.providerList}>
          {filteredProviders.map((provider, index) => {
            const isSelected = selectedProviderId === provider.id;
            const name = `${provider.title ?? 'Dr.'} ${provider.firstName} ${provider.lastName}`;

            return (
              <TouchableOpacity
                key={provider.id}
                onPress={() => setSelectedProviderId(provider.id)}
                activeOpacity={0.85}
                style={[
                  styles.providerCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}>
                {/* Top Row: Avatar, Info, and Radio Selection */}
                <View style={styles.providerTopRow}>
                  <View style={[styles.avatarBox, { backgroundColor: AVATAR_BGS[index % AVATAR_BGS.length] }]}>
                    <Text style={[styles.avatarText, { color: theme.primaryDark }]}>
                      {initialsOf(provider)}
                    </Text>
                  </View>

                  <View style={styles.providerMetaCol}>
                    <Text style={[styles.providerName, { color: theme.text }]}>
                      {name}
                    </Text>
                    <Text style={[styles.specialtyText, { color: theme.textMuted }]}>
                      {provider.specialty || 'General Practitioner'}
                      {provider.yearsExperience ? ` · ${provider.yearsExperience} yrs exp` : ''}
                    </Text>

                    {provider.rating != null && (
                      <View style={styles.ratingRow}>
                        <Star size={14} color="#F5B041" fill="#F5B041" />
                        <Text style={[styles.ratingText, { color: theme.text }]}>
                          {provider.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? theme.primary : theme.border,
                        backgroundColor: isSelected ? theme.primary : 'transparent',
                      },
                    ]}>
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </View>

                {/* Badges and Language Row */}
                <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />

                <View style={styles.providerBottomRow}>
                  <View
                    style={[
                      styles.availabilityBadge,
                      { backgroundColor: provider.isAvailable ? '#EAF5E2' : theme.muted },
                    ]}>
                    <Clock size={12} color={provider.isAvailable ? '#137333' : theme.textMuted} />
                    <Text
                      style={[
                        styles.availabilityText,
                        { color: provider.isAvailable ? '#006022' : theme.textMuted },
                      ]}>
                      {provider.isAvailable ? 'Available' : 'Currently unavailable'}
                    </Text>
                  </View>
                </View>

                {provider.languages && provider.languages.length > 0 && (
                  <View style={styles.languagesRow}>
                    <Globe size={12} color={theme.textMuted} />
                    <Text style={[styles.languagesText, { color: theme.textMuted }]}>
                      Speaks: {provider.languages.join(', ')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        )}
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
          disabled={!selectedProviderId}
          onPress={handleContinue}
          style={[styles.continueBtn, { backgroundColor: theme.primary }]}>
          <Text style={styles.continueBtnText}>Continue to Date & Time</Text>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  providerList: {
    gap: 12,
  },
  emptyBox: {
    marginTop: 24,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 13,
    textAlign: 'center',
  },
  providerCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  providerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  providerMetaCol: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  specialtyText: {
    fontSize: 12,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewsText: {
    fontSize: 11,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  providerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF5E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  availabilityText: {
    color: '#006022',
    fontSize: 11,
    fontWeight: '700',
  },
  feeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  feeSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B6B6B',
  },
  languagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  languagesText: {
    fontSize: 11,
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
