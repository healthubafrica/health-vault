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
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Phone,
  Video,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { appointments } from '@/lib/api';

export default function TeleCareWaitingRoomScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => appointments.list({ upcoming: true }),
  });

  const nextTelecare = (data?.data ?? [])
    .filter((a) => a.isTelecare)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  const providerName = nextTelecare?.provider
    ? `${nextTelecare.provider.title ?? 'Dr.'} ${nextTelecare.provider.firstName} ${nextTelecare.provider.lastName}`
    : 'Provider TBD';
  const providerInitials = nextTelecare?.provider
    ? `${nextTelecare.provider.firstName[0] ?? ''}${nextTelecare.provider.lastName[0] ?? ''}`.toUpperCase()
    : '—';

  const handleJoinCall = () => {
    if (!nextTelecare) return;
    router.push({ pathname: '/telecare-call', params: { sessionId: nextTelecare.id } });
  };

  const handleEndSession = () => {
    Alert.alert('Leave Waiting Room', 'Are you sure you want to exit the TeleCare waiting room?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.replace('/(tabs)') },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>TeleCare</Text>
        <View style={styles.headerRight}>
          <TopHeaderEmergency />
          <TouchableOpacity
            onPress={() => router.push('/telecare-settings')}
            style={styles.settingsBtn}
            activeOpacity={0.7}>
            <Settings size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : !nextTelecare ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center', paddingVertical: 24 }]}>
            <Video size={32} color={theme.textMuted} />
            <Text style={[styles.providerName, { color: theme.text, marginTop: 10 }]}>No upcoming TeleCare session</Text>
            <Text style={[styles.specialtyText, { color: theme.textMuted, marginTop: 4, textAlign: 'center' }]}>
              Book a TeleCare appointment to see your waiting room here.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/book-appointment-step1', params: { preselect: 'telecare' } })}
              style={[styles.joinBtn, { backgroundColor: theme.primary, marginTop: 16, paddingHorizontal: 24 }]}>
              <Video size={16} color="#FFFFFF" />
              <Text style={styles.joinBtnText}>Book TeleCare</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <>
        {/* Appointment Summary Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.providerRow}>
            <View style={[styles.avatarBox, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>{providerInitials}</Text>
            </View>
            <View style={styles.providerInfo}>
              <Text style={[styles.providerName, { color: theme.text }]}>{providerName}</Text>
              <Text style={[styles.specialtyText, { color: theme.textMuted }]}>{nextTelecare.provider?.specialty || 'General Practitioner'}</Text>
            </View>
            <StatusPill status="green" label={nextTelecare.status === 'confirmed' ? 'Confirmed' : nextTelecare.status} />
          </View>

          <View style={[styles.metaTable, { borderTopColor: theme.border }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>TIME</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>
                {new Date(nextTelecare.scheduledAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>DURATION</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{nextTelecare.durationMinutes} mins</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>REFERENCE</Text>
              <Text style={[styles.meetingCodeText, { color: theme.text }]}>{nextTelecare.hhaRef}</Text>
            </View>
          </View>
        </View>

        {/* Camera Preview Placeholder Box */}
        <View style={styles.cameraBox}>
          <View style={styles.cameraContent}>
            {cameraOn ? (
              <Camera size={44} color="#A0A0A0" opacity={0.6} />
            ) : (
              <CameraOff size={44} color="#A0A0A0" opacity={0.6} />
            )}
            <Text style={styles.cameraStateText}>
              {cameraOn ? 'Camera preview active' : 'Camera turned off'}
            </Text>

            {/* Provider Waiting Badge */}
            <View style={styles.waitingBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.waitingBadgeText}>Waiting for provider</Text>
            </View>
          </View>
        </View>

        {/* Waiting Status Notice */}
        <View style={[styles.noticeCard, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.noticeText, { color: theme.primaryDark }]}>
            The provider has not joined the session yet. Your camera and microphone are ready. Please wait a moment.
          </Text>
        </View>

        {/* Device Status Checks */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>DEVICE STATUS</Text>
          <View style={styles.deviceList}>
            <View style={[styles.deviceItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.deviceLeft}>
                <Camera size={20} color={cameraOn ? theme.status.success.border : theme.textMuted} />
                <Text style={[styles.deviceName, { color: theme.text }]}>Camera</Text>
              </View>
              <View style={styles.deviceRight}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: cameraOn ? theme.status.success.border : theme.border },
                  ]}
                />
                <Text style={[styles.statusText, { color: theme.textMuted }]}>{cameraOn ? 'On' : 'Off'}</Text>
              </View>
            </View>

            <View style={[styles.deviceItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.deviceLeft}>
                <Mic size={20} color={micOn ? theme.status.success.border : theme.textMuted} />
                <Text style={[styles.deviceName, { color: theme.text }]}>Microphone</Text>
              </View>
              <View style={styles.deviceRight}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: micOn ? theme.status.success.border : theme.border },
                  ]}
                />
                <Text style={[styles.statusText, { color: theme.textMuted }]}>{micOn ? 'On' : 'Off'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Media Controls & Join CTAs */}
        <View style={styles.controlsSection}>
          {/* Media Toggles */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => setCameraOn(!cameraOn)}
              activeOpacity={0.8}
              style={[
                styles.toggleBtn,
                {
                  borderColor: cameraOn ? theme.primary : theme.border,
                  backgroundColor: cameraOn ? theme.primaryLight : theme.surface,
                },
              ]}>
              {cameraOn ? (
                <Camera size={18} color={theme.primary} />
              ) : (
                <CameraOff size={18} color={theme.textMuted} />
              )}
              <Text
                style={[
                  styles.toggleBtnText,
                  { color: cameraOn ? theme.primary : theme.textMuted },
                ]}>
                {cameraOn ? 'Camera On' : 'Camera Off'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMicOn(!micOn)}
              activeOpacity={0.8}
              style={[
                styles.toggleBtn,
                {
                  borderColor: micOn ? theme.primary : theme.border,
                  backgroundColor: micOn ? theme.primaryLight : theme.surface,
                },
              ]}>
              {micOn ? (
                <Mic size={18} color={theme.primary} />
              ) : (
                <MicOff size={18} color={theme.textMuted} />
              )}
              <Text
                style={[
                  styles.toggleBtnText,
                  { color: micOn ? theme.primary : theme.textMuted },
                ]}>
                {micOn ? 'Mic On' : 'Mic Off'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Join Call Button */}
          <TouchableOpacity
            onPress={handleJoinCall}
            disabled={isConnecting}
            activeOpacity={0.85}
            style={[styles.joinBtn, { backgroundColor: '#006022' }]}>
            <Phone size={18} color="#FFFFFF" />
            <Text style={styles.joinBtnText}>{isConnecting ? 'Connecting...' : 'Join Call'}</Text>
          </TouchableOpacity>

          {/* End Session Button */}
          <TouchableOpacity
            onPress={handleEndSession}
            activeOpacity={0.85}
            style={[styles.endBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.endBtnText, { color: theme.text }]}>End Session</Text>
          </TouchableOpacity>
        </View>
        </>
        )}

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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsBtn: {
    width: 40,
    height: 40,
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
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '800',
  },
  specialtyText: {
    fontSize: 12,
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
  meetingCodeText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  cameraBox: {
    borderRadius: 20,
    backgroundColor: '#121614',
    aspectRatio: 16 / 10,
    maxHeight: 260,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cameraContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 10,
  },
  cameraStateText: {
    color: '#A0A0A0',
    fontSize: 13,
    fontWeight: '500',
  },
  waitingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E8930A',
  },
  waitingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  noticeCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
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
  deviceList: {
    gap: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  deviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  controlsSection: {
    gap: 10,
    marginTop: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  endBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  endBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
