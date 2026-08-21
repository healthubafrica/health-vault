import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import BloodPressureTrendChart from '@/components/BloodPressureTrendChart';
import EmergencyFAB from '@/components/EmergencyFAB';
import { vitals } from '@/lib/api';

type StatusColor = 'green' | 'amber' | 'red';
const STATUS_LABEL: Record<StatusColor, string> = { green: 'Normal', amber: 'Elevated', red: 'High' };

function classify(systolic: number): StatusColor {
  if (systolic > 140) return 'red';
  if (systolic > 130) return 'amber';
  return 'green';
}

export default function BloodPressureTrendDetailScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { data, isLoading } = useQuery({
    queryKey: ['vitals'],
    queryFn: () => vitals.list(),
  });

  const readings = (data?.data ?? [])
    .filter((r) => r.systolicBp != null && r.diastolicBp != null)
    .slice()
    .reverse();

  const systolicValues = readings.map((r) => r.systolicBp as number);
  const diastolicValues = readings.map((r) => r.diastolicBp as number);
  const latest = readings[readings.length - 1];
  const latestStatus: StatusColor = latest ? classify(latest.systolicBp as number) : 'green';
  const avgSystolic = systolicValues.length ? Math.round(systolicValues.reduce((s, v) => s + v, 0) / systolicValues.length) : 0;
  const avgDiastolic = diastolicValues.length ? Math.round(diastolicValues.reduce((s, v) => s + v, 0) / diastolicValues.length) : 0;

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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <ChevronLeft size={22} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>Blood Pressure</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {readings.length === 0 ? (
          <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>No blood pressure readings yet</Text>
          </View>
        ) : (
          <>
            {/* Current Reading Summary */}
            <View style={[styles.summaryCard, { backgroundColor: theme.primaryLight }]}>
              <View style={styles.summaryTop}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>CURRENT READING</Text>
                <Text style={[styles.summaryDate, { color: theme.textMuted }]}>
                  {new Date(latest.recordedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.valueRow}>
                <Text style={[styles.bigValue, { color: theme.primary }]}>{latest.systolicBp}</Text>
                <Text style={[styles.slashText, { color: theme.primary }]}>/</Text>
                <Text style={[styles.bigValue, { color: theme.primary }]}>{latest.diastolicBp}</Text>
                <Text style={[styles.unitText, { color: theme.textMuted }]}>mmHg</Text>
              </View>

              <View style={styles.summaryBottom}>
                <StatusPill status={latestStatus} label={STATUS_LABEL[latestStatus]} />
              </View>
            </View>

            {/* Dual Line Trend Chart */}
            <BloodPressureTrendChart systolic={systolicValues} diastolic={diastolicValues} />

            {/* Stats — Systolic & Diastolic */}
            <View style={styles.statsSection}>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>Systolic Avg</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{avgSystolic} mmHg</Text>
                  <Text style={[styles.statRange, { color: theme.textMuted }]}>Range: {Math.min(...systolicValues)}–{Math.max(...systolicValues)}</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>Diastolic Avg</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{avgDiastolic} mmHg</Text>
                  <Text style={[styles.statRange, { color: theme.textMuted }]}>Range: {Math.min(...diastolicValues)}–{Math.max(...diastolicValues)}</Text>
                </View>
              </View>

              {/* Classification Banner */}
              <View
                style={[
                  styles.classificationCard,
                  {
                    backgroundColor: theme.status[latestStatus === 'green' ? 'success' : latestStatus === 'amber' ? 'warning' : 'emergency'].background,
                    borderColor: theme.status[latestStatus === 'green' ? 'success' : latestStatus === 'amber' ? 'warning' : 'emergency'].border,
                  },
                ]}>
                <Text style={[styles.classTitle, { color: theme.status[latestStatus === 'green' ? 'success' : latestStatus === 'amber' ? 'warning' : 'emergency'].text }]}>Classification</Text>
                <Text style={[styles.classDesc, { color: theme.status[latestStatus === 'green' ? 'success' : latestStatus === 'amber' ? 'warning' : 'emergency'].text }]}>
                  {latestStatus === 'green' ? 'Normal blood pressure. Monitor regularly.' : latestStatus === 'amber' ? 'Elevated blood pressure. Monitor closely and discuss with your provider.' : 'High blood pressure. Contact your provider.'}
                </Text>
              </View>
            </View>

            {/* Reading History */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Reading History</Text>

              <View style={styles.historyList}>
                {readings.slice().reverse().map((reading) => {
                  const status = classify(reading.systolicBp as number);
                  return (
                    <View
                      key={reading.id}
                      style={[styles.historyItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <View style={styles.historyLeft}>
                        <Text style={[styles.historyValue, { color: theme.text }]}>
                          {reading.systolicBp}/{reading.diastolicBp} mmHg
                        </Text>
                        <Text style={[styles.historyDate, { color: theme.textMuted }]}>
                          {new Date(reading.recordedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>

                      <View style={styles.historyRight}>
                        <View style={[styles.historyPill, { backgroundColor: theme.status[status === 'green' ? 'success' : status === 'amber' ? 'warning' : 'emergency'].background }]}>
                          <Text style={[styles.historyPillText, { color: theme.status[status === 'green' ? 'success' : status === 'amber' ? 'warning' : 'emergency'].text }]}>
                            {STATUS_LABEL[status]}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
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
  summaryCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  summaryDate: {
    fontSize: 11,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  bigValue: {
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 48,
  },
  slashText: {
    fontSize: 28,
    fontWeight: '600',
    opacity: 0.7,
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  summaryBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 12,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statRange: {
    fontSize: 11,
    marginTop: 4,
  },
  classificationCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  classTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  classDesc: {
    fontSize: 13,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  historyLeft: {
    flex: 1,
  },
  historyValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 11,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historySource: {
    fontSize: 11,
  },
});
