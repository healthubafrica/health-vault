import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  PhoneCall,
  AlertOctagon,
  MapPin,
  Heart,
  Droplets,
  Pill,
  Users,
  ShieldAlert,
  ChevronLeft,
  History,
} from 'lucide-react-native';
import { ErrorState } from '@/components/states';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import * as Location from 'expo-location';
import { patients, dispatch, analytics, ApiError } from '@/lib/api';
import { bloodGroupLabel } from '@/lib/bloodGroup';
import { useAuthStore } from '@/lib/stores/authStore';
import { useQuery } from '@tanstack/react-query';

// Backend EmergencyType has no generic "medical" value; "Other" is the catch-all.
const DISPATCH_EMERGENCY_TYPE = 'Other';
const EMERGENCY_NUMBER = '112';

async function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    if (fix) return { latitude: fix.coords.latitude, longitude: fix.coords.longitude };
    const last = await Location.getLastKnownPositionAsync();
    return last ? { latitude: last.coords.latitude, longitude: last.coords.longitude } : null;
  } catch {
    return null;
  }
}

export default function EmergencyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const authUser = useAuthStore((s) => s.user);
  const [isRequesting, setIsRequesting] = useState(false);
  // undefined = still locating, null = unavailable (permission denied / no fix)
  const [loc, setLoc] = useState<{ latitude: number; longitude: number } | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getCurrentCoordinates().then((c) => alive && setLoc(c)).catch(() => alive && setLoc(null));
    return () => {
      alive = false;
    };
  }, []);

  const { data: profileRes, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: () => patients.getMyProfile(),
  });

  const profile = profileRes?.data;
  const patientName = profile ? `${profile.firstName} ${profile.lastName}` : (authUser ? `${authUser.firstName} ${authUser.lastName}` : 'Patient');
  // Only real, recorded data: a responder must never be shown invented
  // allergies, medicines or contacts.
  const NOT_RECORDED = 'Not recorded';
  const bloodGroup = bloodGroupLabel(profile?.bloodGroup) ?? NOT_RECORDED;
  const allergies = profile?.medicalInfo?.allergies?.join(', ') || NOT_RECORDED;
  const chronicConditions = profile?.medicalInfo?.chronicConditions?.join(', ') || NOT_RECORDED;
  const currentMedications = profile?.medicalInfo?.activeMedications?.join(', ') || NOT_RECORDED;
  const emergencyContactName = profile?.emergencyContacts?.[0]?.fullName ?? profile?.nextOfKinName ?? NOT_RECORDED;
  const emergencyContactPhone = profile?.emergencyContacts?.[0]?.phone ?? profile?.nextOfKinPhone ?? NOT_RECORDED;
  const emergencyContactRel = profile?.emergencyContacts?.[0]?.relationship ?? profile?.nextOfKinRelationship ?? 'Contact';

  const handleDispatchCare = () => {
    Alert.alert(
      'Confirm DispatchCare Request',
      'This will immediately alert HHA Emergency Dispatch with your current GPS location and emergency medical profile. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Dispatch',
          style: 'destructive',
          onPress: async () => {
            setIsRequesting(true);
            analytics.track('dispatch_request_started', { emergencyType: DISPATCH_EMERGENCY_TYPE });
            try {
              // Best effort: a dispatcher needs the location, but never block
              // an emergency on a slow or denied GPS fix.
              const coords = await getCurrentCoordinates();
              const created = await dispatch.create({
                emergencyType: DISPATCH_EMERGENCY_TYPE,
                description: `Emergency request for ${patientName}`,
                contactPhone: profile?.user?.phone ?? authUser?.phone ?? undefined,
                ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
              });
              analytics.track('dispatch_request_success', { emergencyType: DISPATCH_EMERGENCY_TYPE });
              const caseId = created?.data?.id;
              Alert.alert(
                'Request sent',
                coords
                  ? 'DispatchCare has your request and location. A dispatcher will contact you shortly.'
                  : "DispatchCare has your request, but we couldn't get your location. Tell the dispatcher where you are when they call.",
                caseId
                  ? [
                      { text: 'OK', style: 'cancel' },
                      {
                        text: 'Track request',
                        onPress: () => router.push({ pathname: '/dispatch-case', params: { id: caseId } } as never),
                      },
                    ]
                  : undefined,
              );
            } catch (err: unknown) {
              analytics.track('dispatch_request_failure', { emergencyType: DISPATCH_EMERGENCY_TYPE });
              // Never imply help is coming when the request failed.
              Alert.alert(
                'Request NOT sent',
                (err instanceof ApiError ? err.message : 'We could not reach DispatchCare.') +
                  '\n\nCall ' + EMERGENCY_NUMBER + ' now.',
              );
            } finally {
              setIsRequesting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {profileError && !profile ? (
          <ErrorState title="Couldn't load your medical profile" onRetry={() => refetchProfile()} />
        ) : null}
        
        {/* Back Button & Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Emergency Action */}
        <View style={[styles.dispatchCard, { backgroundColor: theme.emergencyLight, borderColor: theme.emergency }]}>
          <AlertOctagon size={36} color={theme.emergency} />
          <Text style={[styles.dispatchHeading, { color: theme.emergency }]}>DispatchCare Emergency</Text>
          <Text style={[styles.dispatchSub, { color: '#78281F' }]}>
            Fast-response medical dispatch. We share your GPS location when you allow it.
          </Text>

          <View style={[styles.gpsBox, { backgroundColor: '#FFFFFF', borderColor: theme.emergency }]}>
            <MapPin size={16} color={theme.emergency} />
            <Text style={styles.gpsText}>
              {loc === undefined
                ? 'Getting your location…'
                : loc
                  ? `GPS: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`
                  : 'Location unavailable — allow location access or tell dispatch where you are'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleDispatchCare}
            activeOpacity={0.85}
            style={[styles.dispatchBtn, { backgroundColor: theme.emergency }]}>
            <PhoneCall size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.dispatchBtnText}>
              {isRequesting ? 'CONTACTING DISPATCH...' : 'REQUEST DISPATCHCARE'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/dispatch-history' as never)}
          style={[styles.historyLink, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <History size={18} color={theme.text} />
          <Text style={[styles.historyText, { color: theme.text }]}>View dispatch history</Text>
        </TouchableOpacity>

        {/* Emergency Medical Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Emergency Profile ({patientName})</Text>
          
          <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Blood Group */}
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
                <Droplets size={18} color="#C62828" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Blood Group</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{bloodGroup}</Text>
              </View>
            </View>

            {/* Allergies */}
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
                <ShieldAlert size={18} color="#E65100" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Critical Allergies</Text>
                <Text style={[styles.infoValue, { color: '#C0392B' }]}>{allergies}</Text>
              </View>
            </View>

            {/* Chronic Conditions */}
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Heart size={18} color="#2E7D32" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Chronic Conditions</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{chronicConditions}</Text>
              </View>
            </View>

            {/* Current Medications */}
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Pill size={18} color="#1565C0" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Current Medications</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{currentMedications}</Text>
              </View>
            </View>

            {/* Next of Kin / Contact */}
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.iconBox, { backgroundColor: '#EDE7F6' }]}>
                <Users size={18} color="#512DA8" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Emergency Contact ({emergencyContactRel})</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{emergencyContactName} • {emergencyContactPhone}</Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  offlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  offlineText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dispatchCard: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 24,
  },
  dispatchHeading: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
  dispatchSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  gpsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  gpsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333333',
  },
  dispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dispatchBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  historyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  profileCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
});
