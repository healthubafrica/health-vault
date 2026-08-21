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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  Users,
  Plus,
  Info,
  ChevronRight,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import EmergencyFAB from '@/components/EmergencyFAB';
import { patients, CareTeamMember } from '@/lib/api';

function initialsOf(m: CareTeamMember) {
  return `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase();
}

export default function MyCareTeamScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { data, isLoading } = useQuery({
    queryKey: ['care-team'],
    queryFn: () => patients.getMyCareTeam(),
  });

  const careTeam = data?.data ?? [];

  const handleProviderPress = (provider: CareTeamMember) => {
    Alert.alert(
      `${provider.title ?? 'Dr.'} ${provider.firstName} ${provider.lastName}`,
      `${provider.specialty ?? 'Provider'}\n${provider.visitCount} visit${provider.visitCount === 1 ? '' : 's'}\nLast seen: ${new Date(provider.lastVisitAt).toLocaleDateString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start TeleCare', onPress: () => router.push('/(tabs)/telecare') },
      ]
    );
  };

  const handleAddProvider = () => {
    Alert.alert(
      'Add Healthcare Provider',
      'Enter provider practice number (e.g. HPCSA / PR-XXXXX) or search registered clinics in the Health Hub Africa network.'
    );
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>My Care Team</Text>

        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Summary Info Card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.primaryLight }]}>
          <View style={styles.summaryRow}>
            <Users size={20} color={theme.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryTitle, { color: theme.primaryDark }]}>
                {careTeam.length} Provider{careTeam.length === 1 ? '' : 's'}
              </Text>
              <Text style={[styles.summaryBody, { color: theme.primaryDark }]}>
                Providers you've seen have access to your health records and can send you messages and test results.
              </Text>
            </View>
          </View>
        </View>

        {/* Active Providers List */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>YOUR PROVIDERS</Text>

          {isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
          ) : careTeam.length === 0 ? (
            <View style={[styles.providerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.providerName, { color: theme.text }]}>No providers yet</Text>
              <Text style={[styles.metaText, { color: theme.textMuted, marginTop: 4 }]}>
                Providers appear here after your first appointment.
              </Text>
            </View>
          ) : (
          <View style={styles.providersList}>
            {careTeam.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                activeOpacity={0.75}
                onPress={() => handleProviderPress(provider)}
                style={[styles.providerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>

                {/* Avatar Initials Box */}
                <View style={[styles.avatarBox, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.avatarText, { color: theme.primary }]}>{initialsOf(provider)}</Text>
                </View>

                {/* Details */}
                <View style={styles.providerInfo}>
                  <View style={styles.nameHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.providerName, { color: theme.text }]}>
                        {provider.title ?? 'Dr.'} {provider.firstName} {provider.lastName}
                      </Text>
                      <Text style={[styles.specialtyText, { color: theme.textMuted }]}>{provider.specialty || 'General Practitioner'}</Text>
                    </View>
                    {provider.isAvailable && <View style={styles.activeDot} />}
                  </View>

                  <View style={styles.metaCol}>
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>
                      {provider.visitCount} visit{provider.visitCount === 1 ? '' : 's'}
                    </Text>
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>
                      Last seen: {new Date(provider.lastVisitAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <ChevronRight size={18} color={theme.textMuted} style={{ marginTop: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
          )}
        </View>

        {/* Manage Team Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>MANAGE TEAM</Text>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleAddProvider}
            style={[styles.addCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.plusIconBox, { backgroundColor: theme.primaryLight }]}>
              <Plus size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.addTitle, { color: theme.text }]}>Add Provider</Text>
              <Text style={[styles.addSub, { color: theme.textMuted }]}>Invite a new healthcare provider</Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* How It Works Explainer */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.infoRow}>
            <Info size={20} color={theme.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>How it works</Text>
              <View style={styles.bulletsList}>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • Providers can access your medical history and health records
                </Text>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • You control who has access to your data
                </Text>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • Revoke access anytime by removing a provider
                </Text>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • All data is encrypted and secure
                </Text>
              </View>
            </View>
          </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  providersList: {
    gap: 10,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  providerInfo: {
    flex: 1,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '800',
  },
  specialtyText: {
    fontSize: 12,
    marginTop: 1,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6DC43F',
    marginTop: 4,
  },
  metaCol: {
    gap: 2,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  plusIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  addSub: {
    fontSize: 12,
    marginTop: 2,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  bulletsList: {
    gap: 6,
  },
  bulletText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
