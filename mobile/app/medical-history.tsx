import React from 'react';
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
  ChevronLeft,
  Edit2,
  Info,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import EmergencyFAB from '@/components/EmergencyFAB';
import { patients } from '@/lib/api';

interface HistoryCategory {
  id: string;
  category: string;
  items: string[];
}

export default function MedicalHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { data, isLoading } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: () => patients.getMyProfile(),
  });

  const medicalInfo = data?.data.medicalInfo;
  // Only categories the backend actually stores (PatientMedicalInfo) —
  // no fabricated "past surgeries" / "family history" the schema has no
  // column for.
  const categories: HistoryCategory[] = medicalInfo
    ? [
        { id: 'allergies', category: 'Allergies', items: medicalInfo.allergies ?? [] },
        { id: 'conditions', category: 'Current Conditions', items: medicalInfo.chronicConditions ?? [] },
        { id: 'medications', category: 'Current Medications', items: medicalInfo.activeMedications ?? [] },
        { id: 'immunizations', category: 'Vaccinations', items: medicalInfo.immunizations ?? [] },
      ].filter((c) => c.items.length > 0)
    : [];

  const handleEditHistory = () => {
    Alert.alert(
      'Edit Medical History',
      'Clinical history editor opened. You can add new allergies, surgeries, or family conditions.'
    );
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>Medical History</Text>

        <TouchableOpacity onPress={handleEditHistory} style={styles.editBtn} activeOpacity={0.7}>
          <Edit2 size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Info Banner */}
        <View style={[styles.bannerCard, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.bannerText, { color: theme.primaryDark }]}>
            Your medical history is private and encrypted. Keep it up to date to help your providers make informed decisions.
          </Text>
        </View>

        {/* Medical History Categories */}
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : categories.length === 0 ? (
          <View style={[styles.categoryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.catTitle, { color: theme.text }]}>No medical history on file yet</Text>
            <Text style={[styles.footerText, { color: theme.textMuted, marginTop: 6 }]}>
              Add allergies, conditions, medications, and vaccinations from your profile.
            </Text>
          </View>
        ) : (
          categories.map((category) => (
            <View
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {/* Category Header */}
              <View style={styles.catHeaderRow}>
                <Text style={[styles.catTitle, { color: theme.text }]}>{category.category}</Text>
              </View>

              {/* Items List */}
              <View style={styles.itemsList}>
                {category.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={[styles.itemDot, { backgroundColor: theme.primary }]} />
                    <Text style={[styles.itemText, { color: theme.text }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        {/* Educational Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.infoRow}>
            <Info size={20} color={theme.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>Keep Your History Updated</Text>
              <Text style={[styles.infoBody, { color: theme.textMuted }]}>
                Regularly update your medical history to ensure your healthcare providers have accurate information for better care decisions.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            onPress={handleEditHistory}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Edit2 size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Edit Medical History</Text>
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
  bannerCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  categoryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  catHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  catTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  sevBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  sevText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemsList: {
    gap: 8,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionSection: {
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
});
