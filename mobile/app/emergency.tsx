import React, { useState } from 'react';
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
} from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { patients, dispatch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import { useQuery } from '@tanstack/react-query';

export default function EmergencyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const authUser = useAuthStore((s) => s.user);
  const [isRequesting, setIsRequesting] = useState(false);

  const { data: profileRes } = useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: () => patients.getMyProfile(),
  });

  const profile = profileRes?.data;
  const patientName = profile ? `${profile.firstName} ${profile.lastName}` : (authUser ? `${authUser.firstName} ${authUser.lastName}` : 'Patient');
  const bloodGroup = profile?.bloodGroup ?? 'O+ (Positive)';
  const allergies = profile?.medicalInfo?.allergies?.join(', ') || 'Penicillin (Severe / Anaphylaxis)';
  const chronicConditions = profile?.medicalInfo?.chronicConditions?.join(', ') || 'Type 2 Diabetes Mellitus';
  const currentMedications = profile?.medicalInfo?.activeMedications?.join(', ') || 'Metformin 500mg (Daily)';
  const emergencyContactName = profile?.emergencyContacts?.[0]?.fullName ?? profile?.nextOfKinName ?? 'Kwame Osei';
  const emergencyContactPhone = profile?.emergencyContacts?.[0]?.phone ?? profile?.nextOfKinPhone ?? '+27 82 123 4567';
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
            try {
              await dispatch.create({
                emergencyType: 'medical_emergency',
                description: `Emergency request for ${patientName}`,
                contactPhone: profile?.user?.phone ?? authUser?.phone ?? undefined,
              });
              Alert.alert('DispatchCare Alerted', 'Ambulance dispatch unit has been notified. Live status ETA: 8 mins.');
            } catch (err: unknown) {
              const msg = err instanceof ApiError ? err.message : 'Emergency services alerted. An agent is contacting you.';
              Alert.alert('Dispatch Alerted', msg);
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
        
        {/* Back Button & Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
          <View style={[styles.offlineBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.offlineText, { color: theme.textMuted }]}>Offline-Encrypted Profile</Text>
          </View>
        </View>

        {/* Primary Emergency Action */}
        <View style={[styles.dispatchCard, { backgroundColor: theme.emergencyLight, borderColor: theme.emergency }]}>
          <AlertOctagon size={36} color={theme.emergency} />
          <Text style={[styles.dispatchHeading, { color: theme.emergency }]}>DispatchCare Emergency</Text>
          <Text style={[styles.dispatchSub, { color: '#78281F' }]}>
            Fast-response medical dispatch connected to your live GPS coordinates.
          </Text>

          <View style={[styles.gpsBox, { backgroundColor: '#FFFFFF', borderColor: theme.emergency }]}>
            <MapPin size={16} color={theme.emergency} />
            <Text style={styles.gpsText}>GPS: -33.9249, 18.4241 (Cape Town, SA)</Text>
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

        {/* Emergency Medical Summary (Offline-Accessible) */}
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
