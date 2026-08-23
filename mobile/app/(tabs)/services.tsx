import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  Calendar,
  Bike,
  Clock,
  FlaskConical,
  CheckCircle2,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import ServiceCard from '@/components/ServiceCard';
import { useQuery } from '@tanstack/react-query';
import { HUB_SERVICES } from '@/lib/services';
import { useAuthStore } from '@/lib/stores/authStore';
import { patients } from '@/lib/api';
import { getScreenCardWidth } from '@/lib/layout';

export default function ServicesTabScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const user = useAuthStore((s) => s.user);
  const cardWidth = getScreenCardWidth();

  const { data: profileRes } = useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: () => patients.getMyProfile(),
    enabled: !!user,
  });

  const profile = profileRes?.data;
  const avatarUrl = profile?.profilePhotoUrl || user?.profilePhotoUrl || user?.avatarUrl;
  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : user
    ? `${user.firstName} ${user.lastName}`.trim()
    : 'there';
  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const todayDateString = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Services Hub</Text>
        <View style={styles.headerRight}>
          <TopHeaderEmergency />
          <TouchableOpacity
            style={[styles.bellBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push('/notifications')}>
            <Bell size={18} color={theme.text} />
            <View style={[styles.bellBadge, { backgroundColor: theme.emergency }]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Header Section: Date & User Greeting */}
        <View style={styles.headerSection}>
          <View style={styles.dateRow}>
            <View style={[styles.dateBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Calendar size={14} color={theme.textMuted} />
              <Text style={[styles.dateText, { color: theme.textMuted }]}>{todayDateString}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.userGreetingRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, styles.avatarFallback, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.avatarInitials, { color: theme.primary }]}>
                  {initials}
                </Text>
              </View>
            )}
            <View style={styles.greetingTextCol}>
              <Text style={[styles.greetingTitle, { color: theme.text }]}>Hello, {displayName}!</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.sectionPrompt, { color: theme.textMuted }]}>
            What are you looking for?
          </Text>
        </View>

        {/* 2-Column Grid of Services with Logos */}
        <View style={styles.servicesGrid}>
          {HUB_SERVICES.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              width={cardWidth}
              onPress={() =>
                router.push(
                  service.hubRoute === '/book-appointment-step1'
                    ? { pathname: '/book-appointment-step1', params: { preselect: service.id } }
                    : (service.hubRoute as any)
                )
              }
            />
          ))}
        </View>

        {/* Service Details Section */}
        <View style={styles.infoSection}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            HOW OUR SERVICES WORK
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/emergency')}
            style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: theme.primaryLight }]}>
                <Bike size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: theme.text }]}>DispatchCare — Rapid Medical Response</Text>
                <Text style={[styles.detailBody, { color: theme.textMuted }]}>
                  Emergency motorcycle responders and rapid ambulance dispatch for urgent home care and critical stabilization.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/book-appointment-step1')}
            style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#EAF5E2' }]}>
                <Clock size={18} color="#137333" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: theme.text }]}>MinuteCare — Quick Consultations</Text>
                <Text style={[styles.detailBody, { color: theme.textMuted }]}>
                  Immediate non-emergency primary care encounters with certified clinical officers and local pharmacies.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/book-appointment-step1')}
            style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#E3F2FD' }]}>
                <FlaskConical size={18} color="#1565C0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: theme.text }]}>CareTest — At-Home Diagnostics</Text>
                <Text style={[styles.detailBody, { color: theme.textMuted }]}>
                  Certified phlebotomists collect lab samples at your doorstep with verified digital results uploaded directly to your Vault.
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Benefits Card */}
        <View style={[styles.benefitsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.benefitsRow}>
            <CheckCircle2 size={20} color={theme.status.success.border} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.benefitsTitle, { color: theme.text }]}>Why Choose Health Hub Africa?</Text>
              <View style={styles.bulletsList}>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • Single unified clinical record for all services
                </Text>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • Certified medical specialists and vetted dispatch teams
                </Text>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • Real-time digital results and prescription fulfillment
                </Text>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • Available 24/7 across our partner regions
                </Text>
              </View>
            </View>
          </View>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  headerSection: {
    marginBottom: 18,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAEAEA',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
  },
  greetingTextCol: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionPrompt: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginBottom: 26,
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  detailBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  benefitsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  benefitsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  benefitsTitle: {
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
