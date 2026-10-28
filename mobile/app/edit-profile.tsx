import { BLOOD_GROUP_LABELS, bloodGroupLabel } from '@/lib/bloodGroup';
import { buildProfileUpdate, GENOTYPES } from '@/lib/profileForm';
import { GENDER_CHOICES, genderForApi } from '@/lib/validation';
import React, { useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Camera,
  Check,
} from 'lucide-react-native';

import { ErrorState } from '@/components/states';
import Colors from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { useMyAvatar } from '@/lib/useMyAvatar';
import { useColorScheme } from '@/components/useColorScheme';
import EmergencyFAB from '@/components/EmergencyFAB';
import { patients } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import { uploadProfilePhoto } from '@/lib/profilePhoto';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function EditProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const authUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: profileRes, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: () => patients.getMyProfile(),
  });

  const profile = profileRes?.data;

  const toForm = (p?: typeof profile) => ({
    firstName: p?.firstName ?? authUser?.firstName ?? '',
    lastName: p?.lastName ?? authUser?.lastName ?? '',
    email: p?.user?.email ?? authUser?.email ?? '',
    phone: p?.user?.phone ?? authUser?.phone ?? '',
    dateOfBirth: p?.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : '',
    gender: p?.gender ?? '',
    bloodType: bloodGroupLabel(p?.bloodGroup) ?? '',
    genotype: p?.genotype ?? '',
    height: p?.medicalInfo?.heightCm ? String(Number(p.medicalInfo.heightCm)) : '',
    weight: p?.medicalInfo?.weightKg ? String(Number(p.medicalInfo.weightKg)) : '',
    address: p?.address ?? '',
    city: p?.city ?? '',
    state: p?.state ?? '',
    country: p?.country ?? 'Nigeria',
    nin: p?.nin ?? '',
  });
  const [formData, setFormData] = useState(() => toForm(profile));
  const set = (patch: Partial<typeof formData>) => setFormData((f) => ({ ...f, ...patch }));

  // The form is created before the profile request resolves, so fill it from
  // the real profile once it arrives. Without this the defaults stay in place
  // and Save overwrites the patient's actual details.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!profile || hydrated) return;
    setHydrated(true);
    setFormData(toForm(profile));
  }, [profile, hydrated]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Your profile has not loaded yet. Please wait a moment and try again.');
      const built = buildProfileUpdate(formData);
      if (!built.ok) throw new Error(built.message);
      return patients.update(profile.id, built.body);
    },
    onSuccess: (res) => {
      if (res?.data) qc.setQueryData(['patient', 'profile'], res);
      qc.invalidateQueries({ queryKey: ['patient', 'profile'] });
      // Other screens greet the patient from the auth store; keep its name in step.
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore.setState({ user: { ...current, firstName: formData.firstName.trim(), lastName: formData.lastName.trim() } });
      }
      Alert.alert(
        'Profile Updated',
        'Your profile information has been saved successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Failed to update profile on server.';
      Alert.alert('Profile not saved', msg);
    },
  });

  const handleSaveChanges = () => {
    if (!updateMutation.isPending) updateMutation.mutate();
  };

  const chips = (options: { value: string; label: string }[], selected: string, onPick: (v: string) => void) => (
    <View style={styles.chipRow}>
      {options.map(({ value, label }) => {
        const on = selected === value;
        return (
          <TouchableOpacity
            key={value}
            onPress={() => onPick(on ? '' : value)}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.chip, { borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.primary : theme.surface }]}>
            <Text style={[styles.chipText, { color: on ? '#FFFFFF' : theme.text }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
  const asOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

  const avatar = useMyAvatar();
  const photoUrl = avatar.uri;
  const [photoBusy, setPhotoBusy] = useState(false);

  const setAvatar = (avatarUrl?: string) => {
    const current = useAuthStore.getState().user;
    if (current) useAuthStore.setState({ user: { ...current, avatarUrl } });
    // Write the new value (null when removed) into the cached profile so the
    // screen never falls back to a stale profilePhotoUrl while it refetches.
    qc.setQueryData(['patient', 'profile'], (old: typeof profileRes) =>
      old ? { ...old, data: { ...old.data, profilePhotoUrl: avatarUrl ?? null } } : old,
    );
    qc.invalidateQueries({ queryKey: ['patient', 'profile'] });
  };

  const pickAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo access in your device settings to choose a profile photo.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      setPhotoBusy(true);
      const url = await uploadProfilePhoto(picked.assets[0]);
      setAvatar(url ?? undefined);
    } catch (err) {
      Alert.alert('Could not update photo', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      await patients.removeProfilePhoto();
      setAvatar(undefined);
    } catch (err) {
      Alert.alert('Could not remove photo', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleChangePhoto = () => {
    if (photoBusy) return;
    if (!photoUrl) {
      void pickAndUpload();
      return;
    }
    Alert.alert('Profile photo', undefined, [
      { text: 'Choose new photo', onPress: () => void pickAndUpload() },
      { text: 'Remove photo', style: 'destructive', onPress: () => void removePhoto() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>

        <View style={{ width: 60 }} />
      </View>

      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {profileError && !profile ? (
          <ErrorState title="Couldn't load your profile" onRetry={() => refetchProfile()} />
        ) : null}
        
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarBox}>
            <Avatar {...avatar} size={80} />
            {photoBusy && (
              <View style={styles.avatarBusy}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleChangePhoto}
            activeOpacity={0.75}
            style={styles.changePhotoBtn}>
            <Camera size={16} color={theme.primary} />
            <Text style={[styles.changePhotoText, { color: theme.primary }]}>{photoBusy ? 'Updating…' : 'Change Photo'}</Text>
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
              onChangeText={(text) => set({ dateOfBirth: text })}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>GENDER</Text>
            {chips(
              GENDER_CHOICES.map(({ value, label }) => ({ value: genderForApi(value), label })),
              formData.gender,
              (gender) => set({ gender }),
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>BLOOD TYPE</Text>
            {chips(asOptions(BLOOD_GROUP_LABELS), formData.bloodType, (bloodType) => set({ bloodType }))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>GENOTYPE</Text>
            {chips(asOptions(GENOTYPES), formData.genotype, (genotype) => set({ genotype }))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>NATIONAL HEALTHCARE ID / INSURANCE NO.</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={formData.nin}
              onChangeText={(text) => set({ nin: text })}
              placeholder="Optional"
              autoCapitalize="characters"
              placeholderTextColor={theme.textMuted}
            />
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
              editable={false}
              style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textMuted, opacity: 0.8 }]}
              value={formData.phone}
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
              onChangeText={(text) => set({ city: text })}
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>STATE</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={formData.state}
              onChangeText={(text) => set({ state: text })}
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
            disabled={!profile || updateMutation.isPending}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: !profile || updateMutation.isPending ? 0.6 : 1 }]}>
            {updateMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Check size={18} color="#FFFFFF" />}
            <Text style={styles.primaryBtnText}>{updateMutation.isPending ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back"
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
    marginBottom: 10,
  },
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 13,
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
