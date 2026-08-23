import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import QuickActionButton from '@/components/QuickActionButton';
import AppointmentCard from '@/components/AppointmentCard';
import ActivityCard from '@/components/ActivityCard';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { useAuthStore } from '@/lib/stores/authStore';
import { vitals, appointments, payments, patients } from '@/lib/api';

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function formatKoboToNaira(amountKobo: number) {
  return `₦${(amountKobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function formatAppointmentTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

export default function HomeDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const user = useAuthStore((s) => s.user);

  const { data: profileRes } = useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: () => patients.getMyProfile(),
    enabled: !!user,
  });

  const profile = profileRes?.data;
  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : user
    ? `${user.firstName} ${user.lastName}`
    : '—';
  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';
  const avatarUrl = profile?.profilePhotoUrl || user?.profilePhotoUrl || user?.avatarUrl;

  // ── Data queries ──────────────────────────────────────────────────────────

  const { data: vitalsData } = useQuery({
    queryKey: ['vitals'],
    queryFn: () => vitals.list(),
    enabled: !!user,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => appointments.list({ upcoming: true }),
    enabled: !!user,
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['payments'],
    queryFn: () => payments.list(),
    enabled: !!user,
  });

  // ── Derived data ──────────────────────────────────────────────────────────

  const latestVitals = vitalsData?.data?.[0];
  const upcomingAppt = appointmentsData?.data?.[0];
  const recentPayment = paymentsData?.data?.[0];

  const hrDisplay = latestVitals?.heartRate ? `${latestVitals.heartRate} bpm` : '— bpm';
  const bpDisplay =
    latestVitals?.systolicBp && latestVitals?.diastolicBp
      ? `${latestVitals.systolicBp}/${latestVitals.diastolicBp}`
      : '—/—';
  const glucoseDisplay = latestVitals?.bloodGlucose ? `${latestVitals.bloodGlucose} mmol` : '— mmol';

  // Compute simple wellness score from number of available metrics
  const metricCount = [
    latestVitals?.heartRate,
    latestVitals?.systolicBp,
    latestVitals?.spo2,
    latestVitals?.bloodGlucose,
  ].filter(Boolean).length;
  const wellnessScore = latestVitals ? Math.min(60 + metricCount * 10, 98) : '—';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.userRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View>
              <Text style={[styles.subGreeting, { color: theme.textMuted }]}>{getTimeGreeting()}</Text>
              <Text style={[styles.greeting, { color: theme.text }]}>{displayName}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TopHeaderEmergency />
            <TouchableOpacity
              style={[styles.bellButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push('/notifications')}>
              <Bell size={20} color={theme.text} />
              <View style={[styles.unreadBadge, { backgroundColor: theme.emergency }]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Wellness Strip */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs)/vitals')}
          style={styles.heroWellnessWrapper}>
          <ImageBackground
            source={require('@/assets/images/wellness-bg.jpg')}
            style={styles.heroWellness}
            imageStyle={styles.heroWellnessImage}>
            <LinearGradient
              colors={['rgba(14, 74, 48, 0.72)', 'rgba(19, 115, 51, 0.65)', 'rgba(29, 156, 74, 0.50)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroWellnessOverlay}>
              <View style={styles.wellnessLeft}>
                <Text style={styles.wellnessScoreLabel}>Wellness Score</Text>
                <Text style={styles.wellnessScoreValue}>{wellnessScore}</Text>
                <Text style={styles.wellnessScoreSub}>
                  {latestVitals ? `${metricCount} metric${metricCount !== 1 ? 's' : ''} recorded` : 'No vitals yet'}
                </Text>
              </View>

              <View style={styles.wellnessRight}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Heart Rate</Text>
                  <View style={[styles.vitalBadge, { backgroundColor: '#EAF5E2' }]}>
                    <Text style={[styles.vitalBadgeText, { color: '#006022' }]}>{hrDisplay}</Text>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Blood Pressure</Text>
                  <View style={[styles.vitalBadge, { backgroundColor: '#EAF5E2' }]}>
                    <Text style={[styles.vitalBadgeText, { color: '#006022' }]}>{bpDisplay}</Text>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Blood Glucose</Text>
                  <View style={[styles.vitalBadge, { backgroundColor: '#FFF4E0' }]}>
                    <Text style={[styles.vitalBadgeText, { color: '#92610A' }]}>{glucoseDisplay}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>QUICK ACTIONS</Text>
          <View style={styles.quickActionGrid}>
            <QuickActionButton
              icon="activity"
              label="Check Vitals"
              sublabel="Track & record"
              backgroundImage={require('@/assets/images/qa_vitals.jpg')}
              onPress={() => router.push('/(tabs)/vitals')}
            />
            <QuickActionButton
              icon="video"
              label="Talk to Doctor"
              sublabel="TeleCare HD"
              backgroundImage={require('@/assets/images/qa_telecare.jpg')}
              onPress={() => router.push({ pathname: '/book-appointment-step1', params: { preselect: 'telecare' } })}
            />
            <QuickActionButton
              icon="calendar"
              label="Book Care"
              sublabel="Services Hub"
              backgroundImage={require('@/assets/images/qa_bookcare.jpg')}
              onPress={() => router.push('/(tabs)/services')}
            />
          </View>
        </View>

        {/* Today / Upcoming Appointment */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming</Text>
            <TouchableOpacity onPress={() => router.push('/appointments')}>
              <Text style={[styles.sectionActionText, { color: theme.primary }]}>View all</Text>
            </TouchableOpacity>
          </View>

          {upcomingAppt ? (
            <AppointmentCard
              providerName={
                upcomingAppt.provider
                  ? `${upcomingAppt.provider.title} ${upcomingAppt.provider.firstName} ${upcomingAppt.provider.lastName}`
                  : 'Provider TBC'
              }
              specialty={upcomingAppt.provider?.specialty ?? upcomingAppt.serviceType}
              time={formatAppointmentTime(upcomingAppt.scheduledAt)}
              type={upcomingAppt.isTelecare ? 'TeleCare' : 'In-Person'}
              status={upcomingAppt.status}
              actionLabel={upcomingAppt.isTelecare ? 'Join Call' : 'View'}
              initials={
                upcomingAppt.provider
                  ? `${upcomingAppt.provider.firstName[0]}${upcomingAppt.provider.lastName[0]}`
                  : '?'
              }
              onActionPress={() =>
                upcomingAppt.isTelecare
                  ? router.push('/(tabs)/telecare')
                  : router.push('/appointments')
              }
            />
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.emptyCardText, { color: theme.textMuted }]}>
                No upcoming appointments
              </Text>
              <TouchableOpacity onPress={() => router.push('/book-appointment-step1')}>
                <Text style={[styles.emptyCardAction, { color: theme.primary }]}>Book now →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/records')}>
              <Text style={[styles.sectionActionText, { color: theme.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            {recentPayment ? (
              <ActivityCard
                icon="credit-card"
                iconBg={theme.status.success.background}
                iconColor={theme.status.success.text}
                title={recentPayment.description || 'Payment'}
                meta={`${formatKoboToNaira(recentPayment.amountKobo)} · ${new Date(recentPayment.createdAt).toLocaleDateString('en-NG')}`}
                status={recentPayment.status === 'paid' ? 'confirmed' : 'amber'}
                statusLabel={recentPayment.status === 'paid' ? 'Paid' : recentPayment.status}
                onPress={() => router.push('/invoices')}
              />
            ) : null}

            {latestVitals ? (
              <ActivityCard
                icon="activity"
                iconBg={theme.primaryLight}
                iconColor={theme.primary}
                title="Vitals recorded"
                meta={`Heart Rate: ${latestVitals.heartRate ?? '—'} bpm · ${new Date(latestVitals.recordedAt).toLocaleDateString('en-NG')}`}
                status="confirmed"
                statusLabel="Done"
                onPress={() => router.push('/(tabs)/vitals')}
              />
            ) : null}

            {!recentPayment && !latestVitals ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.emptyCardText, { color: theme.textMuted }]}>No recent activity</Text>
              </View>
            ) : null}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  subGreeting: { fontSize: 12, fontWeight: '500' },
  greeting: { fontSize: 19, fontWeight: '800', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  unreadBadge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
  heroWellnessWrapper: { marginBottom: 24, borderRadius: 20, shadowColor: '#0E4A30', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
  heroWellness: { borderRadius: 20, overflow: 'hidden' },
  heroWellnessImage: { borderRadius: 20, resizeMode: 'cover' },
  heroWellnessOverlay: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wellnessLeft: { flex: 1 },
  wellnessScoreLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '500', opacity: 0.8 },
  wellnessScoreValue: { color: '#FFFFFF', fontSize: 38, fontWeight: '900', lineHeight: 44 },
  wellnessScoreSub: { color: '#FFFFFF', fontSize: 11, opacity: 0.85, marginTop: 2 },
  wellnessRight: { gap: 6, alignItems: 'flex-end' },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricLabel: { color: '#FFFFFF', fontSize: 11, opacity: 0.8 },
  vitalBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  vitalBadgeText: { fontSize: 10, fontWeight: '700' },
  section: { marginBottom: 24 },
  sectionSubtitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 10 },
  quickActionGrid: { flexDirection: 'row', gap: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionActionText: { fontSize: 13, fontWeight: '600' },
  activityList: { gap: 10 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', gap: 8 },
  emptyCardText: { fontSize: 14 },
  emptyCardAction: { fontSize: 14, fontWeight: '700' },
});
