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
  Edit2,
  X,
  Download,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import EmergencyFAB from '@/components/EmergencyFAB';
import { patients } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import { useQuery } from '@tanstack/react-query';

export default function MyProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const authUser = useAuthStore((s) => s.user);

  const [isEditing, setIsEditing] = useState(false);

  const { data: profileRes, isLoading } = useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: () => patients.getMyProfile(),
  });

  const profile = profileRes?.data;
  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : (authUser ? `${authUser.firstName} ${authUser.lastName}` : 'My Profile');
  const initials = profile ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase() : 'ME';
  const email = profile?.user?.email ?? authUser?.email ?? '';
  const phone = profile?.user?.phone ?? authUser?.phone ?? '—';
  const dob = profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const gender = profile?.gender ?? '—';
  const bloodGroup = profile?.bloodGroup ?? '—';
  const heightWeight = profile?.medicalInfo ? `${profile.medicalInfo.heightCm ?? '—'} cm / ${profile.medicalInfo.weightKg ?? '—'} kg` : '—';
  const address = profile?.address ? `${profile.address}, ${profile.city ?? ''}` : '—';
  const country = profile?.country ?? '—';
  const allergies = profile?.medicalInfo?.allergies?.length ? profile.medicalInfo.allergies : ['None reported'];
  const chronicConditions = profile?.medicalInfo?.chronicConditions?.length ? profile.medicalInfo.chronicConditions : ['None reported'];
  const emergencyContact = profile?.emergencyContacts?.[0] ?? { fullName: profile?.nextOfKinName ?? '—', relationship: profile?.nextOfKinRelationship ?? '—' };

  const handleDownloadRecord = () => {
    Alert.alert(
      'Download Full Health Dossier',
      'Generating verified PDF dossier containing vitals trends, prescription history, lab reports, and physician encounters.'
    );
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>My Profile</Text>

        <TouchableOpacity onPress={handleEditProfile} style={styles.editBtn} activeOpacity={0.7}>
          {isEditing ? (
            <X size={20} color={theme.primary} />
          ) : (
            <Edit2 size={20} color={theme.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Avatar & Basic Info */}
        <View style={[styles.avatarCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.bigAvatar, { backgroundColor: theme.primaryDark }]}>
            <Text style={styles.bigAvatarText}>{initials}</Text>
          </View>
          <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
          <Text style={[styles.userEmail, { color: theme.textMuted }]}>{email}</Text>
          <View style={[styles.memberBadge, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.memberBadgeText, { color: theme.primaryDark }]}>
              {profile?.hhaPatientId ? `Vault ID: ${profile.hhaPatientId}` : 'Verified Member'}
            </Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>PERSONAL INFORMATION</Text>

          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>DATE OF BIRTH</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{dob}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>GENDER</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{gender}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>BLOOD TYPE</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{bloodGroup}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>HEIGHT / WEIGHT</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{heightWeight}</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>CONTACT INFORMATION</Text>

          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>PHONE NUMBER</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{phone}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>ADDRESS</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{address}</Text>
            <Text style={[styles.subValue, { color: theme.textMuted }]}>{country}</Text>
          </View>
        </View>

        {/* Medical Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>MEDICAL INFORMATION</Text>

          {/* Allergies */}
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>ALLERGIES</Text>
            <View style={styles.tagWrap}>
              {allergies.map((allergy, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.allergyTag,
                    {
                      backgroundColor: theme.status.warning.background,
                      borderColor: theme.status.warning.border,
                    },
                  ]}>
                  <Text style={[styles.allergyTagText, { color: theme.status.warning.text }]}>
                    {allergy}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Chronic Conditions */}
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>CHRONIC CONDITIONS</Text>
            <View style={styles.conditionList}>
              {chronicConditions.map((cond, idx) => (
                <Text key={idx} style={[styles.conditionText, { color: theme.text }]}>
                  • {cond}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>EMERGENCY CONTACT</Text>

          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>NAME</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{emergencyContact.fullName}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>RELATIONSHIP</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{emergencyContact.relationship}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={handleEditProfile}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Edit2 size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>
              {isEditing ? 'Save Changes' : 'Edit Profile'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDownloadRecord}
            activeOpacity={0.85}
            style={[styles.secondaryBtn, { backgroundColor: theme.primaryLight }]}>
            <Download size={18} color={theme.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.primaryDark }]}>
              Download Health Record
            </Text>
          </TouchableOpacity>
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
  editBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  avatarCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  bigAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bigAvatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 12,
  },
  memberBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '700',
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
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  subValue: {
    fontSize: 12,
    marginTop: 2,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  allergyTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  allergyTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  conditionList: {
    gap: 4,
    marginTop: 4,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionGroup: {
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
