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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Camera,
  ChevronDown,
  Check,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import EmergencyFAB from '@/components/EmergencyFAB';
import { patients, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function EditProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const authUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: profileRes } = useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: () => patients.getMyProfile(),
  });

  const profile = profileRes?.data;

  const [formData, setFormData] = useState({
    firstName: profile?.firstName ?? authUser?.firstName ?? '',
    lastName: profile?.lastName ?? authUser?.lastName ?? '',
    email: profile?.user?.email ?? authUser?.email ?? '',
    phone: profile?.user?.phone ?? authUser?.phone ?? '',
    dateOfBirth: profile?.dateOfBirth ?? '',
    gender: profile?.gender ?? 'Female',
    bloodType: profile?.bloodGroup ?? 'O+',
    height: profile?.medicalInfo?.heightCm ? String(profile.medicalInfo.heightCm) : '170',
    weight: profile?.medicalInfo?.weightKg ? String(profile.medicalInfo.weightKg) : '65',
    address: profile?.address ?? '',
    city: profile?.city ?? '',
    country: profile?.country ?? 'Nigeria',
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      return patients.update(profile.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        bloodGroup: formData.bloodType,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        medicalInfo: {
          heightCm: parseFloat(formData.height) || undefined,
          weightKg: parseFloat(formData.weight) || undefined,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', 'profile'] });
      Alert.alert(
        'Profile Updated',
        'Your profile information has been saved successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Failed to update profile on server.';
      Alert.alert('Error', msg);
    },
  });

  const handleSaveChanges = () => {
    updateMutation.mutate();
  };

  const handleChangePhoto = () => {
    Alert.alert('Change Profile Photo', 'Choose an option to update your photo:', [
      { text: 'Take Photo', onPress: () => {} },
      { text: 'Choose from Gallery', onPress: () => {} },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>

        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarBox, { backgroundColor: theme.primaryDark }]}>
            <Text style={styles.avatarText}>AO</Text>
          </View>
          <TouchableOpacity
            onPress={handleChangePhoto}
            activeOpacity={0.75}
            style={styles.changePhotoBtn}>
            <Camera size={16} color={theme.primary} />
            <Text style={[styles.changePhotoText, { color: theme.primary }]}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>PERSONAL INFORMATION</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>FIRST NAME</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>LAST NAME</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>DATE OF BIRTH</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={formData.dateOfBirth}
              onChangeText={(text) => setFormData({ ...formData, dateOfBirth: text })}
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>GENDER</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                const nextGender = formData.gender === 'Female' ? 'Male' : 'Female';
                setFormData({ ...formData, gender: nextGender });
              }}
              style={[styles.dropdownField, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.dropdownText, { color: theme.text }]}>{formData.gender}</Text>
              <ChevronDown size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>BLOOD TYPE</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                const types = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
                const currentIndex = types.indexOf(formData.bloodType);
                const nextType = types[(currentIndex + 1) % types.length];
                setFormData({ ...formData, bloodType: nextType });
              }}
              style={[styles.dropdownField, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.dropdownText, { color: theme.text }]}>{formData.bloodType}</Text>
              <ChevronDown size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Physical Measurements */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>PHYSICAL MEASUREMENTS</Text>

          <View style={styles.twoColRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: theme.textMuted }]}>HEIGHT (CM)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={formData.height}
                onChangeText={(text) => setFormData({ ...formData, height: text })}
                keyboardType="numeric"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: theme.textMuted }]}>WEIGHT (KG)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={formData.weight}
                onChangeText={(text) => setFormData({ ...formData, weight: text })}
                keyboardType="numeric"
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>CONTACT INFORMATION</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>EMAIL</Text>
            <TextInput
              editable={false}
              style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textMuted, opacity: 0.8 }]}
              value={formData.email}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>PHONE NUMBER</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>ADDRESS</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>CITY</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>COUNTRY</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={formData.country}
              onChangeText={(text) => setFormData({ ...formData, country: text })}
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>

        {/* Security Notice Card */}
        <View style={[styles.noticeCard, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.noticeText, { color: theme.primaryDark }]}>
            To ensure your safety and protect your personal information, some fields like email cannot be changed here. Contact support for assistance.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={handleSaveChanges}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Check size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            style={[styles.secondaryBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Cancel</Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  noticeCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionGroup: {
    gap: 10,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
