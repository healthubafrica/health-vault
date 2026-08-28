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
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  Share2,
  Download,
  MessageSquare,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import EmergencyFAB from '@/components/EmergencyFAB';
import { labs } from '@/lib/api';

export default function LabResultDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string; name?: string; date?: string; lab?: string; status?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { data, isLoading } = useQuery({
    queryKey: ['lab-order', params.orderId],
    queryFn: () => labs.getOrder(params.orderId as string),
    enabled: !!params.orderId,
  });

  const order = data?.data;
  const results = order?.results ?? [];
  const hasFlagged = results.some((r) => r.isFlagged);

  const testName = params.name || 'Lab Order';
  const testDate = params.date || (order ? new Date(order.orderedAt).toLocaleDateString() : '');
  const testLab = params.lab || order?.labFacility || 'Diagnostic Lab';
  const testStatus = params.status || 'ready';
  const referredBy = order?.provider ? `${order.provider.title ?? 'Dr.'} ${order.provider.firstName} ${order.provider.lastName}` : null;

  const handleShare = async () => {
    try {
      await Share.share({
        title: testName,
        message: `Diagnostic Report: ${testName} (${testDate}) from ${testLab}. Secured via MyHealth Vault+.`,
      });
    } catch {}
  };

  const handleDownload = () => {
    Alert.alert('Not available', 'Downloadable lab report PDFs are not available for this order yet.');
  };

  const getStatusColor = (isFlagged: boolean) => (isFlagged ? '#C0392B' : '#006022');
  const getStatusLabel = (isFlagged: boolean) => (isFlagged ? 'Flagged' : 'Normal');

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>Lab Results</Text>

        <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.7}>
          <Share2 size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Test Metadata Card */}
        <View style={[styles.metaCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.metaTop}>
            <View style={styles.metaLeft}>
              <Text style={[styles.testTitle, { color: theme.text }]}>{testName}</Text>
              <Text style={[styles.labSubtitle, { color: theme.textMuted }]}>{testLab}</Text>
            </View>
            <StatusPill
              status={testStatus === 'ready' ? 'green' : 'amber'}
              label={testStatus === 'ready' ? 'Ready' : 'Pending'}
            />
          </View>

          <View style={[styles.metaList, { borderTopColor: theme.border }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.textMuted }]}>DATE</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{testDate}</Text>
            </View>
            {referredBy && (
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: theme.textMuted }]}>REFERRED BY</Text>
                <Text style={[styles.metaValue, { color: theme.text }]}>{referredBy}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Test Values List */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>RESULTS</Text>
          {results.length === 0 ? (
            <Text style={[styles.testTypeBody, { color: theme.textMuted }]}>
              {order ? 'No individual test values have been reported yet.' : 'Could not load this lab order.'}
            </Text>
          ) : (
          <View style={styles.valuesList}>
            {results.map((val) => (
              <View
                key={val.id}
                style={[styles.valueCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.valueTopRow}>
                  <View style={styles.valueInfoLeft}>
                    <Text style={[styles.valName, { color: theme.text }]}>{val.testName}</Text>
                    {val.referenceRange && (
                      <Text style={[styles.valRange, { color: theme.textMuted }]}>
                        Ref. Range: {val.referenceRange}
                      </Text>
                    )}
                  </View>
                  {val.valueDisplay && (
                    <Text style={[styles.valBigNumber, { color: getStatusColor(val.isFlagged) }]}>
                      {val.valueDisplay} <Text style={styles.valUnit}>{val.unit}</Text>
                    </Text>
                  )}
                </View>

                <View style={[styles.valueStatusRow, { borderTopColor: theme.border }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(val.isFlagged) }]} />
                  <Text style={[styles.statusLabelText, { color: theme.textMuted }]}>
                    {getStatusLabel(val.isFlagged)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          )}
        </View>

        {/* Summary Note */}
        {results.length > 0 && (
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: hasFlagged ? theme.status.warning.background : theme.status.success.background,
                borderColor: hasFlagged ? theme.status.warning.border : theme.status.success.border,
              },
            ]}>
            <Text style={[styles.summaryText, { color: hasFlagged ? theme.status.warning.text : theme.status.success.text }]}>
              {hasFlagged
                ? 'One or more values fall outside the normal reference range — discuss with your provider.'
                : 'All values are within normal ranges.'}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={handleDownload}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Download size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Download Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/telecare')}
            activeOpacity={0.85}
            style={[styles.secondaryBtn, { backgroundColor: theme.primaryLight }]}>
            <MessageSquare size={18} color={theme.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.primaryDark }]}>
              Discuss with Doctor
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
    marginBottom: 16,
  },
  metaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  metaLeft: {
    flex: 1,
  },
  testTitle: {
    fontSize: 17,
    fontWeight: '800',
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
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  testTypeBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  valuesList: {
    gap: 10,
  },
  valueCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  valueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  valueInfoLeft: {
    flex: 1,
  },
  valName: {
    fontSize: 14,
    fontWeight: '700',
  },
  valRange: {
    fontSize: 12,
    marginTop: 2,
  },
  valBigNumber: {
    fontSize: 17,
    fontWeight: '800',
  },
  valUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  valueStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabelText: {
    fontSize: 11,
    fontWeight: '500',
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 13,
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
