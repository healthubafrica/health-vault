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
  FileText,
  File,
  Download,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import EmergencyFAB from '@/components/EmergencyFAB';

export default function DocumentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const docName = (params.name as string) || 'Lab Report - March 2025';
  const docDate = (params.date as string) || '14 Mar 2025';
  const docLab = (params.lab as string) || 'Pathcare Laboratory';
  const docType = (params.type as string) || 'PDF';
  const docSize = (params.size as string) || '2.4 MB';
  const docPages = (params.pages as string) || '3';
  const docSummary =
    (params.summary as string) ||
    'Full Blood Panel - Complete metabolic and hematologic analysis';

  const handleShare = async () => {
    try {
      await Share.share({
        title: docName,
        message: `Health Document: ${docName} (${docDate}) from ${docLab}. Secured via MyHealth Vault+.`,
      });
    } catch {
      // Ignored
    }
  };

  const handleDownload = () => {
    Alert.alert('Download Started', `Downloading ${docName} (${docSize}) to your device.`);
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>Document</Text>

        <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.7}>
          <Share2 size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Document Metadata Card */}
        <View style={[styles.metaCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.metaTop}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(39, 126, 255, 0.1)' }]}>
              <FileText size={24} color={theme.primary} />
            </View>
            <View style={styles.metaHeadInfo}>
              <Text numberOfLines={2} style={[styles.docTitle, { color: theme.text }]}>
                {docName}
              </Text>
              <Text style={[styles.labSubtitle, { color: theme.textMuted }]}>{docLab}</Text>
            </View>
          </View>

          <View style={[styles.metaList, { borderTopColor: theme.border }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>DATE</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{docDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>TYPE</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{docType}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>SIZE</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{docSize}</Text>
            </View>
          </View>
        </View>

        {/* Document Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>SUMMARY</Text>
          <Text style={[styles.summaryBody, { color: theme.text }]}>{docSummary}</Text>
        </View>

        {/* Document Preview Placeholder */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>PREVIEW</Text>
          <View style={[styles.previewContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <File size={48} color={theme.primary} opacity={0.4} style={{ marginBottom: 12 }} />
            <Text style={[styles.previewPageText, { color: theme.text }]}>
              PDF file with {docPages} pages
            </Text>
            <Text style={[styles.previewSubtext, { color: theme.textMuted }]}>
              Open in PDF viewer to see full document
            </Text>
          </View>
        </View>

        {/* Key Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>KEY INFORMATION</Text>
          <View style={styles.infoCardsList}>
            <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>ISSUED BY</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{docLab}</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>TEST TYPE</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>Full Blood Panel</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>STATUS</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>Complete & Reviewed</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={handleDownload}
            activeOpacity={0.85}
            style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}>
            <Download size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Download</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.85}
            style={[styles.secondaryActionBtn, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.secondaryActionText, { color: theme.primaryDark }]}>Share Document</Text>
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
  metaCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  metaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaHeadInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  labSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  metaList: {
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
    marginBottom: 18,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewContainer: {
    minHeight: 240,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  previewPageText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  previewSubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  infoCardsList: {
    gap: 8,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionGroup: {
    gap: 10,
    marginTop: 6,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
