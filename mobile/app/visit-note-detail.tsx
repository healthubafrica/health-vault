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
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Share2,
  Calendar,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import EmergencyFAB from '@/components/EmergencyFAB';

export default function VisitNoteDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const noteType = (params.type as string) || 'Visit note';
  const noteDate = (params.date as string) || '';
  const noteProvider = (params.provider as string) || 'Clinician';
  const noteSummary = ((params.summary as string) || '').trim();

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${noteType} - ${noteDate}`,
        message: `Clinical Encounter Summary: ${noteType} with ${noteProvider} on ${noteDate}. Secured via MyHealth Vault+.`,
      });
    } catch {}
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>Visit Note</Text>

        <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.7}>
          <Share2 size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Visit Header Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{noteType}</Text>
          </View>

          <View style={[styles.metaTable, { borderTopColor: theme.border }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>PROVIDER</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{noteProvider}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>DATE & TIME</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{noteDate}</Text>
            </View>
          </View>
        </View>

        {/* Real note content only */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>SUMMARY</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.bodyText, { color: theme.text }]}>
              {noteSummary || 'No written summary was recorded for this visit.'}
            </Text>
          </View>
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={() => router.push('/book-appointment-step1')}
            activeOpacity={0.85}
            style={[styles.secondaryBtn, { backgroundColor: theme.primaryLight }]}>
            <Calendar size={18} color={theme.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.primaryDark }]}>Book a follow-up</Text>
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
  shareBtn: {
    width: 44,
    height: 44,
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
  cardTop: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  cardFacility: {
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
  section: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  findingsList: {
    gap: 8,
  },
  findingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  findingText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  medsList: {
    gap: 8,
  },
  medCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  medName: {
    fontSize: 14,
    fontWeight: '600',
  },
  followUpCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  followUpText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionGroup: {
    gap: 10,
    marginTop: 8,
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
