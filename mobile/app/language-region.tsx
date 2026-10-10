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
  Globe,
  Coins,
  Scale,
  Clock,
  Check,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ErrorState } from '@/components/states';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { patients, ApiError } from '@/lib/api';

const LANGUAGES = [
  { id: 'en', name: 'English', flag: '' },
  { id: 'ha', name: 'Hausa', flag: '' },
  { id: 'yo', name: 'Yorùbá', flag: '' },
  { id: 'ig', name: 'Igbo', flag: '' },
  { id: 'fr', name: 'Français', flag: '' },
  { id: 'sw', name: 'Kiswahili', flag: '' },
];



export default function LanguageRegionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const { data: profileData, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: () => patients.getMyProfile(),
  });
  const profile = profileData?.data;

  const [selectedLanguage, setSelectedLanguage] = useState('en');

  // Only preferredLanguage is actually persisted server-side — currency,
  // unit system, and time format have no backing profile field yet, so
  // they stay local-only UI state rather than fake-saving them.
  React.useEffect(() => {
    if (profile?.preferredLanguage) setSelectedLanguage(profile.preferredLanguage);
  }, [profile?.preferredLanguage]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!profile) throw new Error('Profile not loaded yet');
      return patients.update(profile.id, { preferredLanguage: selectedLanguage });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', 'profile'] });
      Alert.alert('Preferences Saved', 'Your display language has been updated.');
      router.back();
    },
    onError: (err: unknown) => {
      Alert.alert('Could not save', err instanceof ApiError ? err.message : 'Please try again.');
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Language & Region</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={saveMutation.isPending}
          onPress={handleSave}
          style={styles.saveBtn}>
          <Text style={[styles.saveBtnText, { color: theme.primary, opacity: saveMutation.isPending ? 0.5 : 1 }]}>
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {profileError && !profile ? (
          <ErrorState title="Couldn't load your profile" onRetry={() => refetchProfile()} />
        ) : null}

        {/* Language Section */}
        <View style={styles.sectionHeader}>
          <Globe size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Display Language</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {LANGUAGES.map((lang, idx) => {
            const isSelected = selectedLanguage === lang.id;
            return (
              <React.Fragment key={lang.id}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setSelectedLanguage(lang.id)}
                  style={styles.optionRow}>
                  <Text style={styles.flagText}>{lang.flag}</Text>
                  <Text style={[styles.optionName, { color: theme.text }]}>{lang.name}</Text>
                  {isSelected && <Check size={18} color={theme.primary} strokeWidth={2.5} />}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        <Text style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center', marginTop: 12 }}>
          Your choice is saved to your profile. The app is currently shown in English; translations are being added.
        </Text>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  saveBtn: {
    padding: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  flagText: {
    fontSize: 20,
  },
  currSymbolBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currSymbolText: {
    fontSize: 14,
    fontWeight: '800',
  },
  optionName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});
