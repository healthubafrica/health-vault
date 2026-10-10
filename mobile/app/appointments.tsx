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
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Calendar,
  Video,
  Plus,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { appointments, telecare, analytics, Appointment, ApiError } from '@/lib/api';
import { canCancel, canJoinCall, findSessionForAppointment, isPastStatus, statusPill } from '@/lib/appointments';


export default function AppointmentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const { data: upcomingData, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => appointments.list({ upcoming: true }),
  });

  const { data: pastData, isLoading: loadingPast } = useQuery({
    queryKey: ['appointments', 'past'],
    // Past = completed, cancelled and missed. The API filters by one status,
    // so fetch recent appointments and keep the finished ones.
    queryFn: async () => {
      const res = await appointments.list();
      return { ...res, data: res.data.filter((a) => isPastStatus(a.status)) };
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      appointments.cancel(id, reason),
    onSuccess: () => {
      analytics.track('booking_cancelled');
      qc.invalidateQueries({ queryKey: ['appointments'] });
      Alert.alert('Cancelled', 'Your appointment has been cancelled.');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Failed to cancel appointment.';
      Alert.alert('Error', msg);
    },
  });

  const currentList: Appointment[] =
    activeTab === 'upcoming'
      ? (upcomingData?.data ?? [])
      : (pastData?.data ?? []);

  const isLoading = activeTab === 'upcoming' ? loadingUpcoming : loadingPast;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  };

  const handleCancel = (appt: Appointment) => {
    Alert.alert(
      'Cancel Appointment',
      `Cancel your appointment with ${appt.provider ? `${appt.provider.title} ${appt.provider.lastName}` : 'provider'}?`,
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Cancel Appointment',
          style: 'destructive',
          onPress: () => cancelMutation.mutate({ id: appt.id, reason: 'Patient request' }),
        },
      ]
    );
  };

  const joinCall = async (item: Appointment) => {
    try {
      // The video token is issued per TelecareSession, not per appointment.
      const sessions = (await telecare.list()).data;
      const session = findSessionForAppointment(sessions, item.id);
      if (!session) {
        Alert.alert('Session not ready', 'Your video room opens once the appointment is confirmed. Please check back shortly.');
        return;
      }
      router.push({ pathname: '/telecare-call', params: { sessionId: session.id } });
    } catch (err) {
      Alert.alert('Could not join', err instanceof ApiError ? err.message : 'Please try again.');
    }
  };

  const handleAction = (item: Appointment) => {
    if (canJoinCall(item)) {
      void joinCall(item);
    } else if (canCancel(item.status)) {
      Alert.alert(
        'Appointment Options',
        `Choose an action for your appointment:`,
        [
          { text: 'Cancel Appointment', style: 'destructive', onPress: () => handleCancel(item) },
          { text: 'Dismiss', style: 'cancel' },
        ]
      );
    }
  };

  const handleBookAppointment = () => {
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>Appointments</Text>

        <TopHeaderEmergency />
      </View>

      {/* Segmented Control Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('upcoming')}
          style={[
            styles.tabButton,
            activeTab === 'upcoming'
              ? { backgroundColor: theme.primary }
              : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
          ]}>
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'upcoming' ? '#FFFFFF' : theme.text },
            ]}>
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('past')}
          style={[
            styles.tabButton,
            activeTab === 'past'
              ? { backgroundColor: theme.primary }
              : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
          ]}>
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'past' ? '#FFFFFF' : theme.text },
            ]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : currentList.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color={theme.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {activeTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              {activeTab === 'upcoming'
                ? 'Book your first appointment to get started.'
                : 'Your consultation history will appear here.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {currentList.map((appointment) => {
              const TypeIcon = appointment.isTelecare ? Video : Calendar;
              const providerName = appointment.provider
                ? `${appointment.provider.title} ${appointment.provider.firstName} ${appointment.provider.lastName}`
                : 'Provider TBC';
              const providerInitials = appointment.provider
                ? `${appointment.provider.firstName[0]}${appointment.provider.lastName[0]}`
                : '?';
              const specialty = appointment.provider?.specialty ?? appointment.serviceType;

              return (
                <View
                  key={appointment.id}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {/* Provider Info Row */}
                  <View style={styles.providerRow}>
                    <View style={[styles.avatarBox, { backgroundColor: theme.primaryLight }]}>
                      <Text style={[styles.avatarText, { color: theme.primary }]}>
                        {providerInitials}
                      </Text>
                    </View>
                    <View style={styles.providerDetails}>
                      <Text style={[styles.providerName, { color: theme.text }]}>
                        {providerName}
                      </Text>
                      <Text style={[styles.specialtyText, { color: theme.textMuted }]}>
                        {specialty}
                      </Text>
                      <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                        <StatusPill {...statusPill(appointment.status)} />
                      </View>
                    </View>
                  </View>

                  {/* Date and Modality Details */}
                  <View style={[styles.detailsRow, { borderTopColor: theme.border }]}>
                    <TypeIcon size={16} color={theme.primary} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dateText, { color: theme.text }]}>{formatDate(appointment.scheduledAt)}</Text>
                      <Text style={[styles.modalityText, { color: theme.textMuted }]}>
                        {appointment.isTelecare ? 'Video call consultation' : 'In-person clinic visit'}
                      </Text>

                    </View>
                  </View>

                  {/* Action CTA Button */}
                  {(canJoinCall(appointment) || canCancel(appointment.status)) && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleAction(appointment)}
                      style={[
                        styles.actionBtn,
                        canJoinCall(appointment)
                          ? { backgroundColor: theme.primary }
                          : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
                      ]}>
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: canJoinCall(appointment) ? '#FFFFFF' : theme.text },
                        ]}>
                        {canJoinCall(appointment) ? 'Join Call' : 'Options'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Book Appointment Button */}
      <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleBookAppointment}
          style={[styles.bookMainBtn, { backgroundColor: theme.primary }]}>
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.bookMainBtnText}>Book Appointment</Text>
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
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
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '800',
  },
  specialtyText: {
    fontSize: 12,
    marginTop: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalityText: {
    fontSize: 11,
    marginTop: 1,
  },
  actionBtn: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  bookMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bookMainBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
